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

const STAGING_DIR = path.join(__dirname, "staging-copy");

// Tables in insertion order (reverse for truncation).
// The CSV header row defines the column names — no explicit column list needed.
const TABLES = [
  { file: "01-organizations.csv", table: "organization" },
  { file: "02-users.csv", table: "user" },
  { file: "03-user-organizations.csv", table: "user_organization" },
  { file: "04-campaigns.csv", table: "all_campaign", sequence: "campaign_id_seq" },
  { file: "05-interaction-steps.csv", table: "interaction_step" },
  { file: "06-assignments.csv", table: "assignment" },
  { file: "07-campaign-contacts.csv", table: "campaign_contact" },
  { file: "08-messages.csv", table: "message" }
];

// Inserts CSV data using Postgres COPY command.
//
// CSV null/empty semantics (handled natively by Postgres, no custom parsing):
//   - Unquoted empty field (,,)  → SQL NULL
//   - Quoted empty field (,"",)  → empty string ''
//   - All type coercion (string → int, string → boolean, etc.) is handled
//     natively by Postgres, so CSV values like "true" and "9" just work.
//
// The HEADER option tells Postgres to read and skip the first row,
// using it to determine column mapping.
const copyInsert = async (knex, { file, table }) => {
  const filePath = path.join(STAGING_DIR, file);
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });

  const copyQuery = `COPY "${table}" FROM STDIN WITH (FORMAT csv, HEADER true)`;

  // Get raw pg client from knex connection pool
  const client = await knex.client.acquireConnection();
  try {
    const stream = client.query(copyFrom(copyQuery));
    await pipeline(Readable.from(content), stream);
  } finally {
    await knex.client.releaseConnection(client);
  }
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

  // Truncate in reverse order to respect foreign keys
  const reversedTables = [...TABLES].reverse();
  for (const { table } of reversedTables) {
    await knex.raw(`TRUNCATE TABLE "${table}" CASCADE`);
    logger.info(`Truncated ${table}`);
  }

  // Reset sequences
  for (const { table, sequence } of TABLES) {
    const seqName = sequence || `${table}_id_seq`;
    await knex.raw(`ALTER SEQUENCE IF EXISTS ${seqName} RESTART WITH 1`);
  }
  logger.info("Reset sequences");

  // Insert via COPY
  for (const entry of TABLES) {
    await copyInsert(knex, entry);
    logger.info(`Copied ${entry.file} into ${entry.table}`);
  }

  // Advance sequences past the explicitly set IDs
  for (const { table, sequence } of TABLES) {
    const seqName = sequence || `${table}_id_seq`;
    await knex.raw(`
      SELECT setval(
        '${seqName}',
        COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
        false
      )
    `);
  }
  logger.info("Advanced sequences past seeded IDs");

  logger.info("Staging seed complete!");
};
