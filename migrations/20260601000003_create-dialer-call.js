/**
 * One row per call attempt against a dialer contact. The dialer analogue of the
 * `message` table. from_number records the caller ID used.
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
      .inTable("dialer_campaign_contact");
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
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("ended_at").nullable();
    // Mirror message's indexes: one for lookups by contact, one for recent-call
    // queries. The composite (contact_id, status) index also covers the NOT EXISTS
    // subqueries that filter callable contacts by active/terminal call status.
    table.index(
      ["dialer_campaign_contact_id", "status"],
      "dialer_call_contact_status_idx"
    );
    table.index("created_at", "dialer_call_created_at_idx");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.dropTable("dialer_call");
};
