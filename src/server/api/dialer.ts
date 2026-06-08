import { r } from "../models";
import type { DialerContactWithData } from "./lib/dialer";
import type { DialerCallRecord, DialerContactRecord } from "./types";

export const resolvers = {
  DialerCampaignContact: {
    id: (c: DialerContactRecord) => c.id,
    campaignId: (c: DialerContactRecord) => c.campaign_id,
    firstName: (c: DialerContactRecord) => c.first_name,
    lastName: (c: DialerContactRecord) => c.last_name,
    zip: (c: DialerContactRecord) => c.zip,
    callStatus: (c: DialerContactWithData) => c.callStatus,
    doNotCall: (c: DialerContactRecord) => c.do_not_call,
    attemptCount: (c: DialerContactWithData) => c.attemptCount,
    lastAttemptedAt: (c: DialerContactWithData) => c.lastAttemptedAt,
    customFields: (c: DialerContactRecord) => c.custom_fields,
    assignment: (
      c: DialerContactRecord,
      _args: unknown,
      { loaders }: { loaders: any }
    ) => (c.assignment_id ? loaders.assignment.load(c.assignment_id) : null),
    interactionSteps: (c: DialerContactWithData) =>
      c.interactionSteps ??
      r
        .reader("interaction_step")
        .where({ campaign_id: c.campaign_id, is_deleted: false }),
    questionResponseValues: (c: DialerContactWithData) =>
      c.questionResponseValues ?? [],
    tags: (c: DialerContactWithData) => c.tags ?? []
  },

  DialerCall: {
    id: (c: DialerCallRecord) => c.id,
    dialerCampaignContactId: (c: DialerCallRecord) =>
      c.dialer_campaign_contact_id,
    status: (c: DialerCallRecord) => c.status,
    fromNumber: (c: DialerCallRecord) => c.from_number,
    telnyxCallControlId: (c: DialerCallRecord) => c.telnyx_call_control_id,
    createdAt: (c: DialerCallRecord) => c.created_at,
    endedAt: (c: DialerCallRecord) => c.ended_at
  }
};

export default resolvers;
