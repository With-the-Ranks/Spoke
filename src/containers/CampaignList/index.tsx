import type { Campaign } from "@spoke/spoke-codegen";
import {
  ReleaseActionTarget,
  useDeleteNeedsMessageMutation,
  useGetAdminAssignmentTargetsQuery,
  useMarkForSecondPassMutation,
  useReleaseMessagesMutation,
  useSetCampaignArchivedMutation,
  useToggleAutoAssignMutation,
  useUnMarkForSecondPassMutation
} from "@spoke/spoke-codegen";
import type { GraphQLError } from "graphql";
import React, { useState } from "react";

import type { CampaignDetailsForExport } from "../../components/ExportMultipleCampaignDataDialog";
import AssignmentHUD from "./components/AssignmentHUD";
import CampaignListHeader from "./components/CampaignListHeader";
import CampaignListLoader from "./components/CampaignListLoader";
import { OperationDialog } from "./components/OperationDialog";
import type { Operation } from "./utils";
import {
  isDeleteNeedsMessage,
  isMarkForSecondPass,
  isReleaseUnrepliedMessages,
  isReleaseUnsentMessages,
  isUnMarkForSecondPass
} from "./utils";

export interface CampaignListProps {
  organizationId: string;
  pageSize: number;
  campaignsFilter: { isArchived: boolean; campaignTitle?: string };
  isAdmin: boolean;
  campaignDetailsForExport: CampaignDetailsForExport[];
  selectForExport: (details: CampaignDetailsForExport) => void;
  filterByCampaignTitle: (title: string) => void;
  handleClickExportButton: () => void;
}

export const CampaignList: React.FC<CampaignListProps> = (props) => {
  const [inProgress, setInProgress] = useState<Operation | undefined>(
    undefined
  );
  const [error, setError] = useState<GraphQLError | undefined>(undefined);
  const [finished, setFinished] = useState<string | undefined>(undefined);
  const [executing, setExecuting] = useState(false);

  const [setCampaignArchived] = useSetCampaignArchivedMutation();
  const toggleArchive = (
    campaignId: string,
    shouldArchive: boolean
  ) => async () => {
    await setCampaignArchived({
      variables: { campaignId, archived: shouldArchive }
    });
  };

  const [releaseMessages] = useReleaseMessagesMutation();
  const [deleteNeedsMessage] = useDeleteNeedsMessageMutation();
  const [markCampaign] = useMarkForSecondPassMutation();
  const [unmarkCampaign] = useUnMarkForSecondPassMutation();
  const [useToggleAutoAssign] = useToggleAutoAssignMutation();

  const toggleAutoAssign = (
    campaignId: string,
    enabled: boolean
  ) => async () => {
    await useToggleAutoAssign({
      variables: { campaignId, enabled }
    });
  };

  const start = (op: Operation) => () => setInProgress(op);

  const clearInProgress = () => {
    setInProgress(undefined);
    setError(undefined);
    setFinished(undefined);
    setExecuting(false);
  };

  const setStateAfterOperation = (
    result?: Partial<Campaign> | string | null,
    errors?: readonly GraphQLError[]
  ) => {
    if (errors) setError(errors[0]);
    else if (result) {
      const newFinished = typeof result === "string" ? result : "Done";
      setFinished(newFinished);
    }
    setExecuting(false);
  };

  const executeOperation = async () => {
    setExecuting(true);
    if (!inProgress) throw new Error("Operation was not set correctly");
    const { campaign } = inProgress;

    const isReleaseUnsent = isReleaseUnsentMessages(inProgress);
    const isReleaseUnreplied = isReleaseUnrepliedMessages(inProgress);

    // eslint-disable-next-line default-case
    switch (true) {
      case isReleaseUnsent || isReleaseUnreplied: {
        const target = isReleaseUnsent
          ? ReleaseActionTarget.Unsent
          : ReleaseActionTarget.Unreplied;
        const { data, errors } = await releaseMessages({
          variables: { campaignId: campaign.id, target }
        });

        setStateAfterOperation(data?.releaseMessages, errors);
        break;
      }
      case isDeleteNeedsMessage(inProgress): {
        const { data, errors } = await deleteNeedsMessage({
          variables: { campaignId: campaign.id }
        });
        setStateAfterOperation(data?.deleteNeedsMessage, errors);
        break;
      }
      case isMarkForSecondPass(inProgress): {
        const {
          excludeNewer,
          excludeRecentlyTexted,
          hours,
          days
        } = inProgress.payload;
        const { id: campaignId, title: campaignTitle } = campaign;
        const excludeAgeInHours = excludeRecentlyTexted
          ? (days || 0) * 24 + (hours || 0)
          : undefined;

        const { data, errors } = await markCampaign({
          variables: {
            campaignId,
            campaignTitle,
            input: {
              excludeNewer,
              excludeAgeInHours
            }
          }
        });

        setStateAfterOperation(data?.markForSecondPass, errors);
        break;
      }
      case isUnMarkForSecondPass(inProgress): {
        const { id: campaignId, title: campaignTitle } = campaign;
        const { data, errors } = await unmarkCampaign({
          variables: { campaignId, campaignTitle }
        });
        setStateAfterOperation(data?.unMarkForSecondPass, errors);
        break;
      }
    }
  };

  const setInProgressState = (newInProgress: Operation) => {
    setInProgress(newInProgress);
  };

  const {
    organizationId,
    pageSize,
    campaignsFilter,
    isAdmin,
    campaignDetailsForExport,
    selectForExport,
    filterByCampaignTitle,
    handleClickExportButton
  } = props;
  const { data } = useGetAdminAssignmentTargetsQuery({
    variables: { organizationId }
  });

  const targets = data?.organization?.currentAssignmentTargets;
  if (!targets) return null;
  return (
    <div>
      {inProgress && (
        <OperationDialog
          inProgress={inProgress}
          error={error}
          finished={finished}
          executing={executing}
          setInProgress={setInProgressState}
          clearInProgress={clearInProgress}
          executeOperation={executeOperation}
        />
      )}
      <AssignmentHUD assignmentTargets={targets} />
      <CampaignListHeader
        campaignDetailsForExport={campaignDetailsForExport}
        filterByCampaignTitle={filterByCampaignTitle}
        onClick={handleClickExportButton}
      />
      <CampaignListLoader
        organizationId={organizationId}
        campaignsFilter={campaignsFilter}
        pageSize={pageSize}
        isAdmin={isAdmin}
        startOperation={start}
        toggleArchive={toggleArchive}
        toggleAutoAssign={toggleAutoAssign}
        selectForExport={selectForExport}
        campaignDetailsForExport={campaignDetailsForExport}
      />
    </div>
  );
};

export default CampaignList;
