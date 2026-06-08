/**
 * Standalone contacts table for dialer (Call) campaigns. Deliberately separate
 * from campaign_contact so dialer contacts never carry texting-only columns
 * (message_status, is_opted_out, autosend). Reuses the shared `assignment` table
 * via assignment_id so the existing assignment plumbing still applies.
 *
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("dialer_campaign_contact", (table) => {
    table.increments("id").primary();
    table
      .integer("campaign_id")
      .notNullable()
      .references("id")
      .inTable("all_campaign");
    table
      .integer("assignment_id")
      .nullable()
      .references("id")
      .inTable("assignment");
    // Contact identity (owned here, not via campaign_contact)
    table.text("external_id");
    table.text("first_name").notNullable();
    table.text("last_name").notNullable();
    table.text("cell").notNullable();
    table.text("zip");
    table.text("timezone");
    table.text("custom_fields").notNullable().defaultTo("{}");
    // Dialer state
    table.boolean("do_not_call").notNullable().defaultTo(false);
    table.boolean("archived").notNullable().defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable();
  });

  await knex.raw(`
    -- Partial indexes mirror the campaign_contact pattern: only index live rows.
    create index dialer_campaign_contact_campaign_id_idx
      on dialer_campaign_contact (campaign_id)
      where archived = false;

    create index dialer_campaign_contact_assignment_id_idx
      on dialer_campaign_contact (assignment_id)
      where archived = false;

    -- Mirrors todos_partial_idx on campaign_contact for fast "next contact to call"
    -- queries by campaign, assignment, and do_not_call status.
    create index dialer_campaign_contact_todos_partial_idx
      on dialer_campaign_contact (campaign_id, assignment_id, do_not_call)
      where archived = false;

    -- One phone number per campaign (mirrors campaign_contact's cell+campaign_id unique constraint).
    alter table dialer_campaign_contact
      add constraint dialer_campaign_contact_cell_campaign_id_unique unique (cell, campaign_id);

    create trigger _500_dialer_campaign_contact_updated_at
      before update
      on dialer_campaign_contact
      for each row
      execute procedure universal_updated_at();

    create or replace function cascade_archived_to_dialer_campaign_contacts() returns trigger as $$
    begin
      update dialer_campaign_contact
      set archived = NEW.is_archived
      where campaign_id = NEW.id;
      return NEW;
    end;
    $$ language plpgsql strict set search_path from current;

    create trigger _500_cascade_archived_dialer_campaign
      after update
      on all_campaign
      for each row
      when (NEW.is_archived is distinct from OLD.is_archived)
      execute procedure cascade_archived_to_dialer_campaign_contacts();
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw(`
    drop trigger if exists _500_cascade_archived_dialer_campaign on all_campaign;
    drop function if exists cascade_archived_to_dialer_campaign_contacts;
    drop trigger if exists _500_dialer_campaign_contact_updated_at on dialer_campaign_contact;
  `);
  await knex.schema.dropTable("dialer_campaign_contact");
};
