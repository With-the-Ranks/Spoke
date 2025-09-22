/* eslint-disable import/prefer-default-export */
import type { CampaignVariableInput } from "@spoke/spoke-codegen";

export const sortCampaignVariableInputs = (
  campaignVariables: CampaignVariableInput[]
) => {
  return campaignVariables.sort((cv1, cv2) => {
    if (cv1.displayOrder < cv2.displayOrder) return -1;
    if (cv1.displayOrder > cv2.displayOrder) return 1;
    return 0;
  });
};
