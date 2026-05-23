/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.alterTable("campaign_contact_upload", (table) => {
    table.text("contacts_filename").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.alterTable("campaign_contact_upload", (table) => {
    table.dropColumn("contacts_filename");
  });
};
