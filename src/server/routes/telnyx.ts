import express from "express";

import { config } from "../../config";
import logger from "../../logger";
import type { SpokeRequest } from "../types";

const router = express.Router();

router.get("/telnyx/token", async (req, res) => {
  const spokeReq = req as SpokeRequest;
  if (!spokeReq.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { TELNYX_SIP_USERNAME, TELNYX_SIP_PASSWORD } = config;

  if (!TELNYX_SIP_USERNAME || !TELNYX_SIP_PASSWORD) {
    return res
      .status(503)
      .json({ error: "Telnyx calling is not configured on this server." });
  }

  return res.json({
    login: TELNYX_SIP_USERNAME,
    password: TELNYX_SIP_PASSWORD
  });
});

// Telnyx sends call control events here — must be publicly reachable (e.g. via ngrok in dev).
// Configure this URL on your Credential Connection in the Telnyx portal.
router.post("/telnyx/webhook", (req, res) => {
  const event = req.body;
  const eventType = event?.data?.event_type;
  const callId =
    event?.data?.payload?.call_control_id ??
    event?.data?.payload?.call_session_id;

  logger.info("Telnyx webhook", { eventType, callId });

  // Respond 200 immediately — Telnyx retries if it doesn't get a timely response.
  res.sendStatus(200);
});

export default router;
