import type {
  Notice,
  Pending10DlcCampaignNotice,
  Pricing10DlcNotice,
  PricingTollFreeNotice,
  Register10DlcBrandNotice,
  Register10DlcCampaignNotice,
  TitleContentNotice
} from "@spoke/spoke-codegen";
import type { GraphQLType } from "graphql";

export const isTitleContentNotice = (obj: Notice): obj is TitleContentNotice =>
  (obj as TitleContentNotice & GraphQLType).__typename === "TitleContentNotice";

export const isRegister10DlcBrandNotice = (
  obj: Notice
): obj is Register10DlcBrandNotice =>
  (obj as Register10DlcBrandNotice & GraphQLType).__typename ===
  "Register10DlcBrandNotice";

export const isRegister10DlcCampaignNotice = (
  obj: Notice
): obj is Register10DlcCampaignNotice =>
  (obj as Register10DlcCampaignNotice & GraphQLType).__typename ===
  "Register10DlcCampaignNotice";

export const isPending10DlcCampaignNotice = (
  obj: Notice
): obj is Pending10DlcCampaignNotice =>
  (obj as Pending10DlcCampaignNotice & GraphQLType).__typename ===
  "Pending10DlcCampaignNotice";

export const isPricing10DlcNotice = (obj: Notice): obj is Pricing10DlcNotice =>
  (obj as Pricing10DlcNotice & GraphQLType).__typename === "Pricing10DlcNotice";

export const isPricingTollFreeNotice = (
  obj: Notice
): obj is PricingTollFreeNotice =>
  (obj as PricingTollFreeNotice & GraphQLType).__typename ===
  "PricingTollFreeNotice";
