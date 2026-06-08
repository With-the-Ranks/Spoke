/**
 * Survey answers captured during a call. The dialer analogue of
 * question_response: it FKs the dialer contact, but reuses the SHARED
 * interaction_step (the script tree is campaign-level and channel-agnostic).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("dialer_question_response", (table) => {
    table.increments("id").primary();
    table
      .integer("dialer_campaign_contact_id")
      .notNullable()
      .references("id")
      .inTable("dialer_campaign_contact")
      .onDelete("CASCADE");
    table
      .integer("interaction_step_id")
      .notNullable()
      .references("id")
      .inTable("interaction_step")
      .onDelete("CASCADE");
    table.text("value").notNullable();
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable();
    table.index("dialer_campaign_contact_id");
  });

  // Mirror question_response: at most one live answer per (step, contact).
  await knex.raw(`
    create unique index dialer_qr_step_contact_idx
      on dialer_question_response (interaction_step_id, dialer_campaign_contact_id)
      where is_deleted = false;

    create index dialer_qr_interaction_step_id_idx
      on dialer_question_response (interaction_step_id);

    create index dialer_qr_is_deleted_idx
      on dialer_question_response (is_deleted);

    create trigger _500_dialer_question_response_updated_at
      before update
      on dialer_question_response
      for each row
      execute procedure universal_updated_at();
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw(`
    drop trigger if exists _500_dialer_question_response_updated_at on dialer_question_response;
  `);
  return knex.schema.dropTable("dialer_question_response");
};
