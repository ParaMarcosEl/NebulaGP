import { NextRequest } from 'next/server';
import { adminAuth } from '@/Lib/Firebase/FirebaseAdmin';
import { createSessionBodySchema } from '../Utils/schemas';
import { fail, ok } from '../Utils/response';
import { parseJsonBody } from '../Utils/validation';

type SessionCreateResponse = {
  uid: string;
  email?: string;
};

type SessionDeleteResponse = {
  message: string;
};

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req, createSessionBodySchema);
  if (!body.success) return body.response;

  try {
    const decoded = await adminAuth.verifyIdToken(body.data.idToken);
    const res = ok<SessionCreateResponse>({ uid: decoded.uid, email: decoded.email }, 200);

    res.cookies.set({
      name: 'firebase_token',
      value: body.data.idToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch {
    return fail('Invalid token', 401);
  }
}

export async function DELETE() {
  const res = ok<SessionDeleteResponse>({ message: 'Logged out' }, 200);
  res.cookies.set({
    name: 'firebase_token',
    value: '',
    path: '/',
    maxAge: 0,
  });
  return res;
}
