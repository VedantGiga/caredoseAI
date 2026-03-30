import { Request, Response } from "express";
import { db, activityLogsTable, patientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCallInfo, removeCallInfo } from "../services/twilio.service.js";
import { logger } from "../lib/logger.js";

export async function handleVoiceWebhook(req: Request, res: Response): Promise<void> {
  const { CallSid, Digits } = req.body as { CallSid?: string; Digits?: string };

  logger.info({ CallSid, Digits }, "Twilio voice webhook received");

  const callInfo = CallSid ? getCallInfo(CallSid) : null;

  if (callInfo && Digits) {
    const status = Digits === "1" ? "taken" : "missed";

    await db
      .update(activityLogsTable)
      .set({
        status,
        source: "call",
        respondedAt: new Date(),
      })
      .where(eq(activityLogsTable.id, callInfo.logId));

    logger.info({ logId: callInfo.logId, status }, "Medicine status updated via call");

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${status === "taken" ? "Thank you. Your medicine has been marked as taken. Stay healthy!" : "Understood. Please take your medicine as soon as possible. Goodbye."}</Say>
  <Hangup/>
</Response>`;

    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } else {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We did not receive your response. Please take your medicine. Goodbye.</Say>
  <Hangup/>
</Response>`;
    res.set("Content-Type", "text/xml");
    res.send(twiml);
  }
}

export async function handleStatusWebhook(req: Request, res: Response): Promise<void> {
  const { CallSid, CallStatus } = req.body as { CallSid?: string; CallStatus?: string };

  logger.info({ CallSid, CallStatus }, "Twilio status webhook received");

  if (CallSid && (CallStatus === "completed" || CallStatus === "failed" || CallStatus === "no-answer")) {
    const callInfo = getCallInfo(CallSid);
    if (callInfo && CallStatus === "no-answer") {
      await db
        .update(activityLogsTable)
        .set({ status: "no_response" })
        .where(eq(activityLogsTable.id, callInfo.logId));
    }
    if (CallSid) removeCallInfo(CallSid);
  }

  res.status(200).send("OK");
}
