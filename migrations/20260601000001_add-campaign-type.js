/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("all_campaign", (table) => {
    table.enu("type", ["sms", "call"]).notNullable().defaultTo("sms");
  });

  // Safety guards: a call campaign must never run texting-only background work.
  // Autosending and stale-reply release both act through campaign_contact
  // (which call campaigns don't have), so we pin the controlling columns to
  // their inert values at the DB level to make the invalid states impossible.
  // As a bonus, each cron's candidate query filters on exactly these columns,
  // so call campaigns are self-excluded. These simple same-row CHECKs are only
  // possible because `type` lives on this table. (Autoassignment is NOT pinned:
  // call campaigns use it to hand volunteers shifts of dialer contacts.)
  await knex.raw(`
    alter table all_campaign
      add constraint call_campaigns_no_autosend
        check (type <> 'call' or autosend_status = 'unstarted'),
      add constraint call_campaigns_no_stale_release
        check (type <> 'call' or replies_stale_after_minutes is null);
  `);

  // NOTE: the `campaign` view is intentionally NOT recreated to expose `type`.
  // Every read of campaignType goes through the single-campaign loader, which
  // reads all_campaign directly. If a campaigns-list/conversations query ever
  // needs campaignType, expose `type` on the `campaign` view (or read
  // all_campaign in that query) at that point.
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
  await knex.schema.alterTable("all_campaign", (table) => {
    table.dropColumn("type");
  });
};
