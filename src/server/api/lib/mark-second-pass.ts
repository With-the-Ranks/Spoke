/* eslint-disable import/prefer-default-export */
import type { User } from "@spoke/spoke-codegen";
import { r } from "src/server/models";

import { accessRequired } from "../errors";

export const getSecondPassCampaign = async (campaignId: number, user: User) => {
  // verify permissions
  const campaign = await r
    .knex("campaign")
    .where({ id: campaignId })
    .first(["organization_id", "is_archived", "autosend_status"]);

  const organizationId = campaign.organization_id;
  await accessRequired(user, organizationId, "ADMIN", true);
  return campaign;
};
