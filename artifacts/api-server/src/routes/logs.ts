import { Router } from "express";
import { updateLogStatus } from "../controllers/logs.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.patch("/:logId/status", authenticate, updateLogStatus);

export default router;
