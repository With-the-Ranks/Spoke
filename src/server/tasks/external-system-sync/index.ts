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
import syncDialerOptOut, {
  TASK_IDENTIFIER as SYNC_DIALER_OPT_OUT_IDENTIFIER
} from "./sync-dialer-opt-out";
import syncDialerQuestionResponse, {
  TASK_IDENTIFIER as SYNC_DIALER_QUESTION_RESPONSE_IDENTIFIER
} from "./sync-dialer-question-response";

// eslint-disable-next-line import/prefer-default-export
export const taskList: TaskList = {
  [QUEUE_ACTION_EXTERNAL_SYNC_IDENTIFIER]: queueActionExternalSync,
  [SYNC_CONTACT_OPT_OUT_IDENTIFIER]: syncContactOptOut,
  [SYNC_CONTACT_QUESTION_RESPONSE_IDENTIFIER]: syncContactQuestionResponse,
  [SYNC_DIALER_OPT_OUT_IDENTIFIER]: syncDialerOptOut,
  [SYNC_DIALER_QUESTION_RESPONSE_IDENTIFIER]: syncDialerQuestionResponse
};
