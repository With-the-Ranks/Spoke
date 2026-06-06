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
  const contact: DialerContactRecord | undefined = await r
    .reader("dialer_campaign_contact")
    .where({
      assignment_id: assignmentId,
      do_not_call: false,
      archived: false
    })
    .whereIn("call_status", ["not_attempted", "no_answer"])
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
    fromNumber = "+15555550100";
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

  await r
    .knex("dialer_campaign_contact")
    .where({ id: contact.id })
    .update({ call_status: "in_progress" });

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

  const [updated] = (await r
    .knex("dialer_campaign_contact")
    .where({ id: contact.id })
    .update({
      call_status: callStatus,
      attempt_count: r.knex.raw("attempt_count + 1"),
      last_attempted_at: new Date()
    })
    .returning("*")) as DialerContactRecord[];

  return getContactWithData(updated);
};
