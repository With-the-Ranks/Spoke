/**
 * Contact tags applied during a call. Mirrors campaign_contact_tag (tagger_id,
 * composite PK), but FKs the dialer contact. Reuses the SHARED tag vocabulary
 * (all_tag) and `user` so tags mean the same thing across texting and calling.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("dialer_campaign_contact_tag", (table) => {
    table
      .integer("dialer_campaign_contact_id")
      .notNullable()
      .references("id")
      .inTable("dialer_campaign_contact");
    table.integer("tag_id").notNullable().references("id").inTable("all_tag");
    table.integer("tagger_id").notNullable().references("id").inTable("user");
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.primary(["dialer_campaign_contact_id", "tag_id"]);
  });

  await knex.raw(`
    create index dialer_campaign_contact_tag_contact_idx
      on dialer_campaign_contact_tag (dialer_campaign_contact_id);

    create index dialer_campaign_contact_tag_tag_id_idx
      on dialer_campaign_contact_tag (tag_id);

    create trigger _500_dialer_campaign_contact_tag_updated_at
      before update
      on dialer_campaign_contact_tag
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
    drop trigger if exists _500_dialer_campaign_contact_tag_updated_at on dialer_campaign_contact_tag;
    drop index if exists dialer_campaign_contact_tag_contact_idx;
    drop index if exists dialer_campaign_contact_tag_tag_id_idx;
  `);
  return knex.schema.dropTable("dialer_campaign_contact_tag");
};
