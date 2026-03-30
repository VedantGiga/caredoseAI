import { Router } from "express";
import {
  getPatients,
  createPatient,
  getPatient,
  updatePatient,
  deletePatient,
} from "../controllers/patients.controller.js";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getPatientDashboard,
} from "../controllers/medicines.controller.js";
import { getPatientLogs } from "../controllers/logs.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", getPatients);
router.post("/", createPatient);
router.get("/:patientId", getPatient);
router.put("/:patientId", updatePatient);
router.delete("/:patientId", deletePatient);

router.get("/:patientId/dashboard", getPatientDashboard);
router.get("/:patientId/logs", getPatientLogs);
router.get("/:patientId/medicines", getMedicines);
router.post("/:patientId/medicines", createMedicine);
router.put("/:patientId/medicines/:medicineId", updateMedicine);
router.delete("/:patientId/medicines/:medicineId", deleteMedicine);

export default router;
