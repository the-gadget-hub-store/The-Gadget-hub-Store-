import { getState } from './state.js';
import { searchProducts } from './products.js';
import { debounce } from './ui.js';

let searchOverlay = null;
let searchInput = null;
let searchResults = null;

/**
 * Initialize search
 */
export function initSearch() {
  createSearchOverlay();
  setupSearchTriggers();
}

/**
 * Create search overlay
 */
function createSearchOverlay() {
  searchOverlay = document.createElement('div');
  searchOverlay.className = 'search-overlay';
  searchOverlay.innerHTML = `
    <div class="search-container">
      <div class="search-header">
        <input 
          type="text" 
          class="search-input" 
          placeholder="Search for gadgets, accessories..." 
          autocomplete="off"
        />
        <button class="search-close">✕</button>
      </div>
      <div class="search-body">
        <div class="search-results"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(searchOverlay);
  
  searchInput = searchOverlay.querySelector('.search-input');
  searchResults = searchOverlay.querySelector('.search-results');
  const closeBtn = searchOverlay.querySelector('.search-close');
  
  // Event listeners
  searchInput.addEventListener('input', debounce(handleSearch, 300));
  closeBtn.addEventListener('click', closeSearch);
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });
  
  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });
}

/**
 * Setup search triggers
 */
function setupSearchTriggers() {
  const searchButtons = document.querySelectorAll('.search-btn, .search-trigger');
  searchButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  });
}

/**
 * Open search
 */
export function openSearch() {
  searchOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => searchInput.focus(), 100);
}

/**
 * Close search
 */
export function closeSearch() {
  searchOverlay.classList.remove('active');
  document.body.style.overflow = '';
  searchInput.value = '';
  searchResults.innerHTML = '';
}

/**
 * Handle search
 */
function handleSearch(e) {
  const searchTerm = e.target.value.trim();
  
  if (!searchTerm) {
    searchResults.innerHTML = `
      <div class="search-empty">
        <p>Start typing to search for products...</p>
      </div>
    `;
    return;
  }
  
  const results = searchProducts(searchTerm);
  
  if (results.length === 0) {
    searchResults.innerHTML = `
      <div class="search-empty">
        <p>No products found for "${searchTerm}"</p>
      </div>
    `;
    return;
  }
  
  displaySearchResults(results);
}

/**
 * Display search results
 */
function displaySearchResults(results) {
  const limitedResults = results.slice(0, 8);
  
  searchResults.innerHTML = `
    <div class="search-results-header">
      <span>Found ${results.length} product${results.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="search-results-list">
      ${limitedResults.map(product => `
        <a href="/product.html?id=${product.id}" class="search-result-item" onclick="closeSearch()">
          <img src="${product.thumbnail || product.images?.[0] || '/assets/images/placeholder.jpg'}" alt="${product.title}" />
          <div class="search-result-info">
            <h4>${product.title}</h4>
            <p class="search-result-price">$${product.price}</p>
          </div>
        </a>
      `).join('')}
    </div>
    ${results.length > 8 ? `
      <div class="search-results-footer">
        <a href="/shop.html?search=${encodeURIComponent(searchInput.value)}" class="btn btn-primary btn-sm">
          View all ${results.length} results
        </a>
      </div>
    ` : ''}
  `;
}
