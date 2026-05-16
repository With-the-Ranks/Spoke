const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");
const { from: copyFrom } = require("pg-copy-streams");

let logger;
try {
  logger = require("../src/logger");
} catch {
  logger = require(`${__dirname}/../build/src/logger`);
}

const STAGING_DIR = path.join(__dirname, "staging");

/*
 * Tables in insertion order (reverse for truncation).
 * The CSV header row defines the column names — no explicit column list needed.
 *
 * If a table's id sequence doesn't follow the default `<table>_id_seq` naming
 * convention, specify it with the `sequence` property (e.g. all_campaign uses
 * `campaign_id_seq` because the table was renamed from `campaign`).
 */
const TABLES = [
  { file: "01-organizations.csv", table: "organization" },
  { file: "02-users.csv", table: "user" },
  { file: "03-user-organizations.csv", table: "user_organization" },
  { file: "04-campaigns.csv", table: "all_campaign", sequence: "campaign_id_seq" },
  { file: "05-interaction-steps.csv", table: "interaction_step" },
  { file: "06-assignments.csv", table: "assignment" },
  { file: "07-campaign-contacts.csv", table: "campaign_contact" },
  { file: "08-messages.csv", table: "message" },
  { file: "09-messaging-services.csv", table: "messaging_service", skipSequence: true }
];

/*
 * Inserts CSV data using Postgres COPY command via pg-copy-streams.
 *
 * CSV null/empty semantics are handled natively by Postgres — no custom
 * parsing or sentinel values are needed:
 *
 *   Unquoted empty field (,,)  → SQL NULL
 *   Quoted empty field (,"",)  → empty string ''
 *
 * Type coercion (string → int, string → boolean, etc.) is also handled
 * natively by Postgres, so CSV values like "true" and "9" just work.
 *
 * The column list is read from the CSV header row and passed explicitly
 * in the COPY command. This is necessary because Postgres COPY's HEADER
 * option only skips the first row — it does NOT use it for column mapping.
 * Columns are mapped positionally to all table columns without an explicit
 * list, which breaks when the CSV has fewer columns than the table.
 */
const copyInsert = async (client, { file, table }) => {
  const filePath = path.join(STAGING_DIR, file);
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });

  /* Extract column names from the CSV header row */
  const headerLine = content.split("\n")[0];
  const columns = headerLine
    .trim()
    .split(",")
    .map((col) => `"${col}"`)
    .join(", ");

  const copyQuery = `COPY "${table}" (${columns}) FROM STDIN WITH (FORMAT csv, HEADER true)`;
  const stream = client.query(copyFrom(copyQuery));
  await pipeline(Readable.from(content), stream);
};

exports.seed = async function seed(knex) {
  const baseUrl = process.env.BASE_URL || "";
  if (!baseUrl.includes("staging")) {
    throw new Error(
      `Refusing to seed: BASE_URL "${baseUrl}" does not contain "staging". ` +
        "This seed is only intended for staging environments."
    );
  }

  logger.info("Starting staging seed...");

  /*
   * Use a raw pg client for the entire operation so that COPY commands
   * and the surrounding truncate/sequence operations all run within
   * a single transaction. If any step fails, everything rolls back
   * and the database is left in its pre-seed state.
   */
  const client = await knex.client.acquireConnection();
  try {
    await client.query("BEGIN");

    /* Truncate in reverse order to respect foreign keys.
     * RESTART IDENTITY resets the associated sequences to their initial values. */
    const reversedTables = [...TABLES].reverse();
    for (const { table } of reversedTables) {
      await client.query(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`
      );
      logger.info(`Truncated ${table}`);
    }

    /* Insert via COPY */
    for (const entry of TABLES) {
      await copyInsert(client, entry);
      logger.info(`Copied ${entry.file} into ${entry.table}`);
    }

    /*
     * Advance sequences past the explicitly set IDs so that future
     * application-generated rows (via DEFAULT / nextval) don't collide
     * with the seeded data.
     */
    for (const { table, sequence, skipSequence } of TABLES) {
      if (skipSequence) continue;
      const seqName = sequence || `${table}_id_seq`;
      await client.query(`
        SELECT setval(
          '${seqName}',
          COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
          false
        )
      `);
    }
    logger.info("Advanced sequences past seeded IDs");

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await knex.client.releaseConnection(client);
  }

  logger.info("Staging seed complete!");
};
