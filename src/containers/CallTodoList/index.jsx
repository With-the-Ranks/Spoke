import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import CallEndIcon from "@material-ui/icons/CallEnd";
import MicIcon from "@material-ui/icons/Mic";
import MicOffIcon from "@material-ui/icons/MicOff";
import PhoneIcon from "@material-ui/icons/Phone";
import { TelnyxRTC } from "@telnyx/webrtc";
import React, { useCallback, useEffect, useRef, useState } from "react";

const STATUS = {
  IDLE: "idle",
  CONNECTING: "connecting",
  READY: "ready",
  CALLING: "calling",
  ACTIVE: "active",
  ENDED: "ended",
  ERROR: "error"
};

const useCallTimer = (active) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const CallTodoList = () => {
  const [status, setStatus] = useState(STATUS.CONNECTING);
  const [destination, setDestination] = useState("");
  const [callerId, setCallerId] = useState("");
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const clientRef = useRef(null);
  const callRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const duration = useCallTimer(status === STATUS.ACTIVE);

  const setError = useCallback((msg) => {
    setErrorMsg(msg);
    setStatus(STATUS.ERROR);
  }, []);

  useEffect(() => {
    let client;

    const init = async () => {
      try {
        const resp = await fetch("/telnyx/token", { credentials: "include" });
        if (!resp.ok) {
          const { error } = await resp.json();
          return setError(error || "Failed to get calling token.");
        }
        const { login, password } = await resp.json();

        client = new TelnyxRTC({ login, password });
        clientRef.current = client;

        client.on("telnyx.ready", () => setStatus(STATUS.READY));
        client.on("telnyx.error", (err) =>
          setError(err?.message || "Telnyx error.")
        );

        client.on("telnyx.notification", (notification) => {
          const { call } = notification;
          if (!call) return;
          callRef.current = call;

          if (notification.type === "callUpdate") {
            const { state } = call;
            if (state === "active") {
              setStatus(STATUS.ACTIVE);
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = call.remoteStream;
                remoteAudioRef.current.play().catch(() => {});
              }
            } else if (["hangup", "destroy"].includes(state)) {
              callRef.current = null;
              setStatus(STATUS.ENDED);
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = null;
              }
            }
          }
        });

        client.connect();
      } catch (err) {
        setError("Could not initialize calling.");
      }
    };

    init();

    return () => {
      if (callRef.current) callRef.current.hangup();
      if (client) client.disconnect();
    };
  }, [setError]);

  const handleDial = () => {
    if (!destination.trim() || !clientRef.current) return;
    setStatus(STATUS.CALLING);
    const call = clientRef.current.newCall({
      destinationNumber: destination.trim(),
      callerNumber: callerId.trim() || undefined,
      audio: true,
      video: false
    });
    callRef.current = call;
  };

  const handleHangup = () => {
    if (callRef.current) callRef.current.hangup();
  };

  const handleMute = () => {
    if (!callRef.current) return;
    if (muted) {
      callRef.current.unmuteAudio();
    } else {
      callRef.current.muteAudio();
    }
    setMuted((m) => !m);
  };

  const isDialable = status === STATUS.READY || status === STATUS.ENDED;
  const isInCall = status === STATUS.CALLING || status === STATUS.ACTIVE;

  return (
    <div style={{ padding: 32, maxWidth: 400 }}>
      {/* hidden audio element for remote stream */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay />

      <Typography variant="h6" gutterBottom>
        Call
      </Typography>

      {status === STATUS.CONNECTING && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="textSecondary">
            Connecting…
          </Typography>
        </div>
      )}

      {status === STATUS.ERROR && (
        <Typography variant="body2" color="error">
          {errorMsg}
        </Typography>
      )}

      {(isDialable || isInCall) && (
        <>
          <TextField
            label="Your caller ID"
            value={callerId}
            onChange={(e) => setCallerId(e.target.value)}
            disabled={isInCall}
            placeholder="+12125551234"
            fullWidth
            style={{ marginBottom: 12 }}
          />
          <TextField
            label="Dial number"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={isInCall}
            placeholder="+12125551234"
            fullWidth
            style={{ marginBottom: 16 }}
          />
        </>
      )}

      {status === STATUS.ACTIVE && (
        <Typography
          variant="body1"
          style={{ marginBottom: 16, fontVariantNumeric: "tabular-nums" }}
        >
          {duration}
        </Typography>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {isDialable && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PhoneIcon />}
            onClick={handleDial}
            disabled={!destination.trim()}
          >
            Dial
          </Button>
        )}

        {isInCall && (
          <>
            <IconButton onClick={handleMute} title={muted ? "Unmute" : "Mute"}>
              {muted ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
            <IconButton
              onClick={handleHangup}
              style={{ color: "#d32f2f" }}
              title="Hang up"
            >
              <CallEndIcon />
            </IconButton>
          </>
        )}
      </div>

      {status === STATUS.ENDED && (
        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginTop: 12 }}
        >
          Call ended.
        </Typography>
      )}
    </div>
  );
};

export default CallTodoList;
