import { gql } from "@apollo/client";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";
import { css, StyleSheet } from "aphrodite";
import PropTypes from "prop-types";
import React from "react";
import { Helmet } from "react-helmet";
import { withRouter } from "react-router-dom";
import { compose } from "recompose";

import { hasRole } from "../../lib/permissions";
import theme from "../../styles/theme";
import AdminNavigation from "../AdminNavigation";
import { loadData } from "../hoc/with-operations";
import NotificationCard from "./components/NotificationCard";

const styles = StyleSheet.create({
  container: {
    ...theme.layouts.multiColumn.container,
    backgroundColor: "#fafafa",
    backgroundImage: "radial-gradient(circle, #0000000d 1px, #0000 1px)",
    backgroundPosition: "0 0",
    backgroundSize: "10px 10px",
    minHeight: "100vh"
  },
  content: {
    ...theme.layouts.multiColumn.flexColumn,
    paddingLeft: "2rem",
    paddingRight: "2rem",
    margin: "24px auto"
  }
});

class AdminDashboard extends React.Component {
  state = {
    showMenu: true
  };

  handleToggleMenu = () => this.setState({ showMenu: !this.state.showMenu });

  renderNavigation(navGroups) {
    const { organizationId } = this.props.match.params;
    const { organizationData } = this.props;

    if (!organizationId) {
      return "";
    }

    return (
      <AdminNavigation
        onToggleMenu={this.handleToggleMenu}
        showMenu={this.state.showMenu}
        organizationId={organizationId}
        groups={navGroups}
        title={organizationData?.organization?.name}
      />
    );
  }

  render() {
    const { location, children, match, organizationData } = this.props;
    const { roles } = this.props.data.currentUser;
    const { escalatedConversationCount, pendingAssignmentRequestCount } =
      (this.props.badgeCounts || {}).organization || {};
    const { totalCount: trollCount } =
      (this.props.trollAlarmsCount || {}).trollAlarmsCount || {};

    const allGroups = [
      {
        name: "Campaigns",
        items: [
          { name: "Campaigns", path: "campaigns", role: "ADMIN" },
          {
            name: "Template Campaigns",
            path: "template-campaigns",
            role: "ADMIN"
          },
          ...(window.ENABLE_CAMPAIGN_GROUPS
            ? [
                {
                  name: "Campaign Groups",
                  path: "campaign-groups",
                  role: "ADMIN"
                }
              ]
            : [])
        ]
      },
      {
        name: "People",
        items: [
          { name: "People", path: "people", role: "ADMIN" },
          { name: "Teams", path: "teams", role: "ADMIN" },
          { name: "Opt Outs", path: "optouts", role: "ADMIN" }
        ]
      },
      {
        name: "Messages",
        items: [
          { name: "Message Review", path: "incoming", role: "SUPERVOLUNTEER" },
          {
            name: "Assignment Control",
            path: "assignment-control",
            role: "ADMIN"
          },
          ...(!window.DISABLE_ASSIGNMENT_PAGE
            ? [
                {
                  name: "Assignment Requests",
                  path: "assignment-requests",
                  role: "SUPERVOLUNTEER",
                  badge: window.DISABLE_SIDEBAR_BADGES
                    ? undefined
                    : { count: pendingAssignmentRequestCount }
                }
              ]
            : []),
          ...(window.ENABLE_AUTOSENDING
            ? [{ name: "Autosending", path: "autosending", role: "ADMIN" }]
            : []),
          { name: "Tags", path: "tag-editor", role: "ADMIN" }
        ]
      },
      {
        name: "Management",
        items: [
          {
            name: "Bulk Script Editor",
            path: "bulk-script-editor",
            role: "OWNER"
          },
          ...(window.ENABLE_TROLLBOT
            ? [
                {
                  name: "Troll Alarms",
                  path: "trollalarms",
                  role: "SUPERVOLUNTEER",
                  badge: window.DISABLE_SIDEBAR_BADGES
                    ? undefined
                    : { count: trollCount }
                }
              ]
            : []),
          {
            name: "Escalated Convos",
            path: "escalated",
            role: "ADMIN",
            badge: window.DISABLE_SIDEBAR_BADGES
              ? undefined
              : { count: escalatedConversationCount }
          },
          ...(window.ENABLE_SHORTLINK_DOMAINS
            ? [
                {
                  name: "Short Link Domains",
                  path: "short-link-domains",
                  role: "OWNER"
                }
              ]
            : [])
        ]
      },
      {
        name: "Settings",
        items: [
          { name: "Settings", path: "settings", role: "OWNER" },
          { name: "Integrations", path: "integrations", role: "OWNER" }
        ]
      }
    ];

    // Filter items by role within each group, remove empty groups
    const groups = allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((s) => hasRole(s.role, roles))
      }))
      .filter((group) => group.items.length > 0);

    // Flatten for page title lookup
    const allSections = allGroups.flatMap((g) => g.items);
    const currentSection = allSections.find((section) =>
      location.pathname.match(`/${section.path}`)
    );
    const title = currentSection ? currentSection.name : "Admin";

    const pageTitle = `${title} - ${organizationData.organization.name}`;

    return (
      <div className={css(styles.container)}>
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        {this.renderNavigation(groups)}
        <div className={css(styles.content)}>
          <Container maxWidth="md" disableGutters>
            <Typography
              variant="h5"
              style={{ fontWeight: 700, marginBottom: 16 }}
            >
              {title}
            </Typography>
            <NotificationCard organizationId={match.params.organizationId} />
            {children}
          </Container>
        </div>
      </div>
    );
  }
}

AdminDashboard.propTypes = {
  match: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired,
  badgeCounts: PropTypes.object.isRequired,
  trollAlarmsCount: PropTypes.object.isRequired
};

const queries = {
  data: {
    query: gql`
      query getCurrentUserRoles($organizationId: String!) {
        currentUser {
          id
          roles(organizationId: $organizationId)
        }
      }
    `,
    options: ({ match }) => ({
      variables: {
        organizationId: match.params.organizationId
      }
    })
  },
  organizationData: {
    query: gql`
      query getOrganizationName($organizationId: String!) {
        organization(id: $organizationId) {
          id
          name
        }
      }
    `,
    options: ({ match }) => ({
      variables: {
        organizationId: match.params.organizationId
      }
    })
  },
  badgeCounts: {
    query: gql`
      query getBadgeCounts($organizationId: String!) {
        organization(id: $organizationId) {
          id
          escalatedConversationCount
          pendingAssignmentRequestCount
        }
      }
    `,
    skip: window.DISABLE_SIDEBAR_BADGES,
    options: ({ match }) => ({
      variables: {
        organizationId: match.params.organizationId
      }
    })
  },
  trollAlarmsCount: {
    query: gql`
      query getTrollAlarmsCount(
        $organizationId: String!
        $dismissed: Boolean!
      ) {
        trollAlarmsCount(
          organizationId: $organizationId
          dismissed: $dismissed
        ) {
          totalCount
        }
      }
    `,
    skip: window.DISABLE_SIDEBAR_BADGES || !window.ENABLE_TROLLBOT,
    options: ({ match }) => ({
      variables: {
        organizationId: match.params.organizationId,
        dismissed: false
      }
    })
  }
};

export default compose(withRouter, loadData({ queries }))(AdminDashboard);
