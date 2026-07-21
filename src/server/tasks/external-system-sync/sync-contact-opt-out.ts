import type { JobHelpers, Task } from "graphile-worker";

import { ExternalSystemType } from "../../api/types";
import VAN from "../../external-systems/van";
import { markSyncFailed, unsupportedExternalSystemMessage } from "./utils";

export const TASK_IDENTIFIER = "sync-contact-opt-out";

const syncContactOptOut: Task = async (
  payload: Record<string, any>,
  helpers: JobHelpers
) => {
  switch (payload.externalSystemType) {
    case ExternalSystemType.Van:
      VAN.syncOptOut(payload, helpers);
      break;
    default:
      await markSyncFailed(
        payload.syncId,
        unsupportedExternalSystemMessage(payload.externalSystemType),
        helpers
      );
  }
};

export default syncContactOptOut;
