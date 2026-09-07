/* ================================
   THE GADGET HUB STORE
   Authentication Module
   ================================ */

import {
  isFirebaseInitialized,
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  getCurrentUser,
  isAuthenticated,
  getUserDisplayName,
  handleFirebaseError
} from './firebase.js';

import {
  showToast,
  setButtonLoading,
  closeModal,
  openModal
} from './ui.js';

/* ================================
   AUTHENTICATION STATE
   ================================ */

let currentAuthUser = null;

/**
 * Initialize authentication
 */
export function initializeAuth() {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized - auth features disabled');
    return;
  }

  onAuthStateChanged(auth, (user) => {
    currentAuthUser = user;
    updateAuthUI(user);
    console.log('🔐 Auth state:', user ? `Signed in: ${user.email}` : 'Signed out');
  });

  setupAuthForms();
  console.log('✅ Authentication initialized');
}

/**
 * Update authentication UI
 */
function updateAuthUI(user) {
  const accountPage = document.querySelector('[data-page="account"]');
  if (!accountPage) return;

  if (user) {
    showAuthenticatedState(user);
  } else {
    showUnauthenticatedState();
  }
}

/**
 * Show authenticated state
 */
function showAuthenticatedState(user) {
  const container = document.getElementById('accountContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="account-page">
      <div class="account-header">
        <div class="account-avatar">
          ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName || 'User'}">` : `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          `}
        </div>
        <h2>${user.displayName || 'User'}</h2>
        <p>${user.email}</p>
      </div>
      <div class="account-actions">
        <button id="signOutBtn" class="btn btn-outline">Sign Out</button>
      </div>
    </div>
  `;

  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
}

/**
 * Show unauthenticated state
 */
function showUnauthenticatedState() {
  const container = document.getElementById('accountContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="signin">Sign In</button>
        <button class="auth-tab" data-tab="signup">Sign Up</button>
      </div>
      
      <div class="auth-form-container">
        <form id="signInForm" class="auth-form active">
          <h2>Welcome Back</h2>
          <div class="form-group">
            <input type="email" id="signInEmail" class="form-input" placeholder="Email" required>
          </div>
          <div class="form-group">
            <input type="password" id="signInPassword" class="form-input" placeholder="Password" required>
          </div>
          <button type="submit" class="btn btn-primary" id="signInSubmit">
            <span class="btn-text">Sign In</span>
            <span class="btn-loading"><span class="spinner-small"></span></span>
          </button>
          <div class="auth-divider">or</div>
          <button type="button" class="btn btn-outline" id="googleSignInBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <form id="signUpForm" class="auth-form">
          <h2>Create Account</h2>
          <div class="form-group">
            <input type="text" id="signUpName" class="form-input" placeholder="Full Name" required>
          </div>
          <div class="form-group">
            <input type="email" id="signUpEmail" class="form-input" placeholder="Email" required>
          </div>
          <div class="form-group">
            <input type="password" id="signUpPassword" class="form-input" placeholder="Password (min 6 characters)" required>
          </div>
          <button type="submit" class="btn btn-primary" id="signUpSubmit">
            <span class="btn-text">Sign Up</span>
            <span class="btn-loading"><span class="spinner-small"></span></span>
          </button>
          <div class="auth-divider">or</div>
          <button type="button" class="btn btn-outline" id="googleSignUpBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  `;

  setupAuthForms();
}

/**
 * Setup authentication forms
 */
function setupAuthForms() {
  // Tab switching
  const authTabs = document.querySelectorAll('.auth-tab');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      authTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
      });
      
      const targetForm = document.getElementById(tabName === 'signin' ? 'signInForm' : 'signUpForm');
      if (targetForm) targetForm.classList.add('active');
    });
  });

  // Sign in form
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.addEventListener('submit', handleSignIn);
  }

  // Sign up form
  const signUpForm = document.getElementById('signUpForm');
  if (signUpForm) {
    signUpForm.addEventListener('submit', handleSignUp);
  }

  // Google sign in buttons
  const googleSignInBtns = document.querySelectorAll('#googleSignInBtn, #googleSignUpBtn');
  googleSignInBtns.forEach(btn => {
    btn.addEventListener('click', handleGoogleSignIn);
  });
}

/**
 * Handle email/password sign in
 */
async function handleSignIn(e) {
  e.preventDefault();
  
  const email = document.getElementById('signInEmail').value;
  const password = document.getElementById('signInPassword').value;
  const submitBtn = document.getElementById('signInSubmit');

  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Successfully signed in!', 'success');
  } catch (error) {
    const message = handleFirebaseError(error);
    showToast(message, 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/**
 * Handle email/password sign up
 */
async function handleSignUp(e) {
  e.preventDefault();
  
  const name = document.getElementById('signUpName').value;
  const email = document.getElementById('signUpEmail').value;
  const password = document.getElementById('signUpPassword').value;
  const submitBtn = document.getElementById('signUpSubmit');

  if (!name || !email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(userCredential.user, {
      displayName: name
    });
    
    showToast('Account created successfully!', 'success');
  } catch (error) {
    const message = handleFirebaseError(error);
    showToast(message, 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/**
 * Handle Google sign in
 */
async function handleGoogleSignIn() {
  if (!isFirebaseInitialized()) {
    showToast('Service unavailable', 'error');
    return;
  }

  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    showToast('Successfully signed in with Google!', 'success');
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      return;
    }
    const message = handleFirebaseError(error);
    showToast(message, 'error');
  }
}

/**
 * Handle sign out
 */
async function handleSignOut() {
  const signOutBtn = document.getElementById('signOutBtn');
  setButtonLoading(signOutBtn, true);

  try {
    await signOut(auth);
    showToast('Signed out successfully', 'success');
  } catch (error) {
    showToast('Failed to sign out', 'error');
  } finally {
    setButtonLoading(signOutBtn, false);
  }
}

/**
 * Get current authenticated user
 */
export function getAuthUser() {
  return currentAuthUser;
}

/**
 * Check if user is signed in
 */
export function isUserAuthenticated() {
  return isAuthenticated();
}

/* ================================
   AUTO-INITIALIZATION
   ================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    
    if (page === 'account.html') {
      initializeAuth();
    }
  });
} else {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);
  
  if (page === 'account.html') {
    initializeAuth();
  }
}

console.log('📦 Auth module loaded');
