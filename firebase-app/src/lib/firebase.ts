import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged as baseOnAuthStateChanged, signOut as baseSignOut } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigOriginal from '../../firebase-applet-config.json';

let activeConfig = { ...firebaseConfigOriginal };

if (typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    !window.location.hostname.includes('3000') && 
    !window.location.hostname.includes('run.app')) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/__/firebase/init.json', false); // synchronous GET request to fetch hosting config
    xhr.send(null);
    if (xhr.status === 200) {
      const liveConfig = JSON.parse(xhr.responseText);
      if (liveConfig && liveConfig.apiKey) {
        console.log("Firebase: Dynamic production initialization active.", liveConfig.projectId);
        activeConfig = {
          ...firebaseConfigOriginal,
          ...liveConfig
        };
        // Clean up or remove standard sandbox database ID if on custom live project
        if (liveConfig.projectId !== firebaseConfigOriginal.projectId) {
          delete (activeConfig as any).firestoreDatabaseId;
        }
      }
    }
  } catch (error) {
    console.warn("Firebase: Dynamic initialization fetch failed, using fallback configuration:", error);
  }
}

const app = initializeApp(activeConfig);
export { activeConfig as firebaseConfig };

export const auth = getAuth(app);
export const onAuthStateChanged = baseOnAuthStateChanged;
export const signOut = baseSignOut;

// Use initializeFirestore with experimentalForceLongPolling to handle proxy/sandboxed environment constraints
const firestoreDatabaseId = (activeConfig as any).firestoreDatabaseId;

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test: Successfully contacted server.");
  } catch (error: any) {
    const code = error?.code;
    const message = error?.message || String(error);
    
    // A permission-denied error actually indicates a successful backend handshake,
    // meaning the Firestore configuration is correct and the client is online!
    if (code === 'permission-denied') {
      console.log("Firestore connection test: Successfully verified connection (permission denied as expected by security rules).");
      return;
    }
    
    console.warn(`Firestore connection test returned code: ${code}, message: ${message}`);
    if (message.includes('the client is offline') || code === 'unavailable') {
      console.error("Please check your Firebase configuration. The client is offline or could not reach the backend.");
    }
  }
}

// Run connection check after a short delay so browser network state has settled
setTimeout(testConnection, 2000);
