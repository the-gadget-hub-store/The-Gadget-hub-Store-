import { getFirebaseInstances, safeFirebaseOperation } from './firebase-init.js';
import { showSuccessToast, showErrorToast, handleFirebaseError } from './ui.js';

let currentUser = null;
let authStateListeners = [];

/**
 * Initialize auth state listener
 */
export async function initAuth() {
  try {
    const { auth } = getFirebaseInstances();
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      updateAuthUI(user);
      notifyAuthStateListeners(user);
    });
  } catch (error) {
    console.error('Auth initialization error:', error);
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email, password, displayName) {
  return safeFirebaseOperation(async () => {
    const { auth } = getFirebaseInstances();
    const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    await createUserDocument(userCredential.user);
    
    showSuccessToast('Account created successfully!');
    return userCredential.user;
  }, 'Sign up failed');
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  return safeFirebaseOperation(async () => {
    const { auth } = getFirebaseInstances();
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showSuccessToast('Welcome back!');
    return userCredential.user;
  }, 'Sign in failed');
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  return safeFirebaseOperation(async () => {
    const { auth } = getFirebaseInstances();
    const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    await createUserDocument(userCredential.user);
    
    showSuccessToast('Signed in with Google!');
    return userCredential.user;
  }, 'Google sign in failed');
}

/**
 * Sign out
 */
export async function signOut() {
  return safeFirebaseOperation(async () => {
    const { auth } = getFirebaseInstances();
    const { signOut: firebaseSignOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    await firebaseSignOut(auth);
    showSuccessToast('Signed out successfully');
  }, 'Sign out failed');
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  return safeFirebaseOperation(async () => {
    const { auth } = getFirebaseInstances();
    const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    await sendPasswordResetEmail(auth, email);
    showSuccessToast('Password reset email sent!');
  }, 'Password reset failed');
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!currentUser;
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  if (!currentUser) return false;
  
  try {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    return userDoc.exists() && userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Create user document
 */
async function createUserDocument(user) {
  try {
    const { db } = getFirebaseInstances();
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const userRef = doc(db, 'users', user.uid);
    
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role: 'user',
      createdAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error creating user document:', error);
  }
}

/**
 * Update auth UI
 */
function updateAuthUI(user) {
  const accountBtns = document.querySelectorAll('.account-btn');
  const signInBtns = document.querySelectorAll('.sign-in-btn');
  const signOutBtns = document.querySelectorAll('.sign-out-btn');
  const userDisplays = document.querySelectorAll('.user-display');
  
  if (user) {
    accountBtns.forEach(btn => btn.style.display = 'flex');
    signInBtns.forEach(btn => btn.style.display = 'none');
    signOutBtns.forEach(btn => btn.style.display = 'block');
    userDisplays.forEach(display => {
      display.textContent = user.displayName || user.email;
    });
  } else {
    accountBtns.forEach(btn => btn.style.display = 'none');
    signInBtns.forEach(btn => btn.style.display = 'flex');
    signOutBtns.forEach(btn => btn.style.display = 'none');
  }
}

/**
 * Auth state listener
 */
export function onAuthStateChange(callback) {
  authStateListeners.push(callback);
  if (currentUser !== null) {
    callback(currentUser);
  }
}

function notifyAuthStateListeners(user) {
  authStateListeners.forEach(callback => callback(user));
}

/**
 * Require authentication
 */
export async function requireAuth() {
  if (!isAuthenticated()) {
    showErrorToast('Please sign in to continue');
    return false;
  }
  return true;
}

/**
 * Require admin
 */
export async function requireAdmin() {
  if (!isAuthenticated()) {
    showErrorToast('Please sign in to continue');
    window.location.href = '/index.html';
    return false;
  }
  
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    showErrorToast('Access denied. Admin privileges required.');
    window.location.href = '/index.html';
    return false;
  }
  
  return true;
}
