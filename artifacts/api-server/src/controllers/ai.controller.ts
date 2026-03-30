import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middlewares/authenticate.js";
import { parsePrescriptionImage } from "../services/ai.service.js";

const parsePrescriptionSchema = z.object({
  imageBase64: z.string().min(1),
});

export async function parsePrescription(req: AuthRequest, res: Response): Promise<void> {
  const parseResult = parsePrescriptionSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid input - imageBase64 required" });
    return;
  }

  const result = await parsePrescriptionImage(parseResult.data.imageBase64);
  res.json(result);
}
