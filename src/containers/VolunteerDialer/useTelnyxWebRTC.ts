import type { Call, INotification, TelnyxRTC } from "@telnyx/webrtc";
import { NOTIFICATION_TYPE } from "@telnyx/webrtc";
import { useCallback, useEffect, useRef, useState } from "react";

export type CallState =
  | "idle"
  | "connecting"
  | "ready"
  | "dialing"
  | "ringing"
  | "active"
  | "held"
  | "ended"
  | "error";

interface UseTelnyxWebRTCResult {
  clientReady: boolean;
  callState: CallState;
  activeCall: Call | null;
  isMuted: boolean;
  // Whether the most recent call ever reached the `active` state (someone, or
  // a machine, picked up). Used to auto-suggest a disposition.
  callWasAnswered: boolean;
  // The Telnyx hangup cause of the most recent call (e.g. "USER_BUSY",
  // "NO_ANSWER", "NORMAL_CLEARING"), or null if not ended/unknown.
  callEndCause: string | null;
  // Epoch ms when the current call was answered (reached `active`) and when it
  // ended, for computing call duration. Null until each event occurs.
  callStartedAt: number | null;
  callEndedAt: number | null;
  dial: (destinationNumber: string, callerNumber: string) => void;
  hangup: () => void;
  toggleMute: () => void;
  error: string | null;
}

export const useTelnyxWebRTC = (): UseTelnyxWebRTCResult => {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const wasAnsweredRef = useRef(false);

  const [clientReady, setClientReady] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callWasAnswered, setCallWasAnswered] = useState(false);
  const [callEndCause, setCallEndCause] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callEndedAt, setCallEndedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The Telnyx SDK attaches the remote party's audio stream to this element
  // and plays it; without a remoteElement there is no audio output.
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    return () => {
      audio.remove();
      remoteAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    let destroyed = false;
    setCallState("connecting");

    fetch("/telnyx/token")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Telnyx credentials");
        return res.json();
      })
      .then(async ({ login_token: loginToken }) => {
        if (destroyed) return;

        // Dynamic import so the SDK doesn't run server-side
        const { TelnyxRTC: TelnyxRTCClass } = await import("@telnyx/webrtc");
        if (destroyed) return;

        const client = new TelnyxRTCClass({ login_token: loginToken });

        client.on("telnyx.notification", (notification: INotification) => {
          if (notification.type !== NOTIFICATION_TYPE.callUpdate) return;
          const { call } = notification;
          if (!call) return;

          activeCallRef.current = call;
          setActiveCall(call);

          // Map Telnyx numeric state to our display state
          const stateLabel: string = (call as any).state ?? "";
          switch (stateLabel) {
            case "requesting":
            case "trying":
              setCallState("dialing");
              break;
            case "ringing":
              setCallState("ringing");
              break;
            case "active":
              wasAnsweredRef.current = true;
              setCallWasAnswered(true);
              setCallStartedAt((prev) => prev ?? Date.now());
              setCallState("active");
              break;
            case "held":
              setCallState("held");
              break;
            case "hangup":
            case "destroy":
            case "purge":
              setCallEndCause((call as any).cause ?? null);
              setCallEndedAt((prev) => prev ?? Date.now());
              setCallState("ended");
              activeCallRef.current = null;
              setActiveCall(null);
              setIsMuted(false);
              break;
            default:
              break;
          }
        });

        client.on("telnyx.error", () => {
          if (destroyed) return;
          setError("Telnyx connection error");
          setCallState("error");
        });

        clientRef.current = client;
        await client.connect();

        if (!destroyed) {
          setClientReady(true);
          setCallState("ready");
        }
      })
      .catch((err: Error) => {
        if (!destroyed) {
          setError(err.message);
          setCallState("error");
        }
      });

    return () => {
      destroyed = true;
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []);

  const dial = useCallback(
    (destinationNumber: string, callerNumber: string) => {
      if (!clientRef.current) return;
      wasAnsweredRef.current = false;
      setCallWasAnswered(false);
      setCallEndCause(null);
      setCallStartedAt(null);
      setCallEndedAt(null);
      setCallState("dialing");
      clientRef.current.newCall({
        destinationNumber,
        callerNumber,
        audio: true,
        video: false,
        remoteElement: remoteAudioRef.current ?? undefined
      });
    },
    []
  );

  const hangup = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.hangup();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) return;
    if (isMuted) {
      call.unmuteAudio();
      setIsMuted(false);
    } else {
      call.muteAudio();
      setIsMuted(true);
    }
  }, [isMuted]);

  return {
    clientReady,
    callState,
    activeCall,
    isMuted,
    callWasAnswered,
    callEndCause,
    callStartedAt,
    callEndedAt,
    dial,
    hangup,
    toggleMute,
    error
  };
};
