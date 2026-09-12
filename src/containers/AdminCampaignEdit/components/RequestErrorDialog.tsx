import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import React from "react";

export interface RequestErrorDialogProps {
  message: string | undefined;
  onClose: () => void;
}

export const RequestErrorDialog: React.FC<RequestErrorDialogProps> = ({
  message,
  onClose
}) => (
  <Dialog title="Request Error" open={message !== undefined} onClose={onClose}>
    <DialogTitle>Request Error</DialogTitle>
    <DialogContent>
      <DialogContentText>{message || ""}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button key="ok" color="primary" onClick={onClose}>
        Ok
      </Button>
    </DialogActions>
  </Dialog>
);

export default RequestErrorDialog;
