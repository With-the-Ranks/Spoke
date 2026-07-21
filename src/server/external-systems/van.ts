import type { JobHelpers } from "graphile-worker";
import isNil from "lodash/isNil";
import type { SuperAgentRequest } from "superagent";
import { post } from "superagent";

import { config } from "../../config";
import { snakeToCamelCase } from "../../lib/attributes";
import { DateTime } from "../../lib/datetime";
import type {
  ContactIdColumn,
  ContactTable,
  ExternalSystem,
  ResponseTable
} from "../api/types";
import { ExternalSystemType } from "../api/types";
import { getSecret } from "../lib/graphile-secrets";
import { r } from "../models";

const DEFAULT_MODE = "0"; // VoterFile mode

interface CanvassResultRow {
  result_codes: { result_code_id: number }[];
  activist_codes: { activist_code_id: number }[];
  response_options: {
    survey_question_id: number;
    response_option_id: number;
  }[];
}

interface VANCanvassContextPhone {
  dialingPrefix: "1";
  phoneNumber: string;
}

interface VANActivistCodeResponse {
  type: "ActivistCode";
  activistCodeId: number;
  action: "Apply" | "Remove" | null; // Default: Apply
}

interface VANSurveyResponse {
  type: "SurveyResponse";
  surveyQuestionId: number;
  surveyResponseId: number;
}

export interface VanSecretAuthPayload {
  username: string;
  api_key: { __secret: string };
}

export enum VANDataCollectionStatus {
  Active = "Active",
  Archived = "Archived",
  Inactive = "Inactive"
}

export interface VanAuthPayload {
  username: string;
  api_key: string;
}

const getVanAuth = async (externalSystemId: string, helpers: JobHelpers) => {
  const vanCredentials = await r
    .knex("external_system")
    .where({
      id: externalSystemId
    })
    .first("username", "api_key_ref");

  const apiKey = await helpers.withPgClient((client) =>
    getSecret(client, vanCredentials.api_key_ref)
  );

  return {
    username: vanCredentials.username,
    api_key: apiKey || ""
  } as VanAuthPayload;
};

export const withVan = (van: VanAuthPayload) => (
  request: SuperAgentRequest
) => {
  const [apiKey, existingMode] = van.api_key.split("|");
  const mode = existingMode || DEFAULT_MODE;
  request.auth(van.username, `${apiKey}|${mode}`, { type: "basic" });
  request.url = `${config.VAN_BASE_URL}${request.url}`;
  return request;
};

const formatPhone = (phoneNumber: string): VANCanvassContextPhone => ({
  dialingPrefix: "1",
  phoneNumber: phoneNumber.replace("+1", "")
});

const getCanvassResponsesGeneric = (
  contactId: number,
  externalSystemId: string,
  actionIds: Array<number>,
  responseTable: ResponseTable,
  contactIdColumn: ContactIdColumn
) => {
  return r.knex.raw(
    `
      with configured_response_values as (
        select
          qrc.id
        from all_external_sync_question_response_configuration qrc
        join ${responseTable}
          on ${responseTable}.value = qrc.question_response_value
          and ${responseTable}.interaction_step_id = qrc.interaction_step_id
        where
          ${contactIdColumn} = ?
          and system_id = ?
          and ${responseTable}.id = ANY(?)
          and ${responseTable}.is_deleted = false
      ),
      points as (
        -- Result Codes
        select
          json_build_object(
            'result_code_id', external_result_code.external_id
          )::jsonb as result_code,
          null::jsonb as activist_code,
          null::jsonb as response_option
        from configured_response_values
        join external_sync_config_question_response_result_code qrrc
          on qrrc.question_response_config_id = configured_response_values.id
        join external_result_code
          on external_result_code.id = qrrc.external_result_code_id

        union

        -- Activist Codes
        select
          null::jsonb as result_code,
          json_build_object(
            'activist_code_id', external_activist_code.external_id
          )::jsonb as activist_code,
          null::jsonb as response_option
        from configured_response_values
        join external_sync_config_question_response_activist_code qrac
          on qrac.question_response_config_id = configured_response_values.id
        join external_activist_code
          on external_activist_code.id = qrac.external_activist_code_id
        where
          external_activist_code.status = 'active'

        union

        -- Survey Question Response Options
        select
          null::jsonb as result_code,
          null::jsonb as activist_code,
          json_build_object(
            'survey_question_id', external_survey_question.external_id,
            'response_option_id', external_survey_question_response_option.external_id
          )::jsonb as response_option
        from configured_response_values
        join external_sync_config_question_response_response_option qrro
          on qrro.question_response_config_id = configured_response_values.id
        join external_survey_question_response_option
          on external_survey_question_response_option.id = qrro.external_response_option_id
        join external_survey_question
          on external_survey_question.id = external_survey_question_response_option.external_survey_question_id
        where
          external_survey_question.status = 'active'
      ),
      canvass_responses as (
        select
          array_to_json(array_remove(array_agg(result_code), null)) as result_codes,
          array_to_json(array_remove(array_agg(activist_code), null)) as activist_codes,
          array_to_json(array_remove(array_agg(response_option), null)) as response_options
        from points
      )
      select * from canvass_responses
    `,
    [contactId, externalSystemId, actionIds]
  );
};

const formatCanvassResponse = (
  canvassResponse: CanvassResultRow,
  phoneId: number,
  phoneNumber: string,
  canvassedAt: string,
  contactTypeId: number = config.VAN_CONTACT_TYPE_ID
) => {
  const { response_options, activist_codes } = canvassResponse;

  const surveyResponses: VANSurveyResponse[] = response_options.map(
    (option) => ({
      type: "SurveyResponse",
      surveyQuestionId: option.survey_question_id,
      surveyResponseId: option.response_option_id
    })
  );

  const activistCodes: VANActivistCodeResponse[] = activist_codes.map(
    (code) => ({
      type: "ActivistCode",
      activistCodeId: code.activist_code_id,
      action: "Apply"
    })
  );

  const responses = [...surveyResponses, ...activistCodes];

  return [
    {
      canvassContext: {
        phoneId,
        phone: formatPhone(phoneNumber),
        contactTypeId,
        dateCanvassed: canvassedAt
      },
      resultCodeId: null,
      responses
    }
  ];
};

const syncJobOptions = (jobName: string, contactId: number) => ({
  jobKey: `${jobName}-${contactId}`,
  jobKeyMode: "replace" as const,
  maxAttempts: 5,
  runAt: DateTime.local().plus({ minutes: 1 }).toJSDate()
});

const queueOptOutGeneric = async (
  payload: Record<string, any>,
  helpers: JobHelpers,
  jobName: string
): Promise<void> => {
  const { syncId, externalSystemId, contactId } = payload;

  const externalSyncOptOutConfig = await r
    .knex("external_sync_opt_out_configuration")
    .where({ system_id: externalSystemId })
    .first();

  if (isNil(externalSyncOptOutConfig)) {
    await r
      .knex("action_external_system_sync")
      .update({ sync_status: "SKIPPED", sync_error: "No Mapping Found" })
      .where({ id: syncId });
    return;
  }

  await helpers.addJob(
    jobName,
    {
      externalSystemType: ExternalSystemType.Van,
      syncId,
      contactId,
      externalSystemId
    },
    syncJobOptions(jobName, contactId)
  );

  await r
    .knex("action_external_system_sync")
    .update({ sync_status: "SYNC_QUEUED" })
    .where({ id: syncId });
};

const queueQuestionResponseGeneric = async (
  payload: Record<string, any>,
  helpers: JobHelpers,
  responseTable: ResponseTable,
  jobName: string
): Promise<void> => {
  const { syncId, externalSystemId, contactId } = payload;

  const actionData = await r
    .knex("action_external_system_sync")
    .join(
      responseTable,
      `${responseTable}.id`,
      "action_external_system_sync.action_id"
    )
    .join("all_external_sync_question_response_configuration", function () {
      this.on(
        "all_external_sync_question_response_configuration.interaction_step_id",
        "=",
        `${responseTable}.interaction_step_id`
      );
      this.andOn(
        "all_external_sync_question_response_configuration.question_response_value",
        "=",
        `${responseTable}.value`
      );
    })
    .where({ "action_external_system_sync.id": syncId })
    .first();

  if (isNil(actionData)) {
    await r
      .knex("action_external_system_sync")
      .update({ sync_status: "SKIPPED", sync_error: "No Mapping Found" })
      .where({ id: syncId });
    return;
  }

  await helpers.addJob(
    jobName,
    {
      externalSystemType: ExternalSystemType.Van,
      syncId,
      contactId,
      externalSystemId
    },
    syncJobOptions(jobName, contactId)
  );

  await r
    .knex("action_external_system_sync")
    .update({ sync_status: "SYNC_QUEUED" })
    .where({ id: syncId });
};

const syncOptOutGeneric = async (
  payload: Record<string, any>,
  helpers: JobHelpers,
  contactTable: ContactTable,
  contactTypeId: number
): Promise<void> => {
  const { syncId, externalSystemId, contactId } = payload;

  const contact = await r.knex(contactTable).where({ id: contactId }).first();

  const externalSystem = await r
    .knex("external_system")
    .join(
      "external_sync_opt_out_configuration",
      "external_system.id",
      "external_sync_opt_out_configuration.system_id"
    )
    .join(
      "external_result_code",
      "external_sync_opt_out_configuration.external_result_code_id",
      "external_result_code.id"
    )
    .where({ "external_system.id": externalSystemId })
    .select([
      "external_system.id",
      "external_result_code.external_id as result_code_id"
    ])
    .first();

  const syncAction = await r
    .knex("action_external_system_sync")
    .where({ id: syncId })
    .first();
  const customFields = JSON.parse(contact.custom_fields);

  const canvassResponse = {
    canvassContext: {
      phoneId: customFields.phone_id,
      phone: formatPhone(contact.cell),
      contactTypeId,
      dateCanvassed: syncAction.created_at
    },
    resultCodeId: externalSystem.result_code_id,
    responses: null
  };

  const auth = await getVanAuth(externalSystemId, helpers);
  const vanId = contact.external_id;

  const response = await post(`/people/${vanId}/canvassResponses`)
    .use(withVan(auth))
    .send(canvassResponse);

  if (response.status === 204) {
    await r.knex("action_external_system_sync").where({ id: syncId }).update({
      sync_status: "SYNCED",
      synced_at: r.knex.fn.now()
    });
  } else {
    helpers.logger.error(`sync_campaign_to_van__incorrect_response_code`, {
      response: { status: response.status, body: response.body }
    });
    await r.knex("action_external_system_sync").where({ id: syncId }).update({
      sync_status: "SYNC_FAILED",
      sync_error: response.body
    });
  }
};

const syncQuestionResponseGeneric = async (
  payload: Record<string, any>,
  helpers: JobHelpers,
  contactIdColumn: ContactIdColumn,
  contactTable: ContactTable,
  responseTable: ResponseTable,
  contactTypeId: number
): Promise<void> => {
  const { externalSystemId } = payload;
  const contactIdKey = snakeToCamelCase(contactIdColumn);
  const contactId = payload[contactIdKey];

  const contact = await r.knex(contactTable).where({ id: contactId }).first();

  // Get all actions that need to be synced
  // Ignores any that is not mapped
  const pendingActionsToSync = await r
    .knex("action_external_system_sync")
    .join(
      responseTable,
      `${responseTable}.id`,
      "action_external_system_sync.action_id"
    )
    .where({
      sync_status: "SYNC_QUEUED",
      [`${responseTable}.${contactIdColumn}`]: contactId
    })
    .orderBy("action_external_system_sync.created_at", "desc")
    .select(
      "action_external_system_sync.id as sync_id",
      `${responseTable}.id as action_id`,
      "action_external_system_sync.created_at as canvassed_at"
    );

  // actionIds to fetch actions
  // syncIds to update sync status to completed
  const actionIds = pendingActionsToSync.map((a: any) => a.action_id);
  const syncIds = pendingActionsToSync.map((s: any) => s.sync_id);
  const canvassedAt = pendingActionsToSync.at(0).canvassed_at;

  const { rows: canvassResponsesRaw } = await getCanvassResponsesGeneric(
    contactId,
    externalSystemId,
    actionIds,
    responseTable,
    contactIdColumn
  );

  const customFields = JSON.parse(contact.custom_fields);

  const canvassResponses = canvassResponsesRaw.map((cR: CanvassResultRow) =>
    formatCanvassResponse(
      cR,
      customFields.phone_id,
      contact.cell,
      canvassedAt,
      contactTypeId
    )
  );

  const auth = await getVanAuth(externalSystemId, helpers);
  const vanId = contact.external_id;

  for (const canvassResponse of canvassResponses) {
    const response = await post(`/people/${vanId}/canvassResponses`)
      .use(withVan(auth))
      .send(canvassResponse);

    if (response.status === 204) {
      await r
        .knex("action_external_system_sync")
        .whereIn("id", syncIds)
        .update({
          sync_status: "SYNCED",
          synced_at: r.knex.fn.now()
        });
    } else {
      helpers.logger.error(`sync_campaign_to_van__incorrect_response_code`, {
        response: { status: response.status, body: response.body }
      });
      await r
        .knex("action_external_system_sync")
        .whereIn("id", syncIds)
        .update({
          sync_status: "SYNC_FAILED",
          sync_error: response.body
        });
    }
  }
};

const VAN: ExternalSystem = {
  queueOptOut: (payload: Record<string, any>, helpers: JobHelpers) =>
    queueOptOutGeneric(payload, helpers, "sync-contact-opt-out"),

  queueQuestionResponse: (payload: Record<string, any>, helpers: JobHelpers) =>
    queueQuestionResponseGeneric(
      payload,
      helpers,
      "all_question_response",
      "sync-contact-question-response"
    ),

  syncQuestionResponse: (payload: Record<string, any>, helpers: JobHelpers) =>
    syncQuestionResponseGeneric(
      payload,
      helpers,
      "campaign_contact_id",
      "campaign_contact",
      "all_question_response",
      config.VAN_CONTACT_TYPE_ID
    ),

  syncOptOut: (payload: Record<string, any>, helpers: JobHelpers) =>
    syncOptOutGeneric(
      payload,
      helpers,
      "campaign_contact",
      config.VAN_CONTACT_TYPE_ID
    ),

  queueDialerOptOut: (payload: Record<string, any>, helpers: JobHelpers) =>
    queueOptOutGeneric(payload, helpers, "sync-dialer-opt-out"),

  queueDialerQuestionResponse: (
    payload: Record<string, any>,
    helpers: JobHelpers
  ) =>
    queueQuestionResponseGeneric(
      payload,
      helpers,
      "dialer_question_response",
      "sync-dialer-question-response"
    ),

  syncDialerQuestionResponse: (
    payload: Record<string, any>,
    helpers: JobHelpers
  ) =>
    syncQuestionResponseGeneric(
      payload,
      helpers,
      "dialer_campaign_contact_id",
      "dialer_campaign_contact",
      "dialer_question_response",
      config.VAN_DIALER_CONTACT_TYPE_ID
    ),

  syncDialerOptOut: (payload: Record<string, any>, helpers: JobHelpers) =>
    syncOptOutGeneric(
      payload,
      helpers,
      "dialer_campaign_contact",
      config.VAN_DIALER_CONTACT_TYPE_ID
    )
};

export default VAN;
