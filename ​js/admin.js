// ===================================
// ADMIN FUNCTIONS
// ===================================

// Check if user is admin
async function checkAdminAccess() {
    if (!isUserSignedIn()) {
        window.location.href = '/';
        return false;
    }
    
    if (!isFirebaseConfigured) {
        showToast('Firebase not configured', 'error');
        return false;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (!userData || !userData.isAdmin) {
            showToast('Access denied. Admin privileges required.', 'error');
            window.location.href = '/';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = '/';
        return false;
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
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('totalCategories').textContent = categories.length;
        
        const activeProducts = products.filter(p => p.stockStatus === 'in-stock').length;
        document.getElementById('activeProducts').textContent = activeProducts;
        
        // Get newsletter subscribers count
        if (isFirebaseConfigured) {
            const subscribersSnapshot = await db.collection('newsletterSubscribers').get();
            document.getElementById('totalSubscribers').textContent = subscribersSnapshot.size;
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
        
        container.innerHTML = products.map(product => `
            <div class="admin-product-item">
                <img src="${product.thumbnail}" alt="${product.title}">
                <div class="product-info">
                    <h4>${product.title}</h4>
                    <p>${formatPrice(product.price)}</p>
                </div>
                <div class="product-actions">
                    <button onclick="editProduct('${product.id}')" class="btn-icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProductConfirm('${product.id}')" class="btn-icon">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent products:', error);
    }
}

// Product management form
function showAddProductForm() {
    const formHTML = `
        <form id="addProductForm" class="admin-form">
            <div class="form-group">
                <label for="productTitle">Product Title *</label>
                <input type="text" id="productTitle" required>
            </div>
            
            <div class="form-group">
                <label for="productDescription">Description *</label>
                <textarea id="productDescription" rows="4" required></textarea>
            </div>
            
            <div class="form-group">
                <label for="productShortDesc">Short Description</label>
                <input type="text" id="productShortDesc">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="productPrice">Price *</label>
                    <input type="number" id="productPrice" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label for="productOriginalPrice">Original Price</label>
                    <input type="number" id="productOriginalPrice" step="0.01">
                </div>
            </div>
            
            <div class="form-group">
                <label for="productCategory">Category *</label>
                <select id="productCategory" required>
                    <option value="">Select category</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="productAffiliateUrl">Affiliate URL *</label>
                <input type="url" id="productAffiliateUrl" required 
                       placeholder="https://s.click.aliexpress.com/...">
            </div>
            
            <div class="form-group">
                <label for="productImages">Product Images (URLs, comma-separated)</label>
                <textarea id="productImages" rows="2"></textarea>
            </div>
            
            <div class="form-group">
                <label for="productTags">Tags (comma-separated)</label>
                <input type="text" id="productTags">
            </div>
            
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
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add Product</button>
                <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
            </div>
        </form>
    `;
    
    const modal = createModal('Add New Product', formHTML);
    
    // Load categories into select
    loadCategories().then(categories => {
        const select = document.getElementById('productCategory');
        select.innerHTML = '<option value="">Select category</option>' + 
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    });
    
    // Handle form submission
    document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);
}

// Handle add product
async function handleAddProduct(e) {
    e.preventDefault();
    
    const productData = {
        title: document.getElementById('productTitle').value,
        description: document.getElementById('productDescription').value,
        shortDescription: document.getElementById('productShortDesc').value,
        price: parseFloat(document.getElementById('productPrice').value),
        originalPrice: parseFloat(document.getElementById('productOriginalPrice').value) || null,
        category: document.getElementById('productCategory').value,
        affiliateUrl: document.getElementById('productAffiliateUrl').value,
        images: document.getElementById('productImages').value.split(',').map(url => url.trim()).filter(url => url),
        tags: document.getElementById('productTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
        featured: document.getElementById('productFeatured').checked,
        trending: document.getElementById('productTrending').checked,
        bestseller: document.getElementById('productBestseller').checked,
        newArrival: document.getElementById('productNewArrival').checked,
        rating: 0,
        reviewCount: 0,
        currency: 'USD',
        stockStatus: 'in-stock'
    };
    
    // Set thumbnail to first image
    if (productData.images.length > 0) {
        productData.thumbnail = productData.images[0];
    }
    
    // Calculate discount
    if (productData.originalPrice) {
        productData.discount = calculateDiscount(productData.originalPrice, productData.price);
    }
    
    try {
        showLoading();
        const result = await addProduct(productData);
        
        if (result.success) {
            showToast('Product added successfully!', 'success');
            closeModal();
            loadRecentProducts();
        } else {
            showToast(result.message || 'Failed to add product', 'error');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error adding product:', error);
        showToast('Failed to add product', 'error');
        hideLoading();
    }
}

// Delete product confirmation
function deleteProductConfirm(productId) {
    const modal = createModal(
        'Confirm Delete',
        '<p>Are you sure you want to delete this product? This action cannot be undone.</p>',
        {
            footer: `
                <button onclick="performDeleteProduct('${productId}')" class="btn btn-danger">Delete</button>
                <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
            `
        }
    );
}

// Perform product deletion
async function performDeleteProduct(productId) {
    try {
        showLoading();
        const result = await deleteProduct(productId);
        
        if (result.success) {
            showToast('Product deleted successfully', 'success');
            closeModal();
            loadRecentProducts();
        } else {
            showToast(result.message || 'Failed to delete product', 'error');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
        hideLoading();
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
        document.getElementById('settingStoreName').value = settings.storeName || '';
        document.getElementById('settingEmail').value = settings.email || '';
        document.getElementById('settingCurrency').value = settings.currency || 'USD';
        
        if (settings.socialLinks) {
            document.getElementById('settingFacebook').value = settings.socialLinks.facebook || '';
            document.getElementById('settingInstagram').value = settings.socialLinks.instagram || '';
            document.getElementById('settingYoutube').value = settings.socialLinks.youtube || '';
            document.getElementById('settingTiktok').value = settings.socialLinks.tiktok || '';
        }
        
        document.getElementById('settingAffiliateUrl').value = settings.masterAffiliateUrl || '';
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
        showLoading();
        const result = await saveSettings(settingsData);
        
        if (result.success) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast(result.message || 'Failed to save settings', 'error');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Failed to save settings', 'error');
        hideLoading();
    }
}
