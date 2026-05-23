import { r } from "../../../models";
import type { ExportCampaignPayload } from "../export-campaign";
import { addProgressJob, TASK_IDENTIFIER } from "../export-campaign/utils";

export interface ExportMultipleCampaignsPayload {
  campaignIds: number[];
  requesterId: number;
  spokeOptions: ExportCampaignPayload["spokeOptions"];
}

export const addExportMultipleCampaigns = async (
  payload: ExportMultipleCampaignsPayload
) => {
  const { campaignIds, requesterId, spokeOptions } = payload;

  const campaigns = await r
    .reader("campaign")
    .select("id", "title")
    .whereIn("id", campaignIds);

  const campaignTitleById = Object.fromEntries(
    campaigns.map(({ id, title }) => [id, title])
  );

  const jobResults = [];
  for (const campaignId of campaignIds) {
    const jobPayload: ExportCampaignPayload = {
      campaignId,
      campaignTitle: campaignTitleById[campaignId] ?? "",
      requesterId,
      spokeOptions
    };

    const result = await addProgressJob({
      identifier: TASK_IDENTIFIER,
      payload: jobPayload,
      taskSpec: {
        queueName: "multiple-campaign-exports"
      }
    });

    jobResults.push(result);
  }
  return jobResults;
};
