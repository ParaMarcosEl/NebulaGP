// lib/getUserFromRequest.ts
import { NextRequest } from "next/server";
import { adminAuth } from "@/Lib/Firebase/FirebaseAdmin";

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get("firebase_token")?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
