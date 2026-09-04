/* ============================================================
   THE GADGET HUB STORE - AUTHENTICATION MODULE
   User authentication, authorization, and session management
   ============================================================ */

import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  getErrorMessage
} from './firebase.js';

// ============================================================
// AUTHENTICATION STATE
// ============================================================

let currentUser = null;
let authStateListeners = [];
let isAuthReady = false;

// ============================================================
// INITIALIZE AUTHENTICATION
// ============================================================

/**
 * Initialize authentication state listener
 */
export function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      isAuthReady = true;

      // Notify all listeners
      authStateListeners.forEach(listener => {
        try {
          listener(user);
        } catch (error) {
          console.error('Error in auth state listener:', error);
        }
      });

      resolve(user);
    });
  });
}

// ============================================================
// AUTH STATE MANAGEMENT
// ============================================================

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  authStateListeners.push(callback);

  // Immediately call with current state if auth is ready
  if (isAuthReady) {
    callback(currentUser);
  }

  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
}

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Wait for auth to be ready
 * @returns {Promise<Object|null>} Current user
 */
export function waitForAuth() {
  if (isAuthReady) {
    return Promise.resolve(currentUser);
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthChange((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// ============================================================
// SIGN IN / SIGN UP
// ============================================================

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential
 */
export async function signIn(email, password) {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User credential
 */
export async function signUp(email, password, displayName = '') {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (password.length < 6) {
      throw new Error('Password should be at least 6 characters.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile with display name if provided
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

/**
 * Sign in with Google
 * @returns {Promise<Object>} User credential
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const userCredential = await signInWithPopup(auth, provider);
    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error('Google sign in error:', error);

    // Handle specific Google sign-in errors
    if (error.code === 'auth/popup-closed-by-user') {
      return {
        success: false,
        error: 'Sign-in cancelled. Please try again.'
      };
    }

    if (error.code === 'auth/operation-not-allowed') {
      return {
        success: false,
        error: 'Google sign-in is not currently available. Please use email/password.'
      };
    }

    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

// ============================================================
// SIGN OUT
// ============================================================

/**
 * Sign out current user
 * @returns {Promise<Object>} Success status
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    return {
      success: true
    };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

// ============================================================
// PASSWORD RESET
// ============================================================

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} Success status
 */
export async function resetPassword(email) {
  try {
    if (!email) {
      throw new Error('Email is required.');
    }

    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

// ============================================================
// PROFILE MANAGEMENT
// ============================================================

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Success status
 */
export async function updateUserProfile(profileData) {
  try {
    if (!currentUser) {
      throw new Error('No user is signed in.');
    }

    await updateProfile(currentUser, profileData);
    return {
      success: true,
      message: 'Profile updated successfully.'
    };
  } catch (error) {
    console.error('Profile update error:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

/**
 * Get user display name
 * @returns {string} Display name or email
 */
export function getUserDisplayName() {
  if (!currentUser) return 'Guest';
  return currentUser.displayName || currentUser.email || 'User';
}

/**
 * Get user email
 * @returns {string|null} User email
 */
export function getUserEmail() {
  return currentUser?.email || null;
}

/**
 * Get user ID
 * @returns {string|null} User ID
 */
export function getUserId() {
  return currentUser?.uid || null;
}

/**
 * Get user photo URL
 * @returns {string|null} Photo URL
 */
export function getUserPhotoURL() {
  return currentUser?.photoURL || null;
}

// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

/**
 * Check if current user is admin
 * Note: This is a client-side check only.
 * Real authorization MUST be enforced by Firestore Security Rules.
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin() {
  try {
    if (!currentUser) return false;

    // Get custom claims from ID token
    const idTokenResult = await currentUser.getIdTokenResult();
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Require admin authentication
 * @returns {Promise<boolean>} True if admin, false otherwise
 */
export async function requireAdmin() {
  const adminStatus = await isAdmin();

  if (!adminStatus) {
    console.warn('Admin access required but user is not admin');
  }

  return adminStatus;
}

/**
 * Require authentication
 * @returns {boolean} True if authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    console.warn('Authentication required but user is not signed in');
    return false;
  }
  return true;
}

// ============================================================
// UI HELPER FUNCTIONS
// ============================================================

/**
 * Show authentication required modal/message
 * @param {string} message - Optional custom message
 */
export function showAuthRequired(message = 'Please sign in to continue') {
  // This will be implemented by ui.js
  if (window.showToast) {
    window.showToast(message, 'warning');
  } else {
    alert(message);
  }
}

/**
 * Redirect to login if not authenticated
 * @param {string} returnUrl - URL to return to after login
 */
export function redirectToLogin(returnUrl = null) {
  if (returnUrl) {
    sessionStorage.setItem('returnUrl', returnUrl);
  }

  // Redirect to account page or show login modal
  if (window.location.pathname !== '/pages/account.html') {
    window.location.href = '/pages/account.html';
  }
}

/**
 * Update UI based on auth state
 * @param {Object|null} user - Current user
 */
export function updateAuthUI(user) {
  // Update account button
  const accountBtns = document.querySelectorAll('[data-auth-button]');
  accountBtns.forEach(btn => {
    if (user) {
      btn.classList.add('authenticated');
      const nameEl = btn.querySelector('[data-auth-name]');
      if (nameEl) {
        nameEl.textContent = getUserDisplayName();
      }
    } else {
      btn.classList.remove('authenticated');
      const nameEl = btn.querySelector('[data-auth-name]');
      if (nameEl) {
        nameEl.textContent = 'Account';
      }
    }
  });

  // Show/hide authenticated-only elements
  const authOnlyElements = document.querySelectorAll('[data-auth-only]');
  authOnlyElements.forEach(el => {
    el.style.display = user ? '' : 'none';
  });

  // Show/hide guest-only elements
  const guestOnlyElements = document.querySelectorAll('[data-guest-only]');
  guestOnlyElements.forEach(el => {
    el.style.display = user ? 'none' : '';
  });
}

// ============================================================
// FORM VALIDATION HELPERS
// ============================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export function validatePassword(password) {
  const result = {
    valid: true,
    errors: []
  };

  if (password.length < 6) {
    result.valid = false;
    result.errors.push('Password must be at least 6 characters long.');
  }

  if (password.length > 128) {
    result.valid = false;
    result.errors.push('Password is too long.');
  }

  return result;
}

/**
 * Validate sign up form
 * @param {string} email - Email
 * @param {string} password - Password
 * @param {string} confirmPassword - Confirm password
 * @returns {Object} Validation result
 */
export function validateSignUpForm(email, password, confirmPassword) {
  const result = {
    valid: true,
    errors: []
  };

  // Validate email
  if (!email) {
    result.valid = false;
    result.errors.push('Email is required.');
  } else if (!validateEmail(email)) {
    result.valid = false;
    result.errors.push('Please enter a valid email address.');
  }

  // Validate password
  if (!password) {
    result.valid = false;
    result.errors.push('Password is required.');
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      result.valid = false;
      result.errors.push(...passwordValidation.errors);
    }
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    result.valid = false;
    result.errors.push('Passwords do not match.');
  }

  return result;
}

/**
 * Validate sign in form
 * @param {string} email - Email
 * @param {string} password - Password
 * @returns {Object} Validation result
 */
export function validateSignInForm(email, password) {
  const result = {
    valid: true,
    errors: []
  };

  if (!email) {
    result.valid = false;
    result.errors.push('Email is required.');
  } else if (!validateEmail(email)) {
    result.valid = false;
    result.errors.push('Please enter a valid email address.');
  }

  if (!password) {
    result.valid = false;
    result.errors.push('Password is required.');
  }

  return result;
}

// ============================================================
// SESSION HELPERS
// ============================================================

/**
 * Get return URL from session storage
 * @returns {string|null} Return URL
 */
export function getReturnUrl() {
  const url = sessionStorage.getItem('returnUrl');
  if (url) {
    sessionStorage.removeItem('returnUrl');
  }
  return url;
}

/**
 * Redirect to return URL or default
 * @param {string} defaultUrl - Default URL if no return URL
 */
export function redirectToReturnUrl(defaultUrl = '/') {
  const returnUrl = getReturnUrl();
  window.location.href = returnUrl || defaultUrl;
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize auth state on module load
initAuth().then(() => {
  console.log('✅ Authentication module initialized');
}).catch(error => {
  console.error('❌ Authentication initialization error:', error);
});

// Subscribe to auth state changes for UI updates
onAuthChange((user) => {
  updateAuthUI(user);
  
  if (user) {
    console.log('👤 User signed in:', user.email);
  } else {
    console.log('👤 User signed out');
  }
});

// ============================================================
// EXPORTS
// ============================================================

export {
  initAuth,
  onAuthChange,
  getCurrentUser,
  isAuthenticated,
  waitForAuth,
  signIn,
  signUp,
  signInWithGoogle,
  signOutUser,
  resetPassword,
  updateUserProfile,
  getUserDisplayName,
  getUserEmail,
  getUserId,
  getUserPhotoURL,
  isAdmin,
  requireAdmin,
  requireAuth,
  showAuthRequired,
  redirectToLogin,
  updateAuthUI,
  validateEmail,
  validatePassword,
  validateSignUpForm,
  validateSignInForm,
  getReturnUrl,
  redirectToReturnUrl
};

console.log('✅ Auth module loaded successfully');
