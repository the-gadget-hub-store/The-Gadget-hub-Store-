// ===================================
// AUTHENTICATION FUNCTIONS
// ===================================

let currentUser = null;

// Initialize auth state listener
if (isFirebaseConfigured) {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateAuthUI();
        
        if (user) {
            console.log('User signed in:', user.email);
            loadUserFavorites();
        } else {
            console.log('User signed out');
            clearUserFavorites();
        }
    });
}

// Update UI based on auth state
function updateAuthUI() {
    const accountBtn = document.getElementById('accountBtn');
    
    if (!accountBtn) return;
    
    if (currentUser) {
        // User is signed in
        accountBtn.innerHTML = '<i class="fas fa-user"></i>';
        accountBtn.title = currentUser.email;
    } else {
        // User is signed out
        accountBtn.innerHTML = '<i class="far fa-user"></i>';
        accountBtn.title = 'Sign In';
    }
}

// Show login modal
function showLoginModal() {
    // Create login modal dynamically
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-overlay"></div>
        <div class="auth-modal-content">
            <button class="auth-modal-close" onclick="closeAuthModal()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="auth-modal-header">
                <h2>Welcome Back</h2>
                <p>Sign in to save your favorites and preferences</p>
            </div>
            
            <div class="auth-tabs">
                <button class="auth-tab active" data-tab="signin">Sign In</button>
                <button class="auth-tab" data-tab="signup">Sign Up</button>
            </div>
            
            <div class="auth-tab-content active" id="signin-tab">
                <form id="signinForm" class="auth-form">
                    <div class="form-group">
                        <label for="signinEmail">Email</label>
                        <input type="email" id="signinEmail" required placeholder="Enter your email">
                    </div>
                    <div class="form-group">
                        <label for="signinPassword">Password</label>
                        <input type="password" id="signinPassword" required placeholder="Enter your password">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <span>Sign In</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </form>
                
                <div class="auth-divider">
                    <span>or</span>
                </div>
                
                <button class="btn btn-outline btn-block" onclick="signInWithGoogle()">
                    <i class="fab fa-google"></i>
                    <span>Continue with Google</span>
                </button>
            </div>
            
            <div class="auth-tab-content" id="signup-tab">
                <form id="signupForm" class="auth-form">
                    <div class="form-group">
                        <label for="signupName">Name</label>
                        <input type="text" id="signupName" required placeholder="Enter your name">
                    </div>
                    <div class="form-group">
                        <label for="signupEmail">Email</label>
                        <input type="email" id="signupEmail" required placeholder="Enter your email">
                    </div>
                    <div class="form-group">
                        <label for="signupPassword">Password</label>
                        <input type="password" id="signupPassword" required placeholder="Create a password">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <span>Create Account</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </form>
                
                <div class="auth-divider">
                    <span>or</span>
                </div>
                
                <button class="btn btn-outline btn-block" onclick="signInWithGoogle()">
                    <i class="fab fa-google"></i>
                    <span>Continue with Google</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    setTimeout(() => {
        modal.classList.add('active');
        
        // Tab switching
        const tabBtns = modal.querySelectorAll('.auth-tab');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                switchAuthTab(tabName);
            });
        });
        
        // Form submissions
        document.getElementById('signinForm').addEventListener('submit', handleSignIn);
        document.getElementById('signupForm').addEventListener('submit', handleSignUp);
        
        // Close on overlay click
        modal.querySelector('.auth-modal-overlay').addEventListener('click', closeAuthModal);
    }, 10);
}

// Switch auth tabs
function switchAuthTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab');
    const contents = document.querySelectorAll('.auth-tab-content');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    contents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Close auth modal
function closeAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Handle sign in
async function handleSignIn(e) {
    e.preventDefault();
    
    if (!isFirebaseConfigured) {
        showToast('Firebase not configured', 'error');
        return;
    }
    
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Successfully signed in!', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Sign in error:', error);
        showToast(error.message, 'error');
    }
}

// Handle sign up
async function handleSignUp(e) {
    e.preventDefault();
    
    if (!isFirebaseConfigured) {
        showToast('Firebase not configured', 'error');
        return;
    }
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile with name
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user document
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Account created successfully!', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Sign up error:', error);
        showToast(error.message, 'error');
    }
}

// Sign in with Google
async function signInWithGoogle() {
    if (!isFirebaseConfigured) {
        showToast('Firebase not configured', 'error');
        return;
    }
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        showToast('Successfully signed in with Google!', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Google sign in error:', error);
        showToast(error.message, 'error');
    }
}

// Sign out
async function signOut() {
    if (!isFirebaseConfigured) {
        showToast('Firebase not configured', 'error');
        return;
    }
    
    try {
        await auth.signOut();
        showToast('Successfully signed out', 'success');
        window.location.href = '/';
    } catch (error) {
        console.error('Sign out error:', error);
        showToast(error.message, 'error');
    }
}

// Check if user is signed in
function isUserSignedIn() {
    return currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Require authentication
function requireAuth(callback) {
    if (isUserSignedIn()) {
        callback();
    } else {
        showLoginModal();
    }
}
