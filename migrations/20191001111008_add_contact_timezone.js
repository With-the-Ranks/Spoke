exports.up = function(knex, Promise) {
  return knex.schema
    .alterTable("campaign_contact", table => {
      table.string("timezone").index(); // indexing it makes the backfill script much faster
    })
    .then(() =>
      knex.schema.raw(`
        create or replace function contact_is_textable_now(timezone text, start integer, stop integer, allow_null boolean) returns boolean as $$
          select allow_null
            or extract(hour from (CURRENT_TIMESTAMP at time zone timezone)) > start
            and extract(hour from (CURRENT_TIMESTAMP at time zone timezone)) < stop
        $$ language sql;
      `)
    );
};

exports.down = function(knex, Promise) {
  return knex.schema.alterTable("campaign_contact", table => {
    table.dropColumn("timezone");
  });
};
