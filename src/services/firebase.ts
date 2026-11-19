import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

function readEnvValue(envVal: string | undefined, fallback?: string): string {
  const trimmed = typeof envVal === 'string' ? envVal.trim() : '';
  return trimmed || fallback || '';
}

export const firebaseConfig = {
  apiKey: readEnvValue(import.meta.env.VITE_FIREBASE_API_KEY, defaultFirebaseConfig.apiKey),
  authDomain: readEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, defaultFirebaseConfig.authDomain),
  projectId: readEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, defaultFirebaseConfig.projectId),
  storageBucket: readEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, defaultFirebaseConfig.storageBucket),
  messagingSenderId: readEnvValue(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    defaultFirebaseConfig.messagingSenderId
  ),
  appId: readEnvValue(import.meta.env.VITE_FIREBASE_APP_ID, defaultFirebaseConfig.appId),
  measurementId: readEnvValue(
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    defaultFirebaseConfig.measurementId
  ),
};

export const firestoreDatabaseId = readEnvValue(
  import.meta.env.VITE_FIREBASE_DATABASE_ID,
  defaultFirebaseConfig.firestoreDatabaseId
);

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

void setPersistence(auth, browserLocalPersistence).catch(() => {});

export let analytics: any = null;
if (firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

/**
 * Validates Firestore connectivity on startup.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      return true; // Connected successfully, rules denied unauthenticated read
    }
    console.warn('Firestore connection test warning:', err?.message || err);
    return false;
  }
}
