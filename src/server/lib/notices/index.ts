import type { Notice } from "@spoke/spoke-codegen";

import type { OrgLevelNotificationGetter } from "./types";

export const getInstanceNotifications = (_userId: string): Notice[] => {
  return [];
};

export const getOrgLevelNotifications: OrgLevelNotificationGetter = async (
  _userId,
  _organizationId
) => {
  return [];
};
