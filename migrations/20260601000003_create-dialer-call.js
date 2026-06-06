/**
 * One row per call attempt against a dialer contact. The dialer analogue of the
 * `message` table. from_number records the caller ID used;
 * disposition is the volunteer-recorded outcome.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.createTable("dialer_call", (table) => {
    table.increments("id").primary();
    table
      .integer("dialer_campaign_contact_id")
      .notNullable()
      .references("id")
      .inTable("dialer_campaign_contact")
      .onDelete("CASCADE");
    table.integer("user_id").notNullable().references("id").inTable("user");
    table.text("telnyx_call_control_id").nullable();
    table.text("from_number").nullable();
    table
      .enu("status", [
        "QUEUED",
        "DIALING",
        "IN_PROGRESS",
        "COMPLETED",
        "NO_ANSWER",
        "VOICEMAIL",
        "ERROR"
      ])
      .notNullable()
      .defaultTo("QUEUED");
    table.text("disposition").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("ended_at").nullable();
    table.index("dialer_campaign_contact_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.dropTable("dialer_call");
};
