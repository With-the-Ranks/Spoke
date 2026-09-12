import type { ApolloError } from "@apollo/client";
import {
  useGetCampaignEditJobsQuery,
  useGetEditCampaignDataQuery,
  useGetOrganizationDataForCampaignEditQuery
} from "@spoke/spoke-codegen";
import React from "react";
import { useHistory, useParams } from "react-router-dom";

import { useSpokeContext } from "../../client/spoke-context";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useAuthzContext } from "../AuthzProvider";
import { isOrganizationsPermissionError } from "../hoc/utils";
import { PrettyErrors } from "../hoc/with-operations";
import AdminCampaignEditView from "./AdminCampaignEditView";

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
