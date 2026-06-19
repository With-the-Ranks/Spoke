/**
 * Extends the action_type check constraint on action_external_system_sync to
 * include dialer action types introduced by the dialer feature.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw(`
    alter table action_external_system_sync
      drop constraint action_external_system_sync_action_type_check,
      add constraint action_external_system_sync_action_type_check
        check (action_type in ('question_response', 'opt_out', 'dialer_question_response', 'dialer_opt_out'));
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw(`
    alter table action_external_system_sync
      drop constraint action_external_system_sync_action_type_check,
      add constraint action_external_system_sync_action_type_check
        check (action_type in ('question_response', 'opt_out'));
  `);
};
