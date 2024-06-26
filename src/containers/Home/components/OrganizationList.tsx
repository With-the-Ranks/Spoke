import {
  ListItemIcon,
  ListItemText,
  makeStyles,
  Typography
} from "@material-ui/core";
import { amber, grey } from "@material-ui/core/colors";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Paper from "@material-ui/core/Paper";
import MarkunreadMailboxIcon from "@material-ui/icons/MarkunreadMailbox";
import NotificationsPausedIcon from "@material-ui/icons/NotificationsPaused";
import { useGetCurrentUserForOrganizationListQuery } from "@spoke/spoke-codegen";
import sortBy from "lodash/sortBy";
import React from "react";
import { Redirect, useHistory } from "react-router-dom";

const useStyles = makeStyles({
  orgText: {
    textAlign: "center"
  }
});

type MembershipType = {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    myCurrentAssignmentTargets: {
      maxRequestCount: number;
    }[];
  };
};

const isMembershipType = (obj: any): obj is MembershipType => {
  return (obj as MembershipType).id !== "undefined";
};

export const OrganizationList: React.FC = () => {
  const history = useHistory();
  const classes = useStyles();
  const { data } = useGetCurrentUserForOrganizationListQuery();
  const currentUser = data?.currentUser;

  const handleSelectOrg = (membership: MembershipType) => () => {
    const {
      role,
      organization: { id: orgId }
    } = membership;
    if (role === "TEXTER") {
      return history.push(`/app/${orgId}`);
    }
    return history.push(`/admin/${orgId}`);
  };

  const memberships = currentUser?.memberships?.edges;
  if (memberships?.length === 0) {
    return (
      <div>
        <Typography variant="h4" gutterBottom>
          You currently aren't part of any organization!
        </Typography>
        <div>
          If you got sent a link by somebody to start texting, ask that person
          to send you the link to join their organization. Then, come back here
          and start texting!
        </div>
      </div>
    );
  }
  if (memberships?.length === 1) {
    const {
      role,
      organization: { id: orgId }
    } = memberships[0].node;
    const path = role === "TEXTER" ? "app" : "admin";
    return <Redirect to={`/${path}/${orgId}`} />;
  }

  const showIcons = window.ASSIGNMENT_SHOW_REQUESTS_AVAILABLE;

  const hydratedList = memberships?.map(({ node: membership }) => ({
    membership,
    hasAssignments:
      membership.organization.myCurrentAssignmentTargets.length > 0
  }));
  const sortedList = sortBy(hydratedList, [
    ({ hasAssignments }) => !hasAssignments, // sort "true" first
    ({ membership }) => membership.organization.id
  ]);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Select your organization
      </Typography>
      {showIcons && (
        <p>
          Organizations with available assignments are marked with an amber
          mailbox icon.
        </p>
      )}
      <Paper style={{ margin: "15px auto", maxWidth: "450px" }}>
        <List>
          {sortedList.map(({ membership, hasAssignments }) => {
            const leftIcon = showIcons ? (
              hasAssignments ? (
                <MarkunreadMailboxIcon style={{ color: amber[500] }} />
              ) : (
                <NotificationsPausedIcon style={{ color: grey[500] }} />
              )
            ) : undefined;
            if (isMembershipType(membership)) {
              return (
                <ListItem
                  key={membership.organization.id}
                  button
                  onClick={handleSelectOrg(membership)}
                >
                  {showIcons && <ListItemIcon>{leftIcon}</ListItemIcon>}
                  <ListItemText
                    primary={membership.organization.name}
                    primaryTypographyProps={{ className: classes.orgText }}
                  />
                </ListItem>
              );
            }
            return null;
          })}
        </List>
      </Paper>
    </div>
  );
};

export default OrganizationList;
