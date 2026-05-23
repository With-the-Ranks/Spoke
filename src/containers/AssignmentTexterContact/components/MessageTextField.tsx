import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React, { useEffect, useRef } from "react";

import SpokeFormField from "../../../components/forms/SpokeFormField";

const FIELD_NAME = "messageText";

const useStyles = makeStyles({
  textField: {
    "@media(max-width: 350px)": {
      overflowY: "scroll"
    }
  }
});

interface MessageTextFieldProps {
  [key: string]: unknown;
}

const MessageTextField: React.FC<MessageTextFieldProps> = (props) => {
  const classes = useStyles();

  const messageTextRef = useRef<HTMLDivElement | null>(null);

  const getMessageFieldRef = () => {
    if (messageTextRef.current) {
      return messageTextRef.current.querySelectorAll(
        `textarea[name="${FIELD_NAME}"]`
      )[0];
    }
  };

  // Allow <shift> + <enter> to add newlines rather than submitting
  const onEnterDown = (event: Event) => {
    const { key, shiftKey } = event as KeyboardEvent;
    if (key === "Enter" && !shiftKey) event.preventDefault();
  };

  useEffect(() => {
    const textField = getMessageFieldRef();
    textField?.addEventListener("keydown", onEnterDown);
    return () => {
      textField?.removeEventListener("keydown", onEnterDown);
    };
  }, []);

  return (
    <div ref={messageTextRef}>
      <SpokeFormField
        className={classes.textField}
        name={FIELD_NAME}
        label="Your message"
        as={TextField}
        multiline
        fullWidth
        rowsMax={6}
        {...props}
      />
    </div>
  );
};

export default MessageTextField;
