import type { EditCampaignDataFragment } from "@spoke/spoke-codegen";
import React from "react";

import ApproveCampaignButton from "./ApproveCampaignButton";
import ArchiveCampaignButton from "./ArchiveCampaignButton";
import StartCampaignButton from "./StartCampaignButton";
import UnstartCampaignButton from "./UnstartCampaignButton";

type Campaign = EditCampaignDataFragment;

export interface CampaignActionButtonsProps {
  campaign: Campaign;
  isAdmin: boolean;
  isCampaignReady: boolean;
  onSectionError: (message: string) => void;
}

export const CampaignActionButtons: React.FC<CampaignActionButtonsProps> = ({
  campaign,
  isAdmin,
  isCampaignReady,
  onSectionError
}) => {
  if (!isAdmin) return null;

  return (
    <>
      <ArchiveCampaignButton
        campaignId={campaign.id}
        isArchived={campaign.isArchived}
      />
      {campaign.isStarted ? (
        !campaign.hasSentMessages && (
          <UnstartCampaignButton
            campaignId={campaign.id}
            onError={onSectionError}
          />
        )
      ) : (
        <>
          <ApproveCampaignButton campaignId={campaign.id} />
          <StartCampaignButton
            campaignId={campaign.id}
            isCompleted={isCampaignReady}
          />
        </>
      )}
    </>
  );
};

export default CampaignActionButtons;
