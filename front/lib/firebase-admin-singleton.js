import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;
let adminApp = null;

function getAdminInstances() {
  // If already initialized, return the existing instances
  if (admin.apps.length > 0 && dbInstance) {
    return { app: admin.apps[0], db: dbInstance };
  }

  // If NOT initialized, try to initialize
  if (!admin.apps.length) {
    const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    // *** CRITICAL CHANGE ***:
    // If the var is missing, DON'T throw. Return null or an indicator.
    // We assume it will be present at runtime. If it's not, it will fail then.
    if (!serviceAccountJsonString) {
      console.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON is not set. Firebase Admin SDK NOT initialized (EXPECTED during build).',
      );
      return { app: null, db: null };
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJsonString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      // Still throw if parsing/init fails when var IS present.
      throw new Error('Failed to initialize Firebase Admin SDK.');
    }
  }

  adminApp = admin.apps[0];
  dbInstance = getFirestore(adminApp);

  return { app: adminApp, db: dbInstance };
}

// Export a function that *gets* the DB, not the DB itself.
export function getAdminDb() {
  const { db } = getAdminInstances();
  // If db is null here, it means the env var wasn't set.
  // The code that *uses* this needs to handle the possibility of null
  // or ensure it's only called at runtime.
  if (!db) {
    // This will likely cause NextAuth to fail if called during build,
    // but it prevents the initial 'throw' during import.
    console.error('Attempted to get DB when Admin SDK is not initialized.');
    // Depending on how NextAuth handles a null adapter, this might
    // "pass" the build but fail at runtime if the var isn't there.
    return null;
  }
  return db;
}
