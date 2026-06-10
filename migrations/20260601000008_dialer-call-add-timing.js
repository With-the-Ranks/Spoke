/**
 * Record when a dialer call actually connected. Talk duration is then derived
 * as ended_at - answered_at (created_at is the queue/dial-click time, which
 * includes ring time, so it isn't a reliable start for talk duration).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("dialer_call", (table) => {
    table.timestamp("answered_at").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable("dialer_call", (table) => {
    table.dropColumn("answered_at");
  });
};
