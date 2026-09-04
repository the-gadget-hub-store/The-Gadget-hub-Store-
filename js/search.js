/* ============================================================
   THE GADGET HUB STORE - SEARCH MODULE
   Search functionality with debouncing and suggestions
   ============================================================ */

import {
  searchProducts,
  sortProducts
} from './products.js';

import {
  searchCategories
} from './categories.js';

// ============================================================
// SEARCH STATE
// ============================================================

let searchHistory = [];
let searchSuggestions = [];
let recentSearches = [];
let popularSearches = [];
let searchCallbacks = [];
let debounceTimer = null;

const DEBOUNCE_DELAY = 300; // milliseconds
const MAX_RECENT_SEARCHES = 10;
const STORAGE_KEY_RECENT = 'recentSearches';
const STORAGE_KEY_POPULAR = 'popularSearches';

// ============================================================
// INITIALIZE SEARCH
// ============================================================

/**
 * Initialize search module
 */
export function initSearch() {
  // Load recent searches from localStorage
  loadRecentSearches();
  
  // Load popular searches from localStorage or Firebase
  loadPopularSearches();
  
  console.log('✅ Search module initialized');
}

// ============================================================
// SEARCH OPERATIONS
// ============================================================

/**
 * Search products with debouncing
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {Function} callback - Callback function
 */
export function searchWithDebounce(query, options = {}, callback) {
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer
  debounceTimer = setTimeout(async () => {
    const results = await performSearch(query, options);
    if (callback) {
      callback(results);
    }
    notifySearchCallbacks(query, results);
  }, DEBOUNCE_DELAY);
}

/**
 * Perform immediate search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function performSearch(query, options = {}) {
  try {
    const normalizedQuery = query.trim();

    // Empty query
    if (!normalizedQuery) {
      return {
        query: '',
        products: [],
        categories: [],
        totalResults: 0
      };
    }

    // Add to search history
    addToSearchHistory(normalizedQuery);

    // Search products
    const productResults = await searchProducts(normalizedQuery, options.filters || {});

    // Search categories if enabled
    let categoryResults = [];
    if (options.includeCategories !== false) {
      categoryResults = await searchCategories(normalizedQuery);
    }

    // Apply sorting if specified
    let sortedProducts = productResults;
    if (options.sortBy) {
      sortedProducts = sortProducts(productResults, options.sortBy);
    }

    // Apply limit if specified
    if (options.limit) {
      sortedProducts = sortedProducts.slice(0, options.limit);
    }

    const results = {
      query: normalizedQuery,
      products: sortedProducts,
      categories: categoryResults,
      totalResults: sortedProducts.length + categoryResults.length,
      productCount: sortedProducts.length,
      categoryCount: categoryResults.length
    };

    return results;
  } catch (error) {
    console.error('Error performing search:', error);
    return {
      query: query || '',
      products: [],
      categories: [],
      totalResults: 0,
      error: 'Search failed. Please try again.'
    };
  }
}

/**
 * Quick search (products only, no categories)
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Product results
 */
export async function quickSearch(query, filters = {}) {
  try {
    const normalizedQuery = query.trim();
    
    if (!normalizedQuery) {
      return [];
    }

    const products = await searchProducts(normalizedQuery, filters);
    return products;
  } catch (error) {
    console.error('Error in quick search:', error);
    return [];
  }
}

/**
 * Get search suggestions
 * @param {string} query - Partial search query
 * @param {number} limit - Maximum suggestions
 * @returns {Promise<Array>} Array of suggestions
 */
export async function getSearchSuggestions(query, limit = 5) {
  try {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery || normalizedQuery.length < 2) {
      return [];
    }

    // Get products matching query
    const products = await searchProducts(normalizedQuery, { limit: 10 });

    // Extract unique titles and partial matches
    const suggestions = new Set();

    products.forEach(product => {
      if (product.title) {
        const title = product.title.toLowerCase();
        
        // Add exact title if it starts with query
        if (title.startsWith(normalizedQuery)) {
          suggestions.add(product.title);
        }
        
        // Add individual words that match
        const words = product.title.split(' ');
        words.forEach(word => {
          if (word.toLowerCase().startsWith(normalizedQuery)) {
            suggestions.add(word);
          }
        });
      }

      // Add matching tags
      if (product.tags) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(normalizedQuery)) {
            suggestions.add(tag);
          }
        });
      }
    });

    // Convert to array and limit
    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

// ============================================================
// SEARCH HISTORY
// ============================================================

/**
 * Add query to search history
 * @param {string} query - Search query
 */
export function addToSearchHistory(query) {
  if (!query || query.trim() === '') return;

  const normalizedQuery = query.trim();

  // Remove if already exists
  searchHistory = searchHistory.filter(q => q !== normalizedQuery);

  // Add to beginning
  searchHistory.unshift(normalizedQuery);

  // Limit history size
  if (searchHistory.length > 50) {
    searchHistory = searchHistory.slice(0, 50);
  }
}

/**
 * Get search history
 * @param {number} limit - Maximum items
 * @returns {Array} Array of recent queries
 */
export function getSearchHistory(limit = 10) {
  return searchHistory.slice(0, limit);
}

/**
 * Clear search history
 */
export function clearSearchHistory() {
  searchHistory = [];
}

// ============================================================
// RECENT SEARCHES
// ============================================================

/**
 * Add to recent searches (persistent)
 * @param {string} query - Search query
 */
export function addToRecentSearches(query) {
  if (!query || query.trim() === '') return;

  const normalizedQuery = query.trim();

  // Remove if already exists
  recentSearches = recentSearches.filter(q => q !== normalizedQuery);

  // Add to beginning
  recentSearches.unshift(normalizedQuery);

  // Limit size
  if (recentSearches.length > MAX_RECENT_SEARCHES) {
    recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
  }

  // Save to localStorage
  saveRecentSearches();
}

/**
 * Get recent searches
 * @returns {Array} Array of recent searches
 */
export function getRecentSearches() {
  return [...recentSearches];
}

/**
 * Clear recent searches
 */
export function clearRecentSearches() {
  recentSearches = [];
  saveRecentSearches();
}

/**
 * Remove specific recent search
 * @param {string} query - Query to remove
 */
export function removeRecentSearch(query) {
  recentSearches = recentSearches.filter(q => q !== query);
  saveRecentSearches();
}

/**
 * Load recent searches from localStorage
 */
function loadRecentSearches() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT);
    if (stored) {
      recentSearches = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading recent searches:', error);
    recentSearches = [];
  }
}

/**
 * Save recent searches to localStorage
 */
function saveRecentSearches() {
  try {
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentSearches));
  } catch (error) {
    console.error('Error saving recent searches:', error);
  }
}

// ============================================================
// POPULAR SEARCHES
// ============================================================

/**
 * Get popular searches
 * @returns {Array} Array of popular searches
 */
export function getPopularSearches() {
  return [...popularSearches];
}

/**
 * Set popular searches
 * @param {Array} searches - Array of popular search terms
 */
export function setPopularSearches(searches) {
  popularSearches = searches;
  savePopularSearches();
}

/**
 * Load popular searches
 */
function loadPopularSearches() {
  try {
    // Try to load from localStorage first
    const stored = localStorage.getItem(STORAGE_KEY_POPULAR);
    if (stored) {
      popularSearches = JSON.parse(stored);
    } else {
      // Use default popular searches
      popularSearches = [
        'Wireless Earbuds',
        'Smart Watch',
        'Phone Case',
        'Power Bank',
        'Gaming Mouse',
        'USB Cable',
        'Screen Protector',
        'Bluetooth Speaker'
      ];
      savePopularSearches();
    }
  } catch (error) {
    console.error('Error loading popular searches:', error);
    popularSearches = [];
  }
}

/**
 * Save popular searches to localStorage
 */
function savePopularSearches() {
  try {
    localStorage.setItem(STORAGE_KEY_POPULAR, JSON.stringify(popularSearches));
  } catch (error) {
    console.error('Error saving popular searches:', error);
  }
}

// ============================================================
// SEARCH CALLBACKS
// ============================================================

/**
 * Subscribe to search events
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onSearch(callback) {
  searchCallbacks.push(callback);

  return () => {
    searchCallbacks = searchCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Notify all search callbacks
 * @param {string} query - Search query
 * @param {Object} results - Search results
 */
function notifySearchCallbacks(query, results) {
  searchCallbacks.forEach(callback => {
    try {
      callback(query, results);
    } catch (error) {
      console.error('Error in search callback:', error);
    }
  });
}

// ============================================================
// UI HELPER FUNCTIONS
// ============================================================

/**
 * Setup search input with debouncing
 * @param {HTMLElement} input - Search input element
 * @param {Function} callback - Callback for results
 * @param {Object} options - Search options
 */
export function setupSearchInput(input, callback, options = {}) {
  if (!input) {
    console.warn('Search input element not found');
    return;
  }

  // Remove existing listener
  if (input._searchInputHandler) {
    input.removeEventListener('input', input._searchInputHandler);
  }

  // Create and store handler
  input._searchInputHandler = (e) => {
    const query = e.target.value;
    searchWithDebounce(query, options, callback);
  };

  // Add listener
  input.addEventListener('input', input._searchInputHandler);

  // Handle form submission
  const form = input.closest('form');
  if (form) {
    // Remove existing listener
    if (form._searchSubmitHandler) {
      form.removeEventListener('submit', form._searchSubmitHandler);
    }

    form._searchSubmitHandler = async (e) => {
      e.preventDefault();
      const query = input.value.trim();
      
      if (query) {
        // Add to recent searches
        addToRecentSearches(query);
        
        // Perform immediate search
        const results = await performSearch(query, options);
        if (callback) {
          callback(results);
        }
      }
    };

    form.addEventListener('submit', form._searchSubmitHandler);
  }
}

/**
 * Setup search suggestions dropdown
 * @param {HTMLElement} input - Search input element
 * @param {HTMLElement} dropdown - Suggestions dropdown element
 */
export function setupSearchSuggestions(input, dropdown) {
  if (!input || !dropdown) {
    console.warn('Search input or dropdown element not found');
    return;
  }

  let suggestionsDebounce = null;

  // Remove existing listener
  if (input._suggestionsHandler) {
    input.removeEventListener('input', input._suggestionsHandler);
  }

  input._suggestionsHandler = (e) => {
    const query = e.target.value.trim();

    // Clear existing timer
    if (suggestionsDebounce) {
      clearTimeout(suggestionsDebounce);
    }

    if (query.length < 2) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      return;
    }

    // Set new timer
    suggestionsDebounce = setTimeout(async () => {
      const suggestions = await getSearchSuggestions(query, 5);
      renderSuggestions(suggestions, dropdown, input);
    }, 200);
  };

  input.addEventListener('input', input._suggestionsHandler);

  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Show suggestions on focus if there's a value
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && dropdown.children.length > 0) {
      dropdown.classList.add('active');
    }
  });
}

/**
 * Render search suggestions
 * @param {Array} suggestions - Array of suggestions
 * @param {HTMLElement} dropdown - Dropdown element
 * @param {HTMLElement} input - Input element
 */
function renderSuggestions(suggestions, dropdown, input) {
  if (!suggestions || suggestions.length === 0) {
    dropdown.innerHTML = '';
    dropdown.classList.remove('active');
    return;
  }

  dropdown.innerHTML = suggestions.map(suggestion => `
    <div class="suggestion-item" data-suggestion="${escapeHtml(suggestion)}">
      <i class="search-icon">🔍</i>
      <span>${escapeHtml(suggestion)}</span>
    </div>
  `).join('');

  dropdown.classList.add('active');

  // Add click handlers
  dropdown.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const suggestion = item.getAttribute('data-suggestion');
      input.value = suggestion;
      dropdown.classList.remove('active');
      
      // Trigger search
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
    });
  });
}

/**
 * Render recent searches
 * @param {HTMLElement} container - Container element
 * @param {Function} onSelect - Callback when search is selected
 */
export function renderRecentSearches(container, onSelect) {
  if (!container) return;

  const recent = getRecentSearches();

  if (recent.length === 0) {
    container.innerHTML = '<p class="text-muted">No recent searches</p>';
    return;
  }

  container.innerHTML = `
    <div class="recent-searches">
      <div class="recent-searches-header">
        <h6>Recent Searches</h6>
        <button class="btn-ghost btn-sm" data-clear-recent>Clear All</button>
      </div>
      <div class="recent-searches-list">
        ${recent.map(query => `
          <div class="recent-search-item">
            <button class="recent-search-btn" data-search="${escapeHtml(query)}">
              <i class="clock-icon">🕐</i>
              <span>${escapeHtml(query)}</span>
            </button>
            <button class="remove-search-btn" data-remove="${escapeHtml(query)}" aria-label="Remove">
              <i>✕</i>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Setup click handlers
  container.querySelectorAll('[data-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-search');
      if (onSelect) onSelect(query);
    });
  });

  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const query = btn.getAttribute('data-remove');
      removeRecentSearch(query);
      renderRecentSearches(container, onSelect);
    });
  });

  const clearBtn = container.querySelector('[data-clear-recent]');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearRecentSearches();
      renderRecentSearches(container, onSelect);
    });
  }
}

/**
 * Render popular searches
 * @param {HTMLElement} container - Container element
 * @param {Function} onSelect - Callback when search is selected
 */
export function renderPopularSearches(container, onSelect) {
  if (!container) return;

  const popular = getPopularSearches();

  if (popular.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="popular-searches">
      <h6>Popular Searches</h6>
      <div class="popular-searches-list">
        ${popular.map(query => `
          <button class="popular-search-tag" data-search="${escapeHtml(query)}">
            ${escapeHtml(query)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Setup click handlers
  container.querySelectorAll('[data-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-search');
      if (onSelect) onSelect(query);
    });
  });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Highlight query in text
 * @param {string} text - Text to highlight
 * @param {string} query - Query to highlight
 * @returns {string} HTML with highlighted text
 */
export function highlightQuery(text, query) {
  if (!text || !query) return escapeHtml(text || '');

  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return escapedText.replace(regex, '<mark>$1</mark>');
}

/**
 * Cancel pending search
 */
export function cancelSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize search on module load
initSearch();

// ============================================================
// EXPORTS
// ============================================================

export {
  initSearch,
  searchWithDebounce,
  performSearch,
  quickSearch,
  getSearchSuggestions,
  addToSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  addToRecentSearches,
  getRecentSearches,
  clearRecentSearches,
  removeRecentSearch,
  getPopularSearches,
  setPopularSearches,
  onSearch,
  setupSearchInput,
  setupSearchSuggestions,
  renderRecentSearches,
  renderPopularSearches,
  highlightQuery,
  cancelSearch
};

console.log('✅ Search module loaded successfully');
