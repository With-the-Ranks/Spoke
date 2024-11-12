/* eslint-disable import/prefer-default-export */
export enum NotificationFrequencyType {
  All = "ALL",
  Periodic = "PERIODIC",
  Daily = "DAILY",
  None = "NONE"
}

export enum Language {
  English = "en",
  Spanish = "es"
}

export const languageEnumToLabel = (value: Language) => {
  switch (value) {
    case Language.Spanish:
      return "Español";
    default:
      return "English";
  }
};
