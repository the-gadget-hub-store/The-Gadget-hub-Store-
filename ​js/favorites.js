// ===================================
// FAVORITES / WISHLIST MANAGEMENT
// ===================================

let userFavorites = [];

// Initialize favorites from localStorage or Firebase
function initializeFavorites() {
    if (isUserSignedIn()) {
        loadUserFavorites();
    } else {
        loadLocalFavorites();
    }
}

// Load favorites from localStorage
function loadLocalFavorites() {
    userFavorites = storage.get('favorites') || [];
    updateFavoritesCount();
}

// Load user favorites from Firebase
async function loadUserFavorites() {
    if (!isFirebaseConfigured || !currentUser) return;
    
    try {
        const snapshot = await db.collection('favorites')
            .where('userId', '==', currentUser.uid)
            .get();
        
        userFavorites = snapshot.docs.map(doc => doc.data().productId);
        updateFavoritesCount();
    } catch (error) {
        console.error('Error loading favorites:', error);
        loadLocalFavorites();
    }
}

// Clear user favorites (on sign out)
function clearUserFavorites() {
    userFavorites = [];
    updateFavoritesCount();
}

// Toggle favorite
async function toggleFavorite(productId) {
    if (!isUserSignedIn()) {
        showToast('Please sign in to save favorites', 'info');
        setTimeout(() => showLoginModal(), 500);
        return;
    }
    
    const index = userFavorites.indexOf(productId);
    
    if (index > -1) {
        // Remove from favorites
        await removeFavorite(productId);
    } else {
        // Add to favorites
        await addFavorite(productId);
    }
}

// Add to favorites
async function addFavorite(productId) {
    if (isFirebaseConfigured && currentUser) {
        try {
            await db.collection('favorites').add({
                userId: currentUser.uid,
                productId: productId,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            userFavorites.push(productId);
            updateFavoritesUI(productId, true);
            showToast('Added to favorites', 'success');
        } catch (error) {
            console.error('Error adding favorite:', error);
            showToast('Failed to add favorite', 'error');
        }
    } else {
        // Use localStorage
        userFavorites.push(productId);
        storage.set('favorites', userFavorites);
        updateFavoritesUI(productId, true);
        showToast('Added to favorites', 'success');
    }
    
    updateFavoritesCount();
}

// Remove from favorites
async function removeFavorite(productId) {
    if (isFirebaseConfigured && currentUser) {
        try {
            const snapshot = await db.collection('favorites')
                .where('userId', '==', currentUser.uid)
                .where('productId', '==', productId)
                .get();
            
            snapshot.forEach(doc => doc.ref.delete());
            
            userFavorites = userFavorites.filter(id => id !== productId);
            updateFavoritesUI(productId, false);
            showToast('Removed from favorites', 'success');
        } catch (error) {
            console.error('Error removing favorite:', error);
            showToast('Failed to remove favorite', 'error');
        }
    } else {
        // Use localStorage
        userFavorites = userFavorites.filter(id => id !== productId);
        storage.set('favorites', userFavorites);
        updateFavoritesUI(productId, false);
        showToast('Removed from favorites', 'success');
    }
    
    updateFavoritesCount();
}

// Check if product is favorite
function isProductFavorite(productId) {
    return userFavorites.includes(productId);
}

// Update favorites UI
function updateFavoritesUI(productId, isFavorite) {
    const buttons = document.querySelectorAll(`[onclick="toggleFavorite('${productId}')"]`);
    
    buttons.forEach(button => {
        const icon = button.querySelector('i');
        if (isFavorite) {
            button.classList.add('active');
            icon.classList.remove('far');
            icon.classList.add('fas');
        } else {
            button.classList.remove('active');
            icon.classList.remove('fas');
            icon.classList.add('far');
        }
    });
}

// Update favorites count
function updateFavoritesCount() {
    const countElement = document.getElementById('favoritesCount');
    if (countElement) {
        const count = userFavorites.length;
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Get all favorite products
async function getFavoriteProducts() {
    if (userFavorites.length === 0) {
        return [];
    }
    
    try {
        const products = await getProducts();
        return products.filter(p => userFavorites.includes(p.id));
    } catch (error) {
        console.error('Error getting favorite products:', error);
        return [];
    }
}

// Load and display favorites page
async function loadFavoritesPage() {
    const container = document.getElementById('favoritesGrid');
    if (!container) return;
    
    if (!isUserSignedIn()) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-heart"></i>
                <h3>Sign In to View Favorites</h3>
                <p>Save your favorite products and access them anytime.</p>
                <button onclick="showLoginModal()" class="btn btn-primary">
                    <span>Sign In</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        return;
    }
    
    try {
        showLoading();
        const products = await getFavoriteProducts();
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-heart"></i>
                    <h3>Your Wishlist is Empty</h3>
                    <p>Start adding products you love to your favorites.</p>
                    <a href="/pages/shop.html" class="btn btn-primary">
                        <span>Explore Products</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `;
        } else {
            renderProducts(container, products);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading favorites:', error);
        showToast('Failed to load favorites', 'error');
        hideLoading();
    }
}

// Clear all favorites
async function clearAllFavorites() {
    if (!confirm('Are you sure you want to remove all favorites?')) {
        return;
    }
    
    if (isFirebaseConfigured && currentUser) {
        try {
            const snapshot = await db.collection('favorites')
                .where('userId', '==', currentUser.uid)
                .get();
            
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            userFavorites = [];
            updateFavoritesCount();
            showToast('All favorites cleared', 'success');
            
            // Reload page if on favorites page
            if (window.location.pathname.includes('favorites.html')) {
                loadFavoritesPage();
            }
        } catch (error) {
            console.error('Error clearing favorites:', error);
            showToast('Failed to clear favorites', 'error');
        }
    } else {
        userFavorites = [];
        storage.remove('favorites');
        updateFavoritesCount();
        showToast('All favorites cleared', 'success');
        
        if (window.location.pathname.includes('favorites.html')) {
            loadFavoritesPage();
        }
    }
}
