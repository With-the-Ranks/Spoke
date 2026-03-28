import type { JobHelpers } from "graphile-worker";

export enum ActionType {
  QuestionReponse = "question_response",
  OptOut = "opt_out"
}

export enum AutosendingControlsMode {
  Basic = "BASIC",
  Detailed = "DETAILED"
}

export enum AutosendStatus {
  Unstarted = "unstarted",
  Sending = "sending",
  Paused = "paused",
  Complete = "complete"
}

export enum DeactivateMode {
  Deleteall = "DELETEALL",
  Nosuspend = "NOSUSPEND",
  Suspendall = "SUSPENDALL"
}

export enum ExternalDataCollectionStatus {
  Active = "active",
  Archived = "archived",
  Inactive = "inactive"
}

export enum ExternalSystemType {
  Van = "van",
  Dummy = "dummy"
}

export enum FilteredContactReason {
  Invalid = "INVALID",
  Landline = "LANDLINE",
  VOIP = "VOIP",
  OptedOut = "OPTEDOUT"
}

export enum MessageSendStatus {
  Queued = "QUEUED",
  Sending = "SENDING",
  Sent = "SENT",
  Delivered = "DELIVERED",
  Error = "ERROR",
  Paused = "PAUSED",
  NotAttempted = "NOT_ATTEMPTED"
}

export enum MessageStatusType {
  NeedsMessage = "needsMessage",
  NeedsResponse = "needsResponse",
  Conversation = "convo",
  Messaged = "messaged",
  Closed = "closed"
}

export enum MessagingServiceType {
  AssembleNumbers = "assemble-numbers",
  Twilio = "twilio"
}

export enum NotificationTypes {
  AssignmentCreated = "AssignmentCreated",
  AssignmentUpdated = "AssignmentUpdated",
  AssignmentMessageReceived = "AssignmentMessageReceived"
}

export interface AssignmentRecord {
  id: number;
  user_id: number;
  campaign_id: number;
  created_at: string;
  max_contacts: number | null;
  updated_at: string;
}

export interface CampaignContactRecord {
  id: number;
  campaign_id: number;
  assignment_id: number | null;
  external_id: string;
  first_name: string;
  last_name: string;
  cell: string;
  zip: string;
  custom_fields: string;
  created_at: string;
  updated_at: string;
  message_status: MessageStatusType;
  is_opted_out: boolean;
  timezone: string;
  archived: boolean;
}

export interface CampaignRecord {
  id: number;
  organization_id: number;
  title: string;
  description: string;
  is_approved: boolean;
  is_started: boolean | null;
  is_template: boolean;
  due_by: string | null;
  created_at: string;
  is_archived: boolean | null;
  logo_image_url: string | null;
  intro_html: string | null;
  primary_color: string | null;
  texting_hours_start: number;
  texting_hours_end: number;
  timezone: string;
  creator_id: number | null;
  is_autoassign_enabled: boolean;
  limit_assignment_to_teams: boolean;
  updated_at: string;
  replies_stale_after_minutes: number | null;
  landlines_filtered: boolean;
  external_system_id: string | null;
  autosend_status: AutosendStatus;
  autosend_user_id: number;
  messaging_service_sid: string | null;
  column_mapping: string | null;
}

export interface CampaignVariableRecord {
  id: number;
  campaign_id: number;
  display_order: number;
  name: string;
  value: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CannedResponseRecord {
  id: number;
  campaign_id: number;
  text: string;
  title: string;
  user_id?: number | null;
  created_at: Date;
  updated_at?: Date | null;
}

export interface ExternalResultCodeRecord {
  id: string;
  system_id: string;
  external_id: number;
  name: string | null;
  medium_name: string | null;
  short_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalSystem {
  queueQuestionResponse(
    payload: Record<string, any>,
    helpers: JobHelpers
  ): Promise<void>;
  queueOptOut(payload: Record<string, any>, helpers: JobHelpers): Promise<void>;
  syncQuestionResponse(
    payload: Record<string, any>,
    helpers: JobHelpers
  ): Promise<void>;
  syncOptOut(payload: Record<string, any>, helpers: JobHelpers): Promise<void>;
}

export interface ExternalSystemRecord {
  id: string;
  name: string;
  type: string;
  api_key_ref: string;
  organization_id: number;
  username: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface FilteredContactRecord {
  id: number;
  campaign_id: number;
  external_id: string;
  first_name: string;
  last_name: string;
  cell: string;
  zip: string;
  custom_fields: string;
  created_at: string;
  updated_at: string;
  timezone: string;
  filtered_reason: boolean;
}

export interface InteractionStepRecord {
  id: number;
  campaign_id: number;
  parent_interaction_id: number | null;
  question: string;
  answer_option: string;
  answer_actions: string;
  is_deleted: boolean;
  script_options: string[];
  created_at: string;
  updated_at: string;
}

export interface JobRequestRecord {
  id: number;
  campaign_id: number;
  payload: string;
  queue_name: string;
  job_type: string;
  result_message: string;
  locks_queue: boolean;
  assigned: boolean;
  status: number;
  updated_at: string;
  created_at: string;
}

export interface LogRecord {
  id: number;
  message_sid: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  service_type: MessagingServiceType | null;
}

export interface MessageRecord {
  id: number;
  user_number: string;
  user_id: number | null;
  contact_number: string;
  is_from_contact: boolean;
  text: string;
  service_response: string;
  assignment_id: number;
  service: string;
  service_id: string;
  send_status: MessageSendStatus;
  created_at: string;
  queued_at: string;
  sent_at: string;
  service_response_at: string;
  send_before: string;
  campaign_contact_id: number;
  updated_at: string;
  script_version_hash: string;
  num_segments: number;
  num_media: number;
  error_codes: string[] | null;
}

export interface MessagingServiceRecord {
  messaging_service_sid: string;
  organization_id: number;
  account_sid: string;
  encrypted_auth_token: string;
  updated_at: Date;
  service_type: MessagingServiceType;
}

export interface NotificationRecord {
  id: number;
  user_id: number;
  organization_id?: number | null;
  campaign_id?: number | null;
  sent_at?: Date | null;
}

export interface OrganizationRecord {
  id: number;
  uuid: string | null;
  name: string;
  created_at: string;
  features: string;
  texting_hours_enforced: boolean;
  texting_hours_start: number;
  texting_hours_end: number;
  updated_at: string;
}

export interface QuestionResponseRecord {
  id: number;
  campaign_contact_id: number;
  interaction_step_id: number;
  value: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface RelayPageArgs {
  after: string | null;
  first: number | null;
}

export interface TagRecord {
  id: number;
  organization_id: number;
  title: string;
  description: string;
  text_color: string;
  background_color: string;
  author_id: string;
  confirmation_steps: Array<string>;
  on_apply_script: string;
  webhook_url: string;
  is_assignable: string;
  is_system: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

export interface TeamRecord {
  id: number;
  organization_id: number;
  title: string;
  description: string;
  text_color: string;
  background_color: string;
  assignment_priority: number | null;
  author_id: number | null;
  created_at: string;
  is_assignment_enabled: boolean;
  assignment_type: string | null;
  max_request_count: number | null;
  updated_at: string;
}

export interface UserRecord {
  id: number;
  auth0_id: string;
  first_name: string;
  last_name: string;
  cell: string;
  email: string;
  created_at: string;
  assigned_cell: string | null;
  is_superadmin: boolean | null;
  terms: boolean;
  updated_at: string;
  is_suspended: boolean;
}

export interface UserTeamRecord {
  id: number;
  user_id: number | null;
  team_id: number | null;
  created_at: string;
  updated_at: string | null;
}
