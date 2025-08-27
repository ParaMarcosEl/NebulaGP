// lib/getUserFromRequest.ts
import { NextRequest } from 'next/server';
import { adminAuth } from '@/Lib/Firebase/FirebaseAdmin';

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get('firebase_token')?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
// lib/jsonResponse.ts
import { NextResponse } from 'next/server'
import type { User } from '@/Constants/types'

export function jsonResponse(
  success: boolean,
  data: User | null,
  error: string | null = null,
  status = 200
) {
  return NextResponse.json({ success, data, error }, { status })
}
