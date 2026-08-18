// ===================================
// PRODUCT RENDERING & MANAGEMENT
// ===================================

// Create product card HTML
function createProductCard(product) {
    const discount = product.originalPrice 
        ? calculateDiscount(product.originalPrice, product.price) 
        : 0;
    
    const badges = [];
    if (product.trending) badges.push('<span class="product-badge badge-trending"><i class="fas fa-fire"></i> Trending</span>');
    if (product.newArrival) badges.push('<span class="product-badge badge-new">New</span>');
    if (discount > 0) badges.push(`<span class="product-badge badge-sale">-${discount}%</span>`);
    
    const isFavorite = isProductFavorite(product.id);
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image-container">
                <img src="${product.thumbnail || product.images[0]}" 
                     alt="${product.title}" 
                     class="product-image"
                     loading="lazy"
                     onerror="handleImageError(this)">
                
                ${badges.length > 0 ? `<div class="product-badges">${badges.join('')}</div>` : ''}
                
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="toggleFavorite('${product.id}')"
                        aria-label="Add to favorites">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            
            <div class="product-info">
                <div class="product-category">${getCategoryName(product.category)}</div>
                <h3 class="product-title">${product.title}</h3>
                ${product.shortDescription ? `<p class="product-description">${product.shortDescription}</p>` : ''}
                
                <div class="product-rating">
                    <div class="stars">${generateStarRating(product.rating)}</div>
                    <span class="rating-value">${product.rating}</span>
                    <span class="rating-count">(${formatNumber(product.reviewCount)})</span>
                </div>
                
                <div class="product-price">
                    <span class="current-price">${formatPrice(product.price, product.currency)}</span>
                    ${product.originalPrice ? `<span class="original-price">${formatPrice(product.originalPrice, product.currency)}</span>` : ''}
                    ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                </div>
                
                <div class="product-actions">
                    <a href="/pages/product.html?id=${product.id}" class="btn btn-secondary">
                        <span>View Details</span>
                    </a>
                    <a href="${product.affiliateUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="btn btn-primary">
                        <span>Shop Now</span>
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Render products to container
async function renderProducts(container, products) {
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No Products Found</h3>
                <p>We couldn't find any products matching your criteria.</p>
                <a href="/pages/shop.html" class="btn btn-primary">
                    <span>Browse All Products</span>
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => createProductCard(product)).join('');
    
    // Initialize 3D tilt effect on product cards
    init3DTilt();
}

// Load and display trending products
async function loadTrendingProducts() {
    const container = document.getElementById('trendingProductsGrid');
    if (!container) return;
    
    try {
        const products = await getTrendingProducts(8);
        renderProducts(container, products);
    } catch (error) {
        console.error('Error loading trending products:', error);
        showToast('Failed to load trending products', 'error');
    }
}

// Load and display featured products
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProductsGrid');
    if (!container) return;
    
    try {
        const products = await getFeaturedProducts(8);
        renderProducts(container, products);
    } catch (error) {
        console.error('Error loading featured products:', error);
        showToast('Failed to load featured products', 'error');
    }
}

// Load new arrivals
async function loadNewArrivals() {
    const container = document.getElementById('collectionTrack');
    if (!container) return;
    
    try {
        const products = await getNewArrivalProducts(12);
        renderProducts(container, products);
    } catch (error) {
        console.error('Error loading new arrivals:', error);
        showToast('Failed to load new arrivals', 'error');
    }
}

// Get category name by ID
function getCategoryName(categoryId) {
    const category = DEMO_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
}

// Initialize 3D tilt effect
function init3DTilt() {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);
    });
}

// Handle 3D tilt on mouse move
function handleTilt(e) {
    // Only on desktop
    if (window.innerWidth < 992) return;
    
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    
    // Move product image slightly
    const img = card.querySelector('.product-image');
    if (img) {
        const moveX = (x - centerX) / 20;
        const moveY = (y - centerY) / 20;
        img.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
    }
}

// Reset 3D tilt
function resetTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    
    const img = card.querySelector('.product-image');
    if (img) {
        img.style.transform = 'translate(0, 0) scale(1)';
    }
}

// Filter products
function filterProducts(products, filters) {
    let filtered = [...products];
    
    // Filter by category
    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(p => p.category === filters.category);
    }
    
    // Filter by price range
    if (filters.minPrice !== undefined) {
        filtered = filtered.filter(p => p.price >= filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
        filtered = filtered.filter(p => p.price <= filters.maxPrice);
    }
    
    // Filter by rating
    if (filters.minRating) {
        filtered = filtered.filter(p => p.rating >= filters.minRating);
    }
    
    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(p => 
            p.tags && p.tags.some(tag => filters.tags.includes(tag))
        );
    }
    
    // Filter by availability
    if (filters.inStockOnly) {
        filtered = filtered.filter(p => p.stockStatus === 'in-stock');
    }
    
    return filtered;
}

// Sort products
function sortProducts(products, sortBy) {
    const sorted = [...products];
    
    switch (sortBy) {
        case 'price-low':
            return sorted.sort((a, b) => a.price - b.price);
        
        case 'price-high':
            return sorted.sort((a, b) => b.price - a.price);
        
        case 'rating':
            return sorted.sort((a, b) => b.rating - a.rating);
        
        case 'popular':
            return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
        
        case 'discount':
            return sorted.sort((a, b) => {
                const discountA = a.originalPrice ? calculateDiscount(a.originalPrice, a.price) : 0;
                const discountB = b.originalPrice ? calculateDiscount(b.originalPrice, b.price) : 0;
                return discountB - discountA;
            });
        
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        default:
            return sorted;
    }
}

// Load product details
async function loadProductDetails(productId) {
    try {
        showLoading();
        const product = await getProductById(productId);
        
        if (!product) {
            showToast('Product not found', 'error');
            window.location.href = '/pages/shop.html';
            return;
        }
        
        renderProductDetails(product);
        hideLoading();
    } catch (error) {
        console.error('Error loading product details:', error);
        showToast('Failed to load product details', 'error');
        hideLoading();
    }
}

// Render product details
function renderProductDetails(product) {
    // This will be used in product.html
    // Implementation will be in the product details page
    console.log('Rendering product details:', product);
}
