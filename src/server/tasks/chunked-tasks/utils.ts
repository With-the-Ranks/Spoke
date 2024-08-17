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

export interface ChunkTaskPayload extends ProgressJobPayload {
  requesterId: number;
}

export const getContactCount = async (campaignId: number) => {
  const [{ count }] = await r
    .reader("campaign_contact")
    .count()
    .where({ campaign_id: campaignId });
  return count as number;
};

export const getCampaignTitle = async (campaignId: number) => {
  const { title } = await r
    .reader("campaign")
    .first("title")
    .where({ id: campaignId });
  return title;
};

export const getNotificationEmail = async (requesterId: number) => {
  const { email } = await r
    .reader("user")
    .first("email")
    .where({ id: requesterId });
  return email;
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
