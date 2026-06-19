/* eslint-disable import/prefer-default-export */
import type { TaskList } from "graphile-worker";

import queueActionExternalSync, {
  TASK_IDENTIFIER as QUEUE_ACTION_EXTERNAL_SYNC_IDENTIFIER
} from "./queue-action-external-sync";
import syncContactOptOut, {
  TASK_IDENTIFIER as SYNC_CONTACT_OPT_OUT_IDENTIFIER
} from "./sync-contact-opt-out";
import syncContactQuestionResponse, {
  TASK_IDENTIFIER as SYNC_CONTACT_QUESTION_RESPONSE_IDENTIFIER
} from "./sync-contact-question-response";

export const taskList: TaskList = {
  [QUEUE_ACTION_EXTERNAL_SYNC_IDENTIFIER]: queueActionExternalSync,
  [SYNC_CONTACT_OPT_OUT_IDENTIFIER]: syncContactOptOut,
  [SYNC_CONTACT_QUESTION_RESPONSE_IDENTIFIER]: syncContactQuestionResponse
};
