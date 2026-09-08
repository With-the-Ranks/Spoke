exports.up = async function up(knex) {
  // These shouldn't do anything, but just in case there are null values,
  // we want to set them to the default value before making the columns not nullable.
  await knex("all_campaign")
    .whereNull("is_started")
    .update({ is_started: false });
  // if there's somehow a null value for is_archived,
  // we want to set it to true so that the campaign doesn't show up in the UI
  await knex("all_campaign")
    .whereNull("is_archived")
    .update({ is_archived: true });
  await knex("all_campaign")
    .whereNull("texting_hours_start")
    .update({ texting_hours_start: 9 });
  await knex("all_campaign")
    .whereNull("texting_hours_end")
    .update({ texting_hours_end: 21 });
  await knex("all_campaign")
    .whereNull("timezone")
    .update({ timezone: "America/New_York" });
  // just picking the 1st user, no easy way to derive this
  await knex("all_campaign").whereNull("creator_id").update({ creator_id: 1 });

  return knex.schema.alterTable("all_campaign", (table) => {
    table
      .boolean("is_started")
      .notNullable()
      .defaultTo(false)
      .alter({ alterNullable: true, alterType: false });
    table
      .boolean("is_archived")
      .notNullable()
      .defaultTo(false)
      .alter({ alterNullable: true, alterType: false });
    table
      .integer("texting_hours_start")
      .notNullable()
      .defaultTo(9)
      .alter({ alterNullable: true, alterType: false });
    table
      .integer("texting_hours_end")
      .notNullable()
      .defaultTo(21)
      .alter({ alterNullable: true, alterType: false });
    table
      .text("timezone")
      .notNullable()
      .defaultTo("America/New_York")
      .alter({ alterNullable: true, alterType: false });
    table
      .integer("creator_id")
      .notNullable()
      .alter({ alterNullable: true, alterType: false });
  });
};

exports.down = function down(knex) {
  return knex.schema.alterTable("all_campaign", (table) => {
    table
      .boolean("is_started")
      .nullable()
      .alter({ alterNullable: true, alterType: false });
    table
      .boolean("is_archived")
      .nullable()
      .alter({ alterNullable: true, alterType: false });
    table
      .integer("texting_hours_start")
      .nullable()
      .defaultTo(9)
      .alter({ alterNullable: true, alterType: false });
    table
      .integer("texting_hours_end")
      .nullable()
      .defaultTo(21)
      .alter({ alterNullable: true, alterType: false });
    table
      .text("timezone")
      .nullable()
      .defaultTo("America/New_York")
      .alter({ alterNullable: true, alterType: false });
    table
      .integer("creator_id")
      .nullable()
      .alter({ alterNullable: true, alterType: false });
  });
};
