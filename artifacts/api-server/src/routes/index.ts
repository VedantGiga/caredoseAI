import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import patientsRouter from "./patients.js";
import logsRouter from "./logs.js";
import aiRouter from "./ai.js";
import twilioRouter from "./twilio.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/patients", patientsRouter);
router.use("/logs", logsRouter);
router.use("/ai", aiRouter);
router.use("/twilio", twilioRouter);

export default router;
