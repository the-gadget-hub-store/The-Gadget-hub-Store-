/* ================================
   THE GADGET HUB STORE
   Firebase Configuration & Initialization
   SDK Version: 12.18.0
   ================================ */

/**
 * Firebase Modular SDK v12.18.0
 * 
 * This module initializes Firebase and exports:
 * - app: Firebase app instance
 * - auth: Firebase Authentication instance
 * - db: Firestore database instance
 * - storage: Firebase Storage instance
 * 
 * All other modules should import Firebase services from this file.
 */

// Import Firebase SDK 12.18.0 - Modular API
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { 
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

/* ================================
   FIREBASE CONFIGURATION
   ================================ */

/**
 * Firebase project configuration
 * These credentials are safe to expose in frontend code.
 * Security is enforced through Firebase Security Rules.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDwGH1EmaJS4gjPJvJGWrOIm5lUV4exbpQ",
  authDomain: "the-gadget-hub-store-33876.firebaseapp.com",
  projectId: "the-gadget-hub-store-33876",
  storageBucket: "the-gadget-hub-store-33876.firebasestorage.app",
  messagingSenderId: "1065231323861",
  appId: "1:1065231323861:web:883e8a4724e28db2ce485c"
};

/* ================================
   FIREBASE INITIALIZATION
   ================================ */

let app;
let auth;
let db;
let storage;

try {
  // Initialize Firebase app
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
  console.log('📦 Firebase SDK Version: 12.18.0');
  console.log('🔥 Project:', firebaseConfig.projectId);
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  
  // Firebase initialization failure should not crash the entire application
  // Other modules should handle missing Firebase gracefully
}

/* ================================
   AUTH READY PROMISE
   ================================ */

/**
 * Promise that resolves when Firebase auth state is ready
 * This prevents race conditions when checking authentication on page load
 */
export const authReady = new Promise((resolve) => {
  if (!auth) {
    resolve(null);
    return;
  }
  
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    resolve(user);
  });
});

/* ================================
   FIREBASE SERVICE EXPORTS
   ================================ */

// Export Firebase app instance
export { app };

// Export Firebase Authentication
export { 
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
};

// Export Firestore
export { 
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
};

// Export Firebase Storage
export { 
  storage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

/* ================================
   UTILITY FUNCTIONS
   ================================ */

/**
 * Check if Firebase is initialized
 * @returns {boolean} True if Firebase is ready
 */
export function isFirebaseInitialized() {
  return !!(app && auth && db && storage);
}

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is signed in
 */
export function isAuthenticated() {
  return !!(auth && auth.currentUser);
}

/**
 * Get user display name or email
 * @returns {string} User display name or email or 'Guest'
 */
export function getUserDisplayName() {
  const user = getCurrentUser();
  if (!user) return 'Guest';
  return user.displayName || user.email || 'User';
}

/**
 * Get user ID
 * @returns {string|null} User ID or null
 */
export function getUserId() {
  const user = getCurrentUser();
  return user ? user.uid : null;
}

/**
 * Format Firestore timestamp to readable date
 * @param {Timestamp} timestamp - Firestore timestamp
 * @returns {string} Formatted date string
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

/**
 * Format Firestore timestamp to relative time
 * @param {Timestamp} timestamp - Firestore timestamp
 * @returns {string} Relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return formatTimestamp(timestamp);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

/**
 * Safe document reference creator
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @returns {DocumentReference|null} Document reference or null
 */
export function getDocRef(collectionName, docId) {
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }
  
  try {
    return doc(db, collectionName, docId);
  } catch (error) {
    console.error('Error creating document reference:', error);
    return null;
  }
}

/**
 * Safe collection reference creator
 * @param {string} collectionName - Collection name
 * @returns {CollectionReference|null} Collection reference or null
 */
export function getCollectionRef(collectionName) {
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }
  
  try {
    return collection(db, collectionName);
  } catch (error) {
    console.error('Error creating collection reference:', error);
    return null;
  }
}

/**
 * Handle Firebase errors with user-friendly messages
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly error message
 */
export function handleFirebaseError(error) {
  console.error('Firebase Error:', error);
  
  // Authentication errors
  const authErrors = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email.'
  };
  
  // Firestore errors
  const firestoreErrors = {
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested document was not found.',
    'already-exists': 'This document already exists.',
    'resource-exhausted': 'Too many requests. Please try again later.',
    'failed-precondition': 'Operation cannot be completed at this time.',
    'aborted': 'Operation was aborted. Please try again.',
    'unavailable': 'Service is temporarily unavailable.',
    'unauthenticated': 'You must be signed in to perform this action.'
  };
  
  // Storage errors
  const storageErrors = {
    'storage/unauthorized': 'You do not have permission to upload files.',
    'storage/canceled': 'Upload was cancelled.',
    'storage/unknown': 'An unknown error occurred during upload.',
    'storage/object-not-found': 'File not found.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/invalid-format': 'Invalid file format.',
    'storage/cannot-slice-blob': 'File could not be processed.'
  };
  
  const errorCode = error.code || error.message;
  
  return authErrors[errorCode] || 
         firestoreErrors[errorCode] || 
         storageErrors[errorCode] || 
         'An error occurred. Please try again.';
}

/**
 * Validate file for upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  } = options;
  
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload an image.' };
  }
  
  // Check file extension
  if (allowedExtensions.length > 0) {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return { valid: false, error: `File must be one of: ${allowedExtensions.join(', ')}` };
    }
  }
  
  return { valid: true, error: null };
}

/**
 * Generate unique file name for upload
 * @param {string} originalName - Original file name
 * @returns {string} Unique file name with timestamp
 */
export function generateUniqueFileName(originalName) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  return `${timestamp}_${randomString}${extension}`;
}

/**
 * Create a debounced search query
 * @param {Function} callback - Callback function
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(callback, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback.apply(this, args), delay);
  };
}

/* ================================
   FIREBASE STATUS
   ================================ */

// Log Firebase initialization status
if (isFirebaseInitialized()) {
  console.log('🟢 Firebase Status: Ready');
} else {
  console.warn('🔴 Firebase Status: Not Initialized');
  console.warn('⚠️ Application features requiring Firebase may not work');
}

/* ================================
   AUTHENTICATION STATE LISTENER
   ================================ */

/**
 * Set up global authentication state listener
 * This will be used by other modules to react to auth changes
 */
let authStateCallbacks = [];

export function subscribeToAuthState(callback) {
  if (typeof callback === 'function') {
    authStateCallbacks.push(callback);
  }
}

export function unsubscribeFromAuthState(callback) {
  authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
}

// Initialize auth state listener
if (auth) {
  onAuthStateChanged(auth, (user) => {
    console.log('🔐 Auth state changed:', user ? `User: ${user.email}` : 'Signed out');
    
    // Notify all subscribers
    authStateCallbacks.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth state callback:', error);
      }
    });
  });
}

/* ================================
   MODULE READY
   ================================ */

console.log('📦 Firebase module loaded');

// Export a ready promise for other modules
export const firebaseReady = new Promise((resolve) => {
  if (isFirebaseInitialized()) {
    resolve(true);
  } else {
    // If Firebase failed to initialize, resolve with false
    // This prevents other modules from hanging indefinitely
    resolve(false);
  }
});
