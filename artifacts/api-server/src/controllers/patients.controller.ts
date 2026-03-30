import { Response } from "express";
import { z } from "zod";
import { db, patientsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AuthRequest } from "../middlewares/authenticate.js";

const createPatientSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(1).max(150),
  phone: z.string().min(8),
  language: z.enum(["english", "hindi", "gujarati", "tamil", "telugu", "marathi"]),
});

const updatePatientSchema = createPatientSchema.partial();

export async function getPatients(req: AuthRequest, res: Response): Promise<void> {
  const patients = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.userId, req.userId!));
  res.json(patients);
}

export async function createPatient(req: AuthRequest, res: Response): Promise<void> {
  const parseResult = createPatientSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  const [patient] = await db
    .insert(patientsTable)
    .values({ ...parseResult.data, userId: req.userId! })
    .returning();

  res.status(201).json(patient);
}

export async function getPatient(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.id, patientId!), eq(patientsTable.userId, req.userId!)))
    .limit(1);

  if (!patient) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  res.json(patient);
}

export async function updatePatient(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;
  const parseResult = updatePatientSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  const [patient] = await db
    .update(patientsTable)
    .set(parseResult.data)
    .where(and(eq(patientsTable.id, patientId!), eq(patientsTable.userId, req.userId!)))
    .returning();

  if (!patient) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  res.json(patient);
}

export async function deletePatient(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  const [deleted] = await db
    .delete(patientsTable)
    .where(and(eq(patientsTable.id, patientId!), eq(patientsTable.userId, req.userId!)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  res.json({ success: true, message: "Patient deleted" });
}
