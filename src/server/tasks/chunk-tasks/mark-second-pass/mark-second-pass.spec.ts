import {
  createCompleteCampaign,
  createMessage
} from "__test__/testbed-preparation/core";
import { runTaskListOnce } from "graphile-worker";
import { Pool } from "pg";

import { config } from "../../../../config";
import { MessageStatusType } from "../../../api/types";
import { withClient } from "../../../utils";
import { markSecondPass, TASK_IDENTIFIER } from ".";
import type { MarkSecondPassPayload } from "./utils";

interface TestSecondPassMarkingOptions {
  unmark?: boolean;
  createInitials?: boolean;
  markNeedsResponse?: boolean;
  testExcludeNewer?: boolean;
  testExcludeRecentlyTexted?: boolean;
}

const testSecondPassMarking = async (
  pool: Pool,
  options: TestSecondPassMarkingOptions
) => {
  const NUM_CONTACTS = 5;
  const {
    unmark,
    createInitials,
    markNeedsResponse,
    testExcludeNewer,
    testExcludeRecentlyTexted
  } = options;

  await withClient(pool, async (client) => {
    const campaign = await createCompleteCampaign(client, {
      contacts: Array(NUM_CONTACTS).fill({
        messageStatus: markNeedsResponse
          ? MessageStatusType.NeedsResponse
          : unmark
          ? MessageStatusType.NeedsMessage
          : MessageStatusType.Messaged
      }),
      texters: 1
    });

    const { contacts, assignments } = campaign;

    if (createInitials) {
      for (const contact of contacts) {
        await createMessage(client, {
          campaignContactId: contact.id,
          assignmentId: assignments[0].id
        });
      }
    }

    if (testExcludeNewer) {
      await createCompleteCampaign(client, { contacts });
    }

    const { id: campaignId, title: campaignTitle } = campaign.campaign;

    const payload: MarkSecondPassPayload = {
      organizationId: campaign.organization.id,
      campaignId,
      campaignTitle,
      requesterId: campaign.texters[0].id,
      unmark,
      excludeNewer: testExcludeNewer
    };
    if (testExcludeRecentlyTexted) payload.excludeAgeInHours = 1;

    await client.query(`select graphile_worker.add_job($1, $2)`, [
      TASK_IDENTIFIER,
      payload
    ]);

    await runTaskListOnce(
      { pgPool: pool },
      { [TASK_IDENTIFIER]: markSecondPass },
      client
    );

    const { rows: contactRows } = await client.query(
      `
          select message_status from campaign_contact
          where campaign_id = $1;
      `,
      [campaignId]
    );

    const expectedStatus = markNeedsResponse
      ? MessageStatusType.NeedsResponse
      : testExcludeNewer ||
        testExcludeRecentlyTexted ||
        (unmark && createInitials)
      ? MessageStatusType.Messaged
      : MessageStatusType.NeedsMessage;

    for (const contact of contactRows)
      expect(contact.message_status).toBe(expectedStatus);
  });
};

describe("second pass marking", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: config.TEST_DATABASE_URL });
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("marks second pass for all messaged contacts", async () => {
    testSecondPassMarking(pool, {});
  });

  it("unmarks second pass for contacts with initial sent", async () => {
    testSecondPassMarking(pool, { unmark: true, createInitials: true });
  });

  it("unmark second pass doesn't affect contacts without initial sent", async () => {
    testSecondPassMarking(pool, { unmark: true, createInitials: false });
  });

  it("mark second pass doesn't affect contacts marked as needs response", async () => {
    testSecondPassMarking(pool, { markNeedsResponse: true });
  });

  it("unmark second pass doesn't affect contacts marked as needs response", async () => {
    testSecondPassMarking(pool, { unmark: true, markNeedsResponse: true });
  });

  it("mark second pass excludes contacts on newer campaign when specified", async () => {
    testSecondPassMarking(pool, { testExcludeNewer: true });
  });

  it("mark second pass excludes recently texted contacts when specified", async () => {
    testSecondPassMarking(pool, {
      createInitials: true,
      testExcludeRecentlyTexted: true
    });
  });
});
