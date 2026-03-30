import { Request, Response } from "express";
import { z } from "zod";
import { adminAuth, adminDb } from "../lib/firebase-admin";
import { AuthRequest } from "../middlewares/authenticate";

const USERS_COLLECTION = "users";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["caregiver", "patient"]).default("caregiver"),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "ValidationError", message: parseResult.error.message });
    return;
  }

  const { name, email, password, role } = parseResult.data;

  try {
    // 1. Create User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create User Profile in Firestore
    const userData = {
      id: userRecord.uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await adminDb.collection(USERS_COLLECTION).doc(userRecord.uid).set(userData);

    res.status(201).json({
      message: "User registered successfully",
      user: userData,
    });
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      res.status(409).json({ error: "Conflict", message: "User already exists" });
    } else {
      res.status(500).json({ error: "InternalError", message: error.message });
    }
  }
}

/**
 * Since Firebase Client SDK handles login on the mobile app, 
 * this endpoint is used to sync/fetch the Firestore profile 
 * once the user is authenticated.
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized", message: "User ID not found in request" });
    return;
  }

  try {
    let userDoc = await adminDb.collection(USERS_COLLECTION).doc(req.userId).get();

    if (!userDoc.exists) {
      // Auto-create missing profile (e.g. from Google login)
      const userRecord = await adminAuth.getUser(req.userId);
      const userData = {
        id: req.userId,
        name: userRecord.displayName || "User",
        email: userRecord.email || "",
        role: "caregiver",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      
      await adminDb.collection(USERS_COLLECTION).doc(req.userId).set(userData);
      userDoc = await adminDb.collection(USERS_COLLECTION).doc(req.userId).get();
    } else {
      // Update last login
      await adminDb.collection(USERS_COLLECTION).doc(req.userId).update({
        lastLoginAt: new Date().toISOString()
      });
    }

    res.json(userDoc.data());
  } catch (error: any) {
    res.status(500).json({ error: "InternalError", message: error.message });
  }
}

// Login is typically handled on the client via Firebase SDK
// and then the token is passed to these endpoints.
export async function login(req: Request, res: Response): Promise<void> {
  res.status(501).json({ 
    message: "Login should be handled on the client via Firebase SDK. Use the ID token to authenticate with API endpoints." 
  });
}
