import { config } from "../../../../config";
import type { ChunkTaskPayload, ProcessChunkPayload } from "../utils";

export type { ProgressTask } from "../../utils";
export { addProgressJob } from "../../utils";
export {
  getChunkedContactsCte,
  getContactCount,
  getNotificationEmail
} from "../utils";

export const TASK_IDENTIFIER = "mark-second-pass";
export const CHUNK_SIZE = config.MARK_SECOND_PASS_CHUNK_SIZE;

export interface SecondPassOptions {
  unmark?: boolean;
  excludeNewer?: boolean;
  excludeAgeInHours?: number;
}

export interface MarkSecondPassPayload
  extends SecondPassOptions,
    ChunkTaskPayload {
  organizationId: number;
}

export interface ProcessSecondPassChunkPayload
  extends ProcessChunkPayload,
    SecondPassOptions {}
