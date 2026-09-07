import { ErrorCode } from "@slack/web-api";
import type { JobHelpers } from "graphile-worker";
import { runTaskListOnce } from "graphile-worker";
import { Pool } from "pg";

import {
  createOrganization,
  createTeam,
  createTexter,
  createUserOrganization
} from "../../../__test__/testbed-preparation/core";
import { config } from "../../config";
import { withClient } from "../utils";
import {
  syncSlackTeamMembers,
  TASK_IDENTIFIER
} from "./sync-slack-team-members";

jest.mock("../lib/slack", () => ({
  botClient: {
    conversations: {
      list: jest.fn(),
      members: jest.fn()
    }
  }
}));

const mockBotClient = jest.requireMock("../lib/slack").botClient;

describe("sync-slack-team-members", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: config.TEST_DATABASE_URL });
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("should add new members to teams when they are in Slack channels", async () => {
    await withClient(pool, async (client) => {
      // Setup: Create test data
      const org = await createOrganization(client, {});
      const organizationId = org.id;

      // Create users with Slack auth0_ids
      const users = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTexter(client, { auth0Id: `slack_U00${i + 1}` })
        )
      );

      // Create teams
      const team1 = await createTeam(client, { organizationId });
      const team2 = await createTeam(client, { organizationId });

      // Add user1 to organization and team
      const user1 = users[0];
      await createUserOrganization(client, {
        userId: user1.id,
        organizationId: org.id
      });

      // Mock Slack API responses
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          },
          {
            id: "C002",
            name: "marketing-team",
            name_normalized: "marketing-team"
          }
        ],
        response_metadata: {}
      });

      mockBotClient.conversations.members
        .mockResolvedValueOnce({
          ok: true,
          members: ["slack_U001", "slack_U002", "slack_U003"],
          response_metadata: {}
        })
        .mockResolvedValueOnce({
          ok: true,
          members: ["slack_U004", "slack_U005"],
          response_metadata: {}
        });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      // Verify Engineering Team members
      const { rows: engMembers } = await client.query(
        `
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = $1
        ORDER BY u.auth0_id
      `,
        [team1.id]
      );

      expect(engMembers.map((m) => m.auth0_id)).toEqual([
        "slack_U001",
        "slack_U002",
        "slack_U003"
      ]);

      // Verify Marketing Team members
      const { rows: mktMembers } = await client.query(
        `
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = $1
        ORDER BY u.auth0_id
      `,
        [team2.id]
      );

      expect(mktMembers.map((m) => m.auth0_id)).toEqual([
        "slack_U004",
        "slack_U005"
      ]);

      // Verify organization memberships were created
      const { rows: orgMembers } = await client.query(
        `
        SELECT u.auth0_id, uo.role
        FROM user_organization uo
        JOIN public.user u ON uo.user_id = u.id
        WHERE uo.organization_id = $1
        ORDER BY u.auth0_id
      `,
        [org.id]
      );

      expect(orgMembers).toHaveLength(5);
      expect(orgMembers.every((m) => m.role === "TEXTER")).toBe(true);
    });
  });

  it("should remove members from teams when they are not in Slack channels", async () => {
    await withClient(pool, async (client) => {
      // Setup: Create test data
      const org = await createOrganization(client, {});

      // Create users with Slack auth0_ids
      const user1 = await createTexter(client, { auth0Id: "slack_U001" });
      const user2 = await createTexter(client, { auth0Id: "slack_U002" });
      const user3 = await createTexter(client, { auth0Id: "slack_U003" });

      // Create team
      const {
        rows: [team]
      } = await client.query(
        `
        INSERT INTO team (organization_id, title) VALUES ($1, 'Engineering Team') RETURNING *
      `,
        [org.id]
      );

      // Add all users to organization and team initially
      await createUserOrganization(client, {
        userId: user1.id,
        organizationId: org.id
      });
      await createUserOrganization(client, {
        userId: user2.id,
        organizationId: org.id
      });
      await createUserOrganization(client, {
        userId: user3.id,
        organizationId: org.id
      });

      await client.query(
        `
        INSERT INTO user_team (user_id, team_id)
        VALUES ($1, $2), ($3, $2), ($4, $2)
      `,
        [user1.id, team.id, user2.id, user3.id]
      );

      // Mock Slack API - only U001 remains in channel
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          }
        ],
        response_metadata: {}
      });

      mockBotClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ["slack_U001"],
        response_metadata: {}
      });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      // Verify only U001 remains
      const { rows: remainingMembers } = await client.query(
        `
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = $1
      `,
        [team.id]
      );
      expect(remainingMembers).toHaveLength(1);
      expect(remainingMembers[0].auth0_id).toBe("slack_U001");
    });
  });

  it("should handle both additions and removals in a single sync", async () => {
    await withClient(pool, async (client) => {
      // Setup: Create test data
      const org = await createOrganization(client, {});

      // Create users with Slack auth0_ids
      const user1 = await createTexter(client, { auth0Id: "slack_U001" });
      const user2 = await createTexter(client, { auth0Id: "slack_U002" });
      await createTexter(client, { auth0Id: "slack_U003" });
      await createTexter(client, { auth0Id: "slack_U004" });

      // Create team
      const {
        rows: [team]
      } = await client.query(
        `
        INSERT INTO team (organization_id, title) VALUES ($1, 'Engineering Team') RETURNING *
      `,
        [org.id]
      );

      // Setup: U001 and U002 are existing members
      await createUserOrganization(client, {
        userId: user1.id,
        organizationId: org.id
      });
      await createUserOrganization(client, {
        userId: user2.id,
        organizationId: org.id
      });

      await client.query(
        `
        INSERT INTO user_team (user_id, team_id) VALUES ($1, $2), ($3, $2)
      `,
        [user1.id, team.id, user2.id]
      );

      // Mock Slack API - U001 stays, U002 removed, U003 and U004 added
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          }
        ],
        response_metadata: {}
      });

      mockBotClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ["slack_U001", "slack_U003", "slack_U004"],
        response_metadata: {}
      });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      const { rows: finalMembers } = await client.query(
        `
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = $1
        ORDER BY u.auth0_id
      `,
        [team.id]
      );
      expect(finalMembers.map((m) => m.auth0_id)).toEqual([
        "slack_U001",
        "slack_U003",
        "slack_U004"
      ]);
    });
  });

  it("should not duplicate existing team memberships", async () => {
    await withClient(pool, async (client) => {
      // Setup: U001 already a member
      await client.query(`
        INSERT INTO user_organization (user_id, organization_id, role)
        VALUES (1, 1, 'TEXTER')
      `);
      await client.query(`
        INSERT INTO user_team (user_id, team_id)
        VALUES (1, 1)
      `);

      // Mock Slack API - U001 is in channel
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          }
        ],
        response_metadata: {}
      });

      mockBotClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ["slack_U001"],
        response_metadata: {}
      });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      // Verify no duplicates
      const { rows } = await client.query(`
        SELECT COUNT(*) as count
        FROM user_team
        WHERE user_id = 1 AND team_id = 1
      `);
      expect(Number(rows[0].count)).toBe(1);
    });
  });

  it("should skip teams without matching Slack channels", async () => {
    await withClient(pool, async (client) => {
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [{ id: "C999", name: "random", name_normalized: "random" }],
        response_metadata: {}
      });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      // Verify no team memberships were created
      const { rows } = await client.query(
        "SELECT COUNT(*) as count FROM user_team"
      );
      expect(Number(rows[0].count)).toBe(0);
    });
  });

  it("should handle pagination when fetching Slack channels", async () => {
    await withClient(pool, async (client) => {
      mockBotClient.conversations.list
        .mockResolvedValueOnce({
          ok: true,
          channels: [
            {
              id: "C001",
              name: "engineering-team",
              name_normalized: "engineering-team"
            }
          ],
          response_metadata: { next_cursor: "cursor123" }
        })
        .mockResolvedValueOnce({
          ok: true,
          channels: [
            {
              id: "C002",
              name: "marketing-team",
              name_normalized: "marketing-team"
            }
          ],
          response_metadata: {}
        });

      mockBotClient.conversations.members
        .mockResolvedValueOnce({
          ok: true,
          members: ["slack_U001"],
          response_metadata: {}
        })
        .mockResolvedValueOnce({
          ok: true,
          members: ["slack_U002"],
          response_metadata: {}
        });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      expect(mockBotClient.conversations.list).toHaveBeenCalledTimes(2);
      expect(mockBotClient.conversations.list).toHaveBeenNthCalledWith(1, {
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200
      });
      expect(mockBotClient.conversations.list).toHaveBeenNthCalledWith(2, {
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor: "cursor123"
      });
    });
  });

  it("should handle pagination when fetching channel members", async () => {
    await withClient(pool, async (client) => {
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          }
        ],
        response_metadata: {}
      });

      mockBotClient.conversations.members
        .mockResolvedValueOnce({
          ok: true,
          members: ["slack_U001", "slack_U002"],
          response_metadata: { next_cursor: "member_cursor" }
        })
        .mockResolvedValueOnce({
          ok: true,
          members: ["slack_U003"],
          response_metadata: {}
        });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      expect(mockBotClient.conversations.members).toHaveBeenCalledTimes(2);
      expect(mockBotClient.conversations.members).toHaveBeenNthCalledWith(1, {
        channel: "C001",
        limit: 1000
      });
      expect(mockBotClient.conversations.members).toHaveBeenNthCalledWith(2, {
        channel: "C001",
        limit: 1000,
        cursor: "member_cursor"
      });
    });
  });

  it("should retry on rate limit errors", async () => {
    await withClient(pool, async (client) => {
      const rateLimitError = {
        code: ErrorCode.RateLimitedError,
        retryAfter: 0.1
      };

      mockBotClient.conversations.list
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          ok: true,
          channels: [],
          response_metadata: {}
        });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      expect(mockBotClient.conversations.list).toHaveBeenCalledTimes(2);
    });
  });

  it("should handle non-existent users in Slack channel gracefully", async () => {
    await withClient(pool, async (client) => {
      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          }
        ],
        response_metadata: {}
      });

      // Include a non-existent user ID
      mockBotClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ["slack_U001", "slack_UNKNOWN"],
        response_metadata: {}
      });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      // Should only add the existing user
      const { rows } = await client.query(`
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = 1
      `);
      expect(rows).toHaveLength(1);
      expect(rows[0].auth0_id).toBe("slack_U001");
    });
  });

  it("should handle team names with spaces correctly", async () => {
    await withClient(pool, async (client) => {
      // Update team title to have spaces
      await client.query(`
        UPDATE team SET title = 'Engineering Team Special' WHERE id = 1
      `);

      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team-special",
            name_normalized: "engineering-team-special"
          }
        ],
        response_metadata: {}
      });

      mockBotClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ["slack_U001"],
        response_metadata: {}
      });

      await runTaskListOnce(
        { pgPool: pool },
        { [TASK_IDENTIFIER]: syncSlackTeamMembers },
        client
      );

      const { rows } = await client.query(`
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = 1
      `);
      expect(rows).toHaveLength(1);
      expect(rows[0].auth0_id).toBe("slack_U001");
    });
  });

  it("should maintain transactional integrity on failures", async () => {
    await withClient(pool, async (client) => {
      // Setup: Add U001 to team
      await client.query(`
        INSERT INTO user_organization (user_id, organization_id, role)
        VALUES (1, 1, 'TEXTER')
      `);
      await client.query(`
        INSERT INTO user_team (user_id, team_id)
        VALUES (1, 1)
      `);

      mockBotClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "engineering-team",
            name_normalized: "engineering-team"
          }
        ],
        response_metadata: {}
      });

      // Mock a database error during member sync
      const errorHelpers = ({
        withPgClient: jest.fn().mockRejectedValue(new Error("Database error"))
      } as unknown) as JobHelpers;

      await expect(syncSlackTeamMembers({}, errorHelpers)).rejects.toThrow(
        "Database error"
      );

      // Verify original data unchanged
      const { rows } = await client.query(`
        SELECT u.auth0_id
        FROM user_team ut
        JOIN public.user u ON ut.user_id = u.id
        WHERE ut.team_id = 1
      `);
      expect(rows).toHaveLength(1);
      expect(rows[0].auth0_id).toBe("slack_U001");
    });
  });
});
