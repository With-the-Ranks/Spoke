import Typography from "@material-ui/core/Typography";
import { useGetOrganizationNameQuery } from "@spoke/spoke-codegen";
import { css, StyleSheet } from "aphrodite";
import PropTypes from "prop-types";
import React from "react";
import { Helmet } from "react-helmet";
import { withRouter } from "react-router-dom";

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

  if (FullScreenComponent) {
    return <FullScreenComponent {...rest} />;
  }

  const { data: organization, loading } = useGetOrganizationNameQuery({
    variables: {
      organizationId: props.match.params.organizationId
    }
  });

  const sectionTitle = loading ? "Spoke" : organization?.organization?.name;

  return (
    <div>
      {topNavTitle && (
        <Helmet>
          <title>{`${topNavTitle} - ${sectionTitle}`}</title>
        </Helmet>
      )}
      <div className={css(styles.container)}>
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
