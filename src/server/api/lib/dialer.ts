import { ForbiddenError, UserInputError } from "apollo-server-errors";

import { config } from "../../../config";
import { r } from "../../models";
import type {
  DialerCallRecord,
  DialerContactRecord,
  UserRecord
} from "../types";
import { getNumberForDial } from "./assemble-numbers";
import { getMessagingServiceById } from "./message-sending";

const ACTIVE_OR_FINAL_STATUSES = [
  "QUEUED",
  "DIALING",
  "IN_PROGRESS",
  "COMPLETED",
  "VOICEMAIL",
  "ERROR"
];

export interface DialerContactWithData extends DialerContactRecord {
  callStatus: string;
  attemptCount: number;
  lastAttemptedAt: Date | null;
  interactionSteps: unknown[];
  questionResponseValues: unknown[];
  tags: unknown[];
}

export const getContactWithData = async (
  contact: DialerContactRecord
): Promise<DialerContactWithData> => {
  const [questionResponses, tags, interactionSteps, calls] = await Promise.all([
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
      .where({ campaign_id: contact.campaign_id, is_deleted: false }),
    r
      .reader("dialer_call")
      .where({ dialer_campaign_contact_id: contact.id })
      .orderBy("created_at", "desc")
  ]);

  return {
    ...contact,
    callStatus: calls[0]?.status ?? "NOT_ATTEMPTED",
    attemptCount: calls.length,
    lastAttemptedAt: calls[0]?.created_at ?? null,
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
  const contact: DialerContactRecord | undefined = await r
    .reader("dialer_campaign_contact")
    .where({
      assignment_id: assignmentId,
      do_not_call: false,
      archived: false
    })
    .whereNotExists(function (this: any) {
      this.select(r.reader.raw(1))
        .from("dialer_call")
        .whereRaw(
          "dialer_call.dialer_campaign_contact_id = dialer_campaign_contact.id"
        )
        .whereIn("dialer_call.status", ACTIVE_OR_FINAL_STATUSES);
    })
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

export const initiateCall = async (
  assignmentId: string,
  dialerCampaignContactId: string,
  user: Pick<UserRecord, "id" | "is_superadmin">
): Promise<{
  dialerCallId: number;
  contactPhone: string;
  fromNumber: string;
}> => {
  const contact: DialerContactRecord | undefined = await r
    .knex("dialer_campaign_contact")
    .where({ id: dialerCampaignContactId, assignment_id: assignmentId })
    .first();

  if (!contact) throw new UserInputError("Contact not found.");
  if (contact.do_not_call)
    throw new UserInputError("Contact is on the do-not-call list.");

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
    const campaign = await r
      .reader("all_campaign")
      .where({ id: contact.campaign_id })
      .first();

    if (!campaign?.messaging_service_sid) {
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

  // Guard against double-clicks: bail if an active call already exists.
  const activeCall = await r
    .knex("dialer_call")
    .where({ dialer_campaign_contact_id: contact.id })
    .whereIn("status", ["QUEUED", "DIALING", "IN_PROGRESS"])
    .first("id");

  if (activeCall) {
    throw new UserInputError("This contact is already being called.");
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
    telnyxCallControlId?: string;
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
  if (updates.telnyxCallControlId !== undefined)
    patch.telnyx_call_control_id = updates.telnyxCallControlId;

  const terminalStatuses = ["COMPLETED", "NO_ANSWER", "VOICEMAIL", "ERROR"];
  if (updates.status && terminalStatuses.includes(updates.status)) {
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

  if (callStatus === "do_not_call") {
    await r
      .knex("dialer_campaign_contact")
      .where({ id: contact.id })
      .update({ do_not_call: true });
  }

  return getContactWithData(contact);
};
