import { Card } from "@material-ui/core";
import Checkbox from "@material-ui/core/Checkbox";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import type { CampaignListEntryFragment } from "@spoke/spoke-codegen";
import clsx from "clsx";
import React from "react";
import { useHistory } from "react-router-dom";

import type { CampaignDetailsForExport } from "../../../components/ExportMultipleCampaignDataDialog";
import type { CampaignOperationsProps } from "../utils";
import { makeCampaignHeaderTags } from "../utils";
import CampaignDetails from "./CampaignDetails";
import CampaignHeader from "./CampaignHeader";
import CampaignListMenu from "./CampaignListMenu";

const useStyles = makeStyles({
  card: {
    marginBottom: 16,
    cursor: "pointer"
  },
  archivedCard: {
    opacity: 0.6
  }
});

interface Props extends CampaignOperationsProps {
  organizationId: string;
  isAdmin: boolean;
  campaign: CampaignListEntryFragment;
  campaignDetailsForExport: CampaignDetailsForExport[];
  selectForExport: (details: CampaignDetailsForExport) => void;
}

export const CampaignListRow: React.FC<Props> = (props) => {
  const history = useHistory();
  const {
    organizationId,
    isAdmin,
    campaign,
    campaignDetailsForExport,
    selectForExport
  } = props;
  const {
    isStarted,
    isArchived,
    isAutoassignEnabled,
    hasUnassignedContacts,
    hasUnsentInitialMessages,
    hasUnhandledMessages,
    teams,
    campaignGroups,
    externalSystem
  } = campaign;

  const classes = useStyles();

  const creatorName = campaign.creator ? campaign.creator.displayName : null;

  const headerTags = makeCampaignHeaderTags({
    isStarted,
    hasUnassignedContacts,
    hasUnsentInitialMessages,
    hasUnhandledMessages
  });

  const isCampaignSelected = !!campaignDetailsForExport.find(
    (selectedCampaign: CampaignDetailsForExport) =>
      selectedCampaign.id === campaign.id
  );

  const campaignUrl = `/admin/${organizationId}/campaigns/${campaign.id}${
    isStarted ? "" : "/edit"
  }`;

  const isAutoAssignEligible = !!(
    isStarted &&
    !isArchived &&
    isAutoassignEnabled
  );

  return (
    <Card
      variant="outlined"
      className={clsx(classes.card, isArchived && classes.archivedCard)}
      onClick={() => history.push(campaignUrl)}
    >
      <ListItem alignItems="flex-start">
        <ListItemIcon onClick={(e) => e.stopPropagation()}>
          <Checkbox
            edge="start"
            checked={isCampaignSelected}
            tabIndex={-1}
            disableRipple
            onClick={() =>
              selectForExport({ id: campaign.id, title: campaign.title })
            }
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <CampaignHeader
              campaignTitle={campaign.title}
              campaignId={campaign.id}
              tags={headerTags}
            />
          }
          secondary={
            <CampaignDetails
              id={campaign.id}
              description={campaign.description}
              creatorName={creatorName}
              teams={teams}
              campaignGroups={campaignGroups}
              externalSystem={externalSystem}
              isAutoAssignEligible={isAutoAssignEligible}
            />
          }
          secondaryTypographyProps={{ color: "textPrimary" }}
        />
        {isAdmin && (
          <ListItemSecondaryAction onClick={(e) => e.stopPropagation()}>
            <CampaignListMenu
              campaign={campaign}
              startOperation={props.startOperation}
              archiveCampaign={props.archiveCampaign}
              unarchiveCampaign={props.unarchiveCampaign}
            />
          </ListItemSecondaryAction>
        )}
      </ListItem>
    </Card>
  );
};

export default CampaignListRow;
