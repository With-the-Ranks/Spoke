import type {
  CampaignContactRecord,
  FilteredContactRecord,
  InteractionStepRecord,
  MessageRecord,
  UserRecord
} from "src/server/api/types";

import { config } from "../../../../config";
import type { KnownReturnProgressTask } from "../../utils";
import type {
  CampaignTitlePayload,
  ChunkTaskPayload,
  ContactTaskChunk,
  ProcessChunkPayload
} from "../utils";

export { errToObj } from "../../../utils";
export type { ProgressTask, ProgressTaskHelpers } from "../../utils";
export { addProgressJob } from "../../utils";
export type { ChunkTaskPayload, ProcessChunkTitlePayload } from "../utils";
export {
  getContactCount,
  getChunkedContactsCte,
  getNotificationEmail
} from "../utils";
export type { InteractionStepRecord };
export const TASK_IDENTIFIER = "export-campaign";
export const CHUNK_SIZE = config.EXPORT_CAMPAIGN_CHUNK_SIZE;

export interface ExportChunk extends ContactTaskChunk {
  data: { [key: string]: any }[];
}

interface ContactCityState {
  city: string;
  state: string;
}

export interface ContactExportRow
  extends CampaignContactRecord,
    ContactCityState {
  interaction_step_id: number;
  value: string;
  tag_titles: string;
}

export interface FilteredContactsRow
  extends FilteredContactRecord,
    ContactCityState {}

export interface MessageExportRow
  extends Pick<
      MessageRecord,
      | "campaign_contact_id"
      | "assignment_id"
      | "user_number"
      | "contact_number"
      | "is_from_contact"
      | "text"
      | "send_status"
      | "created_at"
      | "num_segments"
      | "num_media"
    >,
    Pick<UserRecord, "first_name" | "last_name" | "email"> {
  error_codes: string;
  user_cell: string;
  campaign_variables: Record<string, string>;
}

interface CampaignVariablePayload {
  campaignVariableNames: string[];
}

interface FilePayload {
  fileNameKey: string;
}

export type ExportCampaignTask<P extends FilePayload> = KnownReturnProgressTask<
  P,
  string
>;

interface UploadPayload
  extends Omit<ChunkTaskPayload, "requesterId">,
    FilePayload {
  contactsCount: number;
}

export interface UploadContactsPayload
  extends UploadPayload,
    CampaignTitlePayload {}

export interface UploadCampaignContacts extends UploadContactsPayload {
  campaignTitle: string;
  interactionSteps: InteractionStepRecord[];
  onlyOptOuts: boolean;
}

export interface ProcessMessagesChunkPayload
  extends ProcessChunkPayload,
    CampaignVariablePayload {}

export interface UploadCampaignMessages
  extends CampaignVariablePayload,
    UploadPayload {}

export const isFilteredContact = (
  contact: FilteredContactsRow | ContactExportRow
): contact is FilteredContactsRow => {
  return "filtered_reason" in contact;
};
