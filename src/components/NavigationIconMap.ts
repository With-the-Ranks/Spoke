import AssignmentIcon from "@material-ui/icons/Assignment";
import AssignmentIndIcon from "@material-ui/icons/AssignmentInd";
import BuildIcon from "@material-ui/icons/Build";
import ChatBubbleIcon from "@material-ui/icons/ChatBubble";
import ExtensionIcon from "@material-ui/icons/Extension";
import GroupIcon from "@material-ui/icons/Group";
import LabelIcon from "@material-ui/icons/Label";
import LinkIcon from "@material-ui/icons/Link";
import MailOutlineIcon from "@material-ui/icons/MailOutline";
import PeopleIcon from "@material-ui/icons/People";
import PhonelinkEraseIcon from "@material-ui/icons/PhonelinkErase";
import ReportProblemIcon from "@material-ui/icons/ReportProblem";
import SendIcon from "@material-ui/icons/Send";
import SettingsIcon from "@material-ui/icons/Settings";
import SmsIcon from "@material-ui/icons/Sms";
import SwapHorizIcon from "@material-ui/icons/SwapHoriz";
import WarningIcon from "@material-ui/icons/Warning";
import type React from "react";

const navigationIconMap: Record<string, React.ComponentType> = {
  campaigns: SmsIcon,
  "template-campaigns": AssignmentIcon,
  "campaign-groups": GroupIcon,
  people: PeopleIcon,
  teams: GroupIcon,
  "assignment-control": AssignmentIndIcon,
  autosending: SendIcon,
  "tag-editor": LabelIcon,
  optouts: PhonelinkEraseIcon,
  incoming: MailOutlineIcon,
  escalated: WarningIcon,
  "bulk-script-editor": BuildIcon,
  "short-link-domains": LinkIcon,
  "assignment-requests": ChatBubbleIcon,
  trollalarms: ReportProblemIcon,
  integrations: ExtensionIcon,
  settings: SettingsIcon,
  // SuperAdmin sections
  superadmins: PeopleIcon,
  organizations: GroupIcon,
  // Texter switch
  todos: SwapHorizIcon
};

export default navigationIconMap;
