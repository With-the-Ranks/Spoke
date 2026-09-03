exports.up = function up(knex) {
  return knex.schema.alterTable("user_organization", (table) => {
    table
      .boolean("assignment_request_notifications")
      .notNullable()
      .defaultTo(false);
  });
};

exports.down = function down(knex) {
  return knex.schema.alterTable("user_organization", (table) => {
    table.dropColumn("assignment_request_notifications");
  });
};
