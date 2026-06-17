/**
 * Per-contact call tracking for the dialer. call_status drives the
 * "next contact to serve" queries (not_attempted / no_answer are callable) and
 * records the volunteer's final disposition; attempt_count and last_attempted_at
 * record dialing history.
 *
 * call_status is a plain text column rather than an enum: the allowed values are
 * driven by the volunteer-facing disposition list, which is still evolving.
 * Current values: not_attempted (default), in_progress, answered, no_answer,
 * voicemail, busy, do_not_call.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("dialer_campaign_contact", (table) => {
    table.text("call_status").notNullable().defaultTo("not_attempted");
    table.integer("attempt_count").notNullable().defaultTo(0);
    table.timestamp("last_attempted_at").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable("dialer_campaign_contact", (table) => {
    table.dropColumn("call_status");
    table.dropColumn("attempt_count");
    table.dropColumn("last_attempted_at");
  });
};
