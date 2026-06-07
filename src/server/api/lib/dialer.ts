import { ForbiddenError, UserInputError } from "apollo-server-errors";

import { config } from "../../../config";
import { isNowBetween } from "../../../lib/timezones";
import { r } from "../../models";
import { OutsideTextingHoursError } from "../../send-message-errors";
import type {
  DialerCallRecord,
  DialerContactRecord,
  UserRecord
} from "../types";
import { getNumberForDial } from "./assemble-numbers";
import { getMessagingServiceById } from "./message-sending";

export interface DialerContactWithData extends DialerContactRecord {
  interactionSteps: unknown[];
  questionResponseValues: unknown[];
  tags: unknown[];
}

export const getContactWithData = async (
  contact: DialerContactRecord
): Promise<DialerContactWithData> => {
  const [questionResponses, tags, interactionSteps] = await Promise.all([
    r
      .reader("dialer_question_response")
      .join(
        "interaction_step as istep",
        "dialer_question_response.interaction_step_id",
        "istep.id"
      )
      .where({
        "dialer_question_response.dialer_campaign_contact_id": contact.id,
        "dialer_question_response.is_deleted": false
      })
      .select(
        "dialer_question_response.id",
        "dialer_question_response.interaction_step_id",
        "dialer_question_response.value",
        "istep.question as istep_question"
      ),
    r
      .reader("dialer_campaign_contact_tag")
      .join("tag", "tag.id", "dialer_campaign_contact_tag.tag_id")
      .where({
        "dialer_campaign_contact_tag.dialer_campaign_contact_id": contact.id
      })
      .select("tag.*"),
    r
      .reader("interaction_step")
      .where({ campaign_id: contact.campaign_id, is_deleted: false })
  ]);

  return {
    ...contact,
    interactionSteps,
    tags,
    questionResponseValues: questionResponses.map((qr) => ({
      id: qr.id,
      interactionStepId: qr.interaction_step_id,
      question: qr.istep_question,
      value: qr.value
    }))
  };
};

const assertContactAccess = async (
  dialerCampaignContactId: string,
  user: Pick<UserRecord, "id" | "is_superadmin">
): Promise<DialerContactRecord> => {
  const contact: DialerContactRecord | undefined = await r
    .knex("dialer_campaign_contact")
    .where({ id: dialerCampaignContactId })
    .first();

  if (!contact) throw new UserInputError("Dialer contact not found.");

  if (!user.is_superadmin && contact.assignment_id) {
    const assignment = await r
      .reader("assignment")
      .where({ id: contact.assignment_id, user_id: user.id })
      .first();
    if (!assignment) {
      throw new ForbiddenError(
        "You are not authorized to access that contact."
      );
    }
  }

  return contact;
};

export const getNextDialerContact = async (
  assignmentId: string
): Promise<DialerContactWithData | null> => {
  const assignment = await r
    .reader("assignment")
    .where({ id: assignmentId })
    .first("campaign_id");

  if (!assignment) return null;

  const campaign = await r
    .reader("all_campaign")
    .where({ id: assignment.campaign_id })
    .first();

  if (!campaign) return null;

  const contact: DialerContactRecord | undefined = await r
    .reader("dialer_campaign_contact")
    // Serve only contacts in this volunteer's claimed shift (assignment),
    // not the campaign-wide pool — pre-assignment is what prevents two
    // volunteers from getting the same contact.
    .where({
      assignment_id: assignmentId,
      do_not_call: false,
      archived: false
    })
    .whereIn("call_status", ["not_attempted", "no_answer"])
    // Only serve contacts callable now under the campaign's contact hours
    // (same rule as texting).
    .whereRaw("contact_is_textable_now(coalesce(timezone, ?), ?, ?, true)", [
      campaign.timezone,
      campaign.texting_hours_start,
      campaign.texting_hours_end
    ])
    .orderBy("id", "asc")
    .first();

  if (!contact) return null;
  return getContactWithData(contact);
};

export const getDialerContact = async (
  dialerCampaignContactId: string,
  user: Pick<UserRecord, "id" | "is_superadmin">
): Promise<DialerContactWithData> => {
  const contact = await assertContactAccess(dialerCampaignContactId, user);
  return getContactWithData(contact);
};

// Correlated EXISTS condition: the campaign (aliased `all_campaign` in the
// outer query) has at least one unclaimed, callable-now contact.
const whereHasUnclaimedCallableContact = (builder: any) => {
  builder
    .select(r.reader.raw(1))
    .from("dialer_campaign_contact as dcc")
    .whereRaw("dcc.campaign_id = all_campaign.id")
    .whereNull("dcc.assignment_id")
    .where("dcc.do_not_call", false)
    .where("dcc.archived", false)
    .whereIn("dcc.call_status", ["not_attempted", "no_answer"])
    .whereRaw(
      "contact_is_textable_now(coalesce(dcc.timezone, all_campaign.timezone), all_campaign.texting_hours_start, all_campaign.texting_hours_end, true)"
    );
};

// True if the org has any started, autoassign-enabled call campaign with
// unclaimed contacts callable right now — i.e. a shift can be requested.
export const callShiftsAvailable = async (
  organizationId: string
): Promise<boolean> => {
  const campaign = await r
    .reader("all_campaign")
    .where({
      organization_id: organizationId,
      type: "call",
      is_started: true,
      is_archived: false,
      is_autoassign_enabled: true
    })
    .whereExists(whereHasUnclaimedCallableContact)
    .first("id");

  return !!campaign;
};

// Assign the requesting volunteer a "shift" of up to `count` contacts from an
// autoassign-enabled call campaign, mirroring how texting hands out batches.
// The FOR UPDATE SKIP LOCKED claim guarantees no two volunteers get the same
// contact even under concurrent requests.
export const assignDialerShift = async (
  user: Pick<UserRecord, "id">,
  organizationId: string,
  count: number,
  parentTrx = r.knex
): Promise<{
  assignmentId: number | null;
  campaignId: number | null;
  count: number;
}> => {
  return parentTrx.transaction(async (trx) => {
    const campaign = await trx("all_campaign")
      .where({
        organization_id: organizationId,
        type: "call",
        is_started: true,
        is_archived: false,
        is_autoassign_enabled: true
      })
      .whereExists(whereHasUnclaimedCallableContact)
      .orderBy("id", "asc")
      .first();

    if (!campaign) {
      return { assignmentId: null, campaignId: null, count: 0 };
    }

    let assignment = await trx("assignment")
      .where({ user_id: user.id, campaign_id: campaign.id })
      .first();

    if (!assignment) {
      [assignment] = await trx("assignment")
        .insert({ user_id: user.id, campaign_id: campaign.id })
        .returning("*");
    }

    const { rows } = await trx.raw(
      `
        with claimed as (
          select id
          from dialer_campaign_contact
          where campaign_id = ?
            and assignment_id is null
            and do_not_call = false
            and archived = false
            and call_status in ('not_attempted', 'no_answer')
            and contact_is_textable_now(coalesce(timezone, ?), ?, ?, true)
          order by id asc
          for update skip locked
          limit ?
        )
        update dialer_campaign_contact as dcc
        set assignment_id = ?, updated_at = now()
        from claimed
        where dcc.id = claimed.id
        returning dcc.id;
      `,
      [
        campaign.id,
        campaign.timezone,
        campaign.texting_hours_start,
        campaign.texting_hours_end,
        count,
        assignment.id
      ]
    );

    return {
      assignmentId: assignment.id,
      campaignId: campaign.id,
      count: rows.length
    };
  });
};

export const initiateCall = async (
  assignmentId: string,
  dialerCampaignContactId: string,
  user: Pick<UserRecord, "id" | "is_superadmin">
): Promise<{
  dialerCallId: number;
  contactPhone: string;
  fromNumber: string;
}> => {
  // Contacts are claimed into a volunteer's shift up-front (see
  // assignDialerShift), so the contact must belong to this assignment.
  const contact: DialerContactRecord | undefined = await r
    .knex("dialer_campaign_contact")
    .where({ id: dialerCampaignContactId, assignment_id: assignmentId })
    .first();

  if (!contact) throw new UserInputError("Contact not found.");
  if (contact.do_not_call)
    throw new UserInputError("Contact is on the do-not-call list.");

  const campaign = await r
    .reader("all_campaign")
    .where({ id: contact.campaign_id })
    .first();

  if (!campaign) throw new UserInputError("Campaign not found.");

  // Calling follows the same contact hours as texting: if it's outside the
  // campaign's texting window in the contact's timezone, block the call.
  const timezone = contact.timezone || campaign.timezone;
  const withinContactHours = isNowBetween(
    timezone,
    campaign.texting_hours_start,
    campaign.texting_hours_end
  );
  if (!config.isTest && !withinContactHours) {
    throw new OutsideTextingHoursError();
  }

  let fromNumber: string;

  if (config.DEFAULT_SERVICE === "fakeservice") {
    // Local/fakeservice testing doesn't have a messaging service to source
    // numbers from, so use a configured Telnyx-owned caller ID instead.
    if (!config.TELNYX_DEFAULT_FROM_NUMBER) {
      throw new Error(
        "TELNYX_DEFAULT_FROM_NUMBER must be set to place dialer calls in fakeservice mode."
      );
    }
    fromNumber = config.TELNYX_DEFAULT_FROM_NUMBER;
  } else {
    if (!campaign.messaging_service_sid) {
      throw new Error("No messaging service configured for this campaign.");
    }

    const messagingService = await getMessagingServiceById(
      campaign.messaging_service_sid
    );

    const dialResult = await getNumberForDial(
      messagingService,
      contact.cell,
      contact.zip ?? undefined
    );

    fromNumber = dialResult.fromNumber;
  }

  // Atomically claim the contact for this call. The conditional status guard
  // means a double-click (or any second attempt) updates 0 rows and bails,
  // so we never place two calls to the same person.
  const claimed = await r
    .knex("dialer_campaign_contact")
    .where({ id: contact.id })
    .whereIn("call_status", ["not_attempted", "no_answer"])
    .update({ call_status: "in_progress" });

  if (claimed === 0) {
    throw new UserInputError("This contact is no longer available to call.");
  }

  const [dialerCall] = (await r
    .knex("dialer_call")
    .insert({
      dialer_campaign_contact_id: contact.id,
      user_id: user.id,
      from_number: fromNumber,
      status: "QUEUED",
      created_at: new Date()
    })
    .returning("*")) as DialerCallRecord[];

  return {
    dialerCallId: dialerCall.id,
    contactPhone: contact.cell,
    fromNumber
  };
};

export const updateDialerCall = async (
  dialerCallId: string,
  user: Pick<UserRecord, "id" | "is_superadmin">,
  updates: {
    status?: string;
    disposition?: string;
    telnyxCallControlId?: string;
    answeredAt?: string | null;
    endedAt?: string | null;
  }
): Promise<DialerCallRecord> => {
  const existingCall: DialerCallRecord | undefined = await r
    .knex("dialer_call")
    .where({ id: dialerCallId })
    .first();

  if (!existingCall) throw new UserInputError("Dialer call not found.");
  if (!user.is_superadmin && existingCall.user_id !== user.id) {
    throw new ForbiddenError("You are not authorized to update this call.");
  }

  const patch: Record<string, unknown> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.disposition !== undefined)
    patch.disposition = updates.disposition;
  if (updates.telnyxCallControlId !== undefined)
    patch.telnyx_call_control_id = updates.telnyxCallControlId;
  if (updates.answeredAt !== undefined)
    patch.answered_at = updates.answeredAt
      ? new Date(updates.answeredAt)
      : null;

  // Prefer the real call-end time from the client; otherwise stamp it when the
  // call reaches a terminal status.
  const terminalStatuses = ["COMPLETED", "NO_ANSWER", "VOICEMAIL", "ERROR"];
  if (updates.endedAt !== undefined) {
    patch.ended_at = updates.endedAt ? new Date(updates.endedAt) : null;
  } else if (updates.status && terminalStatuses.includes(updates.status)) {
    patch.ended_at = new Date();
  }

  const [updated] = (await r
    .knex("dialer_call")
    .where({ id: dialerCallId })
    .update(patch)
    .returning("*")) as DialerCallRecord[];

  return updated;
};

export const saveDialerQuestionResponses = async (
  dialerCampaignContactId: string,
  questionResponses: Array<{ interactionStepId: string; value: string }>,
  user: Pick<UserRecord, "id" | "is_superadmin">
): Promise<DialerContactWithData> => {
  const contact = await assertContactAccess(dialerCampaignContactId, user);

  for (const qr of questionResponses) {
    await r
      .knex("dialer_question_response")
      .insert({
        dialer_campaign_contact_id: contact.id,
        interaction_step_id: qr.interactionStepId,
        value: qr.value,
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflict(
        r.knex.raw(
          "(interaction_step_id, dialer_campaign_contact_id) WHERE is_deleted = false"
        ) as any
      )
      .merge({ value: qr.value, updated_at: new Date() });
  }

  return getContactWithData(contact);
};

export const markDialerContactComplete = async (
  dialerCampaignContactId: string,
  callStatus: string,
  user: Pick<UserRecord, "id" | "is_superadmin">
): Promise<DialerContactWithData> => {
  const contact = await assertContactAccess(dialerCampaignContactId, user);

  const [updated] = (await r
    .knex("dialer_campaign_contact")
    .where({ id: contact.id })
    .update({
      call_status: callStatus,
      attempt_count: r.knex.raw("attempt_count + 1"),
      last_attempted_at: new Date(),
      // A "do not call" outcome must pin the contact off the dial list.
      ...(callStatus === "do_not_call" ? { do_not_call: true } : {})
    })
    .returning("*")) as DialerContactRecord[];

  return getContactWithData(updated);
};
