import { Response } from "express";
import { z } from "zod";
import { db, medicinesTable, patientsTable, activityLogsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { AuthRequest } from "../middlewares/authenticate.js";
import { scheduleMedicine, cancelMedicineJobs } from "../queues/scheduler.js";

const medicineTimeSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  label: z.string().optional(),
});

const createMedicineSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.enum(["daily", "alternate_days", "weekly", "custom"]),
  times: z.array(medicineTimeSchema).min(1),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

const updateMedicineSchema = createMedicineSchema.partial().extend({
  isActive: z.boolean().optional(),
});

async function verifyPatientOwnership(patientId: string, userId: string): Promise<boolean> {
  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.id, patientId), eq(patientsTable.userId, userId)))
    .limit(1);
  return !!patient;
}

export async function getMedicines(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  const owned = await verifyPatientOwnership(patientId!, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  const medicines = await db
    .select()
    .from(medicinesTable)
    .where(eq(medicinesTable.patientId, patientId!));
  res.json(medicines);
}

export async function createMedicine(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  const owned = await verifyPatientOwnership(patientId!, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  const parseResult = createMedicineSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  const [medicine] = await db
    .insert(medicinesTable)
    .values({ ...parseResult.data, patientId: patientId!, endDate: parseResult.data.endDate ?? null })
    .returning();

  await scheduleMedicine(medicine!);

  res.status(201).json(medicine);
}

export async function updateMedicine(req: AuthRequest, res: Response): Promise<void> {
  const { patientId, medicineId } = req.params;

  const owned = await verifyPatientOwnership(patientId!, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  const parseResult = updateMedicineSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  const [medicine] = await db
    .update(medicinesTable)
    .set(parseResult.data)
    .where(and(eq(medicinesTable.id, medicineId!), eq(medicinesTable.patientId, patientId!)))
    .returning();

  if (!medicine) {
    res.status(404).json({ error: "NotFound", message: "Medicine not found" });
    return;
  }

  await cancelMedicineJobs(medicineId!);
  if (medicine.isActive) {
    await scheduleMedicine(medicine);
  }

  res.json(medicine);
}

export async function deleteMedicine(req: AuthRequest, res: Response): Promise<void> {
  const { patientId, medicineId } = req.params;

  const owned = await verifyPatientOwnership(patientId!, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  await cancelMedicineJobs(medicineId!);

  const [deleted] = await db
    .delete(medicinesTable)
    .where(and(eq(medicinesTable.id, medicineId!), eq(medicinesTable.patientId, patientId!)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "NotFound", message: "Medicine not found" });
    return;
  }

  res.json({ success: true, message: "Medicine deleted" });
}

export async function getPatientDashboard(req: AuthRequest, res: Response): Promise<void> {
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

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayLogs = await db
    .select()
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.patientId, patientId!),
        gte(activityLogsTable.scheduledTime, todayStart),
        lte(activityLogsTable.scheduledTime, todayEnd),
      ),
    );

  const todayDoses = todayLogs.map((log) => ({
    logId: log.id,
    medicineId: log.medicineId,
    medicineName: log.medicineName,
    dosage: log.dosage,
    scheduledTime: log.scheduledTime,
    status: log.status as "taken" | "missed" | "pending",
    source: log.source as "call" | "manual" | "auto" | null,
  }));

  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentLogs = await db
    .select()
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.patientId, patientId!),
        gte(activityLogsTable.scheduledTime, thirtyDaysAgo),
        lte(activityLogsTable.scheduledTime, today),
      ),
    );

  const completedLogs = recentLogs.filter((l) => l.status !== "pending");
  const takenLogs = recentLogs.filter((l) => l.status === "taken");
  const adherencePercentage =
    completedLogs.length === 0 ? 100 : Math.round((takenLogs.length / completedLogs.length) * 100);

  const weeklyAdherence: { date: string; percentage: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayLogs = recentLogs.filter(
      (l) => l.scheduledTime >= dayStart && l.scheduledTime < dayEnd,
    );
    const dayCompleted = dayLogs.filter((l) => l.status !== "pending");
    const dayTaken = dayLogs.filter((l) => l.status === "taken");
    weeklyAdherence.push({
      date: dayStart.toISOString().split("T")[0]!,
      percentage: dayCompleted.length === 0 ? 100 : Math.round((dayTaken.length / dayCompleted.length) * 100),
    });
  }

  res.json({
    patient,
    todayDoses,
    adherencePercentage,
    weeklyAdherence,
  });
}
