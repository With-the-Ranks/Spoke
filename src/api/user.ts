import { Language } from "@spoke/spoke-codegen";

/* eslint-disable import/prefer-default-export */
export enum NotificationFrequencyType {
  All = "ALL",
  Periodic = "PERIODIC",
  Daily = "DAILY",
  None = "NONE"
}

export const languageEnumToLabel = (value: Language) => {
  switch (value) {
    case Language.Es:
      return "Español";
    default:
      return "English";
  }
};
