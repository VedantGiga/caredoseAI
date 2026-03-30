import cron from "node-cron";
import { db, medicinesTable, patientsTable, activityLogsTable } from "@workspace/db";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { makeReminderCall, registerCall } from "../services/twilio.service.js";
import { logger } from "../lib/logger.js";

let schedulerStarted = false;

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
  const windowEnd = new Date(windowStart.getTime() + 60_000);

  const todayStr = now.toISOString().split("T")[0]!;

  const medicines = await db
    .select({
      medicine: medicinesTable,
      patient: patientsTable,
    })
    .from(medicinesTable)
    .innerJoin(patientsTable, eq(medicinesTable.patientId, patientsTable.id))
    .where(
      and(
        eq(medicinesTable.isActive, true),
        lte(medicinesTable.startDate, todayStr),
      ),
    );

  for (const { medicine, patient } of medicines) {
    if (medicine.endDate && medicine.endDate < todayStr) continue;

    if (!shouldFireToday(medicine.frequency, medicine.startDate, todayStr)) continue;

    const times = medicine.times as Array<{ hour: number; minute: number; label?: string }>;

    for (const timeSlot of times) {
      const scheduled = new Date();
      scheduled.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

      if (scheduled >= windowStart && scheduled < windowEnd) {
        await fireReminder(medicine, patient, scheduled);
      }
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
  medicine: typeof medicinesTable.$inferSelect,
  patient: typeof patientsTable.$inferSelect,
  scheduledTime: Date,
): Promise<void> {
  const existing = await db
    .select()
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.medicineId, medicine.id),
        gte(activityLogsTable.scheduledTime, new Date(scheduledTime.getTime() - 30_000)),
        lte(activityLogsTable.scheduledTime, new Date(scheduledTime.getTime() + 30_000)),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    logger.info(
      { medicineId: medicine.id, scheduledTime },
      "Reminder already fired for this slot — skipping",
    );
    return;
  }

  const [log] = await db
    .insert(activityLogsTable)
    .values({
      patientId: medicine.patientId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      scheduledTime,
      status: "pending",
      source: null,
    })
    .returning();

  if (!log) return;

  logger.info(
    { logId: log.id, patientName: patient.name, medicine: medicine.name },
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
      logId: log.id,
      patientId: patient.id,
      medicineName: medicine.name,
    });

    await db
      .update(activityLogsTable)
      .set({ callSid, source: "call" })
      .where(eq(activityLogsTable.id, log.id));
  }
}

export async function scheduleMedicine(): Promise<void> {}
export async function cancelMedicineJobs(): Promise<void> {}
