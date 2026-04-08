import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import clsx from "clsx";
import React from "react";
import { useHistory, useLocation } from "react-router-dom";

import UserMenu from "../containers/UserMenu";
import assemblePalette from "../styles/assemble-palette";
import navigationIconMap from "./NavigationIconMap";

const useStyles = makeStyles((theme) => ({
  sidebar: {
    width: 256,
    minWidth: 256,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${assemblePalette.common.cardBorder}`,
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box"
  },
  logoArea: {
    padding: theme.spacing(2, 2),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  logoText: {
    fontWeight: 700,
    fontSize: 20,
    color: theme.palette.primary.main
  },
  navList: {
    flex: 1,
    paddingTop: 0
  },
  navItem: {
    borderRadius: 8,
    margin: theme.spacing(0.25, 1),
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    "&:hover": {
      backgroundColor: assemblePalette.common.lightGrey
    }
  },
  navItemActive: {
    backgroundColor: assemblePalette.tertiary.indigoLight,
    "&:hover": {
      backgroundColor: assemblePalette.tertiary.indigoLight
    }
  },
  navItemIcon: {
    minWidth: 36,
    color: theme.palette.text.secondary
  },
  navItemIconActive: {
    color: theme.palette.primary.main
  },
  navItemText: {
    "& .MuiListItemText-primary": {
      fontSize: 14,
      fontWeight: 500
    }
  },
  navItemTextActive: {
    "& .MuiListItemText-primary": {
      fontWeight: 700,
      color: theme.palette.primary.main
    }
  },
  badge: {
    backgroundColor: theme.palette.info.light,
    color: theme.palette.getContrastText(theme.palette.info.light),
    fontSize: "0.85em",
    width: theme.spacing(3.5),
    height: theme.spacing(3.5)
  },
  actionableBadge: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.getContrastText(theme.palette.error.light)
  },
  bottomSection: {
    borderTop: `1px solid ${assemblePalette.common.cardBorder}`,
    padding: theme.spacing(1)
  },
  userItem: {
    borderRadius: 8,
    margin: theme.spacing(0.25, 1)
  },
  userAvatar: {
    width: 32,
    height: 32,
    fontSize: 14,
    backgroundColor: theme.palette.primary.main
  },
  sectionDivider: {
    margin: theme.spacing(1, 2)
  }
}));

export interface NavigationSection {
  name: string;
  path: string;
  role?: string;
  badge?: { count: number };
  url?: string;
}

interface Props {
  sections: NavigationSection[];
  onToggleMenu: () => React.MouseEventHandler<unknown>;
  switchListItem?: JSX.Element;
  showMenu?: boolean;
  title?: string;
  organizationId?: string;
}

const Navigation: React.FC<Props> = (props) => {
  const history = useHistory();
  const location = useLocation();
  const classes = useStyles();
  const { sections, switchListItem, title } = props;

  if (!props.showMenu) {
    return null;
  }

  const isActive = (section: NavigationSection) => {
    return location.pathname.includes(`/${section.path}`);
  };

  return (
    <div className={classes.sidebar}>
      <div className={classes.logoArea}>
        <Typography className={classes.logoText}>{title || "Spoke"}</Typography>
      </div>
      <Divider />
      <List className={classes.navList}>
        {sections.map((section) => {
          const active = isActive(section);
          const IconComponent = navigationIconMap[section.path];

          return (
            <ListItem
              button
              key={section.name}
              className={clsx(classes.navItem, {
                [classes.navItemActive]: active
              })}
              onClick={() => section.url && history.push(section.url)}
            >
              {IconComponent && (
                <ListItemIcon
                  className={clsx(classes.navItemIcon, {
                    [classes.navItemIconActive]: active
                  })}
                >
                  <IconComponent />
                </ListItemIcon>
              )}
              <ListItemText
                primary={section.name}
                className={clsx(classes.navItemText, {
                  [classes.navItemTextActive]: active
                })}
              />
              {section.badge && (
                <ListItemSecondaryAction>
                  <Avatar
                    className={clsx(classes.badge, {
                      [classes.actionableBadge]: section.badge.count > 0
                    })}
                  >
                    {section.badge.count}
                  </Avatar>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          );
        })}
        {switchListItem && (
          <>
            <Divider style={{ margin: "8px 16px" }} />
            {switchListItem}
          </>
        )}
      </List>
      <div className={classes.bottomSection}>
        <UserMenu organizationId={props.organizationId} />
      </div>
    </div>
  );
};

export default Navigation;
