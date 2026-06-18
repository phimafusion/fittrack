import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (Compat mode)
let auth = null;

const isBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

if (isBrowserEnv && typeof firebase !== 'undefined') {
  // Only initialize if firebase is available (avoids test runner issues if SDK fails to load)
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
  } catch (e) {
    console.error('Firebase initialization failed:', e);
  }
}

export const logout = () => {
  if (auth) return auth.signOut();
  return Promise.resolve();
};

export const loginWithGoogle = async () => {
  if (!auth) return { success: false, error: 'Firebase is not initialized.' };
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const loginWithEmail = async (email, password) => {
  if (!auth) return { success: false, error: 'Firebase is not initialized.' };
  try {
    await auth.signInWithEmailAndPassword(email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const registerWithEmail = async (email, password) => {
  if (!auth) return { success: false, error: 'Firebase is not initialized.' };
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const onAuthStateChanged = (callback) => {
  if (auth) {
    auth.onAuthStateChanged(callback);
  } else {
    // If not in browser / no Firebase, immediately callback with null
    callback(null);
  }
};

export const getCurrentUser = () => {
  if (auth) return auth.currentUser;
  return null;
};
