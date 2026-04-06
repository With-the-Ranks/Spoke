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

// ── Campaign stats seed constants ─────────────────────────────────────────────
const CAMPAIGN_ID = 1;
const ORGANIZATION_ID = 1;
const ASSIGNMENT_ID = 1;
const USER_ID = 3;

const FIRST_NAMES = [
  "Maria", "James", "Patricia", "Robert", "Jennifer", "Michael",
  "Linda", "William", "Barbara", "David", "Elizabeth", "Richard",
  "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles",
  "Karen", "Christopher"
];
const LAST_NAMES = [
  "Garcia", "Johnson", "Smith", "Williams", "Brown", "Jones",
  "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson",
  "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
  "Martinez", "Robinson"
];
const ZIPS = [
  "10001", "60601", "77001", "85001", "30301",
  "94101", "19101", "78201", "98101", "80201"
];
const TIMEZONES = ["US/Eastern", "US/Central", "US/Mountain", "US/Pacific"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const weightedPick = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [val, w] of pairs) {
    r -= w;
    if (r <= 0) return val;
  }
  return pairs[pairs.length - 1][0];
};

const fakeCell = (i) => `+1${5550200000 + i}`;
const fakeUserNumber = "+15551000003";

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
  { file: "08-messages.csv", table: "message" }
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
    for (const { table, sequence } of TABLES) {
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

  // ── Phase 2: generate campaign stats data ──────────────────────────────────
  logger.info("Generating campaign stats data...");

  // Clear existing question responses and interaction steps for this campaign
  await knex("all_question_response")
    .whereIn(
      "interaction_step_id",
      knex("interaction_step").select("id").where({ campaign_id: CAMPAIGN_ID })
    )
    .delete();
  await knex("interaction_step").where({ campaign_id: CAMPAIGN_ID }).delete();

  const [rootStep] = await knex("interaction_step")
    .insert({
      campaign_id: CAMPAIGN_ID,
      question: "Will they attend the event?",
      script_options: [
        "Hi {firstName}! This is {texterFirstName} from With the Ranks. We're hosting a community event on Saturday. Will you be able to attend?"
      ],
      parent_interaction_id: null,
      answer_option: "",
      answer_actions: "",
      is_deleted: false
    })
    .returning("id");

  const rootId = rootStep.id ?? rootStep;

  const answerOptions = [
    "YES they will attend",
    "NO they will not attend the event / Not Interested",
    "NO they will not attend the event / Supports Bernie",
    "MAYBE they will attend",
    "Already RSVPed",
    "Interested",
    "Refused/Angry",
    "Wrong Number",
    "Wrong Number / wants to attend event",
    "Moved"
  ];

  const answerStepIds = [];
  for (const option of answerOptions) {
    const [step] = await knex("interaction_step")
      .insert({
        campaign_id: CAMPAIGN_ID,
        question: "",
        script_options: [
          `Thanks for letting us know! ${option.startsWith("YES") ? "We'll see you Saturday!" : "Have a great day!"}`
        ],
        parent_interaction_id: rootId,
        answer_option: option,
        answer_actions: "",
        is_deleted: false
      })
      .returning("id");
    answerStepIds.push({ option, id: step.id ?? step });
  }

  // Clear existing contacts/messages/opt-outs for this campaign
  await knex("all_question_response")
    .whereIn(
      "campaign_contact_id",
      knex("campaign_contact").select("id").where({ campaign_id: CAMPAIGN_ID })
    )
    .delete();
  await knex("message")
    .whereIn(
      "campaign_contact_id",
      knex("campaign_contact").select("id").where({ campaign_id: CAMPAIGN_ID })
    )
    .delete();
  await knex("campaign_contact").where({ campaign_id: CAMPAIGN_ID }).delete();
  await knex("opt_out").where({ organization_id: ORGANIZATION_ID }).delete();

  const TOTAL_CONTACTS = 500;
  const statusWeights = [
    ["messaged", 0.55],
    ["convo", 0.20],
    ["closed", 0.10],
    ["needsResponse", 0.05],
    ["needsMessage", 0.05],
    ["closed", 0.05]
  ];
  const OPT_OUT_COUNT = 45;
  const contactRows = [];

  for (let i = 0; i < TOTAL_CONTACTS; i++) {
    const status = weightedPick(statusWeights);
    const isOptedOut = i < OPT_OUT_COUNT;
    contactRows.push({
      campaign_id: CAMPAIGN_ID,
      assignment_id: ASSIGNMENT_ID,
      first_name: pick(FIRST_NAMES),
      last_name: pick(LAST_NAMES),
      cell: fakeCell(i),
      zip: pick(ZIPS),
      external_id: `staging-${i}`,
      custom_fields: "{}",
      message_status: isOptedOut ? "closed" : status,
      is_opted_out: isOptedOut,
      timezone: pick(TIMEZONES)
    });
  }

  const BATCH = 100;
  const insertedContacts = [];
  for (let i = 0; i < contactRows.length; i += BATCH) {
    const rows = await knex("campaign_contact")
      .insert(contactRows.slice(i, i + BATCH))
      .returning("*");
    insertedContacts.push(...rows);
  }

  const messageRows = [];
  const questionResponseRows = [];
  let msgServiceId = 1000;

  for (const contact of insertedContacts) {
    if (contact.message_status === "needsMessage" || contact.is_opted_out) {
      continue;
    }

    const sendStatus = weightedPick([
      ["DELIVERED", 0.75],
      ["SENT", 0.20],
      ["ERROR", 0.05]
    ]);

    messageRows.push({
      user_number: fakeUserNumber,
      user_id: USER_ID,
      contact_number: contact.cell,
      is_from_contact: false,
      text: `Hi ${contact.first_name}! This is a volunteer from With the Ranks. We're hosting a community event on Saturday. Will you be able to attend?`,
      service_response: "[]",
      assignment_id: ASSIGNMENT_ID,
      service: "fakeservice",
      service_id: `fake-out-${msgServiceId++}`,
      send_status: sendStatus,
      campaign_contact_id: contact.id,
      error_codes:
        sendStatus === "ERROR"
          ? [
              weightedPick([
                ["11751", 0.4],
                ["30007", 0.3],
                ["30003", 0.2],
                ["21211", 0.1]
              ])
            ]
          : null
    });

    if (
      contact.message_status === "convo" ||
      contact.message_status === "needsResponse"
    ) {
      const answerStep = pick(answerStepIds);
      const replyTexts = {
        "YES they will attend": "Yes I'll be there!",
        "NO they will not attend the event / Not Interested":
          "No thanks, not interested.",
        "NO they will not attend the event / Supports Bernie":
          "I support Bernie, not attending.",
        "MAYBE they will attend": "Maybe, I'll try to make it.",
        "Already RSVPed": "Already signed up!",
        Interested: "Interested, send more info.",
        "Refused/Angry": "Stop texting me!",
        "Wrong Number": "Wrong number.",
        "Wrong Number / wants to attend event":
          "Wrong number but I want to come!",
        Moved: "I moved away."
      };

      messageRows.push({
        user_number: contact.cell,
        user_id: null,
        contact_number: fakeUserNumber,
        is_from_contact: true,
        text: replyTexts[answerStep.option] || "I'll check my schedule.",
        service_response: "[]",
        assignment_id: ASSIGNMENT_ID,
        service: "fakeservice",
        service_id: `fake-in-${msgServiceId++}`,
        send_status: "DELIVERED",
        campaign_contact_id: contact.id,
        error_codes: null
      });

      questionResponseRows.push({
        campaign_contact_id: contact.id,
        interaction_step_id: rootId,
        value: answerStep.option,
        is_deleted: false
      });
    }
  }

  for (let i = 0; i < messageRows.length; i += BATCH) {
    await knex("message").insert(messageRows.slice(i, i + BATCH));
  }
  for (let i = 0; i < questionResponseRows.length; i += BATCH) {
    await knex("all_question_response").insert(
      questionResponseRows.slice(i, i + BATCH)
    );
  }

  const optOutRows = insertedContacts
    .filter((c) => c.is_opted_out)
    .map((c) => ({
      cell: c.cell,
      assignment_id: ASSIGNMENT_ID,
      organization_id: ORGANIZATION_ID,
      reason_code: ""
    }));
  if (optOutRows.length > 0) {
    await knex("opt_out").insert(optOutRows);
  }

  const sent = messageRows.filter(
    (m) => !m.is_from_contact && m.send_status !== "ERROR"
  ).length;
  const replies = messageRows.filter((m) => m.is_from_contact).length;

  logger.info(
    `Campaign stats seed complete — contacts: ${insertedContacts.length}, sent: ${sent}, replies: ${replies}, opt-outs: ${optOutRows.length}, survey responses: ${questionResponseRows.length}`
  );
};