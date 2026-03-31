import { makeStyles } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import type { RouterProps } from "react-router-dom";
import { withRouter } from "react-router-dom";

import Navigation from "../components/Navigation";
import theme from "../styles/theme";
import { useAuthzContext } from "./AuthzProvider";

const useStyles = makeStyles({
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

interface SuperAdminDashboardProps extends RouterProps {
  children: JSX.Element;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  location,
  children
}) => {
  const { isSuperadmin } = useAuthzContext();

  const classes = useStyles();
  const [showMenu, setShowMenu] = useState<boolean>(true);

  const onToggleMenu = () => setShowMenu(!showMenu);

  const sections = [
    { name: "People", path: "people", url: "/superadmin/people" },
    {
      name: "SuperAdmins",
      path: "superadmins",
      url: "/superadmin/superadmins"
    },
    {
      name: "Organizations",
      path: "organizations",
      url: "/superadmin/organizations"
    }
  ];

  const currentSection = sections
    .filter((section) => location.pathname.match(`/${section.path}`))
    .at(0);

  const title = currentSection?.name ?? "SuperAdmin";

  return isSuperadmin ? (
    <div className={classes.container}>
      <Helmet>
        <title>{`${title} - SuperAdmin`}</title>
      </Helmet>
      <Navigation
        onToggleMenu={onToggleMenu}
        sections={sections}
        showMenu={showMenu}
        title="SuperAdmin"
      />
      <div className={classes.content}>
        <Typography variant="h5" style={{ fontWeight: 700, marginBottom: 16 }}>
          {title}
        </Typography>
        {children}
      </div>
    </div>
  ) : (
    <div>
      <Helmet>
        <title>SuperAdmin - Access Denied</title>
      </Helmet>
      <h1>You don&apos;t have permission to access this page</h1>
    </div>
  );
};

export default withRouter(SuperAdminDashboard);
