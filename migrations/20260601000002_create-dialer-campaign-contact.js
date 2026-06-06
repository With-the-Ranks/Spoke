/**
 * Standalone contacts table for dialer (Call) campaigns. Deliberately separate
 * from campaign_contact so dialer contacts never carry texting-only columns
 * (message_status, is_opted_out, autosend). Reuses the shared `assignment` table
 * via assignment_id so the existing assignment plumbing still applies.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.createTable("dialer_campaign_contact", (table) => {
    table.increments("id").primary();
    table
      .integer("campaign_id")
      .notNullable()
      .references("id")
      .inTable("all_campaign")
      .onDelete("CASCADE");
    table
      .integer("assignment_id")
      .nullable()
      .references("id")
      .inTable("assignment")
      .onDelete("SET NULL");
    // Contact identity (owned here, not via campaign_contact)
    table.text("external_id");
    table.text("first_name").notNullable();
    table.text("last_name").notNullable();
    table.text("cell").notNullable();
    table.text("zip");
    table.text("timezone");
    table.jsonb("custom_fields").notNullable().defaultTo("{}");
    // Dialer state
    table
      .enu("call_status", [
        "not_attempted",
        "queued",
        "in_progress",
        "completed",
        "no_answer",
        "voicemail",
        "error"
      ])
      .notNullable()
      .defaultTo("not_attempted");
    table.boolean("do_not_call").notNullable().defaultTo(false);
    table.integer("attempt_count").notNullable().defaultTo(0);
    table.timestamp("last_attempted_at").nullable();
    table.boolean("archived").notNullable().defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable();
    table.index("campaign_id");
    table.index("assignment_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.dropTable("dialer_campaign_contact");
};
