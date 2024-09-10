import type { CsvFormatterStream, FormatterRowArray } from "fast-csv";
import { format } from "fast-csv";
import _ from "lodash";

import { DateTime } from "../../../../lib/datetime";
import {
  getDownloadUrl,
  getUploadStream
} from "../../../../workers/exports/upload";
import getExportCampaignContent from "../../../api/export-campaign";
import { sendEmail } from "../../../mail";
import { r } from "../../../models";
import type { ContactTaskChunk } from "../utils";
import { processChunks } from "../utils";
import type {
  ChunkTaskPayload,
  ContactExportRow,
  ExportCampaignTask,
  ExportChunk,
  FilteredContactsRow,
  InteractionStepRecord,
  MessageExportRow,
  ProcessChunkTitlePayload,
  ProcessMessagesChunkPayload,
  ProgressTask,
  ProgressTaskHelpers,
  UploadCampaignContacts,
  UploadCampaignMessages,
  UploadContactsPayload
} from "./utils";
import {
  addProgressJob,
  CHUNK_SIZE,
  errToObj,
  getChunkedContactsCte,
  getContactCount,
  getNotificationEmail,
  isExportChunk,
  isFilteredContact,
  TASK_IDENTIFIER
} from "./utils";

export { TASK_IDENTIFIER };

const stepHasQuestion = (step: InteractionStepRecord) =>
  step.question && step.question.trim() !== "";

/**
 * Returns map from interaction step ID --> question text (deduped where appropriate).
 * @param {object[]} interactionSteps Array of interaction steps to work on.
 */
export const getUniqueQuestionsByStepId = (
  interactionSteps: InteractionStepRecord[]
) => {
  const questionSteps = interactionSteps.filter(stepHasQuestion);
  const duplicateQuestions = _.groupBy(questionSteps, (step) => step.question);

  return Object.keys(duplicateQuestions).reduce(
    (allQuestions, questionText) => {
      const steps = duplicateQuestions[questionText];
      const newUniqueQuestions =
        steps.length > 1
          ? steps.reduce(
              (collector, step, index) =>
                Object.assign(collector, {
                  [step.id]: `${questionText}_${index + 1}`
                }),
              {}
            )
          : { [steps[0].id]: questionText };

      return Object.assign(allQuestions, newUniqueQuestions);
    },
    {}
  );
};

export const fetchExportData = async (
  campaignId: number,
  requesterId: number
) => {
  const contactsCount = await getContactCount(campaignId);
  const notificationEmail = await getNotificationEmail(requesterId);

  const interactionSteps = await r
    .reader("interaction_step")
    .select("*")
    .where({ campaign_id: campaignId });

  const assignments = await r
    .reader("assignment")
    .where("campaign_id", campaignId)
    .join("user", "user_id", "user.id")
    .select(
      "assignment.id as id",
      "user.first_name",
      "user.last_name",
      "user.email",
      "user.cell",
      "user.assigned_cell"
    );

  const campaignVariableNames: string[] = await r
    .reader<{ name: string }>("campaign_variable")
    .where("campaign_id", campaignId)
    .distinct("name")
    .then((rows) => rows.map(({ name }) => name));

  return {
    contactsCount,
    notificationEmail,
    interactionSteps,
    campaignVariableNames,
    assignments
  };
};

const createContactRow = (
  contact: FilteredContactsRow | ContactExportRow,
  campaignId: number,
  campaignTitle: string
) => {
  const contactIsFiltered = isFilteredContact(contact);

  const contactRow: Record<string, any> = {
    campaignId,
    campaign: campaignTitle,
    "contact[firstName]": contact.first_name,
    "contact[lastName]": contact.last_name,
    "contact[cell]": contact.cell,
    "contact[zip]": contact.zip,
    "contact[city]": contact.city || null,
    "contact[state]": contact.state || null,
    "contact[messageStatus]": contactIsFiltered
      ? "removed"
      : contact.message_status,
    "contact[external_id]": contact.external_id
  };

  if (contactIsFiltered)
    contactRow["contact[filtered_reason]"] = contact.filtered_reason;

  return contactRow;
};

const appendCustomFields = (
  contact: FilteredContactsRow | ContactExportRow,
  contactRow: { [key: string]: any }
) => {
  const customFields = JSON.parse(contact.custom_fields);
  Object.keys(customFields).forEach((fieldName) => {
    contactRow[`contact[${fieldName}]`] = customFields[fieldName];
  });
};

const processFilteredContactsChunk = async ({
  campaignId,
  campaignTitle,
  lastContactId
}: ProcessChunkTitlePayload): Promise<ExportChunk | false> => {
  const filteredRows: FilteredContactsRow[] = await r
    .reader("filtered_contact")
    .select("filtered_contact.*", "zip_code.city", "zip_code.state")
    .leftJoin("zip_code", "filtered_contact.zip", "zip_code.zip")
    .where({ campaign_id: campaignId })
    .whereRaw("filtered_contact.id > ?", [lastContactId])
    .orderBy("filtered_contact.id", "asc")
    .limit(CHUNK_SIZE);

  const newLastContactId = filteredRows?.at(-1)?.id ?? 0;

  if (newLastContactId === 0) return false;

  const contacts = filteredRows.map((contact) => {
    const contactRow = createContactRow(contact, campaignId, campaignTitle);
    appendCustomFields(contact, contactRow);
    return contactRow;
  });

  return { lastContactId: newLastContactId, data: contacts };
};

export const processContactsChunk = async (
  {
    campaignId,
    campaignTitle = "",
    lastContactId
  }: Pick<ProcessChunkTitlePayload, "campaignId" | "lastContactId"> &
    Partial<Pick<ProcessChunkTitlePayload, "campaignTitle">>,
  questionsById: { [key: string]: string },
  onlyOptOuts = false
): Promise<ExportChunk | false> => {
  const contactsCte = onlyOptOuts
    ? getChunkedContactsCte("is_opted_out = true")
    : getChunkedContactsCte();

  const { rows }: { rows: ContactExportRow[] } = await r.reader.raw(
    `
      ${contactsCte}
      select
        campaign_contacts.*,
        zip_code.city,
        zip_code.state,
        question_response.interaction_step_id,
        question_response.value,
        tags.tag_titles
      from campaign_contacts
      left join question_response
        on question_response.campaign_contact_id = campaign_contacts.id
      left join zip_code
        on zip_code.zip = campaign_contacts.zip
      left join (
          select 
            campaign_contact_tag.campaign_contact_id,
            array_agg(tag.title) as tag_titles
          from campaign_contact_tag
          join tag
            on campaign_contact_tag.tag_id = tag.id
          group by campaign_contact_tag.campaign_contact_id
        ) as tags
        on tags.campaign_contact_id = campaign_contacts.id
        order by campaign_contacts.id asc
      ;
    `,
    [campaignId, lastContactId, CHUNK_SIZE]
  );

  if (rows.length === 0) return false;

  lastContactId = rows[rows.length - 1].id;

  const rowsByContactId = _.groupBy(rows, (row) => row.id);
  const contacts = Object.keys(rowsByContactId).map((contactId) => {
    // Use the first row for all the common campaign contact fields
    const contact = rowsByContactId[contactId][0];
    const contactRow = createContactRow(contact, campaignId, campaignTitle);
    appendCustomFields(contact, contactRow);

    // Append columns for question responses
    Object.keys(questionsById).forEach((stepId) => {
      const questionText = questionsById[stepId];
      const response = rowsByContactId[contactId].find(
        (qr) =>
          parseInt(`${qr.interaction_step_id}`, 10) === parseInt(stepId, 10)
      );

      const responseValue = response ? response.value : "";
      contactRow[`question[${questionText}]`] = responseValue;
    });

    contactRow.tags = contact.tag_titles;

    return contactRow;
  });

  return { lastContactId, data: contacts };
};

export const processMessagesChunk = async ({
  campaignId,
  lastContactId,
  campaignVariableNames
}: ProcessMessagesChunkPayload): Promise<ExportChunk | false> => {
  const { rows }: { rows: MessageExportRow[] } = await r.reader.raw(
    `
      select
        message.campaign_contact_id,
        message.assignment_id,
        message.user_number,
        message.contact_number,
        message.is_from_contact,
        message.text,
        message.send_status,
        message.created_at,
        array_to_string(message.error_codes, '|') as error_codes,
        message.num_segments,
        message.num_media,
        public.user.first_name,
        public.user.last_name,
        public.user.email,
        public.user.cell as user_cell,
        (
          select json_object(array_agg(name), array_agg(value))
          from campaign_variable
          where id = ANY(message.campaign_variable_ids)
        )  as campaign_variables
      from message
      left join public.user
        on message.user_id = public.user.id
      where campaign_contact_id in (
        select id
        from campaign_contact
        where
          campaign_id = ?
          and id > ?
          and exists (
            select 1
            from message
            where campaign_contact_id = campaign_contact.id 
          )
        order by
          id asc
        limit ?
      )
      order by
        campaign_contact_id asc,
        message.created_at asc
      ;
    `,
    [campaignId, lastContactId, CHUNK_SIZE]
  );

  if (rows.length === 0) return false;

  lastContactId = rows[rows.length - 1].campaign_contact_id;

  const campaignVariableColumns = (message: MessageExportRow) =>
    campaignVariableNames.reduce<Record<string, string | null>>(
      (acc, variableName) => ({
        ...acc,
        [`campaignVariable[${variableName}]`]: message.campaign_variables
          ? message.campaign_variables[variableName] ?? null
          : null
      }),
      {}
    );

  const messages = rows.map((message) => ({
    assignmentId: message.assignment_id,
    userNumber: message.user_number,
    contactNumber: message.contact_number,
    isFromContact: message.is_from_contact,
    numSegments: message.num_segments,
    numMedia: message.num_media,
    sendStatus: message.send_status,
    errorCodes: message.error_codes,
    attemptedAt: DateTime.fromJSDate(new Date(message.created_at)).toISO(),
    text: message.text,
    campaignId,
    "texter[firstName]": message.first_name,
    "texter[lastName]": message.last_name,
    "texter[email]": message.email,
    "texter[cell]": message.user_cell,
    ...campaignVariableColumns(message)
  }));

  return { lastContactId, data: messages };
};

const setupUploadStreams = async (
  fileName: string,
  helpers: ProgressTaskHelpers
) => {
  const uploadStream = await getUploadStream(`${fileName}.csv`);
  const writeStream = format({
    headers: true,
    writeHeaders: true
  });

  uploadStream.on("error", (err) => {
    helpers.logger.error(`error in ${fileName}UploadStream: `, errToObj(err));
  });

  writeStream.on("error", (err) => {
    helpers.logger.error(`error in ${fileName}WriteStream: `, errToObj(err));
  });

  const uploadPromise = new Promise((resolve) => {
    uploadStream.on("finish", resolve);
  });

  writeStream.pipe(uploadStream);

  return { writeStream, uploadPromise };
};

const writeExportResult = (
  writeStream: CsvFormatterStream<FormatterRowArray, FormatterRowArray>
) => (result: ContactTaskChunk) => {
  if (!isExportChunk(result))
    throw new Error("Wrong task chunk type passed to writeExportResult");
  for (const c of result.data) writeStream.write(c);
};

// eslint-disable-next-line max-len
const processAndUploadCampaignContacts: ExportCampaignTask<UploadCampaignContacts> = async (
  payload,
  helpers
) => {
  const {
    interactionSteps,
    fileNameKey,
    onlyOptOuts,
    campaignId,
    contactsCount
  } = payload;
  const uniqueQuestionsByStepId = getUniqueQuestionsByStepId(interactionSteps);

  const campaignContactsKey = onlyOptOuts
    ? `${fileNameKey}-optouts`
    : fileNameKey;

  const { writeStream, uploadPromise } = await setupUploadStreams(
    campaignContactsKey,
    helpers
  );

  try {
    await processChunks({
      processChunk: (chunkPayload) =>
        processContactsChunk(
          chunkPayload,
          uniqueQuestionsByStepId,
          onlyOptOuts
        ),
      operationName: "Export campaign contacts",
      chunkSize: CHUNK_SIZE,
      campaignId,
      helpers,
      contactsCount,
      writeResult: writeExportResult(writeStream),
      statusDivider: 4,
      statusOffset: onlyOptOuts ? 75 : 25
    });
  } finally {
    writeStream.end();
  }

  await uploadPromise;
  return getDownloadUrl(`${campaignContactsKey}.csv`);
};

// eslint-disable-next-line max-len
const processAndUploadCampaignMessages: ExportCampaignTask<UploadCampaignMessages> = async (
  { fileNameKey, campaignId, contactsCount, campaignVariableNames },
  helpers
) => {
  const messagesKey = `${fileNameKey}-messages`;
  const { writeStream, uploadPromise } = await setupUploadStreams(
    messagesKey,
    helpers
  );

  try {
    await processChunks({
      processChunk: (chunkPayload) =>
        processMessagesChunk({
          campaignId,
          lastContactId: chunkPayload.lastContactId,
          campaignVariableNames
        }),
      operationName: "message export",
      chunkSize: CHUNK_SIZE,
      campaignId,
      helpers,
      contactsCount,
      writeResult: writeExportResult(writeStream),
      statusDivider: 4
    });
  } finally {
    writeStream.end();
  }

  await uploadPromise;
  return getDownloadUrl(`${messagesKey}.csv`);
};

// eslint-disable-next-line max-len
const processAndUploadFilteredContacts: ExportCampaignTask<UploadContactsPayload> = async (
  { fileNameKey, campaignId, campaignTitle },
  helpers
): Promise<string> => {
  const filteredContactsKey = `${fileNameKey}-filteredContacts`;
  const { writeStream, uploadPromise } = await setupUploadStreams(
    filteredContactsKey,
    helpers
  );

  const countQuery = await r
    .reader("filtered_contact")
    .count("*")
    .where({ campaign_id: campaignId });
  const contactsCount = countQuery[0].count as number;

  try {
    await processChunks({
      processChunk: (chunkPayload) =>
        processFilteredContactsChunk({
          campaignId,
          campaignTitle,
          lastContactId: chunkPayload.lastContactId
        }),
      operationName: "filtered contacts export",
      campaignId,
      chunkSize: CHUNK_SIZE,
      helpers,
      contactsCount,
      writeResult: writeExportResult(writeStream),
      statusDivider: 4,
      statusOffset: 75
    });
  } finally {
    writeStream.end();
  }

  await uploadPromise;
  return getDownloadUrl(`${filteredContactsKey}.csv`);
};

export interface ExportCampaignPayload extends ChunkTaskPayload {
  isAutomatedExport?: boolean;
  spokeOptions: {
    campaign: boolean;
    messages: boolean;
    optOuts: boolean;
    filteredContacts: boolean;
  };
}

export const exportCampaign: ProgressTask<ExportCampaignPayload> = async (
  payload,
  helpers
) => {
  const {
    campaignId,
    campaignTitle,
    requesterId,
    isAutomatedExport = false,
    spokeOptions
  } = payload;

  const {
    contactsCount,
    notificationEmail,
    interactionSteps,
    campaignVariableNames
  } = await fetchExportData(campaignId, requesterId);

  // Attempt upload to cloud storage
  let fileNameKey = campaignTitle.replace(/ /g, "_").replace(/\//g, "_");

  if (!isAutomatedExport) {
    const timestamp = DateTime.local().toFormat("y-mm-d-hh-mm-ss");
    fileNameKey = `${fileNameKey}-${timestamp}`;
  }

  const {
    campaign: shouldExportCampaign,
    filteredContacts: shouldExportFilteredContacts,
    messages: shouldExportMessages,
    optOuts: shouldExportOptOuts
  } = spokeOptions;

  const campaign = { campaignId, campaignTitle, contactsCount };

  const campaignExportUrl = shouldExportCampaign
    ? await processAndUploadCampaignContacts(
        {
          fileNameKey,
          ...campaign,
          interactionSteps,
          onlyOptOuts: false
        },
        helpers
      )
    : null;

  const campaignOptOutsExportUrl = shouldExportOptOuts
    ? await processAndUploadCampaignContacts(
        {
          fileNameKey,
          ...campaign,
          interactionSteps,
          onlyOptOuts: true
        },
        helpers
      )
    : null;

  const campaignMessagesExportUrl = shouldExportMessages
    ? await processAndUploadCampaignMessages(
        {
          fileNameKey,
          ...campaign,
          campaignVariableNames
        },
        helpers
      )
    : null;

  const campaignFilteredContactsExportUrl = shouldExportFilteredContacts
    ? await processAndUploadFilteredContacts(
        {
          fileNameKey,
          ...campaign
        },
        helpers
      )
    : null;

  helpers.logger.debug("Waiting for streams to finish");

  try {
    if (!isAutomatedExport) {
      const exportContent = await getExportCampaignContent(
        {
          campaignExportUrl,
          campaignFilteredContactsExportUrl,
          campaignOptOutsExportUrl,
          campaignMessagesExportUrl
        },
        campaignTitle
      );
      await sendEmail({
        to: notificationEmail,
        subject: `Export ready for ${campaignTitle}`,
        html: exportContent
      });
    }
    helpers.logger.info(`Successfully exported ${campaignId}`);
  } finally {
    helpers.logger.info("Finishing export process");
  }
};

export const addExportCampaign = async (payload: ExportCampaignPayload) =>
  addProgressJob({
    identifier: TASK_IDENTIFIER,
    payload,
    taskSpec: {
      queueName: "export"
    }
  });
