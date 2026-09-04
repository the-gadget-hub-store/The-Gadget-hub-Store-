/* ============================================================
   THE GADGET HUB STORE - MAIN APPLICATION
   Application initialization and orchestration
   ============================================================ */

import { initAuth, onAuthChange } from './auth.js';
import { initFavorites, setupFavoriteButtons, onFavoritesChange } from './favorites.js';
import { initCurrency, onCurrencyChange } from './currency.js';
import { initAdvertising, renderAllAdSlots } from './advertising.js';
import { initUI } from './ui.js';
import { initSearch, setupSearchInput } from './search.js';

// ============================================================
// APPLICATION STATE
// ============================================================

let appInitialized = false;
let currentPage = null;

// ============================================================
// PAGE DETECTION
// ============================================================

/**
 * Detect current page
 * @returns {string} Page identifier
 */
function detectCurrentPage() {
  const path = window.location.pathname;
  
  if (path === '/' || path === '/index.html') {
    return 'home';
  } else if (path.includes('/shop.html')) {
    return 'shop';
  } else if (path.includes('/product.html')) {
    return 'product';
  } else if (path.includes('/categories.html')) {
    return 'categories';
  } else if (path.includes('/trending.html')) {
    return 'trending';
  } else if (path.includes('/deals.html')) {
    return 'deals';
  } else if (path.includes('/favorites.html')) {
    return 'favorites';
  } else if (path.includes('/account.html')) {
    return 'account';
  } else if (path.includes('/admin/')) {
    return 'admin';
  }
  
  return 'unknown';
}

// ============================================================
// INITIALIZE APPLICATION
// ============================================================

/**
 * Initialize application
 */
async function initApp() {
  if (appInitialized) {
    console.warn('App already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing The Gadget Hub Store...');

    // Detect current page
    currentPage = detectCurrentPage();
    console.log(`📄 Current page: ${currentPage}`);

    // Initialize core modules (already auto-initialized, but ensure they're ready)
    await initAuth();
    initFavorites();
    await initCurrency();
    await initAdvertising();
    
    // UI is already initialized via auto-init
    // initUI() is called automatically on DOM ready

    // Setup global search
    setupGlobalSearch();

    // Setup global navigation
    setupGlobalNavigation();

    // Setup currency selector
    setupGlobalCurrencySelector();

    // Render advertisement slots
    renderAllAdSlots();

    // Setup page-specific functionality
    setupPageSpecificFeatures();

    // Setup global event listeners
    setupGlobalEventListeners();

    appInitialized = true;
    console.log('✅ Application initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing application:', error);
  }
}

// ============================================================
// GLOBAL SEARCH SETUP
// ============================================================

/**
 * Setup global search functionality
 */
function setupGlobalSearch() {
  // Desktop search
  const desktopSearchInput = document.querySelector('.navbar .search-input');
  if (desktopSearchInput) {
    setupSearchInput(desktopSearchInput, handleSearchResults);
  }

  // Mobile search
  const mobileSearchInput = document.querySelector('.mobile-menu .search-input');
  if (mobileSearchInput) {
    setupSearchInput(mobileSearchInput, handleSearchResults);
  }

  // Search toggle for mobile
  const searchToggle = document.querySelector('[data-search-toggle]');
  const searchBar = document.querySelector('.search-bar-mobile');
  
  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', () => {
      searchBar.classList.toggle('active');
      const searchInput = searchBar.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
      }
    });

    // Close on backdrop click
    const searchBackdrop = document.querySelector('.search-backdrop');
    if (searchBackdrop) {
      searchBackdrop.addEventListener('click', () => {
        searchBar.classList.remove('active');
      });
    }
  }
}

/**
 * Handle search results
 * @param {Object} results - Search results
 */
function handleSearchResults(results) {
  if (!results) return;

  // If on shop page, results are handled by shop page script
  if (currentPage === 'shop') {
    return;
  }

  // Navigate to shop page with search query
  if (results.query) {
    window.location.href = `/pages/shop.html?search=${encodeURIComponent(results.query)}`;
  }
}

// ============================================================
// GLOBAL NAVIGATION SETUP
// ============================================================

/**
 * Setup global navigation
 */
function setupGlobalNavigation() {
  // Set active nav links
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const path = window.location.pathname;
    
    if (
      (href === '/' && path === '/') ||
      (href === '/index.html' && (path === '/' || path === '/index.html')) ||
      (href && path.includes(href) && href !== '/')
    ) {
      link.classList.add('active');
    }
  });

  // Account button behavior
  setupAccountButton();

  // Favorites button
  setupFavoritesButton();
}

/**
 * Setup account button
 */
function setupAccountButton() {
  const accountButtons = document.querySelectorAll('[data-auth-button]');
  
  accountButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/pages/account.html';
    });
  });
}

/**
 * Setup favorites button
 */
function setupFavoritesButton() {
  const favoritesButtons = document.querySelectorAll('[data-favorites-button]');
  
  favoritesButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/pages/favorites.html';
    });
  });

  // Update favorites count badge on change
  onFavoritesChange(() => {
    if (window.updateFavoritesCountBadge) {
      window.updateFavoritesCountBadge();
    }
  });
}

// ============================================================
// GLOBAL CURRENCY SELECTOR
// ============================================================

/**
 * Setup global currency selector
 */
function setupGlobalCurrencySelector() {
  // Desktop currency selector
  const desktopSelector = document.querySelector('.navbar [data-currency-selector]');
  if (desktopSelector) {
    setupCurrencySelectorUI(desktopSelector);
  }

  // Mobile currency selector
  const mobileSelector = document.querySelector('.mobile-menu [data-currency-selector]');
  if (mobileSelector) {
    setupCurrencySelectorUI(mobileSelector);
  }

  // Update prices when currency changes
  onCurrencyChange(() => {
    if (window.updateAllPrices) {
      window.updateAllPrices();
    }
  });
}

/**
 * Setup currency selector UI
 * @param {HTMLElement} selector - Currency selector element
 */
function setupCurrencySelectorUI(selector) {
  if (!selector) return;

  import('./currency.js').then(module => {
    module.setupCurrencySelector(selector);
  }).catch(error => {
    console.error('Error setting up currency selector:', error);
  });
}

// ============================================================
// PAGE-SPECIFIC FEATURES
// ============================================================

/**
 * Setup page-specific features
 */
function setupPageSpecificFeatures() {
  switch (currentPage) {
    case 'home':
      setupHomePage();
      break;
    case 'shop':
      setupShopPage();
      break;
    case 'product':
      setupProductPage();
      break;
    case 'categories':
      setupCategoriesPage();
      break;
    case 'favorites':
      setupFavoritesPage();
      break;
    case 'account':
      setupAccountPage();
      break;
    default:
      console.log('No specific setup for current page');
  }
}

/**
 * Setup home page
 */
function setupHomePage() {
  console.log('Setting up home page...');
  
  // Setup favorite buttons for product cards
  setupFavoriteButtons();

  // Setup hero CTAs
  const heroCtaButtons = document.querySelectorAll('.hero-actions .btn');
  heroCtaButtons.forEach(button => {
    const href = button.getAttribute('href');
    // Master affiliate URL button should open in new tab
    if (href && href.includes('s.click.aliexpress.com')) {
      button.setAttribute('target', '_blank');
      button.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Setup shop page
 */
function setupShopPage() {
  console.log('Setting up shop page...');
  
  // Shop page has its own script, just setup favorites
  setupFavoriteButtons();
}

/**
 * Setup product page
 */
function setupProductPage() {
  console.log('Setting up product page...');
  
  // Product page has its own script, just setup favorites
  setupFavoriteButtons();
}

/**
 * Setup categories page
 */
function setupCategoriesPage() {
  console.log('Setting up categories page...');
  
  // Categories page has its own script if needed
  setupFavoriteButtons();
}

/**
 * Setup favorites page
 */
function setupFavoritesPage() {
  console.log('Setting up favorites page...');
  
  // Favorites page has its own script
  setupFavoriteButtons();
}

/**
 * Setup account page
 */
function setupAccountPage() {
  console.log('Setting up account page...');
  
  // Account page has its own script for auth forms
}

// ============================================================
// GLOBAL EVENT LISTENERS
// ============================================================

/**
 * Setup global event listeners
 */
function setupGlobalEventListeners() {
  // External link handling (affiliate links)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="aliexpress.com"]');
    if (link) {
      // Ensure affiliate links open in new tab with noopener
      if (!link.hasAttribute('target')) {
        link.setAttribute('target', '_blank');
      }
      if (!link.hasAttribute('rel')) {
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  // Handle image load errors
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      const img = e.target;
      if (!img.dataset.errorHandled) {
        img.dataset.errorHandled = 'true';
        img.src = '/assets/images/placeholder-product.jpg';
        img.alt = 'Image not available';
      }
    }
  }, true);

  // Handle newsletter form if present
  const newsletterForm = document.querySelector('[data-newsletter-form]');
  if (newsletterForm) {
    setupNewsletterForm(newsletterForm);
  }

  // Setup all favorite buttons on page
  setupFavoriteButtons();
}

// ============================================================
// NEWSLETTER SUBSCRIPTION
// ============================================================

/**
 * Setup newsletter subscription form
 * @param {HTMLFormElement} form - Newsletter form
 */
function setupNewsletterForm(form) {
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = form.querySelector('input[type="email"]');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!emailInput || !submitButton) return;

    const email = emailInput.value.trim();

    // Validate email
    if (!email || !validateEmail(email)) {
      if (window.showError) {
        window.showError('Please enter a valid email address');
      }
      return;
    }

    // Set button loading state
    if (window.setButtonLoading) {
      window.setButtonLoading(submitButton, true, 'Subscribing...');
    } else {
      submitButton.disabled = true;
      submitButton.textContent = 'Subscribing...';
    }

    try {
      // Save subscriber to Firebase
      const { createDocument } = await import('./firebase.js');
      
      await createDocument('newsletterSubscribers', {
        email: email,
        subscribedAt: new Date(),
        status: 'active'
      });

      // Show success message
      if (window.showSuccess) {
        window.showSuccess('Successfully subscribed to newsletter!');
      } else {
        alert('Successfully subscribed to newsletter!');
      }

      // Clear form
      form.reset();

    } catch (error) {
      console.error('Newsletter subscription error:', error);
      
      // Check if already subscribed
      if (error.code === 'already-exists') {
        if (window.showInfo) {
          window.showInfo('You are already subscribed to our newsletter');
        } else {
          alert('You are already subscribed to our newsletter');
        }
      } else {
        if (window.showError) {
          window.showError('Failed to subscribe. Please try again.');
        } else {
          alert('Failed to subscribe. Please try again.');
        }
      }
    } finally {
      // Reset button state
      if (window.setButtonLoading) {
        window.setButtonLoading(submitButton, false);
      } else {
        submitButton.disabled = false;
        submitButton.textContent = 'Subscribe';
      }
    }
  });
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get URL parameters
 * @returns {Object} URL parameters
 */
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Update URL parameter without reload
 * @param {string} key - Parameter key
 * @param {string} value - Parameter value
 */
export function updateUrlParam(key, value) {
  const url = new URL(window.location);
  
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  
  window.history.pushState({}, '', url);
}

/**
 * Remove URL parameter without reload
 * @param {string} key - Parameter key
 */
export function removeUrlParam(key) {
  updateUrlParam(key, null);
}

/**
 * Reload current page
 */
export function reloadPage() {
  window.location.reload();
}

/**
 * Navigate to page
 * @param {string} url - URL to navigate to
 */
export function navigateTo(url) {
  window.location.href = url;
}

/**
 * Check if user is on mobile device
 * @returns {boolean} True if mobile
 */
export function isMobileDevice() {
  return window.innerWidth < 768;
}

/**
 * Check if user is on tablet device
 * @returns {boolean} True if tablet
 */
export function isTabletDevice() {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
}

/**
 * Get current page identifier
 * @returns {string} Page identifier
 */
export function getCurrentPage() {
  return currentPage;
}

/**
 * Check if app is initialized
 * @returns {boolean} True if initialized
 */
export function isAppInitialized() {
  return appInitialized;
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already loaded
  initApp();
}

// Make utility functions available globally
window.getUrlParams = getUrlParams;
window.updateUrlParam = updateUrlParam;
window.removeUrlParam = removeUrlParam;

// ============================================================
// EXPORTS
// ============================================================

export {
  initApp,
  getCurrentPage,
  isAppInitialized,
  getUrlParams,
  updateUrlParam,
  removeUrlParam,
  reloadPage,
  navigateTo,
  isMobileDevice,
  isTabletDevice
};

console.log('✅ App module loaded successfully');
