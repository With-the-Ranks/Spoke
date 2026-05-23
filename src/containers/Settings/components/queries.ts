import { gql } from "@apollo/client";

import type { Organization } from "../../../api/organization";

export interface OrganizationNameType {
  organization: Pick<Organization, "id" | "name">;
}

export const GET_ORGANIZATION_NAME = gql`
  query GetOrganizationName($organizationId: String!) {
    organization(id: $organizationId) {
      id
      name
    }
  }
`;

export const EDIT_ORGANIZATION_NAME = gql`
  mutation EditOrganizationName(
    $organizationId: String!
    $input: EditOrganizationInput!
  ) {
    editOrganization(id: $organizationId, input: $input) {
      id
      name
    }
  }
`;

export interface OrganizationMessagingServicesType {
  organization: Pick<Organization, "id" | "messagingServices">;
}

export const GET_MESSAGING_SERVICES = gql`
  query GetOrganizationMessagingServices($organizationId: String!) {
    organization(id: $organizationId) {
      id
      messagingServices {
        edges {
          node {
            id
            serviceType
          }
        }
      }
    }
  }
`;

export const GET_ORGANIZATION_SETTINGS = gql`
  query GetOrganizationSettings($organizationId: String!) {
    organization(id: $organizationId) {
      id
      optOutMessage
      textingHoursEnforced
      textingHoursStart
      textingHoursEnd
      defaultTextingTz
      settings {
        id
        optOutMessage
        numbersApiKey
        trollbotWebhookUrl
        defaulTexterApprovalStatus
        showContactLastName
        showContactCell
        showDoNotAssignMessage
        doNotAssignMessage
      }
    }
  }
`;

export const EDIT_ORGANIZATION_SETTINGS = gql`
  mutation EditOrganizationSettings(
    $id: String!
    $input: OrganizationSettingsInput!
  ) {
    editOrganizationSettings(id: $id, input: $input) {
      id
      optOutMessage
      numbersApiKey
      trollbotWebhookUrl
      defaulTexterApprovalStatus
      showContactLastName
      showContactCell
      showDoNotAssignMessage
      doNotAssignMessage
    }
  }
`;

export const UPDATE_TEXTING_HOURS = gql`
  mutation UpdateTextingHours(
    $textingHoursStart: Int!
    $textingHoursEnd: Int!
    $organizationId: String!
  ) {
    updateTextingHours(
      textingHoursStart: $textingHoursStart
      textingHoursEnd: $textingHoursEnd
      organizationId: $organizationId
    ) {
      id
      textingHoursEnforced
      textingHoursStart
      textingHoursEnd
    }
  }
`;

export const UPDATE_TEXTING_HOURS_ENFORCEMENT = gql`
  mutation UpdateTextingHoursEnforcement(
    $textingHoursEnforced: Boolean!
    $organizationId: String!
  ) {
    updateTextingHoursEnforcement(
      textingHoursEnforced: $textingHoursEnforced
      organizationId: $organizationId
    ) {
      id
      textingHoursEnforced
      textingHoursStart
      textingHoursEnd
    }
  }
`;

export const UPDATE_DEFAULT_TEXTING_TIMEZONE = gql`
  mutation UpdateDefaultTextingTimezone(
    $organizationId: String!
    $defaultTextingTz: String!
  ) {
    updateDefaultTextingTimezone(
      defaultTextingTz: $defaultTextingTz
      organizationId: $organizationId
    ) {
      id
      defaultTextingTz
    }
  }
`;
