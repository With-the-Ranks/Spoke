import { gql } from "@apollo/client";
import { Grid } from "@material-ui/core";
import PropTypes from "prop-types";
import React from "react";
import { Link } from "react-router-dom";

import { withQueries } from "../../hoc/with-operations";
import CampaignCostStat from "./CampaignCostStat";
import CampaignStat from "./CampaignStat";

export const TopLineStats = (props) => {
  const {
    organizationId,
    campaignId,
    contactsCount,
    assignments,
    needsMessageCount,
    sentMessagesCount,
    receivedMessagesCount,
    optOutsCount,
    percentUnhandledReplies
  } = props;

  const highUnhandledReplyPercent = 25;
  const campaignPercent =
    percentUnhandledReplies.campaign?.stats.percentUnhandledReplies;
  const replyHighlight = campaignPercent > highUnhandledReplyPercent;

  return (
    <Grid container spacing={2}>
      <Grid item xs={6} sm={3}>
        <CampaignStat
          title="Contacts"
          loading={contactsCount.loading}
          error={contactsCount.errors && contactsCount.errors.message}
          count={contactsCount.campaign && contactsCount.campaign.contactsCount}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <CampaignStat
          title="Texters"
          loading={assignments.loading}
          error={assignments.errors && assignments.errors.message}
          count={
            assignments.campaign && assignments.campaign.assignments.length
          }
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <CampaignStat
          title="Initials To Send"
          loading={needsMessageCount.loading}
          error={needsMessageCount.errors && needsMessageCount.errors.message}
          count={
            needsMessageCount.campaign &&
            needsMessageCount.campaign.stats.countNeedsMessageContacts
          }
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <CampaignStat
          title="Sent"
          loading={sentMessagesCount.loading}
          error={sentMessagesCount.errors && sentMessagesCount.errors.message}
          count={
            sentMessagesCount.campaign &&
            sentMessagesCount.campaign.stats.sentMessagesCount
          }
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <Link
          to={`/admin/${organizationId}/incoming?campaignsFilter=isArchived-false_campaignId-${campaignId}&contactsFilter=isOptedOut-false_messageStatus-needsResponse`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <CampaignStat
            title="Replies"
            loading={receivedMessagesCount.loading}
            error={
              receivedMessagesCount.errors &&
              receivedMessagesCount.errors.message
            }
            count={
              receivedMessagesCount.campaign &&
              receivedMessagesCount.campaign.stats.receivedMessagesCount
            }
            highlight={replyHighlight}
          />
        </Link>
      </Grid>
      <Grid item xs={6} sm={3}>
        <CampaignStat
          title="Opt-outs"
          loading={optOutsCount.loading}
          error={optOutsCount.errors && optOutsCount.errors.message}
          count={
            optOutsCount.campaign && optOutsCount.campaign.stats.optOutsCount
          }
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <CampaignCostStat
          loading={sentMessagesCount.loading}
          error={sentMessagesCount.errors && sentMessagesCount.errors.message}
          smsSegments={
            sentMessagesCount.campaign &&
            sentMessagesCount.campaign.stats.sentSmsSegmentsCount
          }
          mmsMessages={
            sentMessagesCount.campaign &&
            sentMessagesCount.campaign.stats.sentMmsCount
          }
        />
      </Grid>
    </Grid>
  );
};

TopLineStats.propTypes = {
  organizationId: PropTypes.string.isRequired,
  campaignId: PropTypes.string.isRequired
};

const queries = {
  contactsCount: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          contactsCount
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  },
  assignments: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          assignments {
            id
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  },
  needsMessageCount: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          stats {
            countNeedsMessageContacts
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  },
  sentMessagesCount: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          stats {
            sentMessagesCount
            sentSmsSegmentsCount
            sentMmsCount
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  },
  receivedMessagesCount: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          stats {
            receivedMessagesCount
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  },
  optOutsCount: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          stats {
            optOutsCount
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  },
  percentUnhandledReplies: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          stats {
            percentUnhandledReplies
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  }
};

export default withQueries(queries)(TopLineStats);
