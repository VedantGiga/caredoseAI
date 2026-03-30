import { logger } from "../lib/logger.js";
import type { Medicine } from "@workspace/db";

let Queue: typeof import("bullmq").Queue | undefined;
let queueInstance: import("bullmq").Queue | undefined;

async function getQueue() {
  if (!process.env["REDIS_URL"] && !process.env["UPSTASH_REDIS_REST_URL"]) {
    logger.warn("Redis not configured - scheduler disabled");
    return null;
  }

  if (queueInstance) return queueInstance;

  try {
    const bullmq = await import("bullmq");
    Queue = bullmq.Queue;

    const connection = {
      url: process.env["REDIS_URL"] ?? process.env["UPSTASH_REDIS_REST_URL"] ?? "",
    };

    queueInstance = new Queue("medicine-reminders", { connection });
    return queueInstance;
  } catch (err) {
    logger.error({ err }, "Failed to initialize BullMQ queue");
    return null;
  }
}

export interface MedicineJobData {
  medicineId: string;
  patientId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  timeIndex: number;
}

export async function scheduleMedicine(medicine: Medicine): Promise<void> {
  const queue = await getQueue();
  if (!queue) return;

  const now = new Date();
  const endDate = medicine.endDate ? new Date(medicine.endDate) : null;

  const times = medicine.times as Array<{ hour: number; minute: number; label?: string }>;

  for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
    const timeSlot = times[timeIndex]!;
    const scheduledTime = new Date();
    scheduledTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    if (endDate && scheduledTime > endDate) continue;

    const delay = scheduledTime.getTime() - now.getTime();
    const jobId = `medicine-${medicine.id}-${timeIndex}-${scheduledTime.toISOString().split("T")[0]}`;

    const jobData: MedicineJobData = {
      medicineId: medicine.id,
      patientId: medicine.patientId,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      scheduledTime: scheduledTime.toISOString(),
      timeIndex,
    };

    await queue.add("medicine-reminder", jobData, {
      jobId,
      delay,
      attempts: 3,
      backoff: { type: "fixed", delay: 15 * 60 * 1000 },
    });

    logger.info(
      { jobId, medicineId: medicine.id, scheduledTime: scheduledTime.toISOString() },
      "Scheduled medicine reminder",
    );
  }
}

export async function cancelMedicineJobs(medicineId: string): Promise<void> {
  const queue = await getQueue();
  if (!queue) return;

  const jobs = await queue.getJobs(["waiting", "delayed"]);
  for (const job of jobs) {
    if (job.data?.medicineId === medicineId) {
      await job.remove();
    }
  }
}
