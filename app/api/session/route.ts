// app/api/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/Lib/Firebase/FirebaseAdmin";

export async function POST(req: NextRequest) {
  // Login: set ID token in HTTP-only cookie
  const { idToken } = await req.json();

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const res = NextResponse.json({ uid: decoded.uid, email: decoded.email });
    // Set secure HTTP-only cookie
    res.cookies.set({
      name: "firebase_token",
      value: idToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
    return res;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(req: NextRequest) {
  // Logout: remove cookie
  const res = NextResponse.json({ message: "Logged out" });
  res.cookies.set({
    name: "firebase_token",
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
