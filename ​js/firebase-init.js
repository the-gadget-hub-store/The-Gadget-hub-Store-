import { firebaseConfig, COLLECTIONS } from './config.js';

// Firebase State
let firebaseApp = null;
let auth = null;
let db = null;
let storage = null;
let isInitialized = false;
let initializationError = null;

/**
 * Initialize Firebase
 */
export async function initializeFirebase() {
  if (isInitialized) {
    return { success: true, app: firebaseApp, auth, db, storage };
  }

  try {
    // Import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth, connectAuthEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getStorage, connectStorageEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);

    isInitialized = true;

    console.log('✅ Firebase initialized successfully');

    return { success: true, app: firebaseApp, auth, db, storage };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    initializationError = error;
    return { success: false, error };
  }
}

/**
 * Get Firebase instances
 */
export function getFirebaseInstances() {
  if (!isInitialized) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return { app: firebaseApp, auth, db, storage };
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized() {
  return isInitialized;
}

/**
 * Get initialization error
 */
export function getInitializationError() {
  return initializationError;
}

/**
 * Safe Firebase operation wrapper
 */
export async function safeFirebaseOperation(operation, errorMessage = 'Firebase operation failed') {
  try {
    if (!isInitialized) {
      await initializeFirebase();
    }
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}
