import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import {
  useCurrentUserOrganizationRolesQuery,
  useGetOrganizationNameQuery
} from "@spoke/spoke-codegen";
import { css, StyleSheet } from "aphrodite";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useHistory, withRouter } from "react-router-dom";

import Navigation from "../components/Navigation";
import { hasRole } from "../lib/permissions";
import theme from "../styles/theme";

const styles = StyleSheet.create({
  container: {
    ...theme.layouts.multiColumn.container
  },
  content: {
    ...theme.layouts.multiColumn.flexColumn,
    paddingLeft: "2rem",
    paddingRight: "2rem",
    margin: "24px auto"
  }
});

const TexterDashboard = (props) => {
  const {
    main: MainComponent,
    topNavTitle,
    fullScreen: FullScreenComponent,
    ...rest
  } = props;

  const [showMenu, setShowMenu] = useState(false);
  const history = useHistory();
  const { organizationId } = props.match.params;

  const { data: organization, loading } = useGetOrganizationNameQuery({
    variables: { organizationId }
  });

  const { data: userData } = useCurrentUserOrganizationRolesQuery({
    variables: { organizationId },
    skip: !organizationId
  });

  const roles = userData?.currentUser?.roles ?? [];
  const isSuperadmin = userData?.currentUser?.isSuperadmin ?? false;
  const isAdmin = hasRole("SUPERVOLUNTEER", roles) || isSuperadmin;

  if (FullScreenComponent) {
    return <FullScreenComponent {...rest} />;
  }

  const sectionTitle = loading ? "Spoke" : organization?.organization?.name;

  return (
    <div>
      {topNavTitle && (
        <Helmet>
          <title>{`${topNavTitle} - ${sectionTitle}`}</title>
        </Helmet>
      )}
      <div className={css(styles.container)}>
        <Navigation
          onToggleMenu={() => setShowMenu((s) => !s)}
          showMenu={showMenu}
          organizationId={organizationId}
          title={sectionTitle}
          switchListItem={
            isAdmin ? (
              <ListItem
                button
                onClick={() =>
                  history.push(`/admin/${organizationId}/campaigns`)
                }
              >
                <ListItemIcon style={{ minWidth: 32 }}>
                  <ArrowBackIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Switch to admin" />
              </ListItem>
            ) : undefined
          }
        />
        <div className={css(styles.content)}>
          {topNavTitle && (
            <Typography
              variant="h5"
              style={{ fontWeight: 700, marginBottom: 16 }}
            >
              {topNavTitle}
            </Typography>
          )}
          <MainComponent {...rest} />
        </div>
      </div>
    </div>
  );
};

TexterDashboard.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  children: PropTypes.object,
  main: PropTypes.elementType,
  topNav: PropTypes.elementType,
  fullScreen: PropTypes.elementType
};

export default withRouter(TexterDashboard);
