// lib/getUserFromRequest.ts
import { NextRequest } from 'next/server';
import { adminAuth, adminAppCheck } from '@/Lib/Firebase/FirebaseAdmin';

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
import { NextResponse } from 'next/server';
import type { User } from '@/Constants/types';

export function jsonResponse(
  success: boolean,
  data: User | null,
  error: string | null = null,
  status = 200,
) {
  return NextResponse.json({ success, data, error }, { status });
}

// AuthHelpers.ts

export function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. It must be at least 8 characters and include uppercase, lowercase, number, and symbol.";
    case "auth/missing-password":
      return "Password is required.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Contact administrator.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with the same email but different sign-in credentials.";
    case "auth/invalid-credential":
      return "The credential provided is malformed or has expired.";
    case "auth/invalid-verification-code":
      return "The verification code is invalid. Please try again.";
    case "auth/invalid-verification-id":
      return "The verification request is invalid. Please request verification again.";
    case "auth/requires-recent-login":
      return "This operation is sensitive. Please log in again and retry.";
    case "auth/provider-already-linked":
      return "This provider is already linked to the user.";
    case "auth/invalid-phone-number":
      return "The phone number is invalid. Please enter a valid phone number.";
    case "auth/missing-phone-number":
      return "Phone number is required.";
    case "auth/user-disabled":
      return "This user account has been disabled.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized to perform this operation.";
    case "auth/invalid-action-code":
      return "The action code is invalid or expired.";
    case "auth/expired-action-code":
      return "The action code has expired. Please request a new one.";
    case "auth/credential-already-in-use":
      return "This credential is already in use by another account.";
    case "auth/operation-not-supported-in-this-environment":
      return "This operation is not supported in this environment.";
    case "auth/missing-continue-uri":
      return "A continue URL must be provided.";
    case "auth/invalid-continue-uri":
      return "The provided continue URL is invalid.";
    // Admin SDK specific / other Auth-related codes
    case "auth/email-already-exists":
      return "This email is already in use.";
    case "auth/user-not-found":
      return "User not found.";
    case "auth/id-token-expired":
      return "Session has expired. Please log in again.";
    case "auth/id-token-revoked":
      return "Session has been revoked. Please log in again.";
    case "auth/insufficient-permission":
      return "You do not have permission to perform this operation.";
    case "auth/internal-error":
      return "An internal error occurred. Please try again later.";
    case "auth/invalid-argument":
      return "An argument provided is invalid.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function verifyRequest(req: NextRequest) {
  const appCheckToken = req.headers.get('x-firebase-appcheck');
  if (!appCheckToken) {
    throw new Error('Missing App Check token');
  }

  try {
    await adminAppCheck.verifyToken(appCheckToken);
  } catch {
    throw new Error('Invalid App Check token');
  }

  // Optionally also verify Firebase ID token if you want user auth
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.split(' ')[1];
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return decoded; // { uid, email, etc. }
    } catch {
      throw new Error('Invalid Firebase Auth token');
    }
  }

  return null; // if user auth not required
}

