import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import PhoneIcon from "@material-ui/icons/Phone";
import {
  useCallShiftAvailableQuery,
  useRequestCallShiftMutation
} from "@spoke/spoke-codegen";
import React, { useState } from "react";

interface CallRequestProps {
  organizationId: string;
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2)
  },
  message: {
    color: theme.palette.text.secondary
  }
}));

const CallRequest: React.FC<CallRequestProps> = ({ organizationId }) => {
  const classes = useStyles();
  const [message, setMessage] = useState<string | null>(null);

  const { data, loading } = useCallShiftAvailableQuery({
    variables: { organizationId },
    fetchPolicy: "network-only"
  });

  const [
    requestCallShift,
    { loading: requesting }
  ] = useRequestCallShiftMutation({
    // Refresh both the todo list (so the new shift's "Start Calling" appears)
    // and our own availability.
    refetchQueries: ["getTodos", "CallShiftAvailable"]
  });

  const handleRequest = async () => {
    setMessage(null);
    try {
      const response = await requestCallShift({
        variables: { organizationId }
      });
      const count = response.data?.requestCallShift.count ?? 0;
      setMessage(
        count > 0
          ? `Assigned ${count} ${count === 1 ? "call" : "calls"} to your shift.`
          : "No calls are available right now."
      );
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  // Hide entirely when there's nothing to request (mirrors TexterRequest).
  if (loading || !data?.callShiftAvailable) return null;

  return (
    <div className={classes.root}>
      <Button
        variant="contained"
        color="primary"
        startIcon={<PhoneIcon />}
        disabled={requesting}
        onClick={handleRequest}
      >
        {requesting ? "Requesting…" : "Request Calls"}
      </Button>
      {message && (
        <Typography variant="body2" className={classes.message}>
          {message}
        </Typography>
      )}
    </div>
  );
};

export default CallRequest;
