import type { Pool, PoolClient } from "pg";

import type { TexterAssignmentInput } from "../../api/assignment";
import { DateTime } from "../../lib/datetime";
import type { CampaignRecord } from "../api/types";
import { Notifications, sendUserNotification } from "../notifications";
import { withTransaction } from "../utils";
import type { ProgressTask } from "./utils";
import { addProgressJob } from "./utils";

export const TASK_IDENTIFIER = "assign-texters";

export interface AssignmentTarget {
  id: string;
  userId: string;
  contactsCount: number;
  operation: string;
}

// Texting is the default everywhere (campaign_contact + the message_status
// ordering baked into the per-stage option defaults). Only call campaigns
// override the table and assignable rules.
interface ContactTableConfig {
  table?: string;
  // Extra SQL predicate (with a leading "and ") restricting which unassigned
  // contacts may be handed out.
  assignableFilter?: string;
  // ORDER BY expression deciding which assignable contacts go out first.
  assignableOrder?: string;
}

// Admin push-assignment writes the same assignment_id column the volunteer
// shift/pull path uses, so the two coexist: claimed contacts (non-null
// assignment_id) are invisible to assignDialerShift, which only claims nulls.
const getContactTableConfig = (
  campaignType: string | null | undefined
): ContactTableConfig =>
  campaignType === "call"
    ? {
        table: "dialer_campaign_contact",
        // Hand out only contacts that still need a call attempt — never
        // already-finished (answered/voicemail) or do-not-call contacts.
        assignableFilter:
          "and do_not_call = false and call_status in ('not_attempted', 'no_answer')",
        // Prioritize never-attempted contacts over no-answer retries.
        assignableOrder:
          "(case when call_status = 'not_attempted' then 10 else 20 end) asc"
      }
    : {};

interface EnsureAssignmentsOptions {
  client: PoolClient | Pool;
  campaignId: number;
  assignmentInputs: TexterAssignmentInput[];
}

export const ensureAssignments = async (options: EnsureAssignmentsOptions) => {
  const { client, campaignId, assignmentInputs } = options;
  const assignmentTargets: AssignmentTarget[] = [];
  for (const assignmentInput of assignmentInputs) {
    const {
      rows: [{ id, operation }]
    } = await client.query<{ id: string; operation: string }>(
      `
        insert into assignment (user_id, campaign_id)
        values ($1, $2)
        on conflict (user_id, campaign_id)
          -- force return value
          do update set user_id = EXCLUDED.user_id
        returning
          id,
          (case when created_at = updated_at then 'insert' else 'update' end) as operation
      `,
      [assignmentInput.userId, campaignId]
    );
    assignmentTargets.push({
      id,
      userId: assignmentInput.userId,
      contactsCount: assignmentInput.contactsCount,
      operation
    });
  }
  return assignmentTargets;
};

interface ZeroOutDeletedOptions {
  client: PoolClient | Pool;
  table?: string;
  campaignId: number;
  isArchived: boolean;
  assignmentIds: number[];
  ignoreAfterDate: string;
}

export const zeroOutDeleted = async (options: ZeroOutDeletedOptions) => {
  const {
    client,
    table = "campaign_contact",
    campaignId,
    isArchived,
    assignmentIds,
    ignoreAfterDate
  } = options;
  await client.query(
    `
      update ${table}
      set assignment_id = null
      where
        campaign_id = $1
        and archived = ${isArchived}
        and assignment_id is not null
        and not assignment_id = ANY($2)
        and updated_at < $3
    `,
    [campaignId, assignmentIds, ignoreAfterDate]
  );
};

interface FreeUpTextersOptions {
  client: PoolClient;
  table?: string;
  campaignId: number;
  isArchived: boolean;
  assignmentTargets: AssignmentTarget[];
  onProgress?: (percentComplete: number) => void | Promise<void>;
}

export const freeUpTexters = async (options: FreeUpTextersOptions) => {
  const {
    client,
    table = "campaign_contact",
    campaignId,
    isArchived,
    assignmentTargets,
    onProgress
  } = options;
  for (let index = 0; index < assignmentTargets.length; index += 1) {
    const assignmentTarget = assignmentTargets[index];
    const { id: assignmentId, contactsCount } = assignmentTarget;
    await client.query(
      `
        with cc_ids_to_keep as (
          select id
          from ${table}
          where
            campaign_id = $1
            and archived = ${isArchived}
            and assignment_id = $2
          order by id asc
          limit $3
        )
        update ${table}
        set assignment_id = null
        where
          campaign_id = $4
          and archived = ${isArchived}
          and assignment_id = $5
          and id not in (select id from cc_ids_to_keep)
      `,
      [campaignId, assignmentId, contactsCount, campaignId, assignmentId]
    );

    if (onProgress && index % 10 === 0) {
      const stagePercentCompelte = Math.floor(
        (index / assignmentTargets.length) * 100
      );
      await onProgress(stagePercentCompelte);
    }
  }
};

interface AssignPayloadsOptions {
  client: PoolClient;
  table?: string;
  assignableFilter?: string;
  assignableOrder?: string;
  campaignId: number;
  isArchived: boolean;
  assignmentTargets: AssignmentTarget[];
}

export const assignPayloads = async (options: AssignPayloadsOptions) => {
  const {
    client,
    table = "campaign_contact",
    assignableFilter = "",
    // Texting default: prioritize conversations that need action.
    assignableOrder = `(case
            when message_status = 'needsMessage' then 10
            when message_status = 'needsResponse' then 20
            when message_status = 'convo' then 30
            when message_status = 'messaged' then 40
            when message_status = 'closed' then 50
            else 60
          end) asc`,
    campaignId,
    isArchived,
    assignmentTargets
  } = options;

  const assignmentIds = assignmentTargets.map(({ id }) => parseInt(id, 10));
  const contactsCounts = assignmentTargets.map(
    ({ contactsCount }) => contactsCount
  );

  await client.query(
    `
      with raw_assignments as (
        select * from unnest($1::integer[], $2::integer[]) as t (assignment_id, desired_count)
      ),
      assignment_counts as (
        select
          assignment_id,
          generate_series(1, desired_count - (
            select count(*) from ${table}
            where
              campaign_id = $3
              and archived = ${isArchived}
              and ${table}.assignment_id = raw_assignments.assignment_id
          ))
        from raw_assignments
      ),
      assignments_payload as (
        select
          row_number() over () as row,
          assignment_id
        from assignment_counts
      ),
      assignable_contacts as (
        select
          row_number() over () as row,
          id as contact_id
          from ${table}
        where
          campaign_id = $3
          and archived = ${isArchived}
          and assignment_id is null
          ${assignableFilter}
        order by
          -- prioritize contacts requiring action
          ${assignableOrder}
      ),
      final_payloads as (
        select ap.assignment_id, ac.contact_id
        from assignments_payload ap
        join assignable_contacts ac on ac.row = ap.row
      )
      update ${table} cc
      set assignment_id = fp.assignment_id
      from final_payloads fp
      where cc.id = fp.contact_id
    `,
    [assignmentIds, contactsCounts, campaignId]
  );
};

interface SendAssignmentNotificationsOptions {
  campaignId: number;
  assignmentTargets: AssignmentTarget[];
}

const sendAssignmentNotifications = async (
  options: SendAssignmentNotificationsOptions
) => {
  const { campaignId, assignmentTargets } = options;
  await Promise.all(
    assignmentTargets.map(async (assignmentTarget) => {
      const assignment = {
        user_id: assignmentTarget.userId,
        campaign_id: campaignId
      };
      if (assignmentTarget.operation === "insert") {
        return sendUserNotification({
          type: Notifications.ASSIGNMENT_CREATED,
          assignment
        });
      }
      if (assignmentTarget.operation === "update") {
        return sendUserNotification({
          type: Notifications.ASSIGNMENT_UPDATED,
          assignment
        });
      }
    })
  );
};

export interface AssignTextersPayload {
  campaignId: number;
  assignmentInputs: TexterAssignmentInput[];
  ignoreAfterDate?: string;
}

export const assignTexters: ProgressTask<AssignTextersPayload> = async (
  payload,
  helpers
) => {
  const {
    campaignId,
    assignmentInputs,
    ignoreAfterDate = DateTime.local().toISO()
  } = payload;

  const campaign = await helpers
    .query<CampaignRecord>(`select * from campaign where id = $1 `, [
      campaignId
    ])
    .then(({ rows: [row] }) => row);

  // Texting campaigns assign campaign_contact rows; call campaigns assign
  // dialer_campaign_contact rows. Everything else is shared.
  const { table, assignableFilter, assignableOrder } = getContactTableConfig(
    campaign.type
  );

  const targets = await helpers.withPgClient((poolClient) =>
    withTransaction(poolClient, async (trx) => {
      // Ensure assignments for all texters
      const assignmentTargets = await ensureAssignments({
        client: trx,
        campaignId,
        assignmentInputs
      });
      await helpers.updateStatus(10);

      // Zero out "deleted" texters
      const assignmentIds = assignmentTargets.map(({ id }) => parseInt(id, 10));
      await zeroOutDeleted({
        client: trx,
        table,
        campaignId,
        isArchived: campaign.is_archived ?? false,
        assignmentIds,
        ignoreAfterDate
      });
      await helpers.updateStatus(20);

      // Free up contacts from assignment counts that have decreased
      await freeUpTexters({
        client: trx,
        table,
        campaignId,
        isArchived: campaign.is_archived ?? false,
        assignmentTargets,
        onProgress: (stagePercentComplete) =>
          helpers.updateStatus(20 + stagePercentComplete * 30)
      });
      await helpers.updateStatus(50);

      // Assign desired payloads to texters
      await assignPayloads({
        client: trx,
        table,
        assignableFilter,
        assignableOrder,
        campaignId,
        isArchived: campaign.is_archived ?? false,
        assignmentTargets
      });
      await helpers.updateStatus(95);

      return assignmentTargets;
    })
  );

  await sendAssignmentNotifications({
    campaignId,
    assignmentTargets: targets
  });
};

export const addAssignTexters = async (payload: AssignTextersPayload) =>
  addProgressJob({
    identifier: TASK_IDENTIFIER,
    payload
  });
