import express from "express";

import { config } from "../../config";
import logger from "../../logger";
import { r } from "../models";
import type { SpokeRequest } from "../types";
import { errToObj } from "../utils";

const router = express.Router();

router.get("/telnyx/token", (req, res) => {
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
