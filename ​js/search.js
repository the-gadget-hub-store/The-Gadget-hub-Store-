// ===================================
// SEARCH FUNCTIONALITY
// ===================================

let searchResults = [];
let recentSearches = storage.get('recentSearches') || [];

// Initialize search
function initializeSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', openSearch);
    }
    
    if (searchClose) {
        searchClose.addEventListener('click', closeSearch);
    }
    
    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                closeSearch();
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('focus', showSearchSuggestions);
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }
    
    // Load recent searches
    displayRecentSearches();
}

// Open search overlay
function openSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    
    if (searchOverlay) {
        searchOverlay.classList.add('active');
        setTimeout(() => searchInput && searchInput.focus(), 300);
    }
}

// Close search overlay
function closeSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    
    if (searchOverlay) {
        searchOverlay.classList.remove('active');
        if (searchInput) {
            searchInput.value = '';
        }
        hideSearchResults();
    }
}

// Handle search input
async function handleSearch(e) {
    const query = e.target.value.trim();
    const searchClear = document.getElementById('searchClear');
    
    // Show/hide clear button
    if (searchClear) {
        if (query.length > 0) {
            searchClear.classList.add('visible');
        } else {
            searchClear.classList.remove('visible');
        }
    }
    
    if (query.length < 2) {
        hideSearchResults();
        showSearchSuggestions();
        return;
    }
    
    try {
        const results = await searchProducts(query);
        searchResults = results;
        displaySearchResults(results, query);
        
        // Add to recent searches
        addRecentSearch(query);
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed', 'error');
    }
}

// Display search results
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('searchResults');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!resultsContainer) return;
    
    // Hide suggestions
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-empty">
                <i class="fas fa-search"></i>
                <h4>No results found for "${query}"</h4>
                <p>Try searching with different keywords</p>
            </div>
        `;
        resultsContainer.classList.add('active');
        return;
    }
    
    const resultsHTML = `
        <div class="search-results-header">
            <h4>Search Results</h4>
            <span class="results-count">${results.length} products found</span>
        </div>
        <div class="search-results-grid">
            ${results.slice(0, 6).map(product => createSearchResultCard(product)).join('')}
        </div>
        ${results.length > 6 ? `
            <div class="search-results-footer">
                <a href="/pages/shop.html?search=${encodeURIComponent(query)}" class="btn btn-outline">
                    <span>View All Results</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        ` : ''}
    `;
    
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.classList.add('active');
}

// Create search result card
function createSearchResultCard(product) {
    return `
        <a href="/pages/product.html?id=${product.id}" class="search-result-item">
            <div class="search-result-image">
                <img src="${product.thumbnail || product.images[0]}" 
                     alt="${product.title}"
                     onerror="handleImageError(this)">
            </div>
            <div class="search-result-info">
                <h5 class="search-result-title">${product.title}</h5>
                <div class="search-result-price">
                    <span class="price">${formatPrice(product.price)}</span>
                    ${product.originalPrice ? `<span class="original">${formatPrice(product.originalPrice)}</span>` : ''}
                </div>
                <div class="search-result-rating">
                    <div class="stars">${generateStarRating(product.rating)}</div>
                    <span>${product.rating}</span>
                </div>
            </div>
        </a>
    `;
}

// Hide search results
function hideSearchResults() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.classList.remove('active');
        resultsContainer.innerHTML = '';
    }
}

// Show search suggestions
function showSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    const searchInput = document.getElementById('searchInput');
    
    if (!suggestionsContainer || !searchInput) return;
    
    if (searchInput.value.trim().length === 0) {
        suggestionsContainer.style.display = 'block';
        displayRecentSearches();
    }
}

// Display recent searches
function displayRecentSearches() {
    const container = document.querySelector('.popular-searches');
    if (!container) return;
    
    if (recentSearches.length > 0) {
        container.innerHTML = `
            <h4>Recent Searches</h4>
            <div class="suggestion-tags">
                ${recentSearches.map(search => `
                    <button class="suggestion-tag" onclick="performSearch('${search}')">
                        ${search}
                    </button>
                `).join('')}
            </div>
        `;
    }
}

// Add recent search
function addRecentSearch(query) {
    if (!recentSearches.includes(query)) {
        recentSearches.unshift(query);
        recentSearches = recentSearches.slice(0, 5); // Keep only 5 recent searches
        storage.set('recentSearches', recentSearches);
    }
}

// Perform search
function performSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input'));
    }
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    if (searchClear) {
        searchClear.classList.remove('visible');
    }
    
    hideSearchResults();
    showSearchSuggestions();
}

// Clear recent searches
function clearRecentSearches() {
    recentSearches = [];
    storage.remove('recentSearches');
    displayRecentSearches();
    showToast('Recent searches cleared', 'success');
}
