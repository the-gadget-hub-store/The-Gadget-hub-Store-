/* ================================
   THE GADGET HUB STORE
   Search Module
   ================================ */

/**
 * Search Module
 * 
 * Handles:
 * - Product search functionality
 * - Search suggestions
 * - Recent searches
 * - Popular searches
 * - Search results rendering
 * - Debounced search input
 */

import {
  isFirebaseInitialized,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from './firebase.js';

import {
  showLoading,
  showEmptyState,
  escapeHtml,
  debounce
} from './ui.js';

import { 
  loadProducts,
  renderProductCard,
  getCurrentCurrency
} from './products.js';

/* ================================
   CONFIGURATION
   ================================ */

const RECENT_SEARCHES_KEY = 'gadget-hub-recent-searches';
const MAX_RECENT_SEARCHES = 5;
const SEARCH_DEBOUNCE_DELAY = 300; // milliseconds

/* ================================
   SEARCH FUNCTIONALITY
   ================================ */

/**
 * Search products
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching products
 */
export async function searchProducts(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }
  
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }
  
  const term = searchTerm.trim().toLowerCase();
  
  try {
    // Load all products (Firestore doesn't support full-text search natively)
    // In production, you would use a search service like Algolia or Elastic
    const allProducts = await loadProducts();
    
    // Filter products client-side
    const results = allProducts.filter(product => {
      // Search in title
      if (product.title && product.title.toLowerCase().includes(term)) {
        return true;
      }
      
      // Search in description
      if (product.description && product.description.toLowerCase().includes(term)) {
        return true;
      }
      
      // Search in short description
      if (product.shortDescription && product.shortDescription.toLowerCase().includes(term)) {
        return true;
      }
      
      // Search in category
      if (product.category && product.category.toLowerCase().includes(term)) {
        return true;
      }
      
      // Search in tags
      if (product.tags && Array.isArray(product.tags)) {
        const tagMatch = product.tags.some(tag => 
          tag.toLowerCase().includes(term)
        );
        if (tagMatch) return true;
      }
      
      // Search in keywords if available
      if (product.keywords && Array.isArray(product.keywords)) {
        const keywordMatch = product.keywords.some(keyword => 
          keyword.toLowerCase().includes(term)
        );
        if (keywordMatch) return true;
      }
      
      return false;
    });
    
    console.log(`🔍 Search for "${searchTerm}" returned ${results.length} results`);
    return results;
    
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

/**
 * Search products with normalized terms for better matching
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Filtered and sorted products
 */
export async function searchProductsEnhanced(searchTerm) {
  const results = await searchProducts(searchTerm);
  
  // Sort results by relevance
  const term = searchTerm.trim().toLowerCase();
  
  results.sort((a, b) => {
    // Exact title match gets highest priority
    const aTitleExact = a.title && a.title.toLowerCase() === term;
    const bTitleExact = b.title && b.title.toLowerCase() === term;
    if (aTitleExact && !bTitleExact) return -1;
    if (!aTitleExact && bTitleExact) return 1;
    
    // Title starts with term
    const aTitleStarts = a.title && a.title.toLowerCase().startsWith(term);
    const bTitleStarts = b.title && b.title.toLowerCase().startsWith(term);
    if (aTitleStarts && !bTitleStarts) return -1;
    if (!aTitleStarts && bTitleStarts) return 1;
    
    // Featured products get priority
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    
    // Higher rating gets priority
    const aRating = a.rating || 0;
    const bRating = b.rating || 0;
    if (aRating !== bRating) return bRating - aRating;
    
    return 0;
  });
  
  return results;
}

/* ================================
   RECENT SEARCHES
   ================================ */

/**
 * Save search term to recent searches
 * @param {string} searchTerm - Search term to save
 */
export function saveRecentSearch(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return;
  }
  
  try {
    const term = searchTerm.trim();
    let recentSearches = getRecentSearches();
    
    // Remove if already exists
    recentSearches = recentSearches.filter(s => s !== term);
    
    // Add to beginning
    recentSearches.unshift(term);
    
    // Limit to max
    recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
    
    // Save to localStorage
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    
  } catch (error) {
    console.warn('Cannot save recent search to localStorage:', error);
  }
}

/**
 * Get recent searches from localStorage
 * @returns {Array<string>} Array of recent search terms
 */
export function getRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    
    const searches = JSON.parse(stored);
    return Array.isArray(searches) ? searches : [];
    
  } catch (error) {
    console.warn('Cannot read recent searches from localStorage:', error);
    return [];
  }
}

/**
 * Clear recent searches
 */
export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    console.log('✅ Recent searches cleared');
  } catch (error) {
    console.warn('Cannot clear recent searches:', error);
  }
}

/* ================================
   POPULAR SEARCHES
   ================================ */

/**
 * Load popular searches from Firebase settings
 * @returns {Promise<Array<string>>} Array of popular search terms
 */
export async function loadPopularSearches() {
  if (!isFirebaseInitialized()) {
    return getDefaultPopularSearches();
  }
  
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      if (settings.popularSearches && Array.isArray(settings.popularSearches)) {
        return settings.popularSearches;
      }
    }
    
    return getDefaultPopularSearches();
    
  } catch (error) {
    console.error('Error loading popular searches:', error);
    return getDefaultPopularSearches();
  }
}

/**
 * Get default popular searches
 * @returns {Array<string>} Default popular search terms
 */
function getDefaultPopularSearches() {
  return [
    'wireless earbuds',
    'smart watch',
    'gaming mouse',
    'phone case',
    'power bank',
    'bluetooth speaker',
    'fitness tracker',
    'laptop stand'
  ];
}

/* ================================
   SEARCH UI
   ================================ */

/**
 * Render search results
 * @param {Array} products - Search results
 * @param {string} containerId - Container element ID
 * @param {string} searchTerm - Search term used
 */
export function renderSearchResults(products, containerId, searchTerm) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }
  
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="search-empty-state" style="padding: var(--spacing-xl); text-align: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-text-muted); margin: 0 auto var(--spacing-md);">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--spacing-sm);">
          No results found for "${escapeHtml(searchTerm)}"
        </p>
        <p style="color: var(--color-text-muted); font-size: 0.875rem;">
          Try different keywords or browse categories
        </p>
      </div>
    `;
    return;
  }
  
  // Render result count
  const resultCount = `
    <div class="search-result-count" style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border); color: var(--color-text-tertiary); font-size: 0.875rem;">
      Found ${products.length} ${products.length === 1 ? 'result' : 'results'} for "${escapeHtml(searchTerm)}"
    </div>
  `;
  
  // Render product cards in a compact list format
  const productsHtml = products.slice(0, 10).map(product => renderSearchResultItem(product)).join('');
  
  container.innerHTML = resultCount + `
    <div class="search-results-list" style="max-height: 400px; overflow-y: auto;">
      ${productsHtml}
    </div>
  `;
  
  console.log(`✅ Rendered ${products.length} search results`);
}

/**
 * Render single search result item (compact format)
 * @param {Object} product - Product object
 * @returns {string} HTML for search result item
 */
function renderSearchResultItem(product) {
  const imageUrl = product.thumbnail || (product.images && product.images[0]) || '/assets/images/placeholder.jpg';
  const currency = getCurrentCurrency();
  
  // Import price formatting from products module
  const basePrice = product.basePrice || product.price || 0;
  
  // Simple price formatting for search results
  let priceDisplay = `${currency} ${basePrice.toFixed(2)}`;
  
  return `
    <a 
      href="pages/product.html?id=${encodeURIComponent(product.id)}" 
      class="search-result-item"
      style="display: flex; gap: var(--spacing-md); padding: var(--spacing-md); border-bottom: 1px solid var(--color-border); text-decoration: none; color: inherit; transition: background var(--transition-fast);"
      onmouseover="this.style.background='var(--color-bg-elevated)'"
      onmouseout="this.style.background='transparent'"
    >
      <div style="flex-shrink: 0; width: 60px; height: 60px; border-radius: var(--radius-md); overflow: hidden; background: var(--color-bg-secondary);">
        <img 
          src="${escapeHtml(imageUrl)}" 
          alt="${escapeHtml(product.title || 'Product')}"
          style="width: 100%; height: 100%; object-fit: cover;"
        >
      </div>
      <div style="flex: 1; min-width: 0;">
        <h4 style="font-size: 0.9375rem; font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-xs); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(product.title || 'Untitled Product')}
        </h4>
        <p style="font-size: 0.8125rem; color: var(--color-text-tertiary); margin-bottom: var(--spacing-xs);">
          ${escapeHtml(product.category || 'Gadgets')}
        </p>
        <p style="font-size: 0.875rem; font-weight: var(--font-weight-semibold); color: var(--color-accent);">
          ${priceDisplay}
        </p>
      </div>
    </a>
  `;
}

/**
 * Render search suggestions (recent and popular searches)
 * @param {string} containerId - Container element ID
 */
export async function renderSearchSuggestions(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }
  
  const recentSearches = getRecentSearches();
  const popularSearches = await loadPopularSearches();
  
  let html = '';
  
  // Recent searches
  if (recentSearches.length > 0) {
    html += `
      <div class="search-suggestions-section" style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
          <h4 style="font-size: 0.8125rem; font-weight: var(--font-weight-semibold); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px;">
            Recent Searches
          </h4>
          <button 
            id="clearRecentSearches" 
            style="font-size: 0.75rem; color: var(--color-text-muted); background: none; border: none; cursor: pointer; padding: 0;"
            onmouseover="this.style.color='var(--color-accent)'"
            onmouseout="this.style.color='var(--color-text-muted)'"
          >
            Clear
          </button>
        </div>
        <div class="search-suggestions-list">
          ${recentSearches.map(term => `
            <button 
              class="search-suggestion-item" 
              data-search-term="${escapeHtml(term)}"
              style="display: flex; align-items: center; gap: var(--spacing-sm); width: 100%; padding: var(--spacing-sm); background: none; border: none; border-radius: var(--radius-md); color: var(--color-text-secondary); cursor: pointer; text-align: left; font-size: 0.875rem; transition: background var(--transition-fast);"
              onmouseover="this.style.background='var(--color-bg-elevated)'"
              onmouseout="this.style.background='transparent'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${escapeHtml(term)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Popular searches
  if (popularSearches.length > 0) {
    html += `
      <div class="search-suggestions-section" style="padding: var(--spacing-md);">
        <h4 style="font-size: 0.8125rem; font-weight: var(--font-weight-semibold); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
          Popular Searches
        </h4>
        <div class="search-suggestions-list">
          ${popularSearches.map(term => `
            <button 
              class="search-suggestion-item" 
              data-search-term="${escapeHtml(term)}"
              style="display: flex; align-items: center; gap: var(--spacing-sm); width: 100%; padding: var(--spacing-sm); background: none; border: none; border-radius: var(--radius-md); color: var(--color-text-secondary); cursor: pointer; text-align: left; font-size: 0.875rem; transition: background var(--transition-fast);"
              onmouseover="this.style.background='var(--color-bg-elevated)'"
              onmouseout="this.style.background='transparent'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
              ${escapeHtml(term)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html || `
    <div style="padding: var(--spacing-xl); text-align: center; color: var(--color-text-muted);">
      <p>Start typing to search for products...</p>
    </div>
  `;
  
  // Setup suggestion click handlers
  setupSuggestionHandlers(container);
}

/**
 * Setup search suggestion click handlers
 * @param {HTMLElement} container - Container element
 */
function setupSuggestionHandlers(container) {
  // Suggestion item clicks
  const suggestionItems = container.querySelectorAll('.search-suggestion-item');
  suggestionItems.forEach(item => {
    item.addEventListener('click', () => {
      const searchTerm = item.dataset.searchTerm;
      if (searchTerm) {
        performSearch(searchTerm);
      }
    });
  });
  
  // Clear recent searches button
  const clearBtn = container.querySelector('#clearRecentSearches');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearRecentSearches();
      renderSearchSuggestions('searchResults');
    });
  }
}

/* ================================
   SEARCH INITIALIZATION
   ================================ */

/**
 * Perform search
 * @param {string} searchTerm - Search term
 */
async function performSearch(searchTerm) {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  
  if (!searchResults) return;
  
  // Update input if exists
  if (searchInput) {
    searchInput.value = searchTerm;
  }
  
  // Show loading
  showLoading(searchResults, 'Searching...');
  
  try {
    // Perform search
    const results = await searchProductsEnhanced(searchTerm);
    
    // Save to recent searches
    saveRecentSearch(searchTerm);
    
    // Render results
    renderSearchResults(results, 'searchResults', searchTerm);
    
  } catch (error) {
    console.error('Search error:', error);
    searchResults.innerHTML = `
      <div style="padding: var(--spacing-xl); text-align: center; color: var(--color-error);">
        <p>Search failed. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Initialize search functionality
 */
export function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  
  if (!searchInput || !searchResults) {
    console.warn('Search elements not found');
    return;
  }
  
  // Show initial suggestions
  renderSearchSuggestions('searchResults');
  
  // Debounced search on input
  const debouncedSearch = debounce(async (searchTerm) => {
    if (searchTerm.trim().length === 0) {
      renderSearchSuggestions('searchResults');
      return;
    }
    
    if (searchTerm.trim().length < 2) {
      // Too short, don't search yet
      return;
    }
    
    performSearch(searchTerm);
  }, SEARCH_DEBOUNCE_DELAY);
  
  // Input event listener
  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
  
  // Enter key to search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const searchTerm = searchInput.value.trim();
      if (searchTerm.length > 0) {
        performSearch(searchTerm);
      }
    }
  });
  
  // Clear input when modal opens
  const searchModal = document.getElementById('searchModal');
  if (searchModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (searchModal.classList.contains('active')) {
            searchInput.value = '';
            renderSearchSuggestions('searchResults');
          }
        }
      });
    });
    
    observer.observe(searchModal, { attributes: true });
  }
  
  console.log('✅ Search functionality initialized');
}

/* ================================
   AUTO-INITIALIZATION
   ================================ */

// Initialize search when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
  initializeSearch();
}

console.log('📦 Search module loaded');
