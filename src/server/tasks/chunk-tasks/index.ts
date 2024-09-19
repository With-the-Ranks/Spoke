/* eslint-disable import/prefer-default-export */
import type { TaskList } from "graphile-worker";

import {
  exportCampaign,
  TASK_IDENTIFIER as EXPORT_CAMPAIGN_IDENTIFIER
} from "./export-campaign";

export const taskList: TaskList = {
  [EXPORT_CAMPAIGN_IDENTIFIER]: exportCampaign
};
