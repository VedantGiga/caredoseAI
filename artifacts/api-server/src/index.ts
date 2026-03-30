import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./queues/scheduler.js";

let port = 3001;
const rawPort = process.env["PORT"];

if (rawPort) {
  const parsed = Number(rawPort);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
  port = parsed;
} else {
  logger.warn("PORT environment variable not provided — defaulting to 3001");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startScheduler();
});
