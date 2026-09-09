const DEFAULT_AUTOSENDING_MPS = 3;

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("organization", (table) => {
    table.integer("autosending_mps").defaultTo(DEFAULT_AUTOSENDING_MPS).alter();
  });

  await knex("organization")
    .whereNull("autosending_mps")
    .update({ autosending_mps: DEFAULT_AUTOSENDING_MPS });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function down(knex) {
  return knex.raw(`
    alter table organization
    alter column autosending_mps
    drop default
  `);
};
