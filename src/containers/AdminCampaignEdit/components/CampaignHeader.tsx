import Divider from "@material-ui/core/Divider";
import type {
  CampaignBuilderMode,
  EditCampaignDataFragment
} from "@spoke/spoke-codegen";
import React from "react";

import CampaignHeaderNav from "./CampaignHeaderNav";
import CampaignStatusRow from "./CampaignStatusRow";

type Campaign = EditCampaignDataFragment;

export interface CampaignHeaderProps {
  campaign: Campaign;
  isAdmin: boolean;
  isCampaignReadyToStart: boolean;
  builderMode: CampaignBuilderMode;
  onBuilderModeChange: (mode: CampaignBuilderMode) => void;
  onSectionError: (message: string) => void;
  onNavigateToStats: () => void;
  prevCampaignClicked: (prevCampaignId: string) => void;
  nextCampaignClicked: (nextCampaignId: string) => void;
}

export const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaign,
  isAdmin,
  isCampaignReadyToStart,
  builderMode,
  onBuilderModeChange,
  onSectionError,
  onNavigateToStats,
  prevCampaignClicked,
  nextCampaignClicked
}) => {
  const { title, isTemplate } = campaign;

  return (
    <div
      style={{
        marginBottom: 15,
        fontSize: 16
      }}
    >
      {!isTemplate && (
        <>
          <CampaignHeaderNav
            campaignId={campaign.id}
            builderMode={builderMode}
            onBuilderModeChange={onBuilderModeChange}
            onNavigateToStats={onNavigateToStats}
            prevCampaignClicked={prevCampaignClicked}
            nextCampaignClicked={nextCampaignClicked}
          />

          <Divider style={{ marginTop: 20, marginBottom: 20 }} />
        </>
      )}
      {title && <h1> {title} </h1>}
      {!isTemplate && (
        <CampaignStatusRow
          campaign={campaign}
          isAdmin={isAdmin}
          isCampaignReadyToStart={isCampaignReadyToStart}
          onSectionError={onSectionError}
        />
      )}
    </div>
  );
};

export default CampaignHeader;
