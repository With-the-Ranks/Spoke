import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import Autocomplete from "@material-ui/lab/Autocomplete";
import type { Team } from "@spoke/spoke-codegen";
import {
  useEditCampaignTeamsMutation,
  useGetCampaignTeamsQuery,
  useGetOrganizationTeamsForCampaignEditQuery
} from "@spoke/spoke-codegen";
import isEqual from "lodash/isEqual";
import Toggle from "material-ui/Toggle";
import React, { useState } from "react";

import LoadingIndicator from "../../../components/LoadingIndicator";
import { PrettyErrors } from "../../hoc/with-operations";
import CampaignFormSectionHeading from "../components/CampaignFormSectionHeading";
import type { FullComponentProps } from "../components/SectionWrapper";
import { asSection } from "../components/SectionWrapper";

type TeamSelectOption = Pick<Team, "id" | "title">;

interface TeamsValues {
  teams: TeamSelectOption[];
  isAssignmentLimitedToTeams: boolean;
}

const useStyles = makeStyles({
  button: {
    display: "inline-block",
    marginTop: 15
  }
});

const sameTeams = (a: TeamSelectOption[], b: TeamSelectOption[]) =>
  isEqual(new Set(a.map((team) => team.id)), new Set(b.map((team) => team.id)));

const isOptionSelected = (option: TeamSelectOption, value: TeamSelectOption) =>
  option.id === value.id;

const CampaignTeamsForm: React.FC<FullComponentProps> = (props) => {
  const { campaignId, organizationId, onError } = props;
  const classes = useStyles();

  const {
    data,
    loading: campaignLoading,
    error: campaignError
  } = useGetCampaignTeamsQuery({ variables: { campaignId } });

  const {
    data: orgTeamsData,
    loading: orgTeamsLoading,
    error: orgTeamsError
  } = useGetOrganizationTeamsForCampaignEditQuery({
    variables: { organizationId }
  });

  const [editCampaignTeams] = useEditCampaignTeamsMutation();

  const [pendingValues, setPendingValues] = useState<TeamsValues | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  if (campaignLoading || orgTeamsLoading) return <LoadingIndicator />;

  const errors = [];
  if (campaignError) errors.push(campaignError);
  if (orgTeamsError) errors.push(orgTeamsError);

  if (errors.length > 0 || !data?.campaign) {
    return <PrettyErrors errors={errors} />;
  }

  const { campaign } = data;
  const rawOrgTeams = orgTeamsData?.organization?.teams ?? [];
  const orgTeams = rawOrgTeams.filter(
    (team): team is TeamSelectOption => team != null
  );

  const { teams, isAssignmentLimitedToTeams } = pendingValues || campaign;

  const onToggle = (_event: unknown, newAssignmentLimited: boolean) => {
    setPendingValues({
      teams,
      isAssignmentLimitedToTeams: newAssignmentLimited
    });
  };

  const handleTeamsChange = (_event: unknown, newTeams: TeamSelectOption[]) => {
    setPendingValues({
      teams: newTeams,
      isAssignmentLimitedToTeams:
        newTeams.length === 0 ? false : isAssignmentLimitedToTeams
    });
  };

  const handleSubmit = async () => {
    setIsWorking(true);
    try {
      const response = await editCampaignTeams({
        variables: {
          campaignId,
          payload: {
            teamIds: teams.map((team) => team.id),
            isAssignmentLimitedToTeams
          }
        }
      });

      if (response.errors) throw response.errors;
      setPendingValues(null);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setIsWorking(false);
    }
  };

  const hasPendingChanges =
    !sameTeams(teams, campaign.teams) ||
    isAssignmentLimitedToTeams !== campaign.isAssignmentLimitedToTeams;
  const isSaveDisabled = isWorking || !hasPendingChanges;
  const saveLabel = isWorking ? "Working..." : props.saveLabel;
  const teamsAdded = teams.length > 0;

  return (
    <div>
      <CampaignFormSectionHeading
        title="Teams for campaign"
        subtitle="Optionally prioritize assigning texters from specific teams for this campaign by selecting them below. Restrict assignment solely to members of selected teams by using the toggle below."
      />

      <Autocomplete
        multiple
        options={orgTeams}
        getOptionLabel={(team: TeamSelectOption) => team.title}
        value={teams}
        filterSelectedOptions
        onChange={handleTeamsChange}
        getOptionSelected={isOptionSelected}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            label="Select Teams"
            placeholder="Select Teams"
            name="select-teams-autocomplete"
          />
        )}
      />
      <br />

      <Tooltip
        title="Select a team in order to restrict assignments solely to members of those teams"
        disableFocusListener={teamsAdded}
        disableHoverListener={teamsAdded}
        disableTouchListener={teamsAdded}
        placement="top-start"
      >
        <span>
          <Toggle
            disabled={!teamsAdded}
            toggled={isAssignmentLimitedToTeams}
            label="Restrict assignment solely to members of these teams?"
            onToggle={onToggle}
          />
        </span>
      </Tooltip>
      <Button
        variant="contained"
        className={classes.button}
        disabled={isSaveDisabled}
        onClick={handleSubmit}
      >
        {saveLabel}
      </Button>
    </div>
  );
};

export default asSection({
  title: "Teams",
  jobQueueNames: [],
  expandAfterCampaignStarts: true,
  expandableBySuperVolunteers: false
})(CampaignTeamsForm);
