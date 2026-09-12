import type {
  CampaignEditPendingJobFragment,
  EditCampaignDataFragment,
  OrganizationDataForCampaignEditFragment
} from "@spoke/spoke-codegen";
import { CampaignBuilderMode } from "@spoke/spoke-codegen";
import type { History } from "history";
import React, { useState } from "react";
import { Helmet } from "react-helmet";

import CampaignHeader from "./components/CampaignHeader";
import RequestErrorDialog from "./components/RequestErrorDialog";
import { getCampaignEditSections } from "./getCampaignEditSections";

type Campaign = EditCampaignDataFragment;
type Organization = OrganizationDataForCampaignEditFragment;
type PendingJob = CampaignEditPendingJobFragment;

export interface AdminCampaignEditViewProps {
  organizationId: string;
  campaignId: string;
  isAdmin: boolean;
  defaultCampaignBuilderMode?: CampaignBuilderMode | null;
  campaign: Campaign;
  organization: Organization;
  pendingJobs: PendingJob[];
  history: History;
}

export const AdminCampaignEditView: React.FC<AdminCampaignEditViewProps> = ({
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

  const allSections = getCampaignEditSections(campaign, organization);

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

  const saveLabel = "Save";
  const newTitle = `${organization.name} - Campaigns - ${campaignId}: ${campaign.title}`;

  return (
    <div>
      <Helmet>
        <title>{newTitle}</title>
      </Helmet>
      <CampaignHeader
        campaign={campaign}
        isAdmin={isAdmin}
        isCampaignReadyToStart={isCampaignReadyToStart()}
        builderMode={builderMode}
        onBuilderModeChange={setBuilderMode}
        onSectionError={handleSectionError}
        onNavigateToStats={handleNavigateToStats}
        prevCampaignClicked={prevCampaignClicked}
        nextCampaignClicked={nextCampaignClicked}
      />
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
      <RequestErrorDialog message={requestError} onClose={handleCloseError} />
    </div>
  );
};

export default AdminCampaignEditView;
