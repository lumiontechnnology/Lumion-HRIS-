import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const env = (typeof window !== 'undefined' && window.__env__) || (typeof process !== 'undefined' && process.env) || {};
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export { serverTimestamp };

export let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((yes) => { if (yes) analytics = getAnalytics(app); });
}
