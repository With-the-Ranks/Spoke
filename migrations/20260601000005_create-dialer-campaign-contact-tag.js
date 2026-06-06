/**
 * Contact tags applied during a call. Mirrors campaign_contact_tag (tagger_id,
 * composite PK), but FKs the dialer contact. Reuses the SHARED tag vocabulary
 * (all_tag) and `user` so tags mean the same thing across texting and calling.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.createTable("dialer_campaign_contact_tag", (table) => {
    table
      .integer("dialer_campaign_contact_id")
      .notNullable()
      .references("id")
      .inTable("dialer_campaign_contact")
      .onDelete("CASCADE");
    table
      .integer("tag_id")
      .notNullable()
      .references("id")
      .inTable("all_tag")
      .onDelete("CASCADE");
    table.integer("tagger_id").notNullable().references("id").inTable("user");
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.primary(["dialer_campaign_contact_id", "tag_id"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.dropTable("dialer_campaign_contact_tag");
};
