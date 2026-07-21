import { r } from "../models";
import type { DialerContactWithData } from "./lib/dialer";
import { sqlResolvers } from "./lib/utils";
import type { DialerContactRecord } from "./types";

export const resolvers = {
  DialerCampaignContact: {
    ...sqlResolvers([
      "id",
      "campaignId",
      "firstName",
      "lastName",
      "zip",
      "doNotCall",
      "customFields"
    ]),
    // callStatus/attemptCount/lastAttemptedAt are derived from dialer_call rows
    // in getContactWithData (telephony state), not the same-named db columns.
    callStatus: (c: DialerContactWithData) => c.callStatus,
    attemptCount: (c: DialerContactWithData) => c.attemptCount,
    lastAttemptedAt: (c: DialerContactWithData) => c.lastAttemptedAt,
    assignment: (
      c: DialerContactRecord,
      _args: unknown,
      { loaders }: { loaders: any }
    ) => (c.assignment_id ? loaders.assignment.load(c.assignment_id) : null),
    // Interaction steps are campaign-level; the loader batches and caches them
    // per request so multiple contacts in the same campaign share one query.
    interactionSteps: (
      c: DialerContactRecord,
      _args: unknown,
      { loaders }: { loaders: any }
    ) => loaders.interactionStepsByCampaign.load(c.campaign_id),
    questionResponseValues: (c: DialerContactWithData) =>
      c.questionResponseValues ?? [],
    tags: (c: DialerContactWithData) => c.tags ?? [],
    campaignVariables: (c: DialerContactRecord) =>
      r
        .reader("campaign_variable")
        .where({ campaign_id: c.campaign_id })
        .whereNull("deleted_at")
        .select("*")
  },

  DialerCall: {
    ...sqlResolvers([
      "id",
      "dialerCampaignContactId",
      "status",
      "fromNumber",
      "telnyxCallControlId",
      "createdAt",
      "answeredAt",
      "endedAt"
    ])
  }
};

export default resolvers;
