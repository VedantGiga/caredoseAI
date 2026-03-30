import { Response } from "express";
import { z } from "zod";
import { adminDb } from "../lib/firebase-admin";
import { AuthRequest } from "../middlewares/authenticate.js";
import { logger } from "../lib/logger.js";

const updateStatusSchema = z.object({
  status: z.enum(["taken", "missed"]),
});

const PATIENTS_COLLECTION = "patients";
const LOGS_COLLECTION = "activity_logs";

export async function getPatientLogs(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;
  const limit = parseInt(String(req.query["limit"] ?? "50"), 10);
  // Firestore offset is better handled via startAfter, but for simple migration 
  // we'll just fetch and slice if needed, or ignore for now if not critical.

  try {
    const patientDoc = await adminDb.collection(PATIENTS_COLLECTION).doc(patientId as string).get();
    if (!patientDoc.exists || patientDoc.data()?.userId !== req.userId) {
      res.status(404).json({ error: "NotFound", message: "Patient not found" });
      return;
    }

    const snapshot = await adminDb.collection(LOGS_COLLECTION)
      .where("patientId", "==", patientId!)
      .orderBy("scheduledTime", "desc")
      .limit(limit)
      .get();
    
    const logs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch (error) {
    logger.error({ error, patientId, userId: req.userId }, "Failed to fetch logs");
    res.status(500).json({ error: "FirestoreError", message: "Failed to fetch logs" });
  }
}

export async function updateLogStatus(req: AuthRequest, res: Response): Promise<void> {
  const { logId } = req.params;
  const parseResult = updateStatusSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid status" });
    return;
  }

  try {
    const logRef = adminDb.collection(LOGS_COLLECTION).doc(logId as string);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      res.status(404).json({ error: "NotFound", message: "Log not found" });
      return;
    }

    const logData = logDoc.data();
    const patientDoc = await adminDb.collection(PATIENTS_COLLECTION).doc(logData?.patientId as string).get();

    if (!patientDoc.exists || patientDoc.data()?.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "Not allowed" });
      return;
    }

    await logRef.update({
      status: parseResult.data.status,
      source: "manual",
      respondedAt: new Date().toISOString(),
    });

    const updated = await logRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    logger.error({ error, logId, userId: req.userId }, "Failed to update log status");
    res.status(500).json({ error: "FirestoreError", message: "Failed to update log status" });
  }
}
