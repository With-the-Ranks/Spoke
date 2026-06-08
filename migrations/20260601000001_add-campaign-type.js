/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("all_campaign", (table) => {
    table.enu("type", ["sms", "call"]).notNullable().defaultTo("sms");
  });

  // Safety guards: a call campaign must never run texting-only background work.
  // Autosending, autoassignment, and stale-reply release all act through
  // campaign_contact (which call campaigns don't have), but we ALSO pin the
  // controlling columns to their inert values at the DB level so the invalid
  // states are impossible. As a bonus, each cron's candidate query filters on
  // exactly these columns, so call campaigns are self-excluded. These simple
  // same-row CHECKs are only possible because `type` lives on this table.
  await knex.raw(`
    alter table all_campaign
      add constraint call_campaigns_no_autosend
        check (type <> 'call' or autosend_status = 'unstarted'),
      add constraint call_campaigns_no_autoassign
        check (type <> 'call' or is_autoassign_enabled = false),
      add constraint call_campaigns_no_stale_release
        check (type <> 'call' or replies_stale_after_minutes is null);
  `);

  // Expose type on the campaign view so read-replica clients querying campaign
  // (rather than all_campaign directly) can see it. create or replace view can
  // add a column at the end without needing to drop dependent views.
  await knex.raw(`
    create or replace view campaign as
      select
        id,
        organization_id,
        title,
        description,
        is_started,
        due_by,
        created_at,
        is_archived,
        logo_image_url,
        intro_html,
        primary_color,
        texting_hours_start,
        texting_hours_end,
        timezone,
        creator_id,
        is_autoassign_enabled,
        limit_assignment_to_teams,
        updated_at,
        replies_stale_after_minutes,
        landlines_filtered,
        external_system_id,
        is_approved,
        autosend_status,
        autosend_user_id,
        messaging_service_sid,
        autosend_limit,
        type
      from all_campaign
      where is_template = false;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw(`
    alter table all_campaign
      drop constraint if exists call_campaigns_no_autosend,
      drop constraint if exists call_campaigns_no_autoassign,
      drop constraint if exists call_campaigns_no_stale_release;
  `);

  // Remove type from the campaign view before dropping the column.
  // create or replace view cannot remove columns, so we must drop and recreate
  // the view and all views that depend on it.
  await knex.raw(`
    drop view if exists
      autosend_campaigns_to_send,
      assignable_needs_reply_with_escalation_tags,
      assignable_campaigns_with_needs_reply,
      assignable_campaigns_with_needs_message,
      assignable_needs_reply,
      assignable_needs_message,
      assignable_campaigns,
      sendable_campaigns,
      campaign;

    create view campaign as
      select
        id, organization_id, title, description, is_started, due_by, created_at,
        is_archived, logo_image_url, intro_html, primary_color, texting_hours_start,
        texting_hours_end, timezone, creator_id, is_autoassign_enabled,
        limit_assignment_to_teams, updated_at, replies_stale_after_minutes,
        landlines_filtered, external_system_id, is_approved, autosend_status,
        autosend_user_id, messaging_service_sid, autosend_limit
      from all_campaign
      where is_template = false;

    create view sendable_campaigns as
      select campaign.id, campaign.title, campaign.organization_id,
        campaign.limit_assignment_to_teams, campaign.autosend_status,
        campaign.is_autoassign_enabled
      from campaign
      where campaign.is_started and not campaign.is_archived;

    create view assignable_campaigns as
      select sendable_campaigns.id, sendable_campaigns.title,
        sendable_campaigns.organization_id,
        sendable_campaigns.limit_assignment_to_teams,
        sendable_campaigns.autosend_status
      from sendable_campaigns
      where sendable_campaigns.is_autoassign_enabled;

    create view assignable_needs_message as
      select acc.id, acc.campaign_id, acc.message_status
      from assignable_campaign_contacts acc
      join campaign on campaign.id = acc.campaign_id
      where acc.message_status = 'needsMessage'
        and (
          (acc.contact_timezone is null
            and extract(hour from current_timestamp at time zone campaign.timezone) < campaign.texting_hours_end
            and extract(hour from current_timestamp at time zone campaign.timezone) >= campaign.texting_hours_start
          )
          or (
            campaign.texting_hours_end > extract(hour from (current_timestamp at time zone acc.contact_timezone) + interval '10 minutes')
            and campaign.texting_hours_start <= extract(hour from (current_timestamp at time zone acc.contact_timezone))
          )
        );

    create view assignable_campaigns_with_needs_message as
      select assignable_campaigns.id, assignable_campaigns.title,
        assignable_campaigns.organization_id,
        assignable_campaigns.limit_assignment_to_teams,
        assignable_campaigns.autosend_status
      from assignable_campaigns
      where exists (
        select 1 from assignable_needs_message
        where assignable_needs_message.campaign_id = assignable_campaigns.id
      )
      and not exists (
        select 1 from campaign
        where campaign.id = assignable_campaigns.id
          and now() > date_trunc('day', (campaign.due_by + interval '24 hours') at time zone campaign.timezone)
      )
      and assignable_campaigns.autosend_status <> 'sending';

    create view assignable_needs_reply as
      select acc.id, acc.campaign_id, acc.message_status
      from assignable_campaign_contacts acc
      join campaign on campaign.id = acc.campaign_id
      where acc.message_status = 'needsResponse'
        and (
          (acc.contact_timezone is null
            and extract(hour from current_timestamp at time zone campaign.timezone) < campaign.texting_hours_end
            and extract(hour from current_timestamp at time zone campaign.timezone) >= campaign.texting_hours_start
          )
          or (
            campaign.texting_hours_end > extract(hour from (current_timestamp at time zone acc.contact_timezone) + interval '2 minutes')
            and campaign.texting_hours_start <= extract(hour from (current_timestamp at time zone acc.contact_timezone))
          )
        );

    create view assignable_campaigns_with_needs_reply as
      select assignable_campaigns.id, assignable_campaigns.title,
        assignable_campaigns.organization_id,
        assignable_campaigns.limit_assignment_to_teams,
        assignable_campaigns.autosend_status
      from assignable_campaigns
      where exists (
        select 1 from assignable_needs_reply
        where assignable_needs_reply.campaign_id = assignable_campaigns.id
      );

    create view assignable_needs_reply_with_escalation_tags as
      select acc.id, acc.campaign_id, acc.message_status, acc.applied_escalation_tags
      from assignable_campaign_contacts_with_escalation_tags acc
      join campaign on campaign.id = acc.campaign_id
      where acc.message_status = 'needsResponse'
        and (
          (acc.contact_timezone is null
            and extract(hour from current_timestamp at time zone campaign.timezone) < campaign.texting_hours_end
            and extract(hour from current_timestamp at time zone campaign.timezone) >= campaign.texting_hours_start
          )
          or (
            campaign.texting_hours_end > extract(hour from (current_timestamp at time zone acc.contact_timezone) + interval '2 minutes')
            and campaign.texting_hours_start <= extract(hour from (current_timestamp at time zone acc.contact_timezone))
          )
        );

    create view autosend_campaigns_to_send as
      select sendable_campaigns.id, sendable_campaigns.title,
        sendable_campaigns.organization_id,
        sendable_campaigns.limit_assignment_to_teams,
        sendable_campaigns.autosend_status,
        sendable_campaigns.is_autoassign_enabled
      from sendable_campaigns
      where exists (
        select 1 from assignable_needs_message
        where assignable_needs_message.campaign_id = sendable_campaigns.id
      )
      and not exists (
        select 1 from campaign
        where campaign.id = sendable_campaigns.id
          and now() > date_trunc('day', (campaign.due_by + interval '24 hours') at time zone campaign.timezone)
      )
      and sendable_campaigns.autosend_status = 'sending';
  `);

  await knex.schema.alterTable("all_campaign", (table) => {
    table.dropColumn("type");
  });
};
