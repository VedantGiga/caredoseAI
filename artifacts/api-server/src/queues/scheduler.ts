import cron from "node-cron";
import { adminDb } from "../lib/firebase-admin";
import { makeReminderCall, registerCall } from "../services/twilio.service.js";
import { logger } from "../lib/logger.js";

let schedulerStarted = false;

const MEDICINES_COLLECTION = "medicines";
const PATIENTS_COLLECTION = "patients";
const LOGS_COLLECTION = "activity_logs";

export function startScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  logger.info("Medicine reminder scheduler started (runs every minute)");

  cron.schedule("* * * * *", async () => {
    try {
      await checkAndFireReminders();
    } catch (err) {
      logger.error({ err }, "Scheduler tick error");
    }
  });
}

async function checkAndFireReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setSeconds(0, 0);
  windowStart.setMilliseconds(0);
  const windowEnd = new Date(windowStart.getTime() + 60_000);

  const todayStr = now.toISOString().split("T")[0]!;

  try {
    const medicinesSnapshot = await adminDb.collection(MEDICINES_COLLECTION)
      .where("isActive", "==", true)
      .where("startDate", "<=", todayStr)
      .get();

    for (const medicineDoc of medicinesSnapshot.docs) {
      const medicine = { id: medicineDoc.id, ...medicineDoc.data() } as any;

      if (medicine.endDate && medicine.endDate < todayStr) continue;

      if (!shouldFireToday(medicine.frequency, medicine.startDate, todayStr)) continue;

      const times = medicine.times as Array<{ hour: number; minute: number; label?: string }>;

      for (const timeSlot of times) {
        const scheduled = new Date();
        scheduled.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

        if (scheduled >= windowStart && scheduled < windowEnd) {
          // Fetch patient details
          const patientDoc = await adminDb.collection(PATIENTS_COLLECTION).doc(medicine.patientId).get();
          if (patientDoc.exists) {
            const patient = { id: patientDoc.id, ...patientDoc.data() } as any;
            await fireReminder(medicine, patient, scheduled);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.code === 5 || error.message?.includes("NOT_FOUND")) {
      logger.error(
        "Firestore Database NOT FOUND (Code 5). Please ensure you have created a Cloud Firestore database in Native Mode for your project 'caredoseai' in the Firebase Console: https://console.firebase.google.com/",
      );
    } else if (error.code === 9 || error.message?.includes("FAILED_PRECONDITION")) {
      logger.error(
        { error: error.message },
        "Firestore INDEX MISSING (Code 9). This query requires a composite index. Please check your console logs or the Firebase Console to create the required index for the 'medicines' collection (isActive: ASC, startDate: ASC).",
      );
    } else {
      logger.error({ error }, "Error checking reminders in Firestore");
    }
  }
}

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

async function fireReminder(
  medicine: any,
  patient: any,
  scheduledTime: Date,
): Promise<void> {
  const scheduledTimeISO = scheduledTime.toISOString();
  
  // Check for existing log in ±30 seconds window
  const existingSnapshot = await adminDb.collection(LOGS_COLLECTION)
    .where("medicineId", "==", medicine.id)
    .where("scheduledTime", "==", scheduledTimeISO)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    logger.info(
      { medicineId: medicine.id, scheduledTime },
      "Reminder already fired for this slot — skipping",
    );
    return;
  }

  try {
    const logRef = await adminDb.collection(LOGS_COLLECTION).add({
      patientId: medicine.patientId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      scheduledTime: scheduledTimeISO,
      status: "pending",
      source: null,
    });

    const logId = logRef.id;

    logger.info(
      { logId, patientName: patient.name, medicine: medicine.name },
      "Firing medicine reminder call",
    );

    const callSid = await makeReminderCall(
      patient.phone,
      patient.name,
      medicine.name,
      medicine.dosage,
      patient.language,
    );

    if (callSid) {
      registerCall(callSid, {
        logId,
        patientId: patient.id,
        medicineName: medicine.name,
      });

      await logRef.update({ callSid, source: "call" });
    }
  } catch (error) {
    logger.error({ error, medicineId: medicine.id }, "Failed to fire reminder");
  }
}

export async function scheduleMedicine(): Promise<void> {}
export async function cancelMedicineJobs(): Promise<void> {}
