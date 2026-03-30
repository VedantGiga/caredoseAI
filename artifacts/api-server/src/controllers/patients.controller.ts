import { Response } from "express";
import { z } from "zod";
import { adminDb } from "../lib/firebase-admin";
import { AuthRequest } from "../middlewares/authenticate.js";
import { logger } from "../lib/logger.js";

const createPatientSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(1).max(150),
  phone: z.string().min(8),
  language: z.enum(["english", "hindi", "gujarati", "tamil", "telugu", "marathi"]),
});

const updatePatientSchema = createPatientSchema.partial();

const COLLECTION = "patients";

export async function getPatients(req: AuthRequest, res: Response): Promise<void> {
  try {
    const snapshot = await adminDb.collection(COLLECTION)
      .where("userId", "==", req.userId!)
      .get();
    
    const patients = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(patients);
  } catch (error) {
    logger.error({ error, userId: req.userId }, "Failed to fetch patients");
    res.status(500).json({ error: "FirestoreError", message: "Failed to fetch patients" });
  }
}

export async function createPatient(req: AuthRequest, res: Response): Promise<void> {
  const parseResult = createPatientSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  try {
    const docRef = await adminDb.collection(COLLECTION).add({
      ...parseResult.data,
      userId: req.userId!,
      createdAt: new Date().toISOString(),
    });

    const doc = await docRef.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    logger.error({ error, userId: req.userId, body: req.body }, "Failed to create patient");
    res.status(500).json({ error: "FirestoreError", message: "Failed to create patient" });
  }
}

export async function getPatient(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  try {
    const doc = await adminDb.collection(COLLECTION).doc(patientId).get();
    
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: "NotFound", message: "Patient not found" });
      return;
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    logger.error({ error, patientId, userId: req.userId }, "Failed to fetch dashboard");
    res.status(500).json({ error: "FirestoreError", message: "Failed to fetch dashboard" });
  }
}

export async function updatePatient(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;
  const parseResult = updatePatientSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  try {
    const docRef = adminDb.collection(COLLECTION).doc(patientId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: "NotFound", message: "Patient not found" });
      return;
    }

    await docRef.update(parseResult.data);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ error: "FirestoreError", message: "Failed to update patient" });
  }
}

export async function deletePatient(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  try {
    const docRef = adminDb.collection(COLLECTION).doc(patientId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: "NotFound", message: "Patient not found" });
      return;
    }

    await docRef.delete();
    res.json({ success: true, message: "Patient deleted" });
  } catch (error) {
    res.status(500).json({ error: "FirestoreError", message: "Failed to delete patient" });
  }
}
