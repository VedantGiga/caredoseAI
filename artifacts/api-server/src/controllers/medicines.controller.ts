import { Response } from "express";
import { z } from "zod";
import { adminDb } from "../lib/firebase-admin";
import { AuthRequest } from "../middlewares/authenticate.js";
import { logger } from "../lib/logger.js";

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

const PATIENTS_COLLECTION = "patients";
const MEDICINES_COLLECTION = "medicines";
const LOGS_COLLECTION = "activity_logs";

function shouldFireToday(
  frequency: string,
  startDateStr: string,
  todayStr: string,
): boolean {
  if (frequency === "daily") return true;

  const start = new Date(startDateStr);
  const today = new Date(todayStr);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000);

  if (frequency === "alternate_days") return diffDays % 2 === 0;
  if (frequency === "weekly") return diffDays % 7 === 0;
  return true;
}

async function verifyPatientOwnership(patientId: string, userId: string): Promise<boolean> {
  const doc = await adminDb.collection(PATIENTS_COLLECTION).doc(patientId).get();
  return doc.exists && doc.data()?.userId === userId;
}

export async function getMedicines(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  try {
    const owned = await verifyPatientOwnership(patientId as string, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "NotFound", message: "Patient not found" });
      return;
    }

    const snapshot = await adminDb.collection(MEDICINES_COLLECTION)
      .where("patientId", "==", patientId as string)
      .get();
    
    const medicines = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: "FirestoreError", message: "Failed to fetch medicines" });
  }
}

export async function createMedicine(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  const owned = await verifyPatientOwnership(patientId as string, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  const parseResult = createMedicineSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  try {
    const docRef = await adminDb.collection(MEDICINES_COLLECTION).add({
      ...parseResult.data,
      patientId: patientId!,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const doc = await docRef.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: "FirestoreError", message: "Failed to create medicine" });
  }
}

export async function updateMedicine(req: AuthRequest, res: Response): Promise<void> {
  const { patientId, medicineId } = req.params;

  const owned = await verifyPatientOwnership(patientId as string, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  const parseResult = updateMedicineSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input" });
    return;
  }

  try {
    const docRef = adminDb.collection(MEDICINES_COLLECTION).doc(medicineId!);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.patientId !== patientId) {
      res.status(404).json({ error: "NotFound", message: "Medicine not found" });
      return;
    }

    await docRef.update(parseResult.data);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ error: "FirestoreError", message: "Failed to update medicine" });
  }
}

export async function deleteMedicine(req: AuthRequest, res: Response): Promise<void> {
  const { patientId, medicineId } = req.params;

  const owned = await verifyPatientOwnership(patientId as string, req.userId!);
  if (!owned) {
    res.status(404).json({ error: "NotFound", message: "Patient not found" });
    return;
  }

  try {
    const docRef = adminDb.collection(MEDICINES_COLLECTION).doc(medicineId!);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.patientId !== patientId) {
      res.status(404).json({ error: "NotFound", message: "Medicine not found" });
      return;
    }

    await docRef.delete();
    res.json({ success: true, message: "Medicine deleted" });
  } catch (error) {
    res.status(500).json({ error: "FirestoreError", message: "Failed to delete medicine" });
  }
}

export async function getPatientDashboard(req: AuthRequest, res: Response): Promise<void> {
  const { patientId } = req.params;

  try {
    const patientDoc = await adminDb.collection(PATIENTS_COLLECTION).doc(patientId!).get();
    if (!patientDoc.exists || patientDoc.data()?.userId !== req.userId) {
      res.status(404).json({ error: "NotFound", message: "Patient not found" });
      return;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const medicinesSnapshot = await adminDb.collection(MEDICINES_COLLECTION)
      .where("patientId", "==", patientId!)
      .where("isActive", "==", true)
      .get();
    
    const activeMedicines = medicinesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const todayStr = today.toISOString().split("T")[0]!;

    const projectedDoses: any[] = [];
    for (const medicine of activeMedicines) {
      if (medicine.endDate && medicine.endDate < todayStr) continue;
      if (medicine.startDate > todayStr) continue;
      if (!shouldFireToday(medicine.frequency, medicine.startDate, todayStr)) continue;

      const times = medicine.times as Array<{ hour: number; minute: number; label?: string }>;
      for (const t of times) {
        const scheduledTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), t.hour, t.minute, 0, 0);
        projectedDoses.push({
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: medicine.dosage,
          scheduledTime: scheduledTime.toISOString(),
          status: "pending",
          logId: null,
        });
      }
    }

    const logsSnapshot = await adminDb.collection(LOGS_COLLECTION)
      .where("patientId", "==", patientId!)
      .where("scheduledTime", ">=", todayStart.toISOString())
      .where("scheduledTime", "<", todayEnd.toISOString())
      .get();

    const actualLogs = logsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    
    // Merge projected with actual logs (actual status overwrites pending)
    const todayDoses = projectedDoses.map(p => {
      const log = actualLogs.find(l => l.medicineId === p.medicineId && l.scheduledTime === p.scheduledTime);
      if (log) {
        return {
          ...p,
          status: log.status,
          logId: log.id,
          source: log.source || null,
        };
      }
      return p;
    });

    // Also include logs that weren't in projected (if any, e.g. manual doses)
    actualLogs.forEach(log => {
      if (!todayDoses.some(d => d.logId === log.id)) {
        todayDoses.push({
          logId: log.id,
          medicineId: log.medicineId,
          medicineName: log.medicineName,
          dosage: log.dosage,
          scheduledTime: log.scheduledTime,
          status: log.status,
          source: log.source || null,
        });
      }
    });

    todayDoses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentSnapshot = await adminDb.collection(LOGS_COLLECTION)
      .where("patientId", "==", patientId!)
      .where("scheduledTime", ">=", thirtyDaysAgo.toISOString())
      .where("scheduledTime", "<=", today.toISOString())
      .get();

    const recentLogs = recentSnapshot.docs.map((doc: any) => doc.data());
    const completedLogs = recentLogs.filter((l: any) => l.status !== "pending");
    const takenLogs = recentLogs.filter((l: any) => l.status === "taken");
    const adherencePercentage =
      completedLogs.length === 0 ? 100 : Math.round((takenLogs.length / completedLogs.length) * 100);

    const weeklyAdherence: { date: string; percentage: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(dStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dStartISO = dStart.toISOString();
      const dEndISO = dEnd.toISOString();
      
      const dayLogs = recentLogs.filter(
        (l: any) => l.scheduledTime >= dStartISO && l.scheduledTime < dEndISO,
      );
      const dayCompleted = dayLogs.filter((l: any) => l.status !== "pending");
      const dayTaken = dayLogs.filter((l: any) => l.status === "taken");
      
      weeklyAdherence.push({
        date: dStart.toISOString().split("T")[0]!,
        percentage: dayCompleted.length === 0 ? 100 : Math.round((dayTaken.length / dayCompleted.length) * 100),
      });
    }

    res.json({
      patient: { id: patientDoc.id, ...patientDoc.data() },
      todayDoses,
      adherencePercentage,
      weeklyAdherence,
    });
  } catch (error) {
    logger.error({ error, patientId, userId: req.userId }, "Failed to fetch dashboard");
    res.status(500).json({ error: "FirestoreError", message: "Failed to fetch dashboard" });
  }
}
