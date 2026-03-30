import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { medicinesTable } from "./medicines";

export const logStatusEnum = ["taken", "missed", "pending", "no_response"] as const;
export type LogStatus = (typeof logStatusEnum)[number];

export const logSourceEnum = ["call", "manual", "auto"] as const;
export type LogSource = (typeof logSourceEnum)[number];

export const activityLogsTable = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  medicineId: uuid("medicine_id").notNull().references(() => medicinesTable.id, { onDelete: "cascade" }),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage").notNull(),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
  source: text("source"),
  callSid: text("call_sid"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
