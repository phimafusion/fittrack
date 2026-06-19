// Firebase Initialization with graceful fallback
// If firebase-config.js doesn't exist (e.g. GitHub Pages), the app runs in guest-only mode.

let auth = null;

const isBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

async function initFirebase() {
  if (!isBrowserEnv || typeof firebase === 'undefined') return;

  try {
    // Dynamic import: fails gracefully if firebase-config.js doesn't exist
    const { firebaseConfig } = await import('./firebase-config.js');

    // Sanity-check: reject placeholder values from firebase-config.example.js
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_')) {
      console.warn('[Auth] Firebase config contains placeholder values – running in guest mode.');
      return;
    }

    // Check if Firebase was already initialized (e.g. by another module)
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    console.log('[Auth] Firebase initialized successfully.');
  } catch (e) {
    // firebase-config.js not found → silently fall back to guest mode
    console.warn('[Auth] firebase-config.js not found – running in guest mode. (This is expected on GitHub Pages.)');
  }
}

// Kick off async init; the rest of the module remains synchronous-compatible
export const firebaseReady = initFirebase();

export const logout = () => {
  if (auth) return auth.signOut();
  return Promise.resolve();
};

export const loginWithGoogle = async () => {
  await firebaseReady;
  if (!auth) return { success: false, error: 'Firebase ist nicht konfiguriert (Gastmodus).' };
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const loginWithEmail = async (email, password) => {
  await firebaseReady;
  if (!auth) return { success: false, error: 'Firebase ist nicht konfiguriert (Gastmodus).' };
  try {
    await auth.signInWithEmailAndPassword(email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const registerWithEmail = async (email, password) => {
  await firebaseReady;
  if (!auth) return { success: false, error: 'Firebase ist nicht konfiguriert (Gastmodus).' };
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const onAuthStateChanged = (callback) => {
  firebaseReady.then(() => {
    if (auth) {
      auth.onAuthStateChanged(callback);
    } else {
      // No Firebase → immediately signal "not logged in"
      callback(null);
    }
  });
};

export const getCurrentUser = () => {
  if (auth) return auth.currentUser;
  return null;
};
