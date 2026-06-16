import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import { useDialerContactTextingHistoryLazyQuery } from "@spoke/spoke-codegen";
import React from "react";

import { DateTime } from "../../../lib/datetime";

interface ContactHistoryPanelProps {
  dialerCampaignContactId: string;
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    // Allow the flex column to shrink so content never forces horizontal scroll.
    minWidth: 0
  },
  intro: {
    color: theme.palette.text.secondary
  },
  conversation: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5)
  },
  campaignTitle: {
    fontWeight: 600
  },
  thread: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1)
  },
  row: {
    display: "flex",
    minWidth: 0
  },
  rowLeft: {
    justifyContent: "flex-start"
  },
  rowRight: {
    justifyContent: "flex-end"
  },
  bubble: {
    maxWidth: "85%",
    padding: theme.spacing(0.75, 1.25),
    borderRadius: 12,
    whiteSpace: "pre-wrap",
    // Break long words/URLs so a message can't push the panel wider.
    overflowWrap: "anywhere"
  },
  receivedBubble: {
    backgroundColor: theme.palette.grey[200],
    borderTopLeftRadius: 4
  },
  sentBubble: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderTopRightRadius: 4
  },
  time: {
    display: "block",
    marginTop: theme.spacing(0.25),
    opacity: 0.7
  }
}));

// On-demand panel showing the contact's prior texting conversations (same phone,
// same org) so a volunteer has context before calling. Lazily loaded — nothing
// is fetched until the volunteer asks for it.
const ContactHistoryPanel: React.FC<ContactHistoryPanelProps> = ({
  dialerCampaignContactId
}) => {
  const classes = useStyles();

  const [
    loadHistory,
    { data, loading, called, error }
  ] = useDialerContactTextingHistoryLazyQuery({
    variables: { dialerCampaignContactId }
  });

  const conversations = data?.dialerContactTextingHistory ?? [];

  return (
    <div className={classes.root}>
      <Typography variant="h6">Texting history</Typography>

      {!called && (
        <>
          <Typography variant="body2" className={classes.intro}>
            See this contact&apos;s previous text conversations before you call.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => loadHistory()}
          >
            Load texting history
          </Button>
        </>
      )}

      {loading && <CircularProgress size={24} />}

      {error && (
        <Typography color="error" variant="body2">
          Failed to load texting history.
        </Typography>
      )}

      {called && !loading && !error && conversations.length === 0 && (
        <Typography variant="body2" className={classes.intro}>
          No previous texting conversations with this contact.
        </Typography>
      )}

      {conversations.map((conversation) => (
        <div key={conversation.contactId} className={classes.conversation}>
          <Typography className={classes.campaignTitle} variant="subtitle2">
            {conversation.campaignTitle}
          </Typography>
          <Divider />
          <div className={classes.thread}>
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`${classes.row} ${
                  message.isFromContact ? classes.rowLeft : classes.rowRight
                }`}
              >
                <div
                  className={`${classes.bubble} ${
                    message.isFromContact
                      ? classes.receivedBubble
                      : classes.sentBubble
                  }`}
                >
                  <Typography variant="body2">{message.text}</Typography>
                  {message.createdAt && (
                    <Typography className={classes.time} variant="caption">
                      {DateTime.fromISO(message.createdAt).toRelative()}
                    </Typography>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactHistoryPanel;
