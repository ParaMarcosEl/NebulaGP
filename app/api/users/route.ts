import { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from '@/Lib/Firebase/FirebaseAdmin';
import { validatePassword } from '@/Components/UI/Auth/AuthHelpers';
import { createUserBodySchema, updateUserBodySchema } from '../Utils/schemas';
import { fail, ok } from '../Utils/response';
import { nonEmptyStringSchema, parseJsonBody } from '../Utils/validation';
import {
  getErrorCode,
  getErrorMessage,
  getFirebaseErrorMessage,
  verifyRequest,
} from '../Utils/user';

type UserMutationResponse = { uid: string };
type UserReadResponse = { uid: string; [key: string]: unknown };

function parseUid(req: NextRequest): string | null {
  const uidResult = nonEmptyStringSchema.safeParse(req.nextUrl.searchParams.get('uid'));
  if (!uidResult.success) return null;
  return uidResult.data;
}

function mapFirebaseError(error: unknown, fallback: string) {
  const code = getErrorCode(error);
  if (code) return getFirebaseErrorMessage(code);

  const message = getErrorMessage(error);
  if (message) return getFirebaseErrorMessage(message);

  return fallback;
}

// POST /api/users
export async function POST(req: NextRequest) {
  if (!adminAuth || !db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    await verifyRequest(req);
    const body = await parseJsonBody(req, createUserBodySchema);
    if (!body.success) return body.response;

    const { email, password, name, ...rest } = body.data;
    const passwordError = validatePassword(password);
    if (passwordError) return fail(passwordError, 400);

    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: name ?? null,
    });

    await db.collection('users').doc(authUser.uid).set({
      email,
      displayName: name ?? null,
      createdAt: FieldValue.serverTimestamp(),
      ...rest,
    });

    return ok<UserMutationResponse>({ uid: authUser.uid }, 201);
  } catch (error: unknown) {
    console.error('Error in POST /api/users:', error);
    if (getErrorCode(error) === 'auth/email-already-exists') {
      return fail('Email already in use.', 409);
    }
    return fail(mapFirebaseError(error, 'Internal server error'), 500);
  }
}

// GET /api/users?uid=<uid>
export async function GET(req: NextRequest) {
  if (!db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    await verifyRequest(req);
    const uid = parseUid(req);
    if (!uid) return fail('A user ID (uid) is required', 400);

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return fail('User not found', 404);

    return ok<UserReadResponse>({ uid, ...(userDoc.data() ?? {}) }, 200);
  } catch (error: unknown) {
    console.error('Error in GET /api/users:', error);
    return fail(mapFirebaseError(error, 'Internal server error'), 500);
  }
}

// PUT /api/users?uid=<uid>
export async function PUT(req: NextRequest) {
  if (!adminAuth || !db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    await verifyRequest(req);
    const uid = parseUid(req);
    if (!uid) return fail('A user ID (uid) is required', 400);

    const body = await parseJsonBody(req, updateUserBodySchema);
    if (!body.success) return body.response;

    const { email, displayName, ...rest } = body.data;

    if (email) {
      const snapshot = await db.collection('users').where('email', '==', email).get();
      const conflict = snapshot.docs.some((doc) => doc.id !== uid);
      if (conflict) return fail('Email already in use.', 409);
    }

    const authUpdate: Record<string, string> = {};
    if (email) authUpdate.email = email;
    if (displayName) authUpdate.displayName = displayName;

    if (Object.keys(authUpdate).length > 0) {
      try {
        await adminAuth.updateUser(uid, authUpdate);
      } catch (error: unknown) {
        if (getErrorCode(error) === 'auth/email-already-exists') {
          return fail('Email already in use.', 409);
        }
        throw error;
      }
    }

    const firestoreUpdate: Record<string, unknown> = {};
    if (email) firestoreUpdate.email = email;
    if (displayName) firestoreUpdate.displayName = displayName;
    Object.assign(firestoreUpdate, rest);

    if (Object.keys(firestoreUpdate).length > 0) {
      await db.collection('users').doc(uid).set(firestoreUpdate, { merge: true });
    }

    return ok<UserMutationResponse>({ uid }, 200);
  } catch (error: unknown) {
    console.error('Error in PUT /api/users:', error);
    if (getErrorCode(error) === 'auth/user-not-found') return fail('User not found', 404);
    return fail(mapFirebaseError(error, 'Internal server error'), 500);
  }
}

// DELETE /api/users?uid=<uid>
export async function DELETE(req: NextRequest) {
  if (!adminAuth || !db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    await verifyRequest(req);
    const uid = parseUid(req);
    if (!uid) return fail('A user ID (uid) is required', 400);

    await adminAuth.deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    return ok<UserMutationResponse>({ uid }, 200);
  } catch (error: unknown) {
    console.error('Error in DELETE /api/users:', error);
    if (getErrorCode(error) === 'auth/user-not-found') return fail('User not found', 404);
    return fail(mapFirebaseError(error, 'Internal server error'), 500);
  }
}
