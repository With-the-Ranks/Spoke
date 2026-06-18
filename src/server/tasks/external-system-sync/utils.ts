import type { JobHelpers } from "graphile-worker";

import { r } from "../../models";

export const unsupportedActionTypeMessage = (actionType: string) =>
  `Unsupported action type: ${actionType}`;

export const unsupportedExternalSystemMessage = (systemType: string) =>
  `Unsupported external system type: ${systemType}`;

export const markSyncFailed = async (
  syncId: number,
  message: string,
  helpers: JobHelpers
) => {
  await r.knex("action_external_system_sync").where({ id: syncId }).update({
    sync_status: "SYNC_FAILED",
    sync_error: message
  });
  helpers.logger.error(message);
};
