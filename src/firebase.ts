import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence 
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyDNQ_rkec2pKTuCGA9rNHvIF7nHxk_zxVU",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "staff-review-app.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "staff-review-app",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "staff-review-app.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "286978294310",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:286978294310:web:98db62f0af5a94a2e81ce7"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with fallback persistences (excluding indexedDB to prevent iframe backing store open issues)
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
});

// Initialize Cloud Firestore without custom dbId (default database)
export const db = getFirestore(app);

// Validate Connection to Firestore (Prerequisite check from Firebase skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline or connection failed:", error.message);
    }
  }
}
testConnection();
