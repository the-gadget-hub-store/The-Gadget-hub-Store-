// ===================================
// ADMIN FUNCTIONS
// ===================================

// Check if user is admin
async function checkAdminAccess() {
    if (!isUserSignedIn()) {
        window.location.href = '../index.html';
        return false;
    }
    
    if (!isFirebaseConfigured) {
        console.warn('Firebase not configured - using demo mode');
        return true; // Allow access in demo mode
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (!userData || !userData.isAdmin) {
            showToast('Access denied. Admin privileges required.', 'error');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking admin access:', error);
        // Allow access in case of error (demo mode)
        return true;
    }
}

// Initialize admin dashboard
async function initAdminDashboard() {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;
    
    loadAdminStats();
    loadRecentProducts();
    loadRecentSubscribers();
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const products = await getProducts();
        const categories = await getCategories();
        
        // Update stat cards
        const totalProductsEl = document.getElementById('totalProducts');
        const totalCategoriesEl = document.getElementById('totalCategories');
        const activeProductsEl = document.getElementById('activeProducts');
        const totalSubscribersEl = document.getElementById('totalSubscribers');
        
        if (totalProductsEl) totalProductsEl.textContent = products.length || 0;
        if (totalCategoriesEl) totalCategoriesEl.textContent = categories.length || 0;
        
        const activeProducts = products.filter(p => p.stockStatus === 'in-stock').length;
        if (activeProductsEl) activeProductsEl.textContent = activeProducts || 0;
        
        // Get newsletter subscribers count
        if (isFirebaseConfigured && totalSubscribersEl) {
            const subscribersSnapshot = await db.collection('newsletterSubscribers').get();
            totalSubscribersEl.textContent = subscribersSnapshot.size || 0;
        } else if (totalSubscribersEl) {
            totalSubscribersEl.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

// Load recent products
async function loadRecentProducts() {
    const container = document.getElementById('recentProductsList');
    if (!container) return;
    
    try {
        const products = await getProducts(10);
        
        if (products.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No products yet. Click "Add Product" to create your first product.</p>';
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="admin-product-item">
                <img src="${product.thumbnail || product.images[0] || '../assets/images/placeholder.jpg'}" alt="${product.title}">
                <div class="product-info">
                    <h4>${truncateText(product.title, 40)}</h4>
                    <p>${formatPrice(product.price)}</p>
                </div>
                <div class="product-actions">
                    <button class="btn-icon" onclick="editProduct('${product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteProductConfirm('${product.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent products:', error);
        container.innerHTML = '<p style="color: var(--text-secondary);">Error loading products.</p>';
    }
}

// Load recent subscribers (placeholder)
async function loadRecentSubscribers() {
    // Placeholder function for newsletter subscribers
    console.log('Newsletter subscribers feature ready');
}

// Show add product form
function showAddProductForm() {
    const formHTML = `
        <form id="addProductForm" class="admin-form">
            <div class="form-group">
                <label for="productTitle">Product Title *</label>
                <input type="text" id="productTitle" required placeholder="Enter product title">
            </div>
            
            <div class="form-group">
                <label for="productDescription">Description *</label>
                <textarea id="productDescription" rows="4" required placeholder="Enter detailed product description"></textarea>
            </div>
            
            <div class="form-group">
                <label for="productShortDesc">Short Description</label>
                <input type="text" id="productShortDesc" placeholder="Brief product description">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="productPrice">Price (USD) *</label>
                    <input type="number" id="productPrice" step="0.01" required placeholder="0.00">
                </div>
                
                <div class="form-group">
                    <label for="productOriginalPrice">Original Price (USD)</label>
                    <input type="number" id="productOriginalPrice" step="0.01" placeholder="0.00">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="productCategory">Category *</label>
                    <select id="productCategory" required>
                        <option value="">Select category</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="productStock">Stock Status *</label>
                    <select id="productStock" required>
                        <option value="in-stock">In Stock</option>
                        <option value="out-of-stock">Out of Stock</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="productAffiliateUrl">AliExpress Affiliate URL *</label>
                <input type="url" id="productAffiliateUrl" required 
                       placeholder="https://s.click.aliexpress.com/...">
            </div>
            
            <div class="form-group">
                <label for="productImages">Product Images (URLs, comma-separated) *</label>
                <textarea id="productImages" rows="2" required 
                          placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"></textarea>
                <small style="color: var(--text-muted);">Enter image URLs separated by commas</small>
            </div>
            
            <div class="form-group">
                <label for="productTags">Tags (comma-separated)</label>
                <input type="text" id="productTags" placeholder="wireless, audio, bluetooth">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="productRating">Rating (0-5)</label>
                    <input type="number" id="productRating" step="0.1" min="0" max="5" value="0" placeholder="4.5">
                </div>
                
                <div class="form-group">
                    <label for="productReviews">Review Count</label>
                    <input type="number" id="productReviews" min="0" value="0" placeholder="100">
                </div>
            </div>
            
            <div class="form-group">
                <label>Product Flags</label>
                <div class="form-checkboxes">
                    <label>
                        <input type="checkbox" id="productFeatured">
                        <span>Featured</span>
                    </label>
                    <label>
                        <input type="checkbox" id="productTrending">
                        <span>Trending</span>
                    </label>
                    <label>
                        <input type="checkbox" id="productBestseller">
                        <span>Bestseller</span>
                    </label>
                    <label>
                        <input type="checkbox" id="productNewArrival">
                        <span>New Arrival</span>
                    </label>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" onclick="closeModal()" class="btn btn-outline">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Product</button>
            </div>
        </form>
    `;
    
    const modal = createModal('Add New Product', formHTML);
    
    // Load categories into select
    getCategories().then(categories => {
        const select = document.getElementById('productCategory');
        if (select) {
            select.innerHTML = '<option value="">Select category</option>' + 
                categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }
    });
    
    // Handle form submission
    const form = document.getElementById('addProductForm');
    if (form) {
        form.addEventListener('submit', handleAddProduct);
    }
}

// Handle add product
async function handleAddProduct(e) {
    e.preventDefault();
    
    const images = document.getElementById('productImages').value
        .split(',')
        .map(url => url.trim())
        .filter(url => url);
    
    const tags = document.getElementById('productTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    
    const productData = {
        title: document.getElementById('productTitle').value,
        description: document.getElementById('productDescription').value,
        shortDescription: document.getElementById('productShortDesc').value,
        price: parseFloat(document.getElementById('productPrice').value),
        originalPrice: parseFloat(document.getElementById('productOriginalPrice').value) || null,
        category: document.getElementById('productCategory').value,
        affiliateUrl: document.getElementById('productAffiliateUrl').value,
        images: images,
        thumbnail: images[0] || '',
        tags: tags,
        rating: parseFloat(document.getElementById('productRating').value) || 0,
        reviewCount: parseInt(document.getElementById('productReviews').value) || 0,
        featured: document.getElementById('productFeatured').checked,
        trending: document.getElementById('productTrending').checked,
        bestseller: document.getElementById('productBestseller').checked,
        newArrival: document.getElementById('productNewArrival').checked,
        stockStatus: document.getElementById('productStock').value,
        currency: 'USD'
    };
    
    // Calculate discount
    if (productData.originalPrice && productData.originalPrice > productData.price) {
        productData.discount = calculateDiscount(productData.originalPrice, productData.price);
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Adding...</span>';
        
        const result = await addProduct(productData);
        
        if (result.success) {
            showToast('Product added successfully!', 'success');
            closeModal();
            
            // Reload products if on products page
            if (typeof loadAllProducts === 'function') {
                await loadAllProducts();
            }
            
            // Reload recent products if on dashboard
            if (typeof loadRecentProducts === 'function') {
                await loadRecentProducts();
            }
            
            // Reload stats
            if (typeof loadAdminStats === 'function') {
                await loadAdminStats();
            }
        } else {
            showToast(result.message || 'Failed to add product', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showToast('Failed to add product', 'error');
    }
}

// Edit product (navigate to edit page or show edit form)
function editProduct(productId) {
    // For now, redirect to products page with edit parameter
    window.location.href = `products.html?edit=${productId}`;
}

// Delete product confirmation
function deleteProductConfirm(productId) {
    const modal = createModal(
        'Confirm Delete',
        '<p>Are you sure you want to delete this product? This action cannot be undone.</p>',
        {
            footer: `
                <button onclick="closeModal()" class="btn btn-outline">Cancel</button>
                <button onclick="performDeleteProduct('${productId}')" class="btn btn-primary" style="background: var(--danger); border-color: var(--danger);">
                    <i class="fas fa-trash"></i>
                    <span>Delete Product</span>
                </button>
            `
        }
    );
}

// Perform product deletion
async function performDeleteProduct(productId) {
    try {
        const result = await deleteProduct(productId);
        
        if (result.success) {
            showToast('Product deleted successfully', 'success');
            closeModal();
            
            // Reload products if on products page
            if (typeof loadAllProducts === 'function') {
                await loadAllProducts();
            }
            
            // Reload recent products if on dashboard
            if (typeof loadRecentProducts === 'function') {
                await loadRecentProducts();
            }
            
            // Reload stats
            if (typeof loadAdminStats === 'function') {
                await loadAdminStats();
            }
        } else {
            showToast(result.message || 'Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
    }
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.custom-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Settings management
async function loadSettingsPage() {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;
    
    try {
        const settings = await getSettings();
        
        // Populate form fields
        const storeNameEl = document.getElementById('settingStoreName');
        const storeEmailEl = document.getElementById('settingEmail');
        const storeCurrencyEl = document.getElementById('settingCurrency');
        
        if (storeNameEl) storeNameEl.value = settings.storeName || '';
        if (storeEmailEl) storeEmailEl.value = settings.email || '';
        if (storeCurrencyEl) storeCurrencyEl.value = settings.currency || 'USD';
        
        if (settings.socialLinks) {
            const facebookEl = document.getElementById('settingFacebook');
            const instagramEl = document.getElementById('settingInstagram');
            const youtubeEl = document.getElementById('settingYoutube');
            const tiktokEl = document.getElementById('settingTiktok');
            
            if (facebookEl) facebookEl.value = settings.socialLinks.facebook || '';
            if (instagramEl) instagramEl.value = settings.socialLinks.instagram || '';
            if (youtubeEl) youtubeEl.value = settings.socialLinks.youtube || '';
            if (tiktokEl) tiktokEl.value = settings.socialLinks.tiktok || '';
        }
        
        const affiliateUrlEl = document.getElementById('settingAffiliateUrl');
        if (affiliateUrlEl) affiliateUrlEl.value = settings.masterAffiliateUrl || '';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings
async function handleSaveSettings(e) {
    e.preventDefault();
    
    const settingsData = {
        storeName: document.getElementById('settingStoreName').value,
        email: document.getElementById('settingEmail').value,
        currency: document.getElementById('settingCurrency').value,
        socialLinks: {
            facebook: document.getElementById('settingFacebook').value,
            instagram: document.getElementById('settingInstagram').value,
            youtube: document.getElementById('settingYoutube').value,
            tiktok: document.getElementById('settingTiktok').value
        },
        masterAffiliateUrl: document.getElementById('settingAffiliateUrl').value
    };
    
    try {
        const result = await saveSettings(settingsData);
        
        if (result.success) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast(result.message || 'Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Failed to save settings', 'error');
    }
}

// Make functions globally accessible
window.showAddProductForm = showAddProductForm;
window.editProduct = editProduct;
window.deleteProductConfirm = deleteProductConfirm;
window.performDeleteProduct = performDeleteProduct;
window.closeModal = closeModal;
window.checkAdminAccess = checkAdminAccess;
window.initAdminDashboard = initAdminDashboard;
window.loadAdminStats = loadAdminStats;
window.loadRecentProducts = loadRecentProducts;
window.loadSettingsPage = loadSettingsPage;
window.handleSaveSettings = handleSaveSettings;
