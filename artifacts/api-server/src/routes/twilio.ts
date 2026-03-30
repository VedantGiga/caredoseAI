import { Router } from "express";
import { handleVoiceWebhook, handleStatusWebhook } from "../controllers/twilio.controller.js";

const router = Router();

router.post("/voice", handleVoiceWebhook);
router.post("/status", handleStatusWebhook);

export default router;
