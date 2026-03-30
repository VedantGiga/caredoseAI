import { Router } from "express";
import { parsePrescription } from "../controllers/ai.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.post("/parse-prescription", authenticate, parsePrescription);

export default router;
