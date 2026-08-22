import { initializeFirebase } from './firebase-init.js';
import { initAuth, onAuthStateChange } from './auth.js';
import { initProductsListener } from './products.js';
import { initCategoriesListener } from './categories.js';
import { initFavoritesListener } from './favorites.js';
import { initTheme } from './theme.js';
import { init3DEffects } from './3d-effects.js';
import { initSearch } from './search.js';
import { initScrollReveal, showLoadingOverlay, hideLoadingOverlay } from './ui.js';
import { MASTER_AFFILIATE_URL } from './config.js';

/**
 * Initialize application
 */
async function initApp() {
  const loadingOverlay = showLoadingOverlay('Initializing The Gadget Hub Store...');
  
  try {
    // Initialize Firebase
    console.log('🔥 Initializing Firebase...');
    const firebaseResult = await initializeFirebase();
    
    if (!firebaseResult.success) {
      throw new Error('Firebase initialization failed');
    }
    
    // Initialize theme first for immediate visual feedback
    console.log('🎨 Initializing theme...');
    initTheme();
    
    // Initialize authentication
    console.log('🔐 Initializing authentication...');
    await initAuth();
    
    // Initialize real-time listeners
    console.log('📡 Setting up real-time synchronization...');
    await Promise.all([
      initProductsListener(),
      initCategoriesListener()
    ]);
    
    // Initialize favorites when user signs in
    onAuthStateChange((user) => {
      if (user) {
        initFavoritesListener(user.uid);
      }
    });
    
    // Initialize UI features
    console.log('✨ Initializing UI features...');
    initSearch();
    init3DEffects();
    initScrollReveal();
    setupNavigation();
    setupMobileMenu();
    setupMasterAffiliateLinks();
    
    console.log('✅ Application initialized successfully!');
  } catch (error) {
    console.error('❌ Application initialization error:', error);
    alert('Failed to initialize application. Please refresh the page.');
  } finally {
    hideLoadingOverlay();
  }
}

/**
 * Setup navigation
 */
function setupNavigation() {
  const nav = document.querySelector('.header');
  
  if (!nav) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
  
  // Highlight active nav link
  const currentPage = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-links a');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage || 
        (currentPage === '/' && link.getAttribute('href') === '/index.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * Setup mobile menu
 */
function setupMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  const closeBtn = document.querySelector('.mobile-menu-close');
  
  if (!menuBtn || !mobileMenu) return;
  
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.add('active');
    mobileOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  
  const closeMobileMenu = () => {
    mobileMenu.classList.remove('active');
    mobileOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  closeBtn?.addEventListener('click', closeMobileMenu);
  mobileOverlay?.addEventListener('click', closeMobileMenu);
  
  // Close menu when clicking on a link
  const mobileNavLinks = mobileMenu.querySelectorAll('.mobile-nav-links a');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

/**
 * Setup master affiliate links
 */
function setupMasterAffiliateLinks() {
  const masterAffiliateLinks = document.querySelectorAll('.master-affiliate-link');
  
  masterAffiliateLinks.forEach(link => {
    link.href = MASTER_AFFILIATE_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for use in other modules
export { initApp };
