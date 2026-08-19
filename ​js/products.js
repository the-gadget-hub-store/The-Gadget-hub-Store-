// products.js - The Gadget Hub Store Product Management System
// Production-ready implementation with robust Firebase/Firestore error handling

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let allProducts = [];
let filteredProducts = [];
let currentFilter = 'all';
let currentSort = 'default';
let isSubmitting = false;

// ============================================================================
// FIREBASE/FIRESTORE REFERENCES
// ============================================================================

const getProductsCollection = () => {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.collection('products');
        }
        console.error('Firestore database not initialized');
        return null;
    } catch (error) {
        console.error('Error accessing Firestore collection:', error);
        return null;
    }
};

// ============================================================================
// PRODUCT CARD CREATION
// ============================================================================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-category', product.category || '');
    card.setAttribute('data-product-id', product.id || '');
    
    // Determine badge content
    let badge = '';
    if (product.badge) {
        const badgeClass = product.badge.toLowerCase().replace(/\s+/g, '-');
        badge = `<span class="product-badge ${badgeClass}">${product.badge}</span>`;
    } else if (product.trending) {
        badge = '<span class="product-badge trending">Trending</span>';
    } else if (product.featured) {
        badge = '<span class="product-badge featured">Featured</span>';
    } else if (product.newArrival) {
        badge = '<span class="product-badge new">New</span>';
    }

    // Format price
    const price = product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price N/A';
    
    // Construct card HTML
    card.innerHTML = `
        <div class="product-card-inner">
            ${badge}
            <div class="product-image-container">
                <img src="${product.image || 'images/placeholder.jpg'}" 
                     alt="${product.name || 'Product'}" 
                     class="product-image"
                     onerror="this.src='images/placeholder.jpg'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name || 'Unnamed Product'}</h3>
                <p class="product-category">${getCategoryName(product.category)}</p>
                <div class="product-footer">
                    <span class="product-price">${price}</span>
                    <a href="${product.affiliateLink || product.shopLink || '#'}" 
                       class="product-link" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       ${!product.affiliateLink && !product.shopLink ? 'onclick="return false;"' : ''}>
                        Shop Now
                    </a>
                </div>
            </div>
        </div>
    `;

    // Initialize 3D tilt for this card
    init3DTilt(card);

    return card;
}

// ============================================================================
// PRODUCT RENDERING
// ============================================================================

function renderProducts(products, containerId = 'products-grid') {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container with ID "${containerId}" not found`);
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Handle empty state
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No products found.</p>
            </div>
        `;
        return;
    }

    // Render each product card
    products.forEach(product => {
        try {
            const card = createProductCard(product);
            container.appendChild(card);
        } catch (error) {
            console.error('Error rendering product card:', error, product);
        }
    });
}

// ============================================================================
// PRODUCT LOADING FROM FIREBASE/FIRESTORE
// ============================================================================

async function loadTrendingProducts() {
    const container = document.getElementById('trending-products');
    
    if (!container) {
        return;
    }

    try {
        const productsRef = getProductsCollection();
        
        if (!productsRef) {
            throw new Error('Unable to access products collection');
        }

        const snapshot = await productsRef
            .where('trending', '==', true)
            .limit(8)
            .get();

        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (products.length > 0) {
            renderProducts(products, 'trending-products');
        } else {
            container.innerHTML = '<div class="empty-state"><p>No trending products available.</p></div>';
        }

    } catch (error) {
        console.error('Error loading trending products:', error);
        
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>Unable to load trending products.</p></div>';
        }
        
        // Only show toast if it's a critical error, not during initial page load
        if (typeof showToast === 'function' && error.code !== 'permission-denied') {
            showToast('Unable to load trending products. Please try again later.', 'error');
        }
    }
}

async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    
    if (!container) {
        return;
    }

    try {
        const productsRef = getProductsCollection();
        
        if (!productsRef) {
            throw new Error('Unable to access products collection');
        }

        const snapshot = await productsRef
            .where('featured', '==', true)
            .limit(8)
            .get();

        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (products.length > 0) {
            renderProducts(products, 'featured-products');
        } else {
            container.innerHTML = '<div class="empty-state"><p>No featured products available.</p></div>';
        }

    } catch (error) {
        console.error('Error loading featured products:', error);
        
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>Unable to load featured products.</p></div>';
        }
        
        if (typeof showToast === 'function' && error.code !== 'permission-denied') {
            showToast('Unable to load featured products. Please try again later.', 'error');
        }
    }
}

async function loadNewArrivals() {
    const container = document.getElementById('new-arrivals');
    
    if (!container) {
        return;
    }

    try {
        const productsRef = getProductsCollection();
        
        if (!productsRef) {
            throw new Error('Unable to access products collection');
        }

        const snapshot = await productsRef
            .where('newArrival', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(8)
            .get();

        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (products.length > 0) {
            renderProducts(products, 'new-arrivals');
        } else {
            container.innerHTML = '<div class="empty-state"><p>No new arrivals available.</p></div>';
        }

    } catch (error) {
        console.error('Error loading new arrivals:', error);
        
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>Unable to load new arrivals.</p></div>';
        }
        
        if (typeof showToast === 'function' && error.code !== 'permission-denied') {
            showToast('Unable to load new arrivals. Please try again later.', 'error');
        }
    }
}

async function loadAllProducts() {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const productsRef = getProductsCollection();
        
        if (!productsRef) {
            throw new Error('Unable to access products collection');
        }

        const snapshot = await productsRef.get();

        allProducts = [];
        snapshot.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        filteredProducts = [...allProducts];
        
        // Apply current filters and sorting
        filterProducts(currentFilter);
        sortProducts(currentSort);

    } catch (error) {
        console.error('Error loading all products:', error);
        
        if (typeof showToast === 'function') {
            showToast('Unable to load products. Please refresh the page.', 'error');
        }
        
        // Render empty state
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>Unable to load products.</p></div>';
        }
        
    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// ============================================================================
// CATEGORY HANDLING
// ============================================================================

function getCategoryName(category) {
    if (!category) return 'Uncategorized';
    
    const categoryMap = {
        'smartphones': 'Smartphones',
        'laptops': 'Laptops',
        'tablets': 'Tablets',
        'accessories': 'Accessories',
        'audio': 'Audio',
        'wearables': 'Wearables',
        'gaming': 'Gaming',
        'smart-home': 'Smart Home',
        'cameras': 'Cameras',
        'other': 'Other'
    };

    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

// ============================================================================
// 3D TILT EFFECT
// ============================================================================

function init3DTilt(card) {
    if (!card) return;

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    card.addEventListener('mousemove', handleTilt);
    card.addEventListener('mouseleave', resetTilt);
    card.addEventListener('mouseenter', function() {
        this.style.transition = 'none';
    });
}

function handleTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    requestAnimationFrame(() => {
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    });
}

function resetTilt(e) {
    const card = e.currentTarget;
    
    requestAnimationFrame(() => {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
}

// ============================================================================
// FILTERING
// ============================================================================

function filterProducts(category) {
    currentFilter = category;

    if (category === 'all' || !category) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => product.category === category);
    }

    sortProducts(currentSort);
}

// ============================================================================
// SORTING
// ============================================================================

function sortProducts(sortType) {
    currentSort = sortType;

    const sorted = [...filteredProducts];

    switch (sortType) {
        case 'price-low':
            sorted.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
            break;
            
        case 'price-high':
            sorted.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
            break;
            
        case 'name-asc':
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
            
        case 'name-desc':
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
            
        case 'newest':
            sorted.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
            break;
            
        case 'default':
        default:
            // Keep current order or apply default sorting logic
            break;
    }

    renderProducts(sorted, 'products-grid');
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

function searchProducts(query) {
    if (!query || query.trim() === '') {
        filteredProducts = [...allProducts];
    } else {
        const searchTerm = query.toLowerCase().trim();
        filteredProducts = allProducts.filter(product => {
            const name = (product.name || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            const categoryDisplay = getCategoryName(product.category).toLowerCase();
            
            return name.includes(searchTerm) || 
                   category.includes(searchTerm) || 
                   categoryDisplay.includes(searchTerm);
        });
    }

    sortProducts(currentSort);
}

// ============================================================================
// PRODUCT FORM SUBMISSION (ADMIN)
// ============================================================================

function initProductForm() {
    const form = document.getElementById('product-form');
    const submitButton = document.getElementById('submit-product-btn');

    if (!form || !submitButton) {
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent duplicate submissions
        if (isSubmitting) {
            return;
        }

        // Store original button state
        const originalButtonText = submitButton.textContent;
        const originalButtonDisabled = submitButton.disabled;

        try {
            // Set submitting flag
            isSubmitting = true;

            // Validate form data
            const formData = new FormData(form);
            const productName = formData.get('name')?.trim();
            const productPrice = formData.get('price')?.trim();
            const productCategory = formData.get('category')?.trim();
            const productImage = formData.get('image')?.trim();
            const productAffiliateLink = formData.get('affiliateLink')?.trim();

            // Validation
            if (!productName) {
                throw new Error('Product name is required');
            }

            if (!productPrice || isNaN(parseFloat(productPrice))) {
                throw new Error('Valid product price is required');
            }

            if (!productCategory) {
                throw new Error('Product category is required');
            }

            if (!productImage) {
                throw new Error('Product image URL is required');
            }

            // Update UI to loading state
            submitButton.textContent = 'Adding...';
            submitButton.disabled = true;

            if (typeof showLoading === 'function') {
                showLoading();
            }

            // Prepare product data
            const productData = {
                name: productName,
                price: parseFloat(productPrice),
                category: productCategory,
                image: productImage,
                affiliateLink: productAffiliateLink || '',
                shopLink: productAffiliateLink || '',
                trending: formData.get('trending') === 'on',
                featured: formData.get('featured') === 'on',
                newArrival: formData.get('newArrival') === 'on',
                badge: formData.get('badge')?.trim() || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Submit to Firestore
            const productsRef = getProductsCollection();
            
            if (!productsRef) {
                throw new Error('Unable to access database. Please check your connection.');
            }

            await productsRef.add(productData);

            // Success handling
            if (typeof showToast === 'function') {
                showToast('Product added successfully!', 'success');
            }

            // Reset form
            form.reset();

            // Reload products to show the new addition
            await loadAllProducts();

            // Reload specific sections if they exist
            if (productData.trending) {
                loadTrendingProducts().catch(err => console.error('Error reloading trending:', err));
            }
            if (productData.featured) {
                loadFeaturedProducts().catch(err => console.error('Error reloading featured:', err));
            }
            if (productData.newArrival) {
                loadNewArrivals().catch(err => console.error('Error reloading new arrivals:', err));
            }

        } catch (error) {
            // Error handling
            console.error('Error adding product:', error);

            let errorMessage = 'Unable to add product. Please try again.';

            if (error.message.includes('required')) {
                errorMessage = error.message;
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Database connection failed. Please try again.';
            }

            if (typeof showToast === 'function') {
                showToast(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }

        } finally {
            // GUARANTEED CLEANUP - This always runs
            isSubmitting = false;
            submitButton.textContent = originalButtonText;
            submitButton.disabled = originalButtonDisabled;

            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }
    });
}

// ============================================================================
// PRODUCT DELETION (ADMIN)
// ============================================================================

async function deleteProduct(productId) {
    if (!productId) {
        console.error('Product ID is required for deletion');
        return false;
    }

    if (!confirm('Are you sure you want to delete this product?')) {
        return false;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const productsRef = getProductsCollection();
        
        if (!productsRef) {
            throw new Error('Unable to access database');
        }

        await productsRef.doc(productId).delete();

        if (typeof showToast === 'function') {
            showToast('Product deleted successfully!', 'success');
        }

        // Reload products
        await loadAllProducts();
        loadTrendingProducts().catch(err => console.error('Error reloading trending:', err));
        loadFeaturedProducts().catch(err => console.error('Error reloading featured:', err));
        loadNewArrivals().catch(err => console.error('Error reloading new arrivals:', err));

        return true;

    } catch (error) {
        console.error('Error deleting product:', error);

        let errorMessage = 'Unable to delete product. Please try again.';

        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Product not found.';
        }

        if (typeof showToast === 'function') {
            showToast(errorMessage, 'error');
        } else {
            alert(errorMessage);
        }

        return false;

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// ============================================================================
// PRODUCT UPDATE (ADMIN)
// ============================================================================

async function updateProduct(productId, productData) {
    if (!productId) {
        console.error('Product ID is required for update');
        return false;
    }

    if (!productData || typeof productData !== 'object') {
        console.error('Valid product data is required for update');
        return false;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const productsRef = getProductsCollection();
        
        if (!productsRef) {
            throw new Error('Unable to access database');
        }

        const updateData = {
            ...productData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await productsRef.doc(productId).update(updateData);

        if (typeof showToast === 'function') {
            showToast('Product updated successfully!', 'success');
        }

        // Reload products
        await loadAllProducts();
        loadTrendingProducts().catch(err => console.error('Error reloading trending:', err));
        loadFeaturedProducts().catch(err => console.error('Error reloading featured:', err));
        loadNewArrivals().catch(err => console.error('Error reloading new arrivals:', err));

        return true;

    } catch (error) {
        console.error('Error updating product:', error);

        let errorMessage = 'Unable to update product. Please try again.';

        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Product not found.';
        }

        if (typeof showToast === 'function') {
            showToast(errorMessage, 'error');
        } else {
            alert(errorMessage);
        }

        return false;

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// ============================================================================
// FILTER/SORT EVENT HANDLERS
// ============================================================================

function initFilterSortHandlers() {
    // Category filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.getAttribute('data-filter');
            
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter products
            filterProducts(category);
        });
    });

    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortProducts(e.target.value);
        });
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts(e.target.value);
            }, 300);
        });
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initProducts() {
    // Load products for different sections
    loadTrendingProducts().catch(err => console.error('Error loading trending products:', err));
    loadFeaturedProducts().catch(err => console.error('Error loading featured products:', err));
    loadNewArrivals().catch(err => console.error('Error loading new arrivals:', err));

    // Load all products if main grid exists
    if (document.getElementById('products-grid')) {
        loadAllProducts().catch(err => console.error('Error loading all products:', err));
    }

    // Initialize filter and sort handlers
    initFilterSortHandlers();

    // Initialize product form if it exists
    initProductForm();
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    initProducts();
}

// ============================================================================
// GLOBAL EXPORTS (for compatibility with existing application)
// ============================================================================

if (typeof window !== 'undefined') {
    window.createProductCard = createProductCard;
    window.renderProducts = renderProducts;
    window.loadTrendingProducts = loadTrendingProducts;
    window.loadFeaturedProducts = loadFeaturedProducts;
    window.loadNewArrivals = loadNewArrivals;
    window.loadAllProducts = loadAllProducts;
    window.getCategoryName = getCategoryName;
    window.init3DTilt = init3DTilt;
    window.handleTilt = handleTilt;
    window.resetTilt = resetTilt;
    window.filterProducts = filterProducts;
    window.sortProducts = sortProducts;
    window.searchProducts = searchProducts;
    window.deleteProduct = deleteProduct;
    window.updateProduct = updateProduct;
    window.initProducts = initProducts;
}
