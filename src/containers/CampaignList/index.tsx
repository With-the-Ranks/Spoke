import type { Campaign } from "@spoke/spoke-codegen";
import {
  ReleaseActionTarget,
  useArchiveCampaignMutation,
  useDeleteNeedsMessageMutation,
  useGetAdminAssignmentTargetsQuery,
  useMarkForSecondPassMutation,
  useReleaseMessagesMutation,
  useToggleAutoAssignMutation,
  useUnarchiveCampaignMutation,
  useUnMarkForSecondPassMutation
} from "@spoke/spoke-codegen";
import type { GraphQLError } from "graphql";
import React, { useState } from "react";

import AssignmentHUD from "./components/AssignmentHUD";
import CampaignListLoader from "./components/CampaignListLoader";
import { OperationDialog } from "./components/OperationDialog";
import type { Operation } from "./utils";
import {
  isArchiveCampaign,
  isDeleteNeedsMessage,
  isMarkForSecondPass,
  isReleaseUnrepliedMessages,
  isReleaseUnsentMessages,
  isTurnAutoAssignOff,
  isTurnAutoAssignOn,
  isUnarchiveCampaign,
  isUnMarkForSecondPass
} from "./utils";

export interface CampaignListProps {
  organizationId: string;
  pageSize: number;
  campaignsFilter: { isArchived: boolean };
  isAdmin: boolean;
}

export const CampaignList: React.FC<CampaignListProps> = (props) => {
  const [inProgress, setInProgress] = useState<Operation | undefined>(
    undefined
  );
  const [error, setError] = useState<GraphQLError | undefined>(undefined);
  const [finished, setFinished] = useState<string | undefined>(undefined);
  const [executing, setExecuting] = useState(false);

  const [useArchiveCampaign] = useArchiveCampaignMutation();
  const archiveCampaign = (campaignId: string) => async () => {
    await useArchiveCampaign({
      variables: { campaignId }
    });
  };
  const [useUnarchiveCampaign] = useUnarchiveCampaignMutation();
  const unarchiveCampaign = (campaignId: string) => async () => {
    await useUnarchiveCampaign({
      variables: { campaignId }
    });
  };

  const [releaseMessages] = useReleaseMessagesMutation();
  const [deleteNeedsMessage] = useDeleteNeedsMessageMutation();
  const [markCampaign] = useMarkForSecondPassMutation();
  const [unmarkCampaign] = useUnMarkForSecondPassMutation();
  const [toggleAutoAssign] = useToggleAutoAssignMutation();

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
    const isAutoAssignOn = isTurnAutoAssignOn(inProgress);
    const isAutoAssignOff = isTurnAutoAssignOff(inProgress);

    // eslint-disable-next-line default-case
    switch (true) {
      case isArchiveCampaign(inProgress): {
        const { data, errors } = await useArchiveCampaign({
          variables: { campaignId: campaign.id }
        });
        setStateAfterOperation(data?.archiveCampaign, errors);
        break;
      }
      case isUnarchiveCampaign(inProgress): {
        const { data, errors } = await useUnarchiveCampaign({
          variables: { campaignId: campaign.id }
        });
        setStateAfterOperation(data?.unarchiveCampaign, errors);
        break;
      }
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
        const { excludeNewer, hours } = inProgress.payload;
        const { data, errors } = await markCampaign({
          variables: {
            campaignId: campaign.id,
            input: { excludeNewer, excludeAgeInHours: hours }
          }
        });

        setStateAfterOperation(data?.markForSecondPass, errors);
        break;
      }
      case isUnMarkForSecondPass(inProgress): {
        const { data, errors } = await unmarkCampaign({
          variables: { campaignId: campaign.id }
        });
        setStateAfterOperation(data?.unMarkForSecondPass, errors);
        break;
      }
      case isAutoAssignOn || isAutoAssignOff: {
        const { data, errors } = await toggleAutoAssign({
          variables: { campaignId: campaign.id, enabled: isAutoAssignOn }
        });
        setStateAfterOperation(data?.editCampaign, errors);
        break;
      }
    }
  };

  const setInProgressState = (newInProgress: Operation) => {
    setInProgress(newInProgress);
  };

  const { organizationId, pageSize, campaignsFilter, isAdmin } = props;
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
      <CampaignListLoader
        organizationId={organizationId}
        campaignsFilter={campaignsFilter}
        pageSize={pageSize}
        isAdmin={isAdmin}
        startOperation={start}
        archiveCampaign={archiveCampaign}
        unarchiveCampaign={unarchiveCampaign}
      />
    </div>
  );
};

export default CampaignList;
