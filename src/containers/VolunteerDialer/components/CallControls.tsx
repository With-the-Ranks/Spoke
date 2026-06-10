import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import CallIcon from "@material-ui/icons/Call";
import CallEndIcon from "@material-ui/icons/CallEnd";
import MicIcon from "@material-ui/icons/Mic";
import MicOffIcon from "@material-ui/icons/MicOff";
import React from "react";

import type { CallState } from "../useTelnyxWebRTC";

interface CallControlsProps {
  callState: CallState;
  clientReady: boolean;
  isMuted: boolean;
  isSubmitting: boolean;
  onDial: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    gap: theme.spacing(2),
    alignItems: "center",
    marginBottom: theme.spacing(2)
  },
  dialButton: {
    backgroundColor: theme.palette.success?.main ?? "#4caf50",
    color: "#fff",
    "&:hover": {
      backgroundColor: theme.palette.success?.dark ?? "#388e3c"
    }
  },
  hangupButton: {
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    "&:hover": {
      backgroundColor: theme.palette.error.dark
    }
  }
}));

const CallControls: React.FC<CallControlsProps> = ({
  callState,
  clientReady,
  isMuted,
  isSubmitting,
  onDial,
  onHangup,
  onToggleMute
}) => {
  const classes = useStyles();
  const isInCall =
    callState === "dialing" ||
    callState === "ringing" ||
    callState === "active" ||
    callState === "held";
  const canDial = clientReady && callState === "ready" && !isSubmitting;

  return (
    <div className={classes.root}>
      {!isInCall ? (
        <Button
          className={classes.dialButton}
          disabled={!canDial}
          onClick={onDial}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <CallIcon />
            )
          }
          variant="contained"
        >
          Dial
        </Button>
      ) : (
        <>
          <Button
            className={classes.hangupButton}
            onClick={onHangup}
            startIcon={<CallEndIcon />}
            variant="contained"
          >
            Hang Up
          </Button>
          <Tooltip title={isMuted ? "Unmute" : "Mute"}>
            <Button
              color={isMuted ? "secondary" : "default"}
              onClick={onToggleMute}
              startIcon={isMuted ? <MicOffIcon /> : <MicIcon />}
              variant="outlined"
            >
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default CallControls;
