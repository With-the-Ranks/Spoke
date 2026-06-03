/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.alterTable("all_campaign", (table) => {
    table.enu("type", ["sms", "call"]).notNullable().defaultTo("sms");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.alterTable("all_campaign", (table) => {
    table.dropColumn("type");
  });
};
