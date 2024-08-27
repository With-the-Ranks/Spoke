import { getContent } from "../../../lib/templates/mark-second-pass";
import { sendEmail } from "../../../mail";
import { r } from "../../../models";
import type {
  MarkSecondPassPayload,
  ProcessSecondPassChunkPayload,
  ProgressTask
} from "./utils";
import {
  addProgressJob,
  CHUNK_SIZE,
  getChunkedContactsCte,
  getContactCount,
  getNotificationEmail,
  TASK_IDENTIFIER
} from "./utils";

export { TASK_IDENTIFIER };

export const processChunk = async (
  payload: ProcessSecondPassChunkPayload
): Promise<number> => {
  const {
    campaignId,
    lastContactId = 0,
    unmark,
    excludeNewer,
    excludeAgeInHours
  } = payload;

  // don't unmark contacts where a first msg was never sent
  const msgExists = `
    and exists (
      select 1
      from message
      where message.campaign_contact_id = cc.id
    )
  `;

  const markFilters = `
  ${
    excludeNewer
      ? `and not exists (
          select 1 from campaign_contact as newer_contact
          where newer_contact.cell = cc.cell
            and newer_contact.id > cc.id
      )`
      : ""
  }   
  ${
    excludeAgeInHours
      ? `and not exists (
          select 1 from message where campaign_contact_id = cc.id 
            and created_at > now() - interval '?? hour'
      )`
      : ""
  }`;

  const queryArgs: (string | number)[] = [campaignId, lastContactId];
  if (excludeAgeInHours) queryArgs.push(excludeAgeInHours);
  queryArgs.push(CHUNK_SIZE);

  const contactsFilter = `
    message_status = ${unmark ? "'needsMessage'" : "'messaged'"}
    ${unmark ? msgExists : markFilters}
  `;

  const contactsCte = getChunkedContactsCte(contactsFilter);
  const {
    rows: [{ max: maxContactId }]
  } = await r.reader.raw(
    `
      ${contactsCte},
      mark_contacts as (
        update campaign_contact set message_status = ${
          unmark ? "'messaged'" : "'needsMessage'"
        }
        where id in (
          select id from campaign_contacts
        )
        returning id
      )

      -- this ensures that the mark cte will actually run, but return the max contact id overall
      select max(id) from (
        select(id) from campaign_contacts
        union
        select(id) from mark_contacts
      ) ctes
    `,
    queryArgs
  );
  return maxContactId;
};

type ProcessContactsPayload = Omit<
  MarkSecondPassPayload,
  "organizationId" | "requesterId" | "campaignTitle"
>;
const processContacts: ProgressTask<ProcessContactsPayload> = async (
  payload,
  helpers
) => {
  const { campaignId, unmark, excludeNewer, excludeAgeInHours } = payload;
  const contactsCount = await getContactCount(campaignId);

  let lastContactId = 0;
  let processed = 0;
  let chunkContactResult: number;

  while (
    // eslint-disable-next-line no-cond-assign
    (chunkContactResult = await processChunk({
      campaignId,
      lastContactId,
      unmark,
      excludeNewer,
      excludeAgeInHours
    }))
  ) {
    lastContactId = chunkContactResult;
    helpers.logger.debug(
      `Processing ${
        unmark ? "un" : ""
      }mark second pass for ${campaignId} chunk part ${lastContactId}`
    );
    processed += CHUNK_SIZE;
    await helpers.updateStatus(Math.round(processed / contactsCount));
  }
};

export const markSecondPass: ProgressTask<MarkSecondPassPayload> = async (
  payload,
  helpers
) => {
  const {
    campaignId,
    campaignTitle,
    organizationId,
    requesterId,
    unmark,
    excludeNewer,
    excludeAgeInHours
  } = payload;

  const unPrefix = unmark ? "un" : "";
  await processContacts(
    { campaignId, unmark, excludeNewer, excludeAgeInHours },
    helpers
  );

  const notificationEmail = await getNotificationEmail(requesterId);
  const emailContent = await getContent({
    campaignId,
    organizationId,
    campaignTitle,
    unmark
  });

  if (!unmark) {
    await r
      .knex("campaign")
      .update({ autosend_status: "unstarted" })
      .where({ id: campaignId });
  }

  await sendEmail({
    to: notificationEmail,
    subject: `Second pass ${unPrefix}marking complete for ${campaignTitle}`,
    html: emailContent
  });

  helpers.logger.info(
    `Successfully ${unPrefix}marked ${campaignId} for second pass`
  );
};

export const addMarkSecondPass = async (payload: MarkSecondPassPayload) =>
  addProgressJob({
    identifier: TASK_IDENTIFIER,
    payload
  });
