import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import React from "react";
import { useHistory } from "react-router-dom";

import type {
  NavigationGroup,
  NavigationSection
} from "../components/Navigation";
import Navigation from "../components/Navigation";

interface AdminNavigationProps {
  organizationId: string;
  sections?: NavigationSection[];
  groups?: NavigationGroup[];
  showMenu?: boolean;
  onToggleMenu: () => void;
  title?: string;
}

const AdminNavigation: React.FC<AdminNavigationProps> = (props) => {
  const history = useHistory();
  const {
    organizationId,
    sections,
    groups,
    showMenu = true,
    onToggleMenu
  } = props;

  const urlFromPath = (path: string) => `/admin/${organizationId}/${path}`;

  const addUrls = (items: NavigationSection[]) =>
    items.map((section) => ({ ...section, url: urlFromPath(section.path) }));

  const groupsWithUrls = groups?.map((group) => ({
    ...group,
    items: addUrls(group.items)
  }));

  const sectionsWithUrls = sections ? addUrls(sections) : undefined;

  return (
    <Navigation
      onToggleMenu={onToggleMenu}
      showMenu={showMenu}
      title={props.title}
      organizationId={organizationId}
      groups={groupsWithUrls}
      sections={sectionsWithUrls}
      switchListItem={
        <ListItem
          button
          onClick={() => history.push(`/app/${organizationId}/todos`)}
        >
          <ListItemText primary="Switch to texter" />
        </ListItem>
      }
    />
  );
};

export default AdminNavigation;
