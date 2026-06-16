import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import { useGetNextDialerContactQuery } from "@spoke/spoke-codegen";
import React, { useCallback, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import ContactHistoryPanel from "./components/ContactHistoryPanel";
import DialerContact from "./DialerContact";

const useStyles = makeStyles((theme) => ({
  root: {
    // The TexterDashboard wrapper renders this inside a flex content column next
    // to a 100vh sidebar. Grow to fill that column (so short content doesn't
    // leave a bare white void below the card) and carry the page background.
    flex: 1,
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    overflowX: "hidden",
    boxSizing: "border-box",
    // The dashboard content area adds 2rem (theme.spacing(4)) of side padding;
    // cancel it with negative side margins so the page background is full-bleed
    // up to the sidebar instead of sitting in a white gutter. (The root is a
    // flex child that stretches to the column width, so the negative margins
    // widen it rather than just shifting it.)
    marginLeft: theme.spacing(-4),
    marginRight: theme.spacing(-4)
  },
  backButton: {
    marginBottom: theme.spacing(2)
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: theme.spacing(2)
  },
  layout: {
    display: "flex",
    gap: theme.spacing(3),
    alignItems: "flex-start",
    // Center the panel + call card as a group within the page.
    justifyContent: "center",
    // Stack the history panel above the call card on narrow screens.
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column"
    }
  },
  historyPanel: {
    flex: "0 0 340px",
    minWidth: 0,
    // Include padding in the width — the app has no CssBaseline, so without this
    // a width:100% padded panel overflows its container by the padding amount.
    boxSizing: "border-box",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
    overflowX: "hidden",
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    [theme.breakpoints.down("sm")]: {
      flex: "1 1 auto",
      width: "100%",
      // Flow with the page on mobile instead of being an internal scroll box.
      maxHeight: "none",
      overflowY: "visible"
    }
  },
  callColumn: {
    // Desktop: at least 600px wide, capped at the card's 720 so it sits next to
    // the history panel instead of being centered far to the right.
    flex: "1 1 auto",
    minWidth: 600,
    maxWidth: 720,
    // Mobile: full width (the layout stacks at this breakpoint).
    [theme.breakpoints.down("sm")]: {
      minWidth: 0,
      maxWidth: "none",
      width: "100%"
    }
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
      <Button
        className={classes.backButton}
        startIcon={<ArrowBackIcon />}
        onClick={() => history.push(`/app/${organizationId}/todos`)}
      >
        Back to assignments
      </Button>
      <div className={classes.layout}>
        <aside className={classes.historyPanel}>
          <ContactHistoryPanel
            key={contact!.id}
            dialerCampaignContactId={contact!.id}
          />
        </aside>
        <div className={classes.callColumn}>
          <DialerContact
            key={`${contact!.id}-${fetchKey}`}
            contact={contact!}
            assignmentId={assignmentId}
            organizationId={organizationId}
            onNextContact={handleNextContact}
          />
        </div>
      </div>
    </div>
  );
};

export default VolunteerDialer;
