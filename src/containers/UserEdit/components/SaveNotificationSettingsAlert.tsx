import IconButton from "@material-ui/core/IconButton";
import Snackbar from "@material-ui/core/Snackbar";
import CloseIcon from "@material-ui/icons/Close";
import MuiAlert from "@material-ui/lab/Alert";
import React from "react";
import { useTranslation } from "react-i18next";

import { NotificationFrequencyType } from "../../../api/user";
import { titleCase } from "../../../lib/attributes";

export interface SaveNotificationSettingsAlertProps {
  open: boolean;
  notificationFrequency: NotificationFrequencyType;
  handleCloseSnackbar: () => void;
}

// eslint-disable-next-line max-len
export const SaveNotificationSettingsAlert: React.FC<SaveNotificationSettingsAlertProps> = (
  props
) => {
  const { t } = useTranslation("UserMenu");

  const getSnackbarText = () => {
    switch (props.notificationFrequency) {
      case NotificationFrequencyType.All:
        return <p>{t("emails all")}</p>;
      case NotificationFrequencyType.Daily:
        return <p>{t("email daily")}</p>;
      case NotificationFrequencyType.Periodic:
        return <p>{t("email periodic")}</p>;
      case NotificationFrequencyType.None:
        return <p>{t("email none")}</p>;
      default:
        return <p />;
    }
  };
  return (
    <Snackbar
      anchorOrigin={{
        vertical: "top",
        horizontal: "right"
      }}
      open={props.open}
      autoHideDuration={6000}
      onClose={props.handleCloseSnackbar}
      action={
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={props.handleCloseSnackbar}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <MuiAlert variant="filled" elevation={6} severity="success">
        {t("changes saved")}
        <h3>{titleCase(props.notificationFrequency)}</h3>
        {getSnackbarText()}
      </MuiAlert>
    </Snackbar>
  );
};
