import Avatar from "@material-ui/core/Avatar";
import Collapse from "@material-ui/core/Collapse";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import MenuIcon from "@material-ui/icons/Menu";
import clsx from "clsx";
import camelCase from "lodash/camelCase";
import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import UserMenu from "../containers/UserMenu";
import { dataTest } from "../lib/attributes";
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
    boxSizing: "border-box",
    transition: "width 0.2s ease, min-width 0.2s ease"
  },
  sidebarCollapsed: {
    width: 48,
    minWidth: 48
  },
  logoArea: {
    padding: theme.spacing(2, 1),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    minHeight: 56
  },
  logoText: {
    fontWeight: 700,
    fontSize: 20,
    color: theme.palette.primary.main,
    whiteSpace: "nowrap",
    overflow: "hidden"
  },
  toggleBtn: {
    padding: 6,
    flexShrink: 0
  },
  navList: {
    flex: 1,
    paddingTop: 4
  },
  // Group header
  groupHeader: {
    borderRadius: 8,
    margin: theme.spacing(0.25, 1),
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    "&:hover": {
      backgroundColor: assemblePalette.common.lightGrey
    }
  },
  groupHeaderActive: {
    "& .MuiListItemText-primary": {
      color: theme.palette.primary.main,
      fontWeight: 700
    }
  },
  groupHeaderText: {
    "& .MuiListItemText-primary": {
      fontSize: 13,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: theme.palette.text.secondary
    }
  },
  groupHeaderIcon: {
    minWidth: 36,
    color: theme.palette.text.secondary
  },
  // Child nav items
  navItem: {
    borderRadius: 8,
    margin: theme.spacing(0.25, 1),
    paddingLeft: theme.spacing(3),
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
    minWidth: 32,
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
  createButtonWrapper: {
    padding: theme.spacing(1, 2)
  },
  createButton: {
    backgroundColor: "#F59E0B",
    color: "#FFFFFF",
    fontWeight: 700,
    borderRadius: 8,
    textTransform: "none" as const,
    "&:hover": {
      backgroundColor: "#D97706"
    }
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
  // Flat (ungrouped) nav items for texter/superadmin
  flatNavItem: {
    borderRadius: 8,
    margin: theme.spacing(0.25, 1),
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    "&:hover": {
      backgroundColor: assemblePalette.common.lightGrey
    }
  }
}));

export interface NavigationSection {
  name: string;
  path: string;
  role?: string;
  badge?: { count: number };
  url?: string;
}

export interface NavigationGroup {
  name: string;
  items: NavigationSection[];
}

interface Props {
  sections?: NavigationSection[];
  groups?: NavigationGroup[];
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
  const { sections, groups, switchListItem, title } = props;
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const collapsed = !props.showMenu;

  const isActive = (section: NavigationSection) =>
    location.pathname.includes(`/${section.path}`);

  const isGroupActive = (group: NavigationGroup) =>
    group.items.some((item) => isActive(item));

  const renderSection = (section: NavigationSection, indented = false) => {
    const active = isActive(section);
    const IconComponent = navigationIconMap[section.path];

    return (
      <ListItem
        button
        {...dataTest(camelCase(`nav ${section.path}`))}
        key={section.name}
        className={clsx(indented ? classes.navItem : classes.flatNavItem, {
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
  };

  return (
    <div
      className={clsx(classes.sidebar, {
        [classes.sidebarCollapsed]: collapsed
      })}
    >
      {/* Logo + toggle */}
      <div className={classes.logoArea}>
        {!collapsed && (
          <Typography className={classes.logoText}>
            {title || "Spoke"}
          </Typography>
        )}
        <IconButton
          className={classes.toggleBtn}
          size="small"
          onClick={props.onToggleMenu as any}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <MenuIcon fontSize="small" />
          ) : (
            <ChevronLeftIcon fontSize="small" />
          )}
        </IconButton>
      </div>

      <Divider />

      {!collapsed && (
        <>
          <List className={classes.navList}>
            {/* Grouped navigation */}
            {groups &&
              groups.map((group) => {
                const groupActive = isGroupActive(group);
                const isOpen = hoveredGroup === group.name || groupActive;

                return (
                  <div
                    key={group.name}
                    onMouseEnter={() => setHoveredGroup(group.name)}
                    onMouseLeave={() => setHoveredGroup(null)}
                  >
                    {/* Group header */}
                    <ListItem
                      button
                      className={clsx(classes.groupHeader, {
                        [classes.groupHeaderActive]: groupActive
                      })}
                      onClick={() =>
                        setHoveredGroup(isOpen ? null : group.name)
                      }
                    >
                      <ListItemText
                        primary={group.name}
                        className={classes.groupHeaderText}
                      />
                    </ListItem>

                    {/* Group children */}
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <List disablePadding>
                        {group.items.map((item) => renderSection(item, true))}
                      </List>
                    </Collapse>
                  </div>
                );
              })}

            {/* Flat (ungrouped) navigation fallback */}
            {!groups &&
              sections &&
              sections.map((section) => renderSection(section, false))}

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
        </>
      )}
    </div>
  );
};

export default Navigation;
