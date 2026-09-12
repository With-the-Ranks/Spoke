import type {
  EditCampaignDataFragment,
  OrganizationDataForCampaignEditFragment
} from "@spoke/spoke-codegen";
import { CampaignBuilderMode } from "@spoke/spoke-codegen";

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
import type { CampaignEditSection } from "./types";

type Campaign = EditCampaignDataFragment;
type Organization = OrganizationDataForCampaignEditFragment;

export const getCampaignEditSections = (
  campaign: Campaign,
  organization: Organization
): CampaignEditSection[] => [
  {
    title: "Basics",
    content: CampaignBasicsForm,
    blocksStarting: true,
    checkCompleted: () => campaign.title !== "" && campaign.description !== ""
  },
  {
    title: "Campaign Groups",
    content: CampaignGroupsForm,
    showForModes: [CampaignBuilderMode.Advanced, CampaignBuilderMode.Template],
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
    showForModes: [CampaignBuilderMode.Advanced, CampaignBuilderMode.Template]
  },
  {
    title: "Autoassign Mode",
    content: CampaignAutoassignModeForm,
    showForModes: [CampaignBuilderMode.Basic, CampaignBuilderMode.Advanced]
  }
];

export default getCampaignEditSections;
