/* eslint-disable import/prefer-default-export */
import type { TaskList } from "graphile-worker";

import {
  exportCampaign,
  TASK_IDENTIFIER as EXPORT_CAMPAIGN_IDENTIFIER
} from "./export-campaign";
import {
  markSecondPass,
  TASK_IDENTIFIER as MARK_SECOND_PASS_IDENTIFIER
} from "./mark-second-pass";

export const taskList: TaskList = {
  [EXPORT_CAMPAIGN_IDENTIFIER]: exportCampaign,
  [MARK_SECOND_PASS_IDENTIFIER]: markSecondPass
};
