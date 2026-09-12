import { gql } from "@apollo/client";

export const GET_ORGANIZATION_DATA = gql`
  query getOrganizationData($organizationId: String!) {
    organization(id: $organizationId) {
      id
      name
      messagingServices(active: true) {
        edges {
          node {
            name
          }
        }
      }
    }
  }
`;

export const GET_CAMPAIGN_JOBS = gql`
  query getCampaignJobs($campaignId: String!) {
    campaign(id: $campaignId) {
      id
      pendingJobs {
        id
        jobType
        assigned
        status
        resultMessage
      }
    }
  }
`;

export const EditCampaignFragment = gql`
  fragment EditCampaignFragment on Campaign {
    id
    title
    description
    isStarted
    isArchived
    isTemplate
    hasSentMessages
    contactsCount
    editors
    readiness {
      id
      interactions
    }
  }
`;

export const GET_EDIT_CAMPAIGN_DATA = gql`
  query getCampaign($campaignId: String!) {
    campaign(id: $campaignId) {
      ...EditCampaignFragment
    }
  }
  ${EditCampaignFragment}
`;
