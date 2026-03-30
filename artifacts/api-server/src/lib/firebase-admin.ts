import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from "./logger";

const serviceAccountPath = join(process.cwd(), "service-account.json");

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You can add databaseURL here if you use Realtime Database, 
    // but for Firestore it's inferred from project_id.
  });

  logger.info("Firebase Admin initialized successfully");
} catch (error) {
  logger.error({ error }, "Failed to initialize Firebase Admin");
  // Don't exit process yet, maybe provide a fallback or wait for user to fix
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
