import type { CampaignBuilderMode } from "@spoke/spoke-codegen";

export interface CampaignEditSection {
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

export interface CampaignReadinessType {
  basics: boolean;
  messagingService: boolean;
  textingHours: boolean;
  integration: boolean;
  contacts: boolean;
  autoassign: boolean;
  cannedResponses: boolean;
  interactions: boolean;
  texters: boolean;
  campaignVariables: boolean;
}
