import ButtonBase from "@material-ui/core/ButtonBase";
import Collapse from "@material-ui/core/Collapse";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { useGetAssignmentCannedResponsesQuery } from "@spoke/spoke-codegen";
import React, { useState } from "react";

interface CannedResponsesProps {
  assignmentId: string;
  // Same {field} interpolation the script bubbles use, so the preview reads
  // naturally with the contact's details filled in.
  interpolate: (text: string) => string;
  // Called with the raw response text when a volunteer picks one; the caller
  // drops it into the call script.
  onSelect: (text: string) => void;
}

const useStyles = makeStyles((theme) => ({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: theme.spacing(1, 0),
    textAlign: "left"
  },
  expandIcon: {
    transition: theme.transitions.create("transform")
  },
  expandIconOpen: {
    transform: "rotate(180deg)"
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1)
  },
  item: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 8,
    backgroundColor: theme.palette.grey[50],
    border: `1px solid ${theme.palette.divider}`,
    transition: "background-color 0.15s",
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  title: {
    fontWeight: 600
  },
  text: {
    whiteSpace: "pre-wrap"
  }
}));

// Reference talking points for the volunteer to read aloud during a call.
// Picking one appends it to the call script (the texting view inserts it into
// the message box instead — a call has nothing to send).
const CannedResponses: React.FC<CannedResponsesProps> = ({
  assignmentId,
  interpolate,
  onSelect
}) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);

  const { data, loading, error } = useGetAssignmentCannedResponsesQuery({
    variables: { assignmentId }
  });
  const cannedResponses = data?.assignment?.cannedResponses ?? [];

  // No canned responses for this campaign: render nothing so the call view
  // stays uncluttered (mirrors the texting view hiding the button).
  if (!loading && !error && cannedResponses.length === 0) return null;

  return (
    <>
      <ButtonBase className={classes.header} onClick={() => setOpen(!open)}>
        <Typography variant="subtitle1">
          Canned Responses
          {cannedResponses.length > 0 ? ` (${cannedResponses.length})` : ""}
        </Typography>
        <ExpandMoreIcon
          className={`${classes.expandIcon} ${
            open ? classes.expandIconOpen : ""
          }`}
        />
      </ButtonBase>
      <Collapse in={open}>
        {loading && (
          <Typography color="textSecondary" variant="body2">
            Loading…
          </Typography>
        )}
        {error && (
          <Typography color="error" variant="body2">
            Failed to load canned responses.
          </Typography>
        )}
        <div className={classes.list}>
          {cannedResponses.map((response) => (
            <ButtonBase
              key={response.id}
              className={classes.item}
              onClick={() => onSelect(response.text)}
            >
              <Typography className={classes.title} variant="body2">
                {response.title}
              </Typography>
              <Typography
                className={classes.text}
                color="textSecondary"
                variant="body2"
              >
                {interpolate(response.text)}
              </Typography>
            </ButtonBase>
          ))}
        </div>
      </Collapse>
    </>
  );
};

export default CannedResponses;
