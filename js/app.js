/* ================================
   THE GADGET HUB STORE
   Application Bootstrap & Main Logic
   ================================ */

/**
 * Main Application Module
 * 
 * Coordinates:
 * - Firebase initialization check
 * - UI components
 * - Authentication state
 * - Page-specific features
 * - Global functionality
 */

import { 
  isFirebaseInitialized,
  getCurrentUser,
  isAuthenticated,
  subscribeToAuthState,
  db,
  getDoc,
  doc,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from './firebase.js';

import {
  showToast,
  showLoading,
  showEmptyState,
  showError,
  setButtonLoading,
  closeDropdown,
  toggleDropdown,
  escapeHtml,
  debounce
} from './ui.js';

/* ================================
   GLOBAL STATE
   ================================ */

let currentUser = null;
let appSettings = null;
let supportedCurrencies = [];
let selectedCurrency = 'USD';

/* ================================
   INITIALIZATION
   ================================ */

/**
 * Initialize application
 */
async function initializeApp() {
  console.log('🚀 Initializing The Gadget Hub Store...');
  
  // Check Firebase initialization
  if (!isFirebaseInitialized()) {
    console.warn('⚠️ Firebase not initialized - some features may be limited');
    showToast('Some features may be limited due to connection issues', 'warning', 5000);
  } else {
    console.log('✅ Firebase ready');
  }
  
  // Setup authentication state listener
  setupAuthStateListener();
  
  // Initialize global features
  await initializeGlobalFeatures();
  
  // Initialize page-specific features
  initializePageSpecificFeatures();
  
  console.log('✅ Application initialized');
}

/* ================================
   AUTHENTICATION STATE
   ================================ */

/**
 * Setup authentication state listener
 */
function setupAuthStateListener() {
  subscribeToAuthState((user) => {
    currentUser = user;
    updateAuthUI();
    updateFavoritesBadge();
  });
}

/**
 * Update authentication UI elements
 */
function updateAuthUI() {
  const accountLink = document.querySelector('a[href*="account.html"]');
  
  if (accountLink && currentUser) {
    // User is signed in - could update with user info
    accountLink.setAttribute('title', `Account: ${currentUser.email}`);
  }
  
  console.log('🔐 Auth UI updated:', currentUser ? 'Signed in' : 'Signed out');
}

/* ================================
   GLOBAL FEATURES
   ================================ */

/**
 * Initialize global features present on all pages
 */
async function initializeGlobalFeatures() {
  console.log('🌍 Initializing global features...');
  
  // Initialize currency selector
  await initializeCurrencySelector();
  
  // Load social links
  await loadSocialLinks();
  
  // Initialize newsletter form
  initializeNewsletterForm();
  
  // Setup favorites badge
  updateFavoritesBadge();
  
  console.log('✅ Global features initialized');
}

/* ================================
   CURRENCY SELECTOR
   ================================ */

/**
 * Initialize currency selector
 */
async function initializeCurrencySelector() {
  try {
    // Load supported currencies from settings or use defaults
    supportedCurrencies = await loadSupportedCurrencies();
    
    // Load saved currency preference or detect
    selectedCurrency = loadCurrencyPreference();
    
    // Populate currency dropdown
    populateCurrencyDropdown();
    
    // Setup currency selector button
    setupCurrencySelector();
    
    console.log(`💱 Currency selector initialized: ${selectedCurrency}`);
  } catch (error) {
    console.error('Error initializing currency selector:', error);
    // Use USD as fallback
    selectedCurrency = 'USD';
    populateCurrencyDropdownFallback();
  }
}

/**
 * Load supported currencies from Firebase settings
 */
async function loadSupportedCurrencies() {
  if (!isFirebaseInitialized()) {
    return getDefaultCurrencies();
  }
  
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      appSettings = settings;
      
      if (settings.supportedCurrencies && Array.isArray(settings.supportedCurrencies)) {
        return settings.supportedCurrencies;
      }
    }
    
    return getDefaultCurrencies();
  } catch (error) {
    console.error('Error loading currencies from Firebase:', error);
    return getDefaultCurrencies();
  }
}

/**
 * Get default supported currencies (exact 20 from specification)
 */
function getDefaultCurrencies() {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
    { code: 'GBP', name: 'Pound Sterling', symbol: '£', country: 'United Kingdom' },
    { code: 'EUR', name: 'Euro', symbol: '€', country: 'Eurozone' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', country: 'South Korea' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', country: 'Pakistan' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', country: 'Bangladesh' },
    { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', country: 'Nepal' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', country: 'UAE' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', country: 'Saudi Arabia' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', country: 'Turkey' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', country: 'Malaysia' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', country: 'Indonesia' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', country: 'Thailand' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', country: 'South Africa' }
  ];
}

/**
 * Load currency preference with priority
 */
function loadCurrencyPreference() {
  // Priority 1: Explicit user selection (localStorage)
  try {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      console.log('💱 Using saved currency preference:', savedCurrency);
      return savedCurrency;
    }
  } catch (error) {
    console.warn('Cannot access localStorage for currency preference');
  }
  
  // Priority 2: Browser locale detection (basic fallback)
  try {
    const locale = navigator.language || navigator.userLanguage || 'en-US';
    const currencyMap = {
      'en-US': 'USD',
      'en-GB': 'GBP',
      'en-CA': 'CAD',
      'en-AU': 'AUD',
      'zh-CN': 'CNY',
      'ja-JP': 'JPY',
      'ko-KR': 'KRW',
      'hi-IN': 'INR',
      'ur-PK': 'PKR',
      'bn-BD': 'BDT',
      'ne-NP': 'NPR',
      'ar-AE': 'AED',
      'ar-SA': 'SAR',
      'tr-TR': 'TRY',
      'ms-MY': 'MYR',
      'id-ID': 'IDR',
      'zh-SG': 'SGD',
      'th-TH': 'THB',
      'af-ZA': 'ZAR'
    };
    
    if (currencyMap[locale]) {
      console.log('💱 Using locale-based currency:', currencyMap[locale]);
      return currencyMap[locale];
    }
    
    // Try matching just the country code
    const countryCode = locale.split('-')[1];
    for (const [loc, curr] of Object.entries(currencyMap)) {
      if (loc.endsWith(countryCode)) {
        console.log('💱 Using country-based currency:', curr);
        return curr;
      }
    }
  } catch (error) {
    console.warn('Error detecting locale currency:', error);
  }
  
  // Priority 3: Default from settings or USD
  if (appSettings && appSettings.defaultCurrency) {
    return appSettings.defaultCurrency;
  }
  
  return 'USD';
}

/**
 * Populate currency dropdown
 */
function populateCurrencyDropdown() {
  const dropdown = document.getElementById('currencyDropdown');
  if (!dropdown) return;
  
  dropdown.innerHTML = supportedCurrencies.map(currency => `
    <button 
      class="currency-option ${currency.code === selectedCurrency ? 'active' : ''}" 
      data-currency="${currency.code}"
      role="menuitem"
    >
      <div class="currency-option-label">
        <span class="currency-option-name">${escapeHtml(currency.name)}</span>
        <span class="currency-option-code">${escapeHtml(currency.code)} (${escapeHtml(currency.symbol)})</span>
      </div>
    </button>
  `).join('');
  
  // Add click handlers
  dropdown.querySelectorAll('.currency-option').forEach(option => {
    option.addEventListener('click', () => {
      const currency = option.dataset.currency;
      selectCurrency(currency);
    });
  });
}

/**
 * Populate currency dropdown with fallback
 */
function populateCurrencyDropdownFallback() {
  const dropdown = document.getElementById('currencyDropdown');
  if (!dropdown) return;
  
  const fallbackCurrencies = getDefaultCurrencies();
  
  dropdown.innerHTML = fallbackCurrencies.slice(0, 5).map(currency => `
    <button 
      class="currency-option ${currency.code === selectedCurrency ? 'active' : ''}" 
      data-currency="${currency.code}"
      role="menuitem"
    >
      <div class="currency-option-label">
        <span class="currency-option-name">${escapeHtml(currency.name)}</span>
        <span class="currency-option-code">${escapeHtml(currency.code)}</span>
      </div>
    </button>
  `).join('');
}

/**
 * Setup currency selector button
 */
function setupCurrencySelector() {
  const currencyBtn = document.getElementById('currencyBtn');
  const currencyDropdown = document.getElementById('currencyDropdown');
  
  if (!currencyBtn) return;
  
  // Update button text
  updateCurrencyButton();
  
  // Toggle dropdown on click
  currencyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown('currencyDropdown');
    currencyBtn.setAttribute('aria-expanded', currencyDropdown?.classList.contains('active') ? 'true' : 'false');
  });
}

/**
 * Update currency button display
 */
function updateCurrencyButton() {
  const selectedCurrencyEl = document.getElementById('selectedCurrency');
  if (selectedCurrencyEl) {
    selectedCurrencyEl.textContent = selectedCurrency;
  }
}

/**
 * Select currency
 */
function selectCurrency(currencyCode) {
  selectedCurrency = currencyCode;
  
  // Save preference
  try {
    localStorage.setItem('selectedCurrency', currencyCode);
  } catch (error) {
    console.warn('Cannot save currency preference to localStorage');
  }
  
  // Update UI
  updateCurrencyButton();
  populateCurrencyDropdown();
  closeDropdown('currencyDropdown');
  
  // Show confirmation
  const currency = supportedCurrencies.find(c => c.code === currencyCode);
  showToast(`Currency changed to ${currency ? currency.name : currencyCode}`, 'success');
  
  // Trigger currency change event for other modules
  document.dispatchEvent(new CustomEvent('currencyChanged', { 
    detail: { currency: currencyCode } 
  }));
  
  console.log('💱 Currency selected:', currencyCode);
}

/**
 * Get current selected currency
 */
export function getCurrentCurrency() {
  return selectedCurrency;
}

/* ================================
   SOCIAL LINKS
   ================================ */

/**
 * Load social links from Firebase
 */
async function loadSocialLinks() {
  const socialContainer = document.getElementById('socialLinks');
  const footerSocialContainer = document.getElementById('footerSocial');
  
  if (!socialContainer && !footerSocialContainer) return;
  
  if (!isFirebaseInitialized()) {
    console.warn('Cannot load social links - Firebase not initialized');
    return;
  }
  
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    
    if (!settingsDoc.exists()) {
      showEmptyState(socialContainer, 'Social links not configured');
      return;
    }
    
    const settings = settingsDoc.data();
    const socialLinks = settings.socialLinks || {};
    
    renderSocialLinks(socialLinks);
    
    console.log('✅ Social links loaded');
  } catch (error) {
    console.error('Error loading social links:', error);
    if (socialContainer) {
      showError(socialContainer, 'Failed to load social links');
    }
  }
}

/**
 * Render social links
 */
function renderSocialLinks(socialLinks) {
  const socialContainer = document.getElementById('socialLinks');
  const footerSocialContainer = document.getElementById('footerSocial');
  const footerFollowLinks = document.getElementById('footerFollowLinks');
  
  const platforms = [
    { name: 'Facebook', icon: 'facebook', key: 'facebook' },
    { name: 'Instagram', icon: 'instagram', key: 'instagram' },
    { name: 'YouTube', icon: 'youtube', key: 'youtube' },
    { name: 'TikTok', icon: 'tiktok', key: 'tiktok' }
  ];
  
  const icons = {
    facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    tiktok: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
  };
  
  // Render in social section
  if (socialContainer) {
    const html = platforms
      .filter(platform => socialLinks[platform.key])
      .map(platform => `
        <a 
          href="${escapeHtml(socialLinks[platform.key])}" 
          class="social-link" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="${platform.name}"
        >
          ${icons[platform.icon]}
        </a>
      `).join('');
    
    socialContainer.innerHTML = html || '<p style="color: var(--color-text-tertiary);">No social links configured</p>';
  }
  
  // Render in footer social
  if (footerSocialContainer) {
    const html = platforms
      .filter(platform => socialLinks[platform.key])
      .map(platform => `
        <a 
          href="${escapeHtml(socialLinks[platform.key])}" 
          class="footer-social-link" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="${platform.name}"
        >
          ${icons[platform.icon]}
        </a>
      `).join('');
    
    footerSocialContainer.innerHTML = html;
  }
  
  // Update footer follow links
  if (footerFollowLinks) {
    const links = footerFollowLinks.querySelectorAll('a[data-social]');
    links.forEach(link => {
      const platform = link.dataset.social;
      if (socialLinks[platform]) {
        link.href = socialLinks[platform];
      } else {
        link.style.display = 'none';
      }
    });
  }
}

/* ================================
   NEWSLETTER
   ================================ */

/**
 * Initialize newsletter form
 */
function initializeNewsletterForm() {
  const newsletterForm = document.getElementById('newsletterForm');
  if (!newsletterForm) return;
  
  newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  console.log('✅ Newsletter form initialized');
}

/**
 * Handle newsletter form submission
 */
async function handleNewsletterSubmit(e) {
  e.preventDefault();
  
  const emailInput = document.getElementById('newsletterEmail');
  const submitBtn = document.getElementById('newsletterSubmitBtn');
  
  if (!emailInput || !submitBtn) return;
  
  const email = emailInput.value.trim();
  
  // Validate email
  if (!email || !isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    emailInput.focus();
    return;
  }
  
  if (!isFirebaseInitialized()) {
    showToast('Service unavailable. Please try again later.', 'error');
    return;
  }
  
  setButtonLoading(submitBtn, true);
  
  try {
    // Add to Firestore
    await addDoc(collection(db, 'newsletterSubscribers'), {
      email: email,
      subscribedAt: serverTimestamp(),
      source: 'homepage',
      active: true
    });
    
    showToast('✅ Successfully subscribed to newsletter!', 'success');
    emailInput.value = '';
    
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.code === 'permission-denied') {
      showToast('Subscription temporarily unavailable', 'error');
    } else {
      showToast('Failed to subscribe. Please try again.', 'error');
    }
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/* ================================
   FAVORITES BADGE
   ================================ */

/**
 * Update favorites badge count
 */
async function updateFavoritesBadge() {
  const badge = document.getElementById('favoritesBadge');
  if (!badge) return;
  
  if (!isAuthenticated()) {
    badge.textContent = '0';
    return;
  }
  
  // This will be properly implemented when favorites module is created
  // For now, show 0
  badge.textContent = '0';
}

/* ================================
   PAGE-SPECIFIC INITIALIZATION
   ================================ */

/**
 * Initialize page-specific features based on current page
 */
function initializePageSpecificFeatures() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  
  console.log(`📄 Current page: ${page}`);
  
  switch (page) {
    case 'index.html':
    case '':
      initializeHomePage();
      break;
    case 'shop.html':
      console.log('Shop page - will be initialized by products module');
      break;
    case 'product.html':
      console.log('Product page - will be initialized by products module');
      break;
    case 'favorites.html':
      console.log('Favorites page - will be initialized by favorites module');
      break;
    case 'account.html':
      console.log('Account page - will be initialized by auth module');
      break;
    case 'trending.html':
      console.log('Trending page - will be initialized by products module');
      break;
    case 'deals.html':
      console.log('Deals page - will be initialized by products module');
      break;
    case 'categories.html':
      console.log('Categories page - will be initialized by categories module');
      break;
    default:
      console.log('Unknown page');
  }
  
  // Update active navigation link
  updateActiveNavLink(page);
}

/**
 * Initialize homepage-specific features
 */
function initializeHomePage() {
  console.log('🏠 Initializing homepage features...');
  
  // Homepage-specific initialization will be completed
  // when products and categories modules are created
  
  // For now, show loading states in sections
  const sections = [
    { id: 'categoriesGrid', message: 'Loading categories...' },
    { id: 'trendingProductsGrid', message: 'Loading trending products...' },
    { id: 'trendingCollectionGrid', message: 'Loading collection...' },
    { id: 'dealCard', message: 'Loading deal...' }
  ];
  
  sections.forEach(section => {
    const element = document.getElementById(section.id);
    if (element) {
      showLoading(element, section.message);
    }
  });
  
  console.log('✅ Homepage initialization complete (waiting for data modules)');
}

/**
 * Update active navigation link
 */
function updateActiveNavLink(currentPage) {
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
    
    const href = link.getAttribute('href');
    if (!href) return;
    
    const linkPage = href.substring(href.lastIndexOf('/') + 1);
    
    if (linkPage === currentPage || 
        (currentPage === '' && linkPage === 'index.html') ||
        (currentPage === 'index.html' && linkPage === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ================================
   GLOBAL ERROR HANDLING
   ================================ */

/**
 * Setup global error handler
 */
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't show toast for every error, but log it
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't show toast for every rejection, but log it
});

/* ================================
   START APPLICATION
   ================================ */

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for use by other modules
export { selectedCurrency, appSettings };
