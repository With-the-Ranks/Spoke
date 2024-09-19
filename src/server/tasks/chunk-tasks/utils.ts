import { config } from "../../../config";
import { r } from "../../models";
import type { ProgressJobPayload, ProgressTaskHelpers } from "../utils";

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

export interface ChunkTaskPayload
  extends ProgressJobPayload,
    CampaignTitlePayload {
  requesterId: number;
}

export const getContactCount = async (campaignId: number) => {
  const [{ count }] = await r
    .reader("campaign_contact")
    .count()
    .where({ campaign_id: campaignId });
  return count as number;
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
 * @param filter a SQL condition to filter the contacts for the campaign_contact alias cc
 * (ex. cc.is_opted_out = true)
 * @returns campaign_contacts:
 * the CTE for the selected contacts which requires query params [campaignId, lastContactId, limit]
 */
export const getChunkedContactsCte = (filter?: string) => {
  return `
    with campaign_contacts as (
      select * from campaign_contact cc
      where campaign_id = ? and id > ?
      ${andSqlFilter(filter)}
      order by cc.id asc
      limit ?
    )`;
};

export interface ProcessChunksPayload {
  processChunk: (
    payload: ProcessChunkPayload
  ) => Promise<ContactTaskChunk | false>;
  operationName: string;
  chunkSize: number;
  campaignId: number;
  helpers: ProgressTaskHelpers;
  contactsCount: number;
  processedInitial?: number;
  statusDivider?: number;
  statusOffset?: number;
  writeResult?: (result: ContactTaskChunk) => void;
}

export const processChunks = async (payload: ProcessChunksPayload) => {
  const {
    processChunk,
    operationName,
    chunkSize,
    campaignId,
    helpers,
    contactsCount,
    statusDivider = 1,
    statusOffset = 0,
    writeResult
  } = payload;

  let lastContactId = 0;
  let processed = 0;
  let chunkResult;

  while (
    // eslint-disable-next-line no-cond-assign
    (chunkResult = await processChunk({ ...payload, lastContactId }))
  ) {
    lastContactId = chunkResult.lastContactId;
    helpers.logger.debug(
      `Processing ${operationName} for campaign ID ${campaignId} chunk part ${lastContactId}`
    );

    processed += chunkSize;
    const newStatus =
      Math.round((processed / contactsCount / statusDivider) * 100) +
      statusOffset;

    if (!config.isTest) await helpers.updateStatus(newStatus);
    if (writeResult) writeResult(chunkResult);
  }
};
