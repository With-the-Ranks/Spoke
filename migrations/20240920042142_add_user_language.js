/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function up(knex) {
  return knex.schema.alterTable("user", (t) => {
    t.enu("language", ["en", "es"]).notNullable().defaultTo("en");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.schema.alterTable("user", (t) => {
    t.dropColumn("language");
  });
};
