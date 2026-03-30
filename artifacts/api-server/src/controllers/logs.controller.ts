import { Response } from "express";
import { z } from "zod";
import { db, activityLogsTable, patientsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { AuthRequest } from "../middlewares/authenticate.js";

const updateStatusSchema = z.object({
  status: z.enum(["taken", "missed"]),
});

export async function getPatientLogs(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;
  const limit = parseInt(String(req.query["limit"] ?? "50"), 10);
  const offset = parseInt(String(req.query["offset"] ?? "0"), 10);

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.id, patientId!), eq(patientsTable.userId, req.userId!)))
    .limit(1);

  if (!patient) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.patientId, patientId!))
    .orderBy(desc(activityLogsTable.scheduledTime))
    .limit(limit)
    .offset(offset);

  res.json(logs);
}

export async function updateLogStatus(req: AuthRequest, res: Response): Promise<void> {
  const { logId } = req.params;
  const parseResult = updateStatusSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid status" });
    return;
  }

  const [log] = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.id, logId!))
    .limit(1);

  if (!log) {
    res.status(404).json({ error: "NotFound", message: "Log not found" });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.id, log.patientId), eq(patientsTable.userId, req.userId!)))
    .limit(1);

  if (!patient) {
    res.status(403).json({ error: "Forbidden", message: "Not allowed" });
    return;
  }

  const [updated] = await db
    .update(activityLogsTable)
    .set({
      status: parseResult.data.status,
      source: "manual",
      respondedAt: new Date(),
    })
    .where(eq(activityLogsTable.id, logId!))
    .returning();

  res.json(updated);
}
