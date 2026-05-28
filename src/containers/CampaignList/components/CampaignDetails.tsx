import Chip from "@material-ui/core/Chip";
import { blue } from "@material-ui/core/colors";
import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import DescriptionOutlinedIcon from "@material-ui/icons/DescriptionOutlined";
import LocalOfferOutlinedIcon from "@material-ui/icons/LocalOfferOutlined";
import PeopleOutlineRoundedIcon from "@material-ui/icons/PeopleOutlineRounded";
import PersonOutlineRoundedIcon from "@material-ui/icons/PersonOutlineRounded";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import type {
  CampaignListEntryFragment,
  ExternalSystem
} from "@spoke/spoke-codegen";
import React from "react";

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    whiteSpace: "pre-wrap",
    alignItems: "center"
  },
  chip: {
    margin: "4px",
    padding: "4px",
    color: "#666666"
  }
});

interface CampaignDetailsProps {
  id: string;
  description: string;
  creatorName: string | null;
  hasUnassignedContacts: boolean | null | undefined;
  teams: CampaignListEntryFragment["teams"];
  campaignGroups: CampaignListEntryFragment["campaignGroups"];
  externalSystem: Pick<ExternalSystem, "name" | "type"> | null | undefined;
}

const CampaignDetails: React.FC<CampaignDetailsProps> = ({
  description,
  creatorName,
  hasUnassignedContacts,
  externalSystem,
  teams,
  campaignGroups
}) => {
  const classes = useStyles();

  const showExtraTags =
    (!window.ENABLE_AUTOSENDING && hasUnassignedContacts) || externalSystem;
  const showCampaignGroupsTags =
    campaignGroups?.edges && campaignGroups.edges?.length > 0;

  return (
    <>
      <div className={classes.wrapper}>
        {creatorName ? (
          <Tooltip title="Created by">
            <Chip
              icon={<PersonOutlineRoundedIcon fontSize="small" />}
              label={creatorName}
              className={classes.chip}
              variant="outlined"
            />
          </Tooltip>
        ) : null}
        {teams.length > 0 ? (
          <Tooltip title="Teams">
            <Chip
              icon={<PeopleOutlineRoundedIcon fontSize="small" />}
              label={teams
                .map((team: Record<string, unknown>) => team.title)
                .join(", ")}
              className={classes.chip}
              variant="outlined"
            />
          </Tooltip>
        ) : null}
        {showCampaignGroupsTags ? (
          <Tooltip title="Campaigns">
            <Chip
              icon={<RecordVoiceOverIcon fontSize="small" />}
              label={campaignGroups.edges
                .map(({ node }: { node: Record<string, unknown> }) => node.name)
                .join(", ")}
              className={classes.chip}
              variant="outlined"
            />
          </Tooltip>
        ) : null}
      </div>
      <div className={classes.chip}>
        <Tooltip title="Description" placement="bottom-start">
          <div className={classes.wrapper}>
            <DescriptionOutlinedIcon
              fontSize="small"
              style={{ marginRight: "4px" }}
            />
            {description}
          </div>
        </Tooltip>
      </div>
      {showExtraTags ? (
        <>
          <Divider component="li" />

          <div style={{ marginTop: "8px" }}>
            {hasUnassignedContacts ? (
              <Chip
                icon={<LocalOfferOutlinedIcon fontSize="small" />}
                label="Unassigned Contacts"
                className={classes.chip}
              />
            ) : null}
            {externalSystem ? (
              <Chip
                icon={<LocalOfferOutlinedIcon fontSize="small" />}
                label={`${externalSystem.type}: ${externalSystem.name}`}
                className={classes.chip}
                style={{ backgroundColor: blue[300] }}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
};

export default CampaignDetails;
