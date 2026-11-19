import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

// Firebase configuration using Next.js client environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Database | null = null;

/**
 * Initializes and returns the Firebase App singleton.
 * Prevents multiple initializations across React renders and HMR.
 */
export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;

  if (getApps().length > 0) {
    appInstance = getApp();
  } else {
    if (!firebaseConfig.databaseURL) {
      console.warn(
        "[Firebase] Warning: NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set. Check .env.local."
      );
    }
    appInstance = initializeApp(firebaseConfig);
  }

  return appInstance;
}

/**
 * Initializes and returns the Firebase Realtime Database instance.
 * Explicitly passes the regional databaseURL (e.g. asia-southeast1).
 */
export function getFirebaseDatabase(): Database {
  if (dbInstance) return dbInstance;

  const app = getFirebaseApp();
  dbInstance = getDatabase(app, firebaseConfig.databaseURL);
  return dbInstance;
}
