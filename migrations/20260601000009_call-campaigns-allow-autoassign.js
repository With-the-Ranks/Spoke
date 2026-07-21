/**
 * Call campaigns DO use autoassignment — it's how volunteers are handed shifts
 * of dialer contacts to call. Drop the guard added in 20260601000001 that
 * pinned is_autoassign_enabled = false for call campaigns.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw(`
    alter table all_campaign
      drop constraint if exists call_campaigns_no_autoassign;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw(`
    alter table all_campaign
      add constraint call_campaigns_no_autoassign
        check (type <> 'call' or is_autoassign_enabled = false);
  `);
};
