import Chip from "@material-ui/core/Chip";
import { makeStyles } from "@material-ui/core/styles";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import React from "react";

import type { CallState } from "../useTelnyxWebRTC";
import CallTimer from "./CallTimer";

interface CallStatusBarProps {
  callState: CallState;
  callStartedAt?: number | null;
  callEndedAt?: number | null;
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2)
  },
  chip: {
    fontWeight: 600,
    fontSize: "0.85rem"
  }
}));

const STATE_LABELS: Record<CallState, string> = {
  idle: "Ready to dial",
  connecting: "Connecting…",
  ready: "Ready to dial",
  dialing: "Dialing…",
  ringing: "Ringing…",
  active: "On call",
  held: "On hold",
  ended: "Call ended",
  error: "Connection error"
};

const STATE_COLORS: Record<CallState, "default" | "primary" | "secondary"> = {
  idle: "default",
  connecting: "default",
  ready: "default",
  dialing: "primary",
  ringing: "primary",
  active: "secondary",
  held: "default",
  ended: "default",
  error: "secondary"
};

const CallStatusBar: React.FC<CallStatusBarProps> = ({
  callState,
  callStartedAt = null,
  callEndedAt = null
}) => {
  const classes = useStyles();
  const isLive =
    callState === "active" ||
    callState === "ringing" ||
    callState === "dialing";

  return (
    <div className={classes.root}>
      <Chip
        className={classes.chip}
        color={STATE_COLORS[callState]}
        icon={isLive ? <FiberManualRecordIcon /> : undefined}
        label={STATE_LABELS[callState]}
        variant="outlined"
      />
      <CallTimer startedAt={callStartedAt} endedAt={callEndedAt} />
    </div>
  );
};

export default CallStatusBar;
