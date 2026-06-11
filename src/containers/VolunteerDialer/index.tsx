import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import { useGetNextDialerContactQuery } from "@spoke/spoke-codegen";
import React, { useCallback, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import DialerContact from "./DialerContact";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: theme.spacing(2)
  }
}));

const VolunteerDialer: React.FC = () => {
  const classes = useStyles();
  const history = useHistory();
  const { organizationId, assignmentId } = useParams<{
    organizationId: string;
    assignmentId: string;
  }>();

  const [fetchKey, setFetchKey] = useState(0);
  // Track whether we've served at least one contact this session
  const hasServedContact = useRef(false);

  const { data, loading, error, refetch } = useGetNextDialerContactQuery({
    variables: { assignmentId },
    fetchPolicy: "network-only"
  });

  const handleNextContact = useCallback(() => {
    refetch().then(({ data: nextData }) => {
      if (!nextData?.getNextDialerContact) {
        history.push(`/app/${organizationId}/todos`);
      } else {
        setFetchKey((k) => k + 1);
      }
    });
  }, [history, organizationId, refetch]);

  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.center}>
          <CircularProgress />
          <Typography color="textSecondary">Loading contact…</Typography>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.root}>
        <div className={classes.center}>
          <Typography color="error">
            Failed to load contact: {error.message}
          </Typography>
        </div>
      </div>
    );
  }

  const contact = data?.getNextDialerContact;

  if (!loading && !contact) {
    if (hasServedContact.current) {
      // Finished all contacts — redirect to todos
      history.push(`/app/${organizationId}/todos`);
      return null;
    }

    // No contacts available at all — show an informative message
    return (
      <div className={classes.root}>
        <div className={classes.center}>
          <Typography variant="h6">No contacts to dial</Typography>
          <Typography color="textSecondary" variant="body2">
            This assignment has no contacts available. An admin needs to upload
            contacts for this calling campaign.
          </Typography>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => history.push(`/app/${organizationId}/todos`)}
          >
            Back to assignments
          </Button>
        </div>
      </div>
    );
  }

  if (contact) {
    hasServedContact.current = true;
  }

  return (
    <div className={classes.root}>
      <DialerContact
        key={`${contact!.id}-${fetchKey}`}
        contact={contact!}
        assignmentId={assignmentId}
        organizationId={organizationId}
        onNextContact={handleNextContact}
      />
    </div>
  );
};

export default VolunteerDialer;
