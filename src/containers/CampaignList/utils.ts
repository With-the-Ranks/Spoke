/* eslint-disable import/prefer-default-export */
import type { CampaignListEntryFragment } from "@spoke/spoke-codegen";
import type { GraphQLError } from "graphql";
import type { MouseEventHandler } from "react";

export interface OperationDefinition {
  title: (campaign: CampaignListEntryFragment) => string;
  body: (campaign?: CampaignListEntryFragment) => string;
  mutationName?: string;
  deletionProtection?: boolean;
}

export interface Operation {
  name: string;
  campaign: CampaignListEntryFragment;
  payload?: unknown;
}

export interface CampaignOperationsProps {
  startOperation: (
    op: Operation
  ) => MouseEventHandler<HTMLLIElement> | undefined;
  archiveCampaign: (
    campaignId: string
  ) => MouseEventHandler<HTMLLIElement> | undefined;
  unarchiveCampaign: (
    campaignId: string
  ) => MouseEventHandler<HTMLLIElement> | undefined;
}

export const dialogOperations: Record<string, OperationDefinition> = {
  releaseUnsentMessages: {
    title: (campaign) => `Release Unsent Messages for ${campaign.title}`,
    body: () => `Releasing unsent messages for this campaign will cause unsent messages in this campaign\
      to be removed from texter's assignments. This means that these texters will no longer be able to send\
      these messages, but these messages will become available to assign via the autoassignment\
      functionality.`,
    mutationName: "releaseMessages"
  },
  markForSecondPass: {
    title: (campaign) =>
      `Mark Unresponded to Messages in ${campaign.title} for a Second Pass`,
    body: () => `Marking messages that have not been responded to on this campaign will reset the state of those\
      messages, causing them to show up as needing a first text for a second time.`
  },
  releaseUnrepliedMessages: {
    title: (campaign) =>
      `Release Unreplied Conversations for ${campaign.title}`,
    body: () => `Releasing unreplied messages for this campaign will cause unreplied messages in this campaign\
      to be removed from texter's assignments. This means that these texters will no longer be able to respond\
      to these conversations, but these conversations will become available to assign via the autoassignment\
      functionality.`,
    mutationName: "releaseMessages"
  },
  deleteNeedsMessage: {
    title: (campaign) => `Delete Un-Messaged Contacts for ${campaign.title}`,
    body: () => `Deleting unmessaged contacts for this campaign will remove contacts that have not received a message yet.\
      This operation is useful if, for one reason or another, you don't want to message any more contacts on this\
      campaign, but still want to use autoassignment to handle replies. This might be because there's a mistake in\
      the script or file, or because the event for which you were sending these messages has already happened.`,
    mutationName: "deleteNeedsMessage",
    deletionProtection: true
  },
  unMarkForSecondPass: {
    title: (campaign) => `Un-Mark ${campaign.title} for a Second Pass`,
    body: () => `Un-marking this campaign for a second pass will mark contacts that have been sent a message but are marked\
      as unmessaged because of a second pass as having been messaged, effectively undoing the 'Mark for Second Pass' operation.\
      This operation is useful if, for one reason or another, you don't want to message any more contacts on this campaign,\
      but still want to use autoassignment to handle replies. This might be because there's a mistake in the script or file,\
      or because the event for which you were sending these messages has already happened. This will not affect contacts\
      that have not yet received one message, or contacts that have replied.`,
    mutationName: "unMarkForSecondPass"
  },
  turnAutoAssignOn: {
    title: (campaign) => `Turn auto-assign ON for ${campaign.title}`,
    body: () =>
      `Turning auto-assign ON means that this campaign's contacts will be eligible to be assigned by the text request form`,
    mutationName: "turnAutoAssignOn"
  },
  turnAutoAssignOff: {
    title: (campaign) => `Turn auto-assign OFF for ${campaign.title}`,
    body: () =>
      `Turning auto-assign OFF means that this campaign's contacts will not be assigned by the text request form`,
    mutationName: "turnAutoAssignOff"
  }
};

export interface ReleaseUnrepliedMessages extends Operation {
  payload: {
    ageInHours: number;
  };
}

export interface MarkForSecondPass extends Operation {
  payload: {
    excludeNewer: boolean;
    excludeRecentlyTexted: boolean;
    days: number;
    hours: number;
  };
}

export const isArchiveCampaign = (inProgress: Operation) => {
  return inProgress.name === "archiveCampign";
};

export const isUnarchiveCampaign = (inProgress: Operation) => {
  return inProgress.name === "unarchiveCampign";
};

export const isReleaseUnsentMessages = (inProgress: Operation) => {
  return inProgress.name === "releaseUnsentMessages";
};

export const isReleaseUnrepliedMessages = (
  inProgress: Operation
): inProgress is ReleaseUnrepliedMessages => {
  return inProgress.name === "releaseUnrepliedMessages";
};

export const isDeleteNeedsMessage = (inProgress: Operation) => {
  return inProgress.name === "deleteNeedsMessage";
};

export const isMarkForSecondPass = (
  inProgress: Operation
): inProgress is MarkForSecondPass => {
  return inProgress.name === "markForSecondPass";
};

export const isUnMarkForSecondPass = (inProgress: Operation) => {
  return inProgress.name === "unMarkForSecondPass";
};

export const isTurnAutoAssignOn = (inProgress: Operation) => {
  return inProgress.name === "turnAutoAssignOn";
};

export const isTurnAutoAssignOff = (inProgress: Operation) => {
  return inProgress.name === "turnAutoAssignOff";
};

export const isCampaignGroupsPermissionError = (gqlError: GraphQLError) => {
  return (
    gqlError.path &&
    gqlError.path[gqlError.path.length - 1] === "campaignGroups" &&
    gqlError.extensions.code === "FORBIDDEN"
  );
};
