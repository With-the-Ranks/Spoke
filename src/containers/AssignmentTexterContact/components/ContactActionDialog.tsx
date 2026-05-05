import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import { Card, CardActions, CardTitle } from "material-ui/Card";
import React, { useEffect, useRef } from "react";
import Form from "react-formal";
import * as yup from "yup";

import GSForm from "../../../components/forms/GSForm";
import SpokeFormField from "../../../components/forms/SpokeFormField";

const FIELD_NAME = "messageText";

const useStyles = makeStyles({
  contactActionCard: {
    "@media(max-width: 320px)": {
      padding: "2px 10px !important"
    },
    zIndex: 2000,
    backgroundColor: "white"
  },
  dialogButton: {
    display: "inline-block"
  }
});

const contactActionSchema = yup.object({
  messageText: yup.string()
});

interface ContactActionDialogProps {
  title: string;
  messageText: string;
  submitTitle: string;
  onChange: (value: { messageText: string }) => void;
  onSubmit: () => void;
  handleCloseDialog: () => void;
}

const ContactActionDialog: React.FC<ContactActionDialogProps> = (props) => {
  const {
    title,
    messageText,
    submitTitle,
    onChange,
    onSubmit,
    handleCloseDialog
  } = props;

  const classes = useStyles();

  const contactActionTextRef = useRef<HTMLDivElement | null>(null);

  const getContactActionTextField = () => {
    if (contactActionTextRef.current) {
      return contactActionTextRef.current.querySelectorAll(
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
    const textField = getContactActionTextField();
    textField?.addEventListener("keydown", onEnterDown);
    return () => {
      textField?.removeEventListener("keydown", onEnterDown);
    };
  }, []);

  return (
    <Card>
      <CardTitle title={title} />
      <Divider />
      <CardActions className={classes.contactActionCard}>
        <GSForm
          className={classes.contactActionCard}
          schema={contactActionSchema}
          onChange={onChange}
          value={{ messageText }}
          onSubmit={onSubmit}
        >
          <div ref={contactActionTextRef}>
            <SpokeFormField name={FIELD_NAME} fullWidth autoFocus multiline />
          </div>
          <div>
            <Button
              className={classes.dialogButton}
              onClick={handleCloseDialog}
            >
              Cancel
            </Button>
            <Form.Submit
              type="submit"
              label={submitTitle}
              className={classes.dialogButton}
            />
          </div>
        </GSForm>
      </CardActions>
    </Card>
  );
};

export default ContactActionDialog;
