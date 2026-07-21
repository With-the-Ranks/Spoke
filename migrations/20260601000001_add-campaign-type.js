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

  // Removing the type column requires dropping and recreating the campaign view,
  // which cascades to EVERY dependent view: not just the autosend/assignable
  // stack, but also assignable_campaign_contacts and the external-sync
  // configuration views. Drop with cascade and rebuild the full stack to its
  // pre-type definition (mirrors 20250912015240_drop_dynamic_assignment).
  await knex.raw(`
    drop view campaign cascade;
    alter table all_campaign drop column type;

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

    create view assignable_campaign_contacts as
      select
        campaign_contact.id, campaign_contact.campaign_id,
        campaign_contact.message_status, campaign.texting_hours_end,
        campaign_contact.timezone::text as contact_timezone
      from campaign_contact
      join campaign on campaign_contact.campaign_id = campaign.id
      where assignment_id is null
        and is_opted_out = false
        and archived = false
        and not exists (
          select 1
          from campaign_contact_tag
          join tag on campaign_contact_tag.tag_id = tag.id
          where tag.is_assignable = false
            and campaign_contact_tag.campaign_contact_id = campaign_contact.id
        );

    create view public.missing_external_sync_question_response_configuration as
      select
        all_values.*,
        external_system.id as system_id
      from (
        select
          istep.campaign_id,
          istep.parent_interaction_id as interaction_step_id,
          istep.answer_option as value,
          exists (
            select 1
            from public.question_response as istep_qr
            where
              istep_qr.interaction_step_id = istep.parent_interaction_id
              and istep_qr.value = istep.answer_option
          ) as is_required
        from public.interaction_step istep
        where istep.parent_interaction_id is not null
        union
        select
          qr_istep.campaign_id,
          qr.interaction_step_id,
          qr.value,
          true as is_required
        from public.question_response as qr
        join public.interaction_step qr_istep on qr_istep.id = qr.interaction_step_id
      ) all_values
      join campaign on campaign.id = all_values.campaign_id
      join external_system
        on external_system.organization_id = campaign.organization_id
      where
        not exists (
          select 1
          from public.all_external_sync_question_response_configuration aqrc
          where
            all_values.campaign_id = aqrc.campaign_id
            and external_system.id = aqrc.system_id
            and all_values.interaction_step_id = aqrc.interaction_step_id
            and all_values.value = aqrc.question_response_value
        );

    create view public.external_sync_question_response_configuration as
      select
        aqrc.id::text as compound_id,
        aqrc.campaign_id,
        aqrc.system_id,
        aqrc.interaction_step_id,
        aqrc.question_response_value,
        aqrc.created_at,
        aqrc.updated_at,
        not exists (
          select 1 from public.external_sync_config_question_response_response_option qrro
          where qrro.question_response_config_id = aqrc.id
          union
          select 1 from public.external_sync_config_question_response_activist_code qrac
          where qrac.question_response_config_id = aqrc.id
          union
          select 1 from public.external_sync_config_question_response_result_code qrrc
          where qrrc.question_response_config_id = aqrc.id
        ) as is_empty,
        exists (
          select 1 from public.external_sync_config_question_response_response_option qrro
          join external_survey_question_response_option
            on external_survey_question_response_option.id = qrro.external_response_option_id
          join external_survey_question
            on external_survey_question.id = external_survey_question_response_option.external_survey_question_id
          where
            qrro.question_response_config_id = aqrc.id
            and external_survey_question.status <> 'active'

          union

          select 1 from public.external_sync_config_question_response_activist_code qrac
          join external_activist_code
            on external_activist_code.id = qrac.external_activist_code_id
          where
            qrac.question_response_config_id = aqrc.id
            and external_activist_code.status <> 'active'
        ) as includes_not_active,
        false as is_missing,
        false as is_required
      from public.all_external_sync_question_response_configuration aqrc
      union
      select
        missing.value || '|' || missing.interaction_step_id || '|' || missing.campaign_id as compound_id,
        missing.campaign_id,
        missing.system_id as system_id,
        missing.interaction_step_id,
        missing.value as question_response_value,
        null as created_at,
        null as updated_at,
        true as is_empty,
        false as includes_not_active,
        true as is_missing,
        missing.is_required
      from public.missing_external_sync_question_response_configuration missing;

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
};
