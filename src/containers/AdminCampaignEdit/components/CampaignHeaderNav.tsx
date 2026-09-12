import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import type { CampaignBuilderMode } from "@spoke/spoke-codegen";
import React from "react";

import CampaignNavigation from "../../../components/CampaignNavigation";
import BuilderModeSelect from "./BuilderModeSelect";

export interface CampaignHeaderNavProps {
  campaignId: string;
  builderMode: CampaignBuilderMode;
  onBuilderModeChange: (mode: CampaignBuilderMode) => void;
  onNavigateToStats: () => void;
  prevCampaignClicked: (prevCampaignId: string) => void;
  nextCampaignClicked: (nextCampaignId: string) => void;
}

export const CampaignHeaderNav: React.FC<CampaignHeaderNavProps> = ({
  campaignId,
  builderMode,
  onBuilderModeChange,
  onNavigateToStats,
  prevCampaignClicked,
  nextCampaignClicked
}) => (
  <Grid container justifyContent="space-between">
    <Grid item>
      <Button variant="contained" onClick={onNavigateToStats}>
        Details
      </Button>
    </Grid>
    <Grid item>
      <BuilderModeSelect
        builderMode={builderMode}
        onBuilderModeChange={onBuilderModeChange}
      />
    </Grid>
    <Grid item>
      <CampaignNavigation
        prevCampaignClicked={prevCampaignClicked}
        nextCampaignClicked={nextCampaignClicked}
        campaignId={campaignId}
      />
    </Grid>
  </Grid>
);

export default CampaignHeaderNav;
