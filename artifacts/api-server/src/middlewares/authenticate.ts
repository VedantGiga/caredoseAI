import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid token" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token!);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}
