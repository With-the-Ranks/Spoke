import type { Task } from "graphile-worker";

import { ExternalSystemType } from "../../api/types";
import VAN from "../../external-systems/van";
import { markSyncFailed, unsupportedExternalSystemMessage } from "./utils";

export const TASK_IDENTIFIER = "sync-dialer-question-response";

const syncDialerQuestionResponse: Task = async (payload, helpers) => {
  const { externalSystemType, syncId } = payload as Record<string, any>;

  switch (externalSystemType) {
    case ExternalSystemType.Van:
      VAN.syncDialerQuestionResponse(payload as Record<string, any>, helpers);
      break;
    default:
      await markSyncFailed(
        syncId,
        unsupportedExternalSystemMessage(externalSystemType),
        helpers
      );
  }
};

export default syncDialerQuestionResponse;
