import type { WebAPICallError, WebAPICallResult } from "@slack/web-api";
import { ErrorCode } from "@slack/web-api";
import type { JobHelpers, Task } from "graphile-worker";
import isEmpty from "lodash/isEmpty";
import type { PoolClient } from "pg";
import promiseRetry from "promise-retry";

import { sleep } from "../../lib/utils";
import { botClient } from "../lib/slack";
import { withTransaction } from "../utils";

export const TASK_IDENTIFIER = "sync-slack-team-members";

const retrySlack = async <T>(
  fn: () => Promise<WebAPICallResult>
): Promise<WebAPICallResult | (WebAPICallResult & T)> =>
  promiseRetry({ retries: 5, maxTimeout: 1000 }, (retry) =>
    fn().catch((err: WebAPICallError) => {
      if (err.code === ErrorCode.RateLimitedError)
        return sleep(err.retryAfter * 1000).then(() => retry(err));
      throw err;
    })
  );

interface SpokeTeamRow {
  id: string;
  organization_id: string;
  title: string;
}

interface SlackChannelRecord {
  id: string;
  name: string;
  name_normalized: string;
}

interface SlackPagination<T> {
  acc?: T[];
  next_cursor?: string;
}

type FetchAllChannelsOptions = SlackPagination<SlackChannelRecord>;
type FullSlackChannel = SlackChannelRecord & Record<string, unknown>;

const fetchAllChannels = async (
  options: FetchAllChannelsOptions = {}
): Promise<SlackChannelRecord[]> => {
  const { acc = [], next_cursor } = options;
  const params = {
    types: "public_channel,private_channel",
    exclude_archived: true,
    limit: 200,
    ...(isEmpty(next_cursor) ? {} : { cursor: next_cursor })
  };
  const response = await retrySlack<{ channels: FullSlackChannel[] }>(() =>
    botClient.conversations.list(params)
  );

  const {
    channels = [],
    response_metadata = {}
  }: {
    channels?: FullSlackChannel[];
    response_metadata?: WebAPICallResult["response_metadata"];
  } = response;

  const strippedChannels: SlackChannelRecord[] = channels.map(
    ({ id, name, name_normalized }: SlackChannelRecord) => ({
      id,
      name,
      name_normalized
    })
  );

  if (response_metadata.next_cursor) {
    return fetchAllChannels({
      acc: acc.concat(strippedChannels),
      next_cursor: response_metadata.next_cursor
    });
  }
  return acc.concat(strippedChannels);
};

interface FetchChannelMembersOptions extends SlackPagination<any> {
  channelId: string;
}

const fetchChannelMembers = async (
  options: FetchChannelMembersOptions
): Promise<string[]> => {
  const { channelId, acc = [], next_cursor } = options;

  const params = {
    channel: channelId,
    limit: 1000,
    ...(isEmpty(next_cursor) ? {} : { cursor: next_cursor })
  };
  const response = await retrySlack<{ members: any[] }>(() =>
    botClient.conversations.members(params)
  );
  const { members, response_metadata = {} } = response;
  const allMembers = acc.concat(members);

  if (response_metadata.next_cursor) {
    return fetchChannelMembers({
      channelId,
      acc: allMembers,
      next_cursor: response_metadata.next_cursor
    });
  }

  return allMembers;
};

interface SyncTeamOptions {
  spokeTeam: SpokeTeamRow;
  slackChannel: SlackChannelRecord;
  helpers: JobHelpers;
}

const syncTeam = async (options: SyncTeamOptions) => {
  const { spokeTeam, slackChannel, helpers } = options;
  const channelMemberIds = await fetchChannelMembers({
    channelId: slackChannel.id
  });

  const syncResult = await helpers.withPgClient(async (poolClient) =>
    withTransaction<{ addedCount: number; removedCount: number }, PoolClient>(
      poolClient,
      async (client) => {
        const { rows: teamMembers } = await client.query<{
          auth0_id: string;
        }>(
          `
            select u.auth0_id from user_team ut
            join public.user u on ut.user_id = u.id
            where ut.team_id = $1
          `,
          [spokeTeam.id]
        );

        const teamMemberIds = teamMembers.map((m) => m.auth0_id);
        const setTeamMemberIds = new Set(teamMemberIds);
        const setSlackMemberIds = new Set(channelMemberIds);

        const authIdsToAdd = channelMemberIds.filter(
          (id) => !setTeamMemberIds.has(id)
        );
        const authIdsToRemove = teamMemberIds.filter(
          (id) => !setSlackMemberIds.has(id)
        );

        let addedCount = 0;
        let removedCount = 0;

        // Add new members
        if (authIdsToAdd.length > 0) {
          const { rows } = await client.query<{ count: number }>(
            `
              with user_ids_to_add as (
                select id as user_id
                from public.user
                where auth0_id = any ($3)
              ),
              org_memberships as (
                insert into user_organization (user_id, organization_id, role)
                select user_id, $1 as organization_id, 'TEXTER' as role
                from user_ids_to_add
                where not exists (
                  select 1 from user_organization existing
                  where
                    existing.user_id = user_ids_to_add.user_id
                    and existing.organization_id = $1
                )
                returning user_id
              ),
              team_memberships as (
                insert into user_team (user_id, team_id)
                select user_id, $2 as team_id
                from user_ids_to_add
                where not exists (
                  select 1 from user_team existing
                  where
                    existing.user_id = user_ids_to_add.user_id
                    and existing.team_id = $2
                )
                returning 1
              )
              select count(*) from team_memberships
            `,
            [spokeTeam.organization_id, spokeTeam.id, authIdsToAdd]
          );
          addedCount = rows[0]?.count || 0;
        }

        // Remove members who are no longer in the Slack channel
        if (authIdsToRemove.length > 0) {
          const { rowCount } = await client.query(
            `
              delete from user_team
              where team_id = $1
                and user_id in (
                  select id from public.user
                  where auth0_id = any ($2)
                )
              returning id
            `,
            [spokeTeam.id, authIdsToRemove]
          );
          removedCount = rowCount || 0;
        }

        return { addedCount, removedCount };
      }
    )
  );
  return syncResult;
};

export const syncSlackTeamMembers: Task = async (_payload, helpers) => {
  const { rows: allTeams } = await helpers.query<SpokeTeamRow>(
    `select id, organization_id, title from team`
  );

  const allChannels = await fetchAllChannels();
  const syncedTeams: {
    title: string;
    addedCount: number;
    removedCount: number;
  }[] = [];

  for (const spokeTeam of allTeams) {
    const normalizedTeamName = spokeTeam.title.toLowerCase().replace(/ /g, "-");
    const matchingChannel = allChannels.find((channel) => {
      return channel.name_normalized === normalizedTeamName;
    });

    if (matchingChannel) {
      const syncResult = await syncTeam({
        spokeTeam,
        slackChannel: matchingChannel,
        helpers
      });

      syncedTeams.push({
        title: spokeTeam.title,
        addedCount: syncResult.addedCount,
        removedCount: syncResult.removedCount
      });
    }
  }

  helpers.logger.info("finished syncing teams", {
    syncedTeams
  });
};

export default syncSlackTeamMembers;
