/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.createTable("call", (table) => {
    table.increments("id").primary();
    table
      .integer("campaign_contact_id")
      .notNullable()
      .references("id")
      .inTable("campaign_contact");
    table.integer("user_id").notNullable().references("id").inTable("user");
    table.text("telnyx_call_control_id").nullable();
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
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.dropTable("call");
};
