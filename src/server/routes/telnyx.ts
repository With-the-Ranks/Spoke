import express from "express";
import superagent from "superagent";

import { config } from "../../config";
import logger from "../../logger";
import { r } from "../models";
import type { SpokeRequest } from "../types";
import { errToObj } from "../utils";

const router = express.Router();

// Mints a short-lived Telnyx WebRTC access token (JWT) for the logged-in user.
// The Telnyx API key and SIP credentials never leave the server; the browser
// only ever receives an ephemeral, scoped token to log in to TelnyxRTC.
router.get("/telnyx/token", async (req, res) => {
  const spokeReq = req as SpokeRequest;
  if (!spokeReq.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { TELNYX_API_KEY, TELNYX_TELEPHONY_CREDENTIAL_ID } = config;
  if (!TELNYX_API_KEY || !TELNYX_TELEPHONY_CREDENTIAL_ID) {
    return res
      .status(503)
      .json({ error: "Telnyx calling is not configured on this server." });
  }

  try {
    const response = await superagent
      .post(
        `https://api.telnyx.com/v2/telephony_credentials/${TELNYX_TELEPHONY_CREDENTIAL_ID}/token`
      )
      .set("Authorization", `Bearer ${TELNYX_API_KEY}`);

    // The token endpoint returns the JWT as a plain-text body.
    const loginToken = response.text?.trim();
    if (!loginToken) {
      throw new Error("Telnyx returned an empty access token");
    }

    return res.json({ login_token: loginToken });
  } catch (err: any) {
    logger.error("Error minting Telnyx access token", { ...errToObj(err) });
    return res
      .status(502)
      .json({ error: "Could not obtain a Telnyx access token." });
  }
});

// Telnyx Call Control webhook — updates dialer_call rows as call state changes
router.post("/telnyx/call-control", async (req, res) => {
  const { data } = req.body ?? {};
  if (!data) return res.status(400).json({ error: "Missing event data" });

  const { event_type, payload } = data;
  const callControlId: string | undefined = payload?.call_control_id;
  if (!callControlId) return res.status(200).send();

  try {
    const statusMap: Record<string, string> = {
      "call.initiated": "DIALING",
      "call.answered": "IN_PROGRESS",
      "call.hangup": "COMPLETED"
    };

    const newStatus = statusMap[event_type];
    if (!newStatus) return res.status(200).send();

    const updates: Record<string, unknown> = {
      telnyx_call_control_id: callControlId,
      status: newStatus
    };

    if (newStatus === "COMPLETED") {
      updates.ended_at = new Date();
    }

    await r
      .knex("dialer_call")
      .where({ telnyx_call_control_id: callControlId })
      .update(updates);

    return res.status(200).send();
  } catch (err: any) {
    logger.error("Error handling Telnyx call-control webhook", {
      ...errToObj(err),
      event_type,
      callControlId
    });
    return res.status(500).json({ error: err.message });
  }
});

export default router;
