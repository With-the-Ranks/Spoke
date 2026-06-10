import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";

interface CallTimerProps {
  // Epoch ms when the call was answered, or null if it never connected.
  startedAt: number | null;
  // Epoch ms when the call ended, or null while still in progress.
  endedAt: number | null;
}

const useStyles = makeStyles((theme) => ({
  timer: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    marginLeft: theme.spacing(1.5),
    color: theme.palette.text.secondary
  }
}));

const formatDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const CallTimer: React.FC<CallTimerProps> = ({ startedAt, endedAt }) => {
  const classes = useStyles();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Only tick while a call is in progress.
    if (startedAt === null || endedAt !== null) return undefined;
    setNow(Date.now());
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [startedAt, endedAt]);

  // No duration to show until the call actually connects.
  if (startedAt === null) return null;

  const elapsedSeconds = Math.floor(((endedAt ?? now) - startedAt) / 1000);

  return (
    <Typography className={classes.timer} variant="body2" component="span">
      {formatDuration(elapsedSeconds)}
    </Typography>
  );
};

export default CallTimer;
