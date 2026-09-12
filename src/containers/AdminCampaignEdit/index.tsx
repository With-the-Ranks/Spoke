import type { ApolloError } from "@apollo/client";
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
import type {
  CampaignEditPendingJobFragment,
  EditCampaignDataFragment,
  OrganizationDataForCampaignEditFragment
} from "@spoke/spoke-codegen";
import {
  CampaignBuilderMode,
  useGetCampaignEditJobsQuery,
  useGetEditCampaignDataQuery,
  useGetOrganizationDataForCampaignEditQuery
} from "@spoke/spoke-codegen";
import type { History } from "history";
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useHistory, useParams } from "react-router-dom";

import { useSpokeContext } from "../../client/spoke-context";
import CampaignNavigation from "../../components/CampaignNavigation";
import LoadingIndicator from "../../components/LoadingIndicator";
import theme from "../../styles/theme";
import { useAuthzContext } from "../AuthzProvider";
import { isOrganizationsPermissionError } from "../hoc/utils";
import { PrettyErrors } from "../hoc/with-operations";
import ApproveCampaignButton from "./components/ApproveCampaignButton";
import ArchiveCampaignButton from "./components/ArchiveCampaignButton";
import StartCampaignButton from "./components/StartCampaignButton";
import UnstartCampaignButton from "./components/UnstartCampaignButton";
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

type Campaign = EditCampaignDataFragment;
type Organization = OrganizationDataForCampaignEditFragment;
type PendingJob = CampaignEditPendingJobFragment;

interface CampaignEditSection {
  title: string;
  // Typed `any` (not ComponentType<any>): each wrapped section exports a
  // class with static `propTypes` whose ValidationMap isn't structurally
  // assignable to ComponentType<any>'s WeakValidationMap<any> - a known
  // prop-types/generics variance quirk, unrelated to the props themselves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  showForModes?: CampaignBuilderMode[];
  exclude?: boolean;
  blocksStarting?: boolean;
  checkCompleted?: () => boolean;
}

interface AdminCampaignEditViewProps {
  organizationId: string;
  campaignId: string;
  isAdmin: boolean;
  defaultCampaignBuilderMode?: CampaignBuilderMode | null;
  campaign: Campaign;
  organization: Organization;
  pendingJobs: PendingJob[];
  history: History;
}

const AdminCampaignEditView: React.FC<AdminCampaignEditViewProps> = ({
  organizationId,
  campaignId,
  isAdmin,
  defaultCampaignBuilderMode,
  campaign,
  organization,
  pendingJobs,
  history
}) => {
  const [builderMode, setBuilderMode] = useState<CampaignBuilderMode>(
    () =>
      (campaign.isTemplate
        ? CampaignBuilderMode.Template
        : defaultCampaignBuilderMode) || CampaignBuilderMode.Basic
  );
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [requestError, setRequestError] = useState<string | undefined>(
    undefined
  );

  const onExpandChange = (index: number, shouldExpand: boolean) => {
    if (shouldExpand) {
      setExpandedSection(index);
    } else if (index === expandedSection) {
      setExpandedSection(null);
    }
  };

  const handleExpandChange = (sectionIndex: number) => (
    shouldExpand: boolean
  ) => onExpandChange(sectionIndex, shouldExpand);

  const handleSectionError = (message: string) => setRequestError(message);
  const handleCloseError = () => setRequestError(undefined);

  const prevCampaignClicked = (prevCampaignId: string) => {
    history.push(`/admin/${organizationId}/campaigns/${prevCampaignId}/edit`);
  };

  const nextCampaignClicked = (nextCampaignId: string) => {
    history.push(`/admin/${organizationId}/campaigns/${nextCampaignId}/edit`);
  };

  const handleNavigateToStats = () => {
    history.push(`/admin/${organizationId}/campaigns/${campaignId}`);
  };

  const allSections: CampaignEditSection[] = [
    {
      title: "Basics",
      content: CampaignBasicsForm,
      blocksStarting: true,
      checkCompleted: () => campaign.title !== "" && campaign.description !== ""
    },
    {
      title: "Campaign Groups",
      content: CampaignGroupsForm,
      showForModes: [
        CampaignBuilderMode.Advanced,
        CampaignBuilderMode.Template
      ],
      exclude: !window.ENABLE_CAMPAIGN_GROUPS
    },
    {
      title: "Messaging Service",
      content: CampaignMessagingServiceForm,
      showForModes: [CampaignBuilderMode.Advanced],
      blocksStarting: true,
      exclude: (organization.messagingServices?.edges?.length || 0) <= 1
    },
    {
      title: "Texting Hours",
      content: CampaignTextingHoursForm,
      showForModes: [CampaignBuilderMode.Advanced]
    },
    {
      title: "Integration",
      content: CampaignIntegrationForm
    },
    {
      title: "Contacts",
      content: CampaignContactsForm,
      showForModes: [CampaignBuilderMode.Basic, CampaignBuilderMode.Advanced],
      checkCompleted: () => campaign.contactsCount > 0,
      blocksStarting: true
    },
    {
      title: "Contact Overlap Management",
      content: CampaignOverlapManager,
      showForModes: [CampaignBuilderMode.Advanced]
    },
    {
      title: "Teams",
      content: CampaignTeamsForm,
      showForModes: [CampaignBuilderMode.Advanced, CampaignBuilderMode.Template]
    },
    {
      title: "Texters",
      content: CampaignTextersForm,
      showForModes: [CampaignBuilderMode.Advanced]
    },
    {
      title: "Campaign Variables",
      content: CampaignVariablesForm
    },
    {
      title: "Interactions",
      content: CampaignInteractionStepsForm,
      checkCompleted: () => campaign.readiness.interactions,
      blocksStarting: true
    },
    {
      title: "Canned Responses",
      content: CampaignCannedResponsesForm,
      showForModes: [
        CampaignBuilderMode.Advanced,
        CampaignBuilderMode.Template
      ],
      blocksStarting: true
    },
    {
      title: "Autoassign Mode",
      content: CampaignAutoassignModeForm,
      showForModes: [CampaignBuilderMode.Basic, CampaignBuilderMode.Advanced],
      blocksStarting: true
    }
  ];

  const sections = allSections.filter(
    (section) =>
      !section.exclude &&
      (!section.showForModes || section.showForModes.includes(builderMode))
  );

  const isCampaignReadyToStart = () => {
    const hasErroredJob = pendingJobs.some((job) =>
      /Error/.test(job.resultMessage || "")
    );
    if (hasErroredJob) return false;

    return sections.every(
      (section) =>
        !section.blocksStarting || (section.checkCompleted?.() ?? true)
    );
  };

  const renderCurrentEditors = () => {
    if (campaign.editors) {
      return <div>This campaign is being edited by: {campaign.editors}</div>;
    }
    return "";
  };

  const renderHeaderButtons = (isCampaignReady: boolean) => {
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
              onError={handleSectionError}
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

  const renderHeader = () => {
    const { isStarted, title, isTemplate } = campaign;

    const isCampaignReady = !isStarted && isCampaignReadyToStart();

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
          {renderCurrentEditors()}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {renderHeaderButtons(isCampaignReady)}
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
                <Button variant="contained" onClick={handleNavigateToStats}>
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
                    value={builderMode}
                    onChange={(event) => {
                      setBuilderMode(event.target.value as CampaignBuilderMode);
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
                  prevCampaignClicked={prevCampaignClicked}
                  nextCampaignClicked={nextCampaignClicked}
                  campaignId={campaign.id}
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

  const saveLabel = "Save";
  const newTitle = `${organization.name} - Campaigns - ${campaignId}: ${campaign.title}`;

  return (
    <div>
      <Helmet>
        <title>{newTitle}</title>
      </Helmet>
      {renderHeader()}
      {sections.map((section, sectionIndex) => {
        const { content: Component } = section;
        return (
          <Component
            key={section.title}
            organizationId={organizationId}
            campaignId={campaignId}
            active={expandedSection === sectionIndex}
            saveLabel={saveLabel}
            onError={handleSectionError}
            onExpandChange={handleExpandChange(sectionIndex)}
          />
        );
      })}
      <Dialog
        title="Request Error"
        open={requestError !== undefined}
        onClose={handleCloseError}
      >
        <DialogTitle>Request Error</DialogTitle>
        <DialogContent>
          <DialogContentText>{requestError || ""}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button key="ok" color="primary" onClick={handleCloseError}>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const AdminCampaignEdit: React.FC = () => {
  const { organizationId, campaignId } = useParams<{
    organizationId: string;
    campaignId: string;
  }>();

  const history = useHistory();
  const { orgSettings } = useSpokeContext();
  const { isAdmin } = useAuthzContext();

  const {
    data: campaignData,
    loading: campaignLoading,
    error: campaignError
  } = useGetEditCampaignDataQuery({
    variables: { campaignId },
    fetchPolicy: "cache-and-network"
  });

  const {
    data: organizationData,
    loading: organizationLoading,
    error: organizationError
  } = useGetOrganizationDataForCampaignEditQuery({
    variables: { organizationId }
  });

  const {
    data: pendingJobsData,
    loading: pendingJobsLoading,
    error: pendingJobsError
  } = useGetCampaignEditJobsQuery({
    variables: { campaignId },
    fetchPolicy: "cache-and-network"
  });

  if (campaignLoading || organizationLoading || pendingJobsLoading) {
    return <LoadingIndicator />;
  }

  const errors = [
    campaignError,
    organizationError,
    pendingJobsError
  ].filter((error): error is ApolloError => Boolean(error));

  if (
    errors.length > 0 &&
    !isOrganizationsPermissionError(errors[0].graphQLErrors[0])
  ) {
    return <PrettyErrors errors={errors} />;
  }

  const campaign = campaignData?.campaign;
  const organization = organizationData?.organization;
  const pendingJobs = pendingJobsData?.campaign?.pendingJobs;

  if (!campaign || !organization || !pendingJobs) {
    return null;
  }

  return (
    <AdminCampaignEditView
      organizationId={organizationId}
      campaignId={campaignId}
      isAdmin={isAdmin}
      defaultCampaignBuilderMode={orgSettings?.defaultCampaignBuilderMode}
      campaign={campaign}
      organization={organization}
      pendingJobs={pendingJobs}
      history={history}
    />
  );
};

export default AdminCampaignEdit;
