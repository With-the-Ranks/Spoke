const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

let logger;
try {
  logger = require("../src/logger");
} catch {
  logger = require(`${__dirname}/../build/src/logger`);
}

const STAGING_DIR = path.join(__dirname, "staging");

const TABLES = [
  { file: "01-organizations.csv", table: "organization" },
  { file: "02-users.csv", table: "user" },
  { file: "03-user-organizations.csv", table: "user_organization" },
  {
    file: "04-campaigns.csv",
    table: "all_campaign",
    sequence: "campaign_id_seq"
  },
  { file: "05-interaction-steps.csv", table: "interaction_step" },
  { file: "06-assignments.csv", table: "assignment" },
  { file: "07-campaign-contacts.csv", table: "campaign_contact" },
  { file: "08-messages.csv", table: "message" }
];

const loadCsv = (filename) => {
  const content = fs.readFileSync(path.join(STAGING_DIR, filename), {
    encoding: "utf-8"
  });
  const { data, errors } = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse ${filename}: ${JSON.stringify(errors)}`
    );
  }
  return data;
};

/*
 * Clean a parsed CSV row for insertion:
 *   - Empty string or null values are omitted so the DB column default applies
 *   - This works because Knex omits missing keys from the INSERT
 */
const cleanRow = (row) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === "" || value === null) continue;
    cleaned[key] = value;
  }
  return cleaned;
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
    await knex.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    logger.info(`Truncated ${table}`);
  }

  // Insert in order
  for (const { file, table } of TABLES) {
    const rows = loadCsv(file).map(cleanRow);
    if (rows.length === 0) {
      logger.info(`Skipping ${table} (no rows)`);
      continue;
    }
    await knex.batchInsert(table, rows);
    logger.info(`Inserted ${rows.length} rows into ${table}`);
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
