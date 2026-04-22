let logger;
try {
  logger = require("../src/logger");
} catch {
  logger = require(`${__dirname}/../build/src/logger`);
}

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

exports.seed = async function seed(knex) {
  const baseUrl = process.env.BASE_URL || "";
  if (!baseUrl.includes("dev")) {
    throw new Error(
      `Refusing to seed: BASE_URL "${baseUrl}" does not contain "dev". ` +
        "This seed is only intended for dev environments."
    );
  }

  logger.info("Starting dev seed (campaign stats data)...");

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
      external_id: `dev-${i}`,
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
    `Dev seed complete — contacts: ${insertedContacts.length}, sent: ${sent}, replies: ${replies}, opt-outs: ${optOutRows.length}, survey responses: ${questionResponseRows.length}`
  );
};
