import {
  assignContacts,
  createCompleteCampaign,
  createMessagingService
} from "__test__/testbed-preparation/core";
import type { MessageInput } from "@spoke/spoke-codegen";
import type { RequestBodyMatcher } from "nock";
import nock from "nock";
import type { PoolClient } from "pg";
import { Pool } from "pg";
import type { SuperAgentTest } from "supertest";
import supertest from "supertest";

import type { CreateOrgAndSessionOptions } from "../../../../__test__/lib/session";
import { createOrgAndSession } from "../../../../__test__/lib/session";
import { UserRoleType } from "../../../api/organization-membership";
import { config } from "../../../config";
import { createApp } from "../../app";
import { withClient } from "../../utils";

const sendMessage = async (
  agent: supertest.SuperAgentTest,
  cookies: Record<string, string>,
  campaignContactId: number,
  message: MessageInput
) => {
  await agent
    .post(`/graphql`)
    .set(cookies)
    .send({
      operationName: "sendMessage",
      variables: {
        message,
        campaignContactId: campaignContactId.toString()
      },
      query: `
        mutation sendMessage($message: MessageInput!, $campaignContactId: String!) {
          sendMessage(message: $message, campaignContactId: $campaignContactId) {
            id
          }
        }
      `
    });
};

const sendAssembleNumbersMessage = async (
  agent: SuperAgentTest,
  cookies: Record<string, string>,
  completeCampaign: Awaited<ReturnType<typeof createCompleteCampaign>>,
  text: string
) => {
  const contact = completeCampaign.contacts[0];
  const message: MessageInput = {
    assignmentId: completeCampaign.assignments[0].id.toString(),
    contactNumber: contact.cell,
    text
  };

  return sendMessage(agent, cookies, contact.id, message);
};

const createTestBed = async (
  client: PoolClient,
  agent: supertest.SuperAgentTest,
  opts?: { disableMmsConversion?: boolean }
) => {
  const options: CreateOrgAndSessionOptions = {
    agent,
    role: UserRoleType.OWNER
  };

  if (opts?.disableMmsConversion)
    options.orgOptions = { features: { maxSmsSegmentLength: null } };

  const { organization, user, cookies } = await createOrgAndSession(
    client,
    options
  );

  await createMessagingService(client, {
    organizationId: organization.id,
    active: true
  });

  const completeCampaign = await createCompleteCampaign(client, {
    texters: 1,
    contacts: 1,
    organization
  });

  const {
    assignments: [assignment],
    campaign
  } = completeCampaign;

  await assignContacts(client, assignment.id, campaign.id, 1);

  return { organization, user, cookies, completeCampaign };
};

type testAssembleNumbersSendMessageOptions = {
  disableMmsConversion: boolean;
  text: string;
  requestBodyMatcher: RequestBodyMatcher;
};

const testAssembleNumbersSendMessage = async (
  pool: Pool,
  agent: SuperAgentTest,
  opts: testAssembleNumbersSendMessageOptions
) => {
  const { disableMmsConversion } = opts;

  const testbed = await withClient(pool, async (client) => {
    return createTestBed(client, agent, { disableMmsConversion });
  });
  const { cookies, completeCampaign } = testbed;

  const TEST_SWITCHBOARD_URL = "https://numbers.assemble.live";
  nock(TEST_SWITCHBOARD_URL)
    .post("/sms/graphql", opts.requestBodyMatcher)
    .reply(200);

  await sendAssembleNumbersMessage(agent, cookies, completeCampaign, opts.text);
};

describe("assemble numbers messages", () => {
  const LONG_SMS =
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";
  const SHORT_TEXT = "Hi";
  const MMS_URL = "https://i.imgur.com/xxxV8Jo.png";

  let pool: Pool;
  let agent: supertest.SuperAgentTest;

  beforeAll(async () => {
    pool = new Pool({ connectionString: config.TEST_DATABASE_URL });
    const app = await createApp();
    agent = supertest.agent(app);
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("assigns body for sms", async () => {
    await testAssembleNumbersSendMessage(pool, agent, {
      disableMmsConversion: false,
      text: `[${MMS_URL}]${SHORT_TEXT}`,
      requestBodyMatcher: (requestBody) =>
        requestBody.variables.body === SHORT_TEXT
    });

    expect(nock.isDone()).toBe(true);
  });

  it("assigns media url and body for mms", async () => {
    await testAssembleNumbersSendMessage(pool, agent, {
      disableMmsConversion: false,
      text: `[${MMS_URL}]${SHORT_TEXT}`,
      requestBodyMatcher: (requestBody) => {
        const { body: msgBody, mediaUrls } = requestBody.variables;
        return msgBody === SHORT_TEXT && mediaUrls[0] === MMS_URL;
      }
    });

    expect(nock.isDone()).toBe(true);
  });

  it("does not convert sms to mms for org with mms conversion disabled", async () => {
    await testAssembleNumbersSendMessage(pool, agent, {
      disableMmsConversion: true,
      text: LONG_SMS,
      requestBodyMatcher: (body) => body.variables.mediaUrls === undefined
    });

    expect(nock.isDone()).toBe(true);
  });

  it("converts long sms to mms for org with mms conversion enabled", async () => {
    await testAssembleNumbersSendMessage(pool, agent, {
      disableMmsConversion: false,
      text: LONG_SMS,
      requestBodyMatcher: (body) => body.variables.mediaUrls.length === 0
    });

    expect(nock.isDone()).toBe(true);
  });

  it("does not convert short sms to mms for org with mms conversion enabled", async () => {
    await testAssembleNumbersSendMessage(pool, agent, {
      disableMmsConversion: false,
      text: SHORT_TEXT,
      requestBodyMatcher: (body) => body.variables.mediaUrls === undefined
    });

    expect(nock.isDone()).toBe(true);
  });
});
