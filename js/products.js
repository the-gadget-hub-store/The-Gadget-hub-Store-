/* ================================
   THE GADGET HUB STORE
   Products Module
   ================================ */

/**
 * Products Module
 * 
 * Handles:
 * - Loading products from Firestore
 * - Rendering product cards
 * - Product filtering and sorting
 * - Currency conversion
 * - Favorites management
 * - Product details
 */

import {
  isFirebaseInitialized,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  isAuthenticated,
  getCurrentUser,
  getUserId,
  Timestamp
} from './firebase.js';

import {
  showToast,
  showLoading,
  showEmptyState,
  showError,
  escapeHtml
} from './ui.js';

import { getCurrentCurrency } from './app.js';

/* ================================
   CURRENCY CONVERSION
   ================================ */

// Exchange rates (would be loaded from Firebase settings or external API in production)
// For now, using approximate rates as reference
const EXCHANGE_RATES = {
  'USD': 1.0,
  'GBP': 0.79,
  'EUR': 0.92,
  'CAD': 1.36,
  'AUD': 1.52,
  'CNY': 7.24,
  'JPY': 149.50,
  'KRW': 1320.00,
  'INR': 83.12,
  'PKR': 278.50,
  'BDT': 109.75,
  'NPR': 132.95,
  'AED': 3.67,
  'SAR': 3.75,
  'TRY': 32.15,
  'MYR': 4.72,
  'IDR': 15625.00,
  'SGD': 1.34,
  'THB': 35.80,
  'ZAR': 18.65
};

/**
 * Convert price to selected currency
 * @param {number} basePrice - Price in base currency (USD)
 * @param {string} targetCurrency - Target currency code
 * @returns {number} Converted price
 */
function convertCurrency(basePrice, targetCurrency = 'USD') {
  if (!basePrice) return 0;
  
  const rate = EXCHANGE_RATES[targetCurrency] || 1.0;
  return basePrice * rate;
}

/**
 * Format price in selected currency
 * @param {number} price - Price to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted price string
 */
function formatPrice(price, currency = 'USD') {
  try {
    // Special handling for zero-decimal currencies
    const zeroDecimalCurrencies = ['JPY', 'KRW'];
    const minimumFractionDigits = zeroDecimalCurrencies.includes(currency) ? 0 : 2;
    const maximumFractionDigits = zeroDecimalCurrencies.includes(currency) ? 0 : 2;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(price);
  } catch (error) {
    console.error('Error formatting price:', error);
    return `${currency} ${price.toFixed(2)}`;
  }
}

/**
 * Get converted and formatted price
 * @param {number} basePrice - Base price in USD
 * @param {string} targetCurrency - Target currency
 * @returns {string} Formatted converted price
 */
export function getFormattedPrice(basePrice, targetCurrency = null) {
  const currency = targetCurrency || getCurrentCurrency();
  const convertedPrice = convertCurrency(basePrice, currency);
  return formatPrice(convertedPrice, currency);
}

/* ================================
   PRODUCT LOADING
   ================================ */

/**
 * Load all products from Firestore
 * @returns {Promise<Array>} Array of product objects
 */
export async function loadProducts() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const productsCollection = collection(db, 'products');
    const querySnapshot = await getDocs(productsCollection);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Loaded ${products.length} products`);
    return products;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}

/**
 * Load products with specific filter
 * @param {string} field - Field to filter by
 * @param {any} value - Value to match
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Filtered products
 */
export async function loadProductsByFilter(field, value, maxResults = 50) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const productsCollection = collection(db, 'products');
    const q = query(
      productsCollection,
      where(field, '==', value),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Loaded ${products.length} products with ${field}=${value}`);
    return products;
  } catch (error) {
    console.error('Error loading filtered products:', error);
    throw error;
  }
}

/**
 * Load trending products
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Trending products
 */
export async function loadTrendingProducts(maxResults = 8) {
  try {
    return await loadProductsByFilter('trending', true, maxResults);
  } catch (error) {
    console.error('Error loading trending products:', error);
    return [];
  }
}

/**
 * Load featured products
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Featured products
 */
export async function loadFeaturedProducts(maxResults = 8) {
  try {
    return await loadProductsByFilter('featured', true, maxResults);
  } catch (error) {
    console.error('Error loading featured products:', error);
    return [];
  }
}

/**
 * Load products by category
 * @param {string} categoryId - Category ID
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Products in category
 */
export async function loadProductsByCategory(categoryId, maxResults = 50) {
  try {
    return await loadProductsByFilter('categoryId', categoryId, maxResults);
  } catch (error) {
    console.error('Error loading products by category:', error);
    return [];
  }
}

/**
 * Load single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product object
 */
export async function loadProductById(productId) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    
    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }
    
    return {
      id: productDoc.id,
      ...productDoc.data()
    };
  } catch (error) {
    console.error('Error loading product:', error);
    throw error;
  }
}

/**
 * Load deal products (products with active deals)
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Deal products
 */
export async function loadDealProducts(maxResults = 8) {
  if (!isFirebaseInitialized()) {
    return [];
  }
  
  try {
    const productsCollection = collection(db, 'products');
    const q = query(
      productsCollection,
      where('discount', '>', 0),
      orderBy('discount', 'desc'),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(q);
    
    const products = [];
    const now = new Date();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Check if deal is still valid
      let isValidDeal = true;
      if (data.dealExpiration) {
        const expirationDate = data.dealExpiration.toDate ? data.dealExpiration.toDate() : new Date(data.dealExpiration);
        isValidDeal = expirationDate > now;
      }
      
      if (isValidDeal) {
        products.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    console.log(`✅ Loaded ${products.length} deal products`);
    return products;
  } catch (error) {
    console.error('Error loading deal products:', error);
    return [];
  }
}

/* ================================
   PRODUCT RENDERING
   ================================ */

/**
 * Render product card
 * @param {Object} product - Product object
 * @param {string} currency - Currency code
 * @returns {string} HTML string for product card
 */
export function renderProductCard(product, currency = null) {
  const selectedCurrency = currency || getCurrentCurrency();
  
  // Calculate prices
  const basePrice = product.basePrice || product.price || 0;
  const originalPrice = product.originalPrice || basePrice;
  const discount = product.discount || 0;
  
  const currentPrice = convertCurrency(basePrice, selectedCurrency);
  const originalPriceConverted = convertCurrency(originalPrice, selectedCurrency);
  
  const formattedCurrentPrice = formatPrice(currentPrice, selectedCurrency);
  const formattedOriginalPrice = formatPrice(originalPriceConverted, selectedCurrency);
  
  // Product image
  const imageUrl = product.thumbnail || (product.images && product.images[0]) || '/assets/images/placeholder.jpg';
  
  // Rating stars
  const rating = product.rating || 0;
  const stars = renderStars(rating);
  
  // Badges
  let badge = '';
  if (product.featured) {
    badge = '<span class="product-badge">Featured</span>';
  } else if (product.trending) {
    badge = '<span class="product-badge trending">Trending</span>';
  } else if (product.bestseller) {
    badge = '<span class="product-badge bestseller">Bestseller</span>';
  } else if (product.newArrival) {
    badge = '<span class="product-badge new">New</span>';
  }
  
  // Check if favorited
  const isFavorited = false; // Will be updated when favorites are loaded
  
  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-image-container">
        <img 
          src="${escapeHtml(imageUrl)}" 
          alt="${escapeHtml(product.title || 'Product')}" 
          class="product-image"
          loading="lazy"
        >
        ${badge}
        <button 
          class="product-favorite ${isFavorited ? 'active' : ''}" 
          data-product-id="${product.id}"
          aria-label="Add to favorites"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="product-content">
        <p class="product-category">${escapeHtml(product.category || 'Gadgets')}</p>
        <h3 class="product-title">${escapeHtml(product.title || 'Untitled Product')}</h3>
        <div class="product-rating">
          <div class="product-stars">${stars}</div>
          <span class="product-review-count">(${product.reviewCount || 0})</span>
        </div>
        <div class="product-price">
          <span class="product-price-current">${formattedCurrentPrice}</span>
          ${discount > 0 ? `
            <span class="product-price-original">${formattedOriginalPrice}</span>
            <span class="product-discount">-${discount}%</span>
          ` : ''}
        </div>
        <div class="product-actions">
          ${product.affiliateUrl ? `
            <a 
              href="${escapeHtml(product.affiliateUrl)}" 
              class="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shop on AliExpress
            </a>
          ` : `
            <button class="btn btn-outline" disabled>
              Unavailable
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render star rating
 * @param {number} rating - Rating value (0-5)
 * @returns {string} HTML for stars
 */
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let html = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    html += `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`;
  }
  
  // Half star
  if (hasHalfStar) {
    html += `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="opacity: 0.5;">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`;
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    html += `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3;">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`;
  }
  
  return html;
}

/**
 * Render products grid
 * @param {Array} products - Array of products
 * @param {string} containerId - Container element ID
 * @param {string} currency - Currency code
 */
export function renderProductsGrid(products, containerId, currency = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }
  
  if (!products || products.length === 0) {
    showEmptyState(container, 'No products found');
    return;
  }
  
  const html = products.map(product => renderProductCard(product, currency)).join('');
  container.innerHTML = html;
  
  // Setup favorite buttons
  setupFavoriteButtons(container);
  
  console.log(`✅ Rendered ${products.length} products in ${containerId}`);
}

/* ================================
   FAVORITES
   ================================ */

/**
 * Setup favorite button handlers
 * @param {HTMLElement} container - Container element
 */
function setupFavoriteButtons(container) {
  const favoriteButtons = container.querySelectorAll('.product-favorite');
  
  favoriteButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const productId = button.dataset.productId;
      await toggleFavorite(productId, button);
    });
  });
}

/**
 * Toggle favorite status
 * @param {string} productId - Product ID
 * @param {HTMLElement} button - Favorite button element
 */
async function toggleFavorite(productId, button) {
  if (!isAuthenticated()) {
    showToast('Please sign in to add favorites', 'warning');
    // Could redirect to account page
    return;
  }
  
  if (!isFirebaseInitialized()) {
    showToast('Service unavailable', 'error');
    return;
  }
  
  const userId = getUserId();
  const isActive = button.classList.contains('active');
  
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', productId);
    
    if (isActive) {
      // Remove from favorites
      await deleteDoc(favoriteRef);
      button.classList.remove('active');
      showToast('Removed from favorites', 'success');
    } else {
      // Add to favorites
      await setDoc(favoriteRef, {
        productId: productId,
        addedAt: Timestamp.now()
      });
      button.classList.add('active');
      showToast('Added to favorites', 'success');
    }
    
    // Update favorites badge
    updateFavoritesBadge();
    
  } catch (error) {
    console.error('Error toggling favorite:', error);
    showToast('Failed to update favorites', 'error');
  }
}

/**
 * Load user favorites
 * @returns {Promise<Array>} Array of favorited product IDs
 */
export async function loadUserFavorites() {
  if (!isAuthenticated() || !isFirebaseInitialized()) {
    return [];
  }
  
  const userId = getUserId();
  
  try {
    const favoritesCollection = collection(db, 'users', userId, 'favorites');
    const querySnapshot = await getDocs(favoritesCollection);
    
    const favorites = [];
    querySnapshot.forEach((doc) => {
      favorites.push(doc.id); // Document ID is the product ID
    });
    
    console.log(`✅ Loaded ${favorites.length} favorites`);
    return favorites;
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
}

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
  
  try {
    const favorites = await loadUserFavorites();
    badge.textContent = favorites.length.toString();
  } catch (error) {
    console.error('Error updating favorites badge:', error);
    badge.textContent = '0';
  }
}

/* ================================
   HOMEPAGE INITIALIZATION
   ================================ */

/**
 * Initialize homepage products
 */
export async function initializeHomepageProducts() {
  console.log('🏠 Initializing homepage products...');
  
  // Load trending products
  const trendingContainer = document.getElementById('trendingProductsGrid');
  if (trendingContainer) {
    showLoading(trendingContainer, 'Loading trending products...');
    
    try {
      const trendingProducts = await loadTrendingProducts(8);
      renderProductsGrid(trendingProducts, 'trendingProductsGrid');
    } catch (error) {
      console.error('Error loading trending products:', error);
      showError(trendingContainer, 'Failed to load trending products');
    }
  }
  
  // Load trending collection
  const collectionContainer = document.getElementById('trendingCollectionGrid');
  if (collectionContainer) {
    showLoading(collectionContainer, 'Loading collection...');
    
    try {
      const featuredProducts = await loadFeaturedProducts(8);
      renderProductsGrid(featuredProducts, 'trendingCollectionGrid');
    } catch (error) {
      console.error('Error loading collection:', error);
      showError(collectionContainer, 'Failed to load collection');
    }
  }
  
  // Load featured deal
  await initializeFeaturedDeal();
  
  console.log('✅ Homepage products initialized');
}

/**
 * Initialize featured deal section
 */
async function initializeFeaturedDeal() {
  const dealContainer = document.getElementById('dealCard');
  if (!dealContainer) return;
  
  showLoading(dealContainer, 'Loading featured deal...');
  
  try {
    const dealProducts = await loadDealProducts(1);
    
    if (dealProducts.length === 0) {
      showEmptyState(dealContainer, 'No active deals at the moment');
      return;
    }
    
    const deal = dealProducts[0];
    renderFeaturedDeal(deal, dealContainer);
    
  } catch (error) {
    console.error('Error loading featured deal:', error);
    showError(dealContainer, 'Failed to load deal');
  }
}

/**
 * Render featured deal
 * @param {Object} product - Deal product
 * @param {HTMLElement} container - Container element
 */
function renderFeaturedDeal(product, container) {
  const currency = getCurrentCurrency();
  const basePrice = product.basePrice || product.price || 0;
  const originalPrice = product.originalPrice || basePrice;
  
  const currentPrice = convertCurrency(basePrice, currency);
  const originalPriceConverted = convertCurrency(originalPrice, currency);
  
  const formattedCurrentPrice = formatPrice(currentPrice, currency);
  const formattedOriginalPrice = formatPrice(originalPriceConverted, currency);
  
  const imageUrl = product.thumbnail || (product.images && product.images[0]) || '/assets/images/placeholder.jpg';
  
  // Calculate time remaining if dealExpiration exists
  let countdownHtml = '';
  if (product.dealExpiration) {
    const expirationDate = product.dealExpiration.toDate ? product.dealExpiration.toDate() : new Date(product.dealExpiration);
    countdownHtml = renderCountdown(expirationDate);
  }
  
  container.innerHTML = `
    <div class="deal-content">
      <h3>Limited Time Deal!</h3>
      <p class="deal-title">${escapeHtml(product.title)}</p>
      ${countdownHtml}
      <div class="deal-price">
        <span class="deal-price-current">${formattedCurrentPrice}</span>
        <span class="deal-price-original">${formattedOriginalPrice}</span>
        <span class="deal-discount">Save ${product.discount}%</span>
      </div>
      ${product.affiliateUrl ? `
        <a 
          href="${escapeHtml(product.affiliateUrl)}" 
          class="btn btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get This Deal
        </a>
      ` : ''}
    </div>
    <div class="deal-image">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.title)}" loading="lazy">
    </div>
  `;
  
  // Start countdown timer if exists
  if (product.dealExpiration) {
    startCountdown(expirationDate, container);
  }
}

/**
 * Render countdown timer
 * @param {Date} expirationDate - Expiration date
 * @returns {string} HTML for countdown
 */
function renderCountdown(expirationDate) {
  return `
    <div class="deal-timer" id="dealTimer">
      <div class="timer-unit">
        <span class="timer-value" data-unit="days">00</span>
        <span class="timer-label">Days</span>
      </div>
      <div class="timer-unit">
        <span class="timer-value" data-unit="hours">00</span>
        <span class="timer-label">Hours</span>
      </div>
      <div class="timer-unit">
        <span class="timer-value" data-unit="minutes">00</span>
        <span class="timer-label">Minutes</span>
      </div>
      <div class="timer-unit">
        <span class="timer-value" data-unit="seconds">00</span>
        <span class="timer-label">Seconds</span>
      </div>
    </div>
  `;
}

/**
 * Start countdown timer
 * @param {Date} expirationDate - Expiration date
 * @param {HTMLElement} container - Container element
 */
function startCountdown(expirationDate, container) {
  function updateCountdown() {
    const now = new Date();
    const diff = expirationDate - now;
    
    if (diff <= 0) {
      // Deal expired
      const timer = container.querySelector('#dealTimer');
      if (timer) {
        timer.innerHTML = '<p style="color: var(--color-error);">Deal Expired</p>';
      }
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const daysEl = container.querySelector('[data-unit="days"]');
    const hoursEl = container.querySelector('[data-unit="hours"]');
    const minutesEl = container.querySelector('[data-unit="minutes"]');
    const secondsEl = container.querySelector('[data-unit="seconds"]');
    
    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    
    setTimeout(updateCountdown, 1000);
  }
  
  updateCountdown();
}

/* ================================
   CURRENCY CHANGE LISTENER
   ================================ */

// Listen for currency changes and update prices
document.addEventListener('currencyChanged', (e) => {
  console.log('💱 Currency changed, updating product prices...');
  
  // Re-render all visible product grids
  // This is a simplified approach - in production, you might want to
  // just update the price elements without full re-render
  const containers = ['trendingProductsGrid', 'trendingCollectionGrid'];
  
  containers.forEach(async (containerId) => {
    const container = document.getElementById(containerId);
    if (container && container.children.length > 0) {
      // For now, we'll need to reload and re-render
      // A more efficient approach would be to store products in memory
      // and just update price displays
    }
  });
});

/* ================================
   AUTO-INITIALIZATION
   ================================ */

// Initialize homepage products if on homepage
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    
    if (page === 'index.html' || page === '') {
      initializeHomepageProducts();
    }
  });
} else {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  
  if (page === 'index.html' || page === '') {
    initializeHomepageProducts();
  }
}

console.log('📦 Products module loaded');
