import { makeStyles } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import SpokeFormField from "../../../components/forms/SpokeFormField";

const FIELD_NAME = "messageText";

const useStyles = makeStyles({
  textField: {
    "@media(max-width: 350px)": {
      overflowY: "scroll !important"
    }
  }
});

const MessageTextField: React.FC = () => {
  const { t } = useTranslation("AssignmentTexterContact");
  const classes = useStyles();
  const messageTextRef = useRef<HTMLDivElement>(null);

  const onEnterDown = (event: KeyboardEvent) => {
    const keyCode = event.key;
    if (keyCode === "Enter" && !event.shiftKey) {
      event.preventDefault();
      return false;
    }
  };

  useEffect(() => {
    messageTextRef.current?.addEventListener("keydown", onEnterDown);
  }, [messageTextRef]);

  return (
    <div ref={messageTextRef}>
      <SpokeFormField
        className={classes.textField}
        name={FIELD_NAME}
        label={t("your message")}
        as={TextField}
        multiline
        fullWidth
        rowsMax={6}
      />
    </div>
  );
};

export default MessageTextField;
