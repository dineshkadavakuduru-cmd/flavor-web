import { initializeApp, getApps } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let db: Firestore | null = null;

export function getDb(): Firestore | null {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return null;
  try {
    if (!getApps().length) {
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
    }
    if (!db) db = getFirestore();
    return db;
  } catch {
    return null;
  }
}
