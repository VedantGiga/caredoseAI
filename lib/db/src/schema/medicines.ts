import { pgTable, text, boolean, date, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const frequencyEnum = ["daily", "alternate_days", "weekly", "custom"] as const;
export type Frequency = (typeof frequencyEnum)[number];

export interface MedicineTime {
  hour: number;
  minute: number;
  label?: string;
}

export const medicinesTable = pgTable("medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  times: jsonb("times").notNull().$type<MedicineTime[]>(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({ id: true, createdAt: true });
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;
