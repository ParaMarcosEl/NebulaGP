// app/api/users/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { adminAuth, db } from '@/Lib/Firebase/FirebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { User } from '@/Constants/types';

function jsonResponse(
  success: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any = null,
  error: string | null = null,
  status = 200,
) {
  return NextResponse.json({ success, data, error }, { status });
}

// POST /api/users
export async function POST(req: NextRequest) {
  if (!adminAuth || !db) {
    return jsonResponse(false, null, 'Firebase Admin SDK not initialized.', 500);
  }

  try {
    const { email, password, name, ...rest } = await req.json();

    if (!email || !password) {
      return jsonResponse(false, null, 'Email and password are required', 400);
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

    // Update Firebase Auth fields
    const authUpdate: User = {};
    if (email) authUpdate.email = email;
    if (displayName) authUpdate.displayName = displayName;

    if (Object.keys(authUpdate).length > 0) {
      await adminAuth.updateUser(uid, authUpdate);
    }

    // Merge Firestore updates
    if (Object.keys(rest).length > 0) {
      await db.collection('users').doc(uid).set(rest, { merge: true });
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
