// lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore'; // If you're using Firestore
import { getAppCheck } from 'firebase-admin/app-check';


// Define a type for your service account object for type safety
type ServiceAccount = {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  // Add other properties if you need them, but these are often sufficient
};

const serviceAccountString = process.env.FIREBASE_ADMIN_KEY;

// Check if the environment variable is set
if (!serviceAccountString) {
  // In Next.js, this error will occur during build or server startup if missing
  // It's critical for security that this is available only on the server
  console.error('FIREBASE_ADMIN_KEY environment variable is not set.');
  // Consider throwing an error to prevent server startup if vital
  // throw new Error("Firebase Admin SDK credentials missing.");
}

let serviceAccount: ServiceAccount | undefined;
if (serviceAccountString) {
  try {
    // Parse the JSON string into a JavaScript object
    serviceAccount = JSON.parse(serviceAccountString) as ServiceAccount;
    // Basic validation: ensure critical fields are present
    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      console.error(
        'Parsed Firebase Admin Service Account is missing required fields (projectId, privateKey, clientEmail).',
      );
      serviceAccount = undefined; // Invalidate if malformed
    }
  } catch (error) {
    console.error('Error parsing FIREBASE_ADMIN_KEY:', error);
    console.error(
      'Please ensure it is a valid JSON string and newlines in private_key are escaped (e.g., \\n).',
    );
    serviceAccount = undefined; // Invalidate if parsing fails
  }
}

// Initialize Firebase Admin SDK
// This singleton pattern ensures it's initialized only once
function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // Check if an app is already initialized
    if (!serviceAccount) {
      // This case should ideally be caught by the checks above during app startup
      throw new Error(
        'Firebase Admin SDK cannot initialize: Service account credentials are invalid or missing.',
      );
    }

    initializeApp({
      credential: cert(serviceAccount), // Use the parsed service account object
      projectId: 'nebulagp-c805e', // Your project ID
    });
  }
  return getApp(); // Return the default app instance
}

// Export specific Firebase services for easy access

export const adminApp = initializeFirebaseAdmin();
export const adminAuth = getAuth(adminApp);
export const db = getFirestore(adminApp);
export const adminAppCheck = getAppCheck(adminApp);
// ... and so on for other admin services
