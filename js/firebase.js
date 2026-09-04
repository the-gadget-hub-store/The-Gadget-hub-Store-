/* ============================================================
   THE GADGET HUB STORE - FIREBASE CONFIGURATION & INITIALIZATION
   Modular Firebase SDK 12.18.0
   ============================================================ */

// ============================================================
// FIREBASE MODULAR SDK IMPORTS (v12.18.0)
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
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
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { 
  getStorage, 
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDwGH1EmaJS4gjPJvJGWrOIm5lUV4exbpQ",
  authDomain: "the-gadget-hub-store-33876.firebaseapp.com",
  projectId: "the-gadget-hub-store-33876",
  storageBucket: "the-gadget-hub-store-33876.firebasestorage.app",
  messagingSenderId: "1065231323861",
  appId: "1:1065231323861:web:883e8a4724e28db2ce485c"
};

// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

let app;
let auth;
let db;
let storage;

try {
  // Initialize Firebase App
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// ============================================================
// FIREBASE SERVICE EXPORTS
// ============================================================

export { 
  app, 
  auth, 
  db, 
  storage 
};

// ============================================================
// FIREBASE AUTH EXPORTS
// ============================================================

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
};

// ============================================================
// FIRESTORE EXPORTS
// ============================================================

export {
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
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
};

// ============================================================
// FIREBASE STORAGE EXPORTS
// ============================================================

export {
  storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll
};

// ============================================================
// FIRESTORE HELPER FUNCTIONS
// ============================================================

/**
 * Get a single document from Firestore
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 * @returns {Promise<Object|null>} Document data or null
 */
export async function getDocument(collectionName, documentId) {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.warn(`Document ${documentId} not found in ${collectionName}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 * @param {string} collectionName - Collection name
 * @param {Object} options - Query options (orderBy, limit, where)
 * @returns {Promise<Array>} Array of documents
 */
export async function getCollection(collectionName, options = {}) {
  try {
    const collectionRef = collection(db, collectionName);
    let q = collectionRef;
    
    // Apply query constraints
    const constraints = [];
    
    if (options.where) {
      options.where.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }
    
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
    }
    
    if (options.limit) {
      constraints.push(limit(options.limit));
    }
    
    if (constraints.length > 0) {
      q = query(collectionRef, ...constraints);
    }
    
    const querySnapshot = await getDocs(q);
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return documents;
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Create a new document in a collection
 * @param {string} collectionName - Collection name
 * @param {Object} data - Document data
 * @param {string|null} documentId - Optional document ID
 * @returns {Promise<Object>} Created document reference
 */
export async function createDocument(collectionName, data, documentId = null) {
  try {
    const timestamp = serverTimestamp();
    const documentData = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    if (documentId) {
      const docRef = doc(db, collectionName, documentId);
      await setDoc(docRef, documentData);
      return { id: documentId, ...documentData };
    } else {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, documentData);
      return { id: docRef.id, ...documentData };
    }
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update an existing document
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 * @param {Object} data - Updated data
 * @returns {Promise<void>}
 */
export async function updateDocument(collectionName, documentId, data) {
  try {
    const docRef = doc(db, collectionName, documentId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error(`Error updating document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Delete a document
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(collectionName, documentId) {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Listen to real-time updates on a document
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export function listenToDocument(collectionName, documentId, callback) {
  try {
    const docRef = doc(db, collectionName, documentId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(`Error listening to document ${documentId}:`, error);
        callback(null, error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up listener for ${documentId}:`, error);
    throw error;
  }
}

/**
 * Listen to real-time updates on a collection
 * @param {string} collectionName - Collection name
 * @param {Object} options - Query options
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export function listenToCollection(collectionName, options = {}, callback) {
  try {
    const collectionRef = collection(db, collectionName);
    let q = collectionRef;
    
    // Apply query constraints
    const constraints = [];
    
    if (options.where) {
      options.where.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }
    
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
    }
    
    if (options.limit) {
      constraints.push(limit(options.limit));
    }
    
    if (constraints.length > 0) {
      q = query(collectionRef, ...constraints);
    }
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const documents = [];
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        callback(documents);
      },
      (error) => {
        console.error(`Error listening to collection ${collectionName}:`, error);
        callback([], error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up listener for ${collectionName}:`, error);
    throw error;
  }
}

// ============================================================
// FIREBASE STORAGE HELPER FUNCTIONS
// ============================================================

/**
 * Upload a file to Firebase Storage
 * @param {string} path - Storage path
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Download URL
 */
export async function uploadFile(path, file, onProgress = null) {
  try {
    const fileRef = storageRef(storage, path);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export async function deleteFile(path) {
  try {
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    // Ignore error if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

/**
 * Get download URL for a file
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL
 */
export async function getFileURL(path) {
  try {
    const fileRef = storageRef(storage, path);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
}

// ============================================================
// GLOBAL SETTINGS HELPERS
// ============================================================

/**
 * Get global settings document
 * @returns {Promise<Object|null>} Settings object
 */
export async function getGlobalSettings() {
  try {
    return await getDocument('settings', 'global');
  } catch (error) {
    console.error('Error getting global settings:', error);
    return null;
  }
}

/**
 * Update global settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<void>}
 */
export async function updateGlobalSettings(settings) {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        ...settings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating global settings:', error);
    throw error;
  }
}

// ============================================================
// ERROR HANDLING HELPERS
// ============================================================

/**
 * Get user-friendly error message
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  const errorMessages = {
    // Auth errors
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email address already in use.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    
    // Firestore errors
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
    'already-exists': 'The resource already exists.',
    'resource-exhausted': 'Quota exceeded. Please try again later.',
    'unauthenticated': 'Please sign in to continue.',
    
    // Storage errors
    'storage/unauthorized': 'You do not have permission to access this file.',
    'storage/object-not-found': 'File not found.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/unauthenticated': 'Please sign in to upload files.',
    'storage/retry-limit-exceeded': 'Upload failed. Please try again.',
  };
  
  const errorCode = error.code || error.message;
  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// ============================================================
// INITIALIZATION COMPLETE
// ============================================================

console.log('✅ Firebase module loaded successfully');
