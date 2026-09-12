import type { EditCampaignDataFragment } from "@spoke/spoke-codegen";
import React from "react";

import theme from "../../../styles/theme";
import CampaignActionButtons from "./CampaignActionButtons";

type Campaign = EditCampaignDataFragment;

export interface CampaignStatusRowProps {
  campaign: Campaign;
  isAdmin: boolean;
  isCampaignReadyToStart: boolean;
  onSectionError: (message: string) => void;
}

export const CampaignStatusRow: React.FC<CampaignStatusRowProps> = ({
  campaign,
  isAdmin,
  isCampaignReadyToStart,
  onSectionError
}) => {
  const { isStarted } = campaign;

  const isCampaignReady = !isStarted && isCampaignReadyToStart;

  const statusText = isStarted
    ? "This campaign is running!"
    : isCampaignReady
    ? "Your campaign is all good to go!"
    : "You need to complete all the sections below before you can start this campaign";

  return (
    <div
      style={{
        ...theme.layouts.multiColumn.container
      }}
    >
      <div
        style={{
          ...theme.layouts.multiColumn.flexColumn,
          ...(isStarted && {
            color: theme.colors.green
          })
        }}
      >
        {statusText}
        {campaign.editors && (
          <div>This campaign is being edited by: {campaign.editors}</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <CampaignActionButtons
          campaign={campaign}
          isAdmin={isAdmin}
          isCampaignReady={isCampaignReady}
          onSectionError={onSectionError}
        />
      </div>
    </div>
  );
};

export default CampaignStatusRow;
