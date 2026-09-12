import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { CampaignBuilderMode } from "@spoke/spoke-codegen";
import PropTypes from "prop-types";
import React from "react";
import { Helmet } from "react-helmet";
import { compose } from "recompose";

import { withSpokeContext } from "../../client/spoke-context";
import CampaignNavigation from "../../components/CampaignNavigation";
import theme from "../../styles/theme";
import { withAuthzContext } from "../AuthzProvider";
import { loadData } from "../hoc/with-operations";
import ApproveCampaignButton from "./components/ApproveCampaignButton";
import ArchiveCampaignButton from "./components/ArchiveCampaignButton";
import StartCampaignButton from "./components/StartCampaignButton";
import UnstartCampaignButton from "./components/UnstartCampaignButton";
import {
  GET_CAMPAIGN_JOBS,
  GET_EDIT_CAMPAIGN_DATA,
  GET_ORGANIZATION_DATA
} from "./queries";
import CampaignAutoassignModeForm from "./sections/CampaignAutoassignModeForm";
import CampaignBasicsForm from "./sections/CampaignBasicsForm";
import CampaignCannedResponsesForm from "./sections/CampaignCannedResponsesForm";
import CampaignContactsForm from "./sections/CampaignContactsForm";
import CampaignGroupsForm from "./sections/CampaignGroupsForm";
import CampaignIntegrationForm from "./sections/CampaignIntegrationForm";
import CampaignInteractionStepsForm from "./sections/CampaignInteractionStepsForm";
import CampaignMessagingServiceForm from "./sections/CampaignMessagingServiceForm";
import CampaignOverlapManager from "./sections/CampaignOverlapManager";
import CampaignTeamsForm from "./sections/CampaignTeamsForm";
import CampaignTextersForm from "./sections/CampaignTextersForm";
import CampaignTextingHoursForm from "./sections/CampaignTextingHoursForm";
import CampaignVariablesForm from "./sections/CampaignVariablesForm";

// Every section below manages its own state and saves through its own
// dedicated mutation (see e.g. CampaignBasicsForm, CampaignTeamsForm) -
// this container just renders them, tracks which one is expanded, and
// gates campaign-start readiness off checkCompleted()/campaignData.campaign.
class AdminCampaignEdit extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      requestError: undefined,
      builderMode: props.campaignData.campaign.isTemplate
        ? CampaignBuilderMode.Template
        : props.orgSettings.defaultCampaignBuilderMode
    };
  }

  onExpandChange = (index, newExpandedState) => {
    const { expandedSection } = this.state;

    if (newExpandedState) {
      this.setState({ expandedSection: index });
    } else if (index === expandedSection) {
      this.setState({ expandedSection: null });
    }
  };

  checkSectionCompleted = (section) => {
    return section.checkCompleted();
  };

  sections = () => {
    const sections = [
      {
        title: "Basics",
        content: CampaignBasicsForm,
        showForModes: [
          CampaignBuilderMode.Basic,
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        blocksStarting: true,
        checkCompleted: () =>
          this.props.campaignData.campaign.title !== "" &&
          this.props.campaignData.campaign.description !== ""
      },
      {
        title: "Campaign Groups",
        content: CampaignGroupsForm,
        showForModes: [
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        exclude: !window.ENABLE_CAMPAIGN_GROUPS,
        checkCompleted: () => true,
        blocksStarting: false
      },
      {
        title: "Messaging Service",
        content: CampaignMessagingServiceForm,
        showForModes: [CampaignBuilderMode.Advanced],
        checkCompleted: () => true,
        blocksStarting: true,
        exclude:
          this.props.organizationData?.organization?.messagingServices?.edges
            ?.length <= 1
      },
      {
        title: "Texting Hours",
        content: CampaignTextingHoursForm,
        showForModes: [CampaignBuilderMode.Advanced],
        checkCompleted: () => true,
        blocksStarting: false
      },
      {
        title: "Integration",
        content: CampaignIntegrationForm,
        showForModes: [
          CampaignBuilderMode.Basic,
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        checkCompleted: () => true,
        blocksStarting: false
      },
      {
        title: "Contacts",
        content: CampaignContactsForm,
        showForModes: [CampaignBuilderMode.Basic, CampaignBuilderMode.Advanced],
        checkCompleted: () =>
          this.props.campaignData.campaign.contactsCount > 0,
        blocksStarting: true
      },
      {
        title: "Contact Overlap Management",
        content: CampaignOverlapManager,
        showForModes: [CampaignBuilderMode.Advanced],
        checkCompleted: () => true,
        blocksStarting: false
      },
      {
        title: "Teams",
        content: CampaignTeamsForm,
        showForModes: [
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        checkCompleted: () => true,
        blocksStarting: false
      },
      {
        title: "Texters",
        content: CampaignTextersForm,
        showForModes: [CampaignBuilderMode.Advanced],
        checkCompleted: () =>
          this.props.campaignData.campaign.texters.length > 0 &&
          this.props.campaignData.campaign.contactsCount ===
            this.props.campaignData.campaign.texters.reduce(
              (left, right) => left + right.assignment.contactsCount,
              0
            ),
        blocksStarting: false
      },
      {
        title: "Campaign Variables",
        content: CampaignVariablesForm,
        showForModes: [
          CampaignBuilderMode.Basic,
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        checkCompleted: () => true,
        blocksStarting: false
      },
      {
        title: "Interactions",
        content: CampaignInteractionStepsForm,
        showForModes: [
          CampaignBuilderMode.Basic,
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        checkCompleted: () =>
          this.props.campaignData.campaign.readiness.interactions,
        blocksStarting: true
      },
      {
        title: "Canned Responses",
        content: CampaignCannedResponsesForm,
        showForModes: [
          CampaignBuilderMode.Advanced,
          CampaignBuilderMode.Template
        ],
        checkCompleted: () => true,
        blocksStarting: true
      },
      {
        title: "Autoassign Mode",
        content: CampaignAutoassignModeForm,
        showForModes: [CampaignBuilderMode.Basic, CampaignBuilderMode.Advanced],
        checkCompleted: () => true,
        blocksStarting: true
      }
    ];

    return sections.filter(
      (section) =>
        !section.exclude &&
        section.showForModes.includes(this.state.builderMode)
    );
  };

  prevCampaignClicked = (campaignId) => {
    const { history } = this.props;
    const { organizationId } = this.props.match.params;
    history.push(`/admin/${organizationId}/campaigns/${campaignId}/edit`);
  };

  nextCampaignClicked = (campaignId) => {
    const { history } = this.props;
    const { organizationId } = this.props.match.params;
    history.push(`/admin/${organizationId}/campaigns/${campaignId}/edit`);
  };

  renderCurrentEditors = () => {
    const { editors } = this.props.campaignData.campaign;
    if (editors) {
      return <div>This campaign is being edited by: {editors}</div>;
    }
    return "";
  };

  renderHeader = () => {
    const {
      campaign: { isStarted, title, isTemplate } = {}
    } = this.props.campaignData;

    const isCampaignReady = !isStarted && this.isCampaignReadyToStart();

    const statusText = isStarted
      ? "This campaign is running!"
      : isCampaignReady
      ? "Your campaign is all good to go!"
      : "You need to complete all the sections below before you can start this campaign";

    const header = (
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
          {this.renderCurrentEditors()}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {this.renderHeaderButtons(isCampaignReady)}
        </div>
      </div>
    );

    return (
      <div
        style={{
          marginBottom: 15,
          fontSize: 16
        }}
      >
        {!isTemplate && (
          <>
            <Grid container justifyContent="space-between">
              <Grid item>
                <Button
                  variant="contained"
                  onClick={this.handleNavigateToStats}
                >
                  Details
                </Button>
              </Grid>
              <Grid item>
                <FormControl style={{ width: 120 }}>
                  <InputLabel id="campaign-builder-mode-label">
                    Builder Mode
                  </InputLabel>
                  <Select
                    labelId="campaign-builder-mode-label"
                    id="campaign-builder-mode-select"
                    fullWidth
                    value={this.state.builderMode}
                    onChange={(event) => {
                      this.setState({ builderMode: event.target.value });
                    }}
                  >
                    <MenuItem value={CampaignBuilderMode.Basic}>Basic</MenuItem>
                    <MenuItem value={CampaignBuilderMode.Advanced}>
                      Advanced
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <CampaignNavigation
                  prevCampaignClicked={this.prevCampaignClicked}
                  nextCampaignClicked={this.nextCampaignClicked}
                  campaignId={this.props.campaignData.campaign.id}
                />
              </Grid>
            </Grid>

            <Divider style={{ marginTop: 20, marginBottom: 20 }} />
          </>
        )}
        {title && <h1> {title} </h1>}
        {!isTemplate && header}
      </div>
    );
  };

  isCampaignReadyToStart = () => {
    const { pendingJobsData } = this.props;

    let isCompleted =
      pendingJobsData.campaign.pendingJobs.filter((job) =>
        /Error/.test(job.resultMessage || "")
      ).length === 0;

    this.sections().forEach((section) => {
      if (section.blocksStarting && !this.checkSectionCompleted(section)) {
        isCompleted = false;
      }
    });

    return isCompleted;
  };

  renderHeaderButtons = (isCampaignReady) => {
    const { isAdmin, campaignData } = this.props;
    if (!isAdmin) return null;
    const { campaign } = campaignData;

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
              onError={this.handleSectionError}
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

  handleCloseError = () => this.setState({ requestError: undefined });

  handleSectionError = (requestError) => this.setState({ requestError });

  handleExpandChange = (sectionIndex) => (isExpended) =>
    this.onExpandChange(sectionIndex, isExpended);

  handleNavigateToStats = () => {
    const { organizationId, campaignId } = this.props.match.params;
    const statsUrl = `/admin/${organizationId}/campaigns/${campaignId}`;
    this.props.history.push(statsUrl);
  };

  render() {
    const sections = this.sections();
    const { expandedSection, requestError } = this.state;
    const { match } = this.props;
    const { campaignId } = match.params;
    const saveLabel = "Save";

    const errorActions = [
      <Button key="ok" color="primary" onClick={this.handleCloseError}>
        Ok
      </Button>
    ];

    const newTitle = `${this.props.organizationData.organization.name} - Campaigns - ${campaignId}: ${this.props.campaignData.campaign.title}`;

    return (
      <div>
        <Helmet>
          <title>{newTitle}</title>
        </Helmet>
        {this.renderHeader()}
        {sections.map((section, sectionIndex) => {
          const { content: Component } = section;
          return (
            <Component
              key={section.title}
              organizationId={match.params.organizationId}
              campaignId={campaignId}
              active={expandedSection === sectionIndex}
              saveLabel={saveLabel}
              onError={this.handleSectionError}
              onExpandChange={this.handleExpandChange(sectionIndex)}
            />
          );
        })}
        <Dialog
          title="Request Error"
          open={requestError !== undefined}
          onClose={this.handleCloseError}
        >
          <DialogTitle>Request Error</DialogTitle>
          <DialogContent>
            <DialogContentText>{requestError || ""}</DialogContentText>
          </DialogContent>
          <DialogActions>{errorActions}</DialogActions>
        </Dialog>
      </div>
    );
  }
}

AdminCampaignEdit.propTypes = {
  campaignData: PropTypes.object,
  organizationData: PropTypes.object,
  match: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  location: PropTypes.object,
  pendingJobsData: PropTypes.object,
  orgSettings: PropTypes.object
};

const queries = {
  pendingJobsData: {
    query: GET_CAMPAIGN_JOBS,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.match.params.campaignId
      },
      fetchPolicy: "cache-and-network"
    })
  },
  campaignData: {
    query: GET_EDIT_CAMPAIGN_DATA,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.match.params.campaignId
      },
      fetchPolicy: "cache-and-network"
    })
  },
  organizationData: {
    query: GET_ORGANIZATION_DATA,
    options: (ownProps) => ({
      variables: {
        organizationId: ownProps.match.params.organizationId
      }
    })
  }
};

export default compose(
  withSpokeContext,
  withAuthzContext,
  loadData({
    queries
  })
)(AdminCampaignEdit);
