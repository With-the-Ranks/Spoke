import Snackbar from "@material-ui/core/Snackbar";
import Alert from "@material-ui/lab/Alert";
import React from "react";

interface ExportCampaignDataSnackbarProps {
  open: boolean;
  errorMessage: string | null;
  onClose: () => void;
}

const ExportCampaignDataSnackbar: React.FC<ExportCampaignDataSnackbarProps> = ({
  open,
  errorMessage,
  onClose
}) => {
  return errorMessage ? (
    <Snackbar open={open} autoHideDuration={5000} onClose={onClose}>
      <Alert severity="error">{errorMessage}</Alert>
    </Snackbar>
  ) : (
    <Snackbar
      open={open}
      message="Exports started - we'll e-mail you when they're done"
      autoHideDuration={5000}
      onClose={onClose}
    />
  );
};

export default ExportCampaignDataSnackbar;
