import type { Task } from "graphile-worker";

import { ActionType, ExternalSystemType } from "../../api/types";
import VAN from "../../external-systems/van";
import { r } from "../../models";
import {
  markSyncFailed,
  unsupportedActionTypeMessage,
  unsupportedExternalSystemMessage
} from "./utils";

export const TASK_IDENTIFIER = "queue-action-external-sync";

interface QueueActionExternalSyncPayload {
  actionId: number;
  actionType: ActionType;
  contactId?: number;
}

const isDialerAction = (actionType: ActionType) =>
  actionType === ActionType.DialerQuestionResponse ||
  actionType === ActionType.DialerOptOut;

const queueActionExternalSync: Task = async (rawPayload, helpers) => {
  const {
    actionId,
    actionType,
    contactId
  } = rawPayload as QueueActionExternalSyncPayload;
  const [{ id: syncId }] = await r
    .knex("action_external_system_sync")
    .insert({
      action_type: actionType,
      action_id: actionId
    })
    .returning("id");

  let externalSystem: { id: string; type: string } | undefined;

  if (isDialerAction(actionType)) {
    externalSystem = await r
      .knex("external_system")
      .join(
        "all_campaign",
        "all_campaign.external_system_id",
        "external_system.id"
      )
      .join(
        "dialer_campaign_contact",
        "dialer_campaign_contact.campaign_id",
        "all_campaign.id"
      )
      .where({ "dialer_campaign_contact.id": contactId })
      .first(["external_system.id", "external_system.type"]);
  } else {
    externalSystem = await r
      .knex("external_system")
      .join("campaign", "campaign.external_system_id", "external_system.id")
      .join("campaign_contact", "campaign_contact.campaign_id", "campaign.id")
      .where({ "campaign_contact.id": contactId })
      .first(["external_system.id", "external_system.type"]);
  }

  if (!externalSystem) {
    await markSyncFailed(syncId, "No external system found", helpers);
    return;
  }

  const syncPayload = {
    syncId,
    contactId,
    externalSystemId: externalSystem.id
  };

  if (externalSystem.type === ExternalSystemType.Van) {
    switch (actionType) {
      case ActionType.OptOut:
        await VAN.queueOptOut(syncPayload, helpers);
        break;
      case ActionType.QuestionReponse:
        await VAN.queueQuestionResponse(syncPayload, helpers);
        break;
      case ActionType.DialerQuestionResponse:
        await VAN.queueDialerQuestionResponse(syncPayload, helpers);
        break;
      case ActionType.DialerOptOut:
        await VAN.queueDialerOptOut(syncPayload, helpers);
        break;
      default:
        await markSyncFailed(
          syncId,
          unsupportedActionTypeMessage(actionType),
          helpers
        );
    }
  } else {
    await markSyncFailed(
      syncId,
      unsupportedExternalSystemMessage(externalSystem.type),
      helpers
    );
  }
};

export default queueActionExternalSync;
