// app/api/users/route.ts
import { NextRequest } from 'next/server';
import { adminAuth, db } from '@/Lib/Firebase/FirebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { User } from '@/Constants/types';
import { jsonResponse } from '../Utils/user';

// POST /api/users
export async function POST(req: NextRequest) {
  if (!adminAuth || !db) {
    return jsonResponse(false, null, 'Firebase Admin SDK not initialized.', 500);
  }

  try {
    const { email, password, name, firstName, lastName, ...rest } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return jsonResponse(false, null, 'Email, password and name fields are required', 400);
    }

    // Create Firebase Auth account
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: name || null,
    });

    // Create Firestore document
    await db
      .collection('users')
      .doc(authUser.uid)
      .set({
        email,
        displayName: name || null,
        createdAt: FieldValue.serverTimestamp(),
        ...rest,
      });

    return jsonResponse(true, { uid: authUser.uid }, null, 201);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    if (error.code === 'auth/email-already-exists') {
      return jsonResponse(false, null, 'Email already in use.', 409);
    }
    return jsonResponse(false, null, error.message || 'Internal server error', 500);
  }
}

// GET /api/users?uid=<uid>
export async function GET(req: NextRequest) {
  if (!db) {
    return jsonResponse(false, null, 'Firebase Admin SDK not initialized.', 500);
  }

  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return jsonResponse(false, null, 'A user ID (uid) is required', 400);
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return jsonResponse(false, null, 'User not found', 404);
    }

    return jsonResponse(true, { uid, ...userDoc.data() }, null, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return jsonResponse(false, null, error.message || 'Internal server error', 500);
  }
}

// PUT /api/users?uid=<uid>
export async function PUT(req: NextRequest) {
  if (!adminAuth || !db) {
    return jsonResponse(false, null, 'Firebase Admin SDK not initialized.', 500);
  }

  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return jsonResponse(false, null, 'A user ID (uid) is required', 400);
    }

    const { email, displayName, ...rest } = await req.json();

    // --- Email uniqueness check ---
    if (email) {
      const snapshot = await db.collection('users').where('email', '==', email).get();
      const conflict = snapshot.docs.some((doc) => doc.id !== uid);
      if (conflict) {
        return jsonResponse(false, null, 'Email already in use.', 409);
      }
    }

    // --- Update Firebase Auth ---
    const authUpdate: Partial<User> = {};
    if (email) authUpdate.email = email;
    if (displayName) authUpdate.displayName = displayName;

    if (Object.keys(authUpdate).length > 0) {
      try {
        await adminAuth.updateUser(uid, authUpdate);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          return jsonResponse(false, null, 'Email already in use.', 409);
        }
        throw error;
      }
    }

    // --- Merge Firestore updates ---
    const firestoreUpdate: Record<string, unknown> = {};
    if (email) firestoreUpdate.email = email;
    if (displayName) firestoreUpdate.displayName = displayName;
    Object.assign(firestoreUpdate, rest);

    if (Object.keys(firestoreUpdate).length > 0) {
      await db.collection('users').doc(uid).set(firestoreUpdate, { merge: true });
    }

    return jsonResponse(true, { uid }, null, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in PUT /api/users:', error);
    if (error.code === 'auth/user-not-found') {
      return jsonResponse(false, null, 'User not found', 404);
    }
    return jsonResponse(false, null, error.message || 'Internal server error', 500);
  }
}

// DELETE /api/users?uid=<uid>
export async function DELETE(req: NextRequest) {
  if (!adminAuth || !db) {
    return jsonResponse(false, null, 'Firebase Admin SDK not initialized.', 500);
  }

  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return jsonResponse(false, null, 'A user ID (uid) is required', 400);
    }

    await adminAuth.deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    return jsonResponse(true, { uid }, null, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in DELETE /api/users:', error);
    if (error.code === 'auth/user-not-found') {
      return jsonResponse(false, null, 'User not found', 404);
    }
    return jsonResponse(false, null, error.message || 'Internal server error', 500);
  }
}
