import { r } from "../../models";
import type { ProgressJobPayload } from "../utils";

export interface ContactTaskChunk {
  lastContactId: number;
}

export interface CampaignTitlePayload {
  campaignTitle: string;
}

export interface ProcessChunkPayload
  extends ProgressJobPayload,
    ContactTaskChunk {}

export interface ProcessChunkTitlePayload
  extends ProcessChunkPayload,
    CampaignTitlePayload {}

export interface ContactsCountPayload {
  contactsCount: number;
}

export interface ChunkTaskPayload
  extends ProgressJobPayload,
    ContactsCountPayload {
  requesterId: number;
}

export interface ChunkTaskTitlePayload
  extends ChunkTaskPayload,
    CampaignTitlePayload {}

export const getNotificationEmail = async (requesterId: number) => {
  const { email: notificationEmail } = await r
    .reader("user")
    .first("email")
    .where({ id: requesterId });
  return notificationEmail;
};

/**
 *
 * @param filter a SQL condition to filter the contacts (ex. is_opted_out = true)
 * @returns the condition prepended with "and" if it is defined and an empty string otherwise
 */
export const andSqlFilter = (filter?: string) =>
  filter ? `and ${filter}` : "";

/**
 * Fetch a chunk of contacts for the campaign
 * @param filter a SQL condition to filter the contacts (ex. is_opted_out = true)
 * @returns CTE for the selected contacts which requires query params [campaignId, lastContactId, limit]
 */
export const getChunkedContactsCte = (filter?: string) => {
  return `
    with campaign_contacts as (
      select * from campaign_contact
      where campaign_id = ? and id > ?
      ${andSqlFilter(filter)}
      order by campaign_contact.id asc
      limit ?
    )`;
};
