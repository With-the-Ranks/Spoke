const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

let logger;
try {
  logger = require("../../src/logger");
} catch {
  logger = require(`${__dirname}/../../build/src/logger`);
}

const STAGING_DIR = __dirname;

// Tables in insertion order (reverse for truncation)
const TABLES = [
  { file: "01-organizations.csv", table: "organization" },
  { file: "02-users.csv", table: "user" },
  { file: "03-user-organizations.csv", table: "user_organization" },
  { file: "04-campaigns.csv", table: "campaign" },
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
    dynamicTyping: true
  });
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse ${filename}: ${JSON.stringify(errors)}`
    );
  }
  return data;
};

const cleanRow = (row) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(row)) {
    cleaned[key] = value === "" ? null : value;
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
    await knex.raw(`TRUNCATE TABLE "${table}" CASCADE`);
    logger.info(`Truncated ${table}`);
  }

  // Reset sequences
  for (const { table } of TABLES) {
    await knex.raw(
      `ALTER SEQUENCE IF EXISTS ${table}_id_seq RESTART WITH 1`
    );
  }
  logger.info("Reset sequences");

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
  for (const { table } of TABLES) {
    await knex.raw(`
      SELECT setval(
        '${table}_id_seq',
        COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
        false
      )
    `);
  }
  logger.info("Advanced sequences past seeded IDs");

  logger.info("Staging seed complete!");
};
