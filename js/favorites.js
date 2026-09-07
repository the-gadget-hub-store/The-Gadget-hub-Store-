/* ================================
   THE GADGET HUB STORE
   Favorites Module
   ================================ */

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
  orderBy,
  Timestamp,
  isAuthenticated,
  getUserId
} from './firebase.js';

import {
  showToast,
  showLoading,
  showEmptyState,
  showError
} from './ui.js';

import {
  loadProductById,
  renderProductsGrid
} from './products.js';

/* ================================
   FAVORITES MANAGEMENT
   ================================ */

/**
 * Load user's favorite products
 */
export async function loadUserFavorites() {
  if (!isAuthenticated()) {
    return [];
  }

  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  const userId = getUserId();

  try {
    const favoritesCollection = collection(db, 'users', userId, 'favorites');
    const q = query(favoritesCollection, orderBy('addedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const favoriteIds = [];
    querySnapshot.forEach((doc) => {
      favoriteIds.push(doc.id);
    });

    console.log(`✅ Loaded ${favoriteIds.length} favorites`);
    return favoriteIds;
  } catch (error) {
    console.error('Error loading favorites:', error);
    throw error;
  }
}

/**
 * Load favorite products with full details
 */
export async function loadFavoriteProducts() {
  const favoriteIds = await loadUserFavorites();

  if (favoriteIds.length === 0) {
    return [];
  }

  const products = [];

  for (const productId of favoriteIds) {
    try {
      const product = await loadProductById(productId);
      products.push(product);
    } catch (error) {
      console.warn(`Could not load product ${productId}:`, error);
    }
  }

  console.log(`✅ Loaded ${products.length} favorite products with details`);
  return products;
}

/**
 * Add product to favorites
 */
export async function addToFavorites(productId) {
  if (!isAuthenticated()) {
    showToast('Please sign in to add favorites', 'warning');
    return false;
  }

  if (!isFirebaseInitialized()) {
    showToast('Service unavailable', 'error');
    return false;
  }

  const userId = getUserId();

  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', productId);
    await setDoc(favoriteRef, {
      productId: productId,
      addedAt: Timestamp.now()
    });

    console.log(`✅ Added product ${productId} to favorites`);
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    showToast('Failed to add to favorites', 'error');
    return false;
  }
}

/**
 * Remove product from favorites
 */
export async function removeFromFavorites(productId) {
  if (!isAuthenticated()) {
    return false;
  }

  if (!isFirebaseInitialized()) {
    showToast('Service unavailable', 'error');
    return false;
  }

  const userId = getUserId();

  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', productId);
    await deleteDoc(favoriteRef);

    console.log(`✅ Removed product ${productId} from favorites`);
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    showToast('Failed to remove from favorites', 'error');
    return false;
  }
}

/**
 * Check if product is in favorites
 */
export async function isProductFavorited(productId) {
  if (!isAuthenticated()) {
    return false;
  }

  if (!isFirebaseInitialized()) {
    return false;
  }

  const userId = getUserId();

  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', productId);
    const favoriteDoc = await getDoc(favoriteRef);
    return favoriteDoc.exists();
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(productId) {
  const isFavorited = await isProductFavorited(productId);

  if (isFavorited) {
    const removed = await removeFromFavorites(productId);
    if (removed) {
      showToast('Removed from favorites', 'success');
      return false;
    }
  } else {
    const added = await addToFavorites(productId);
    if (added) {
      showToast('Added to favorites', 'success');
      return true;
    }
  }

  return isFavorited;
}

/**
 * Update favorites badge
 */
export async function updateFavoritesBadge() {
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
   FAVORITES PAGE
   ================================ */

/**
 * Initialize favorites page
 */
export async function initializeFavoritesPage() {
  console.log('❤️ Initializing favorites page...');

  const favoritesContainer = document.getElementById('favoritesGrid');
  if (!favoritesContainer) {
    console.warn('Favorites container not found');
    return;
  }

  if (!isAuthenticated()) {
    favoritesContainer.innerHTML = `
      <div class="auth-required" style="text-align: center; padding: var(--spacing-3xl);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-muted); margin: 0 auto var(--spacing-lg);">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h2 style="margin-bottom: var(--spacing-md);">Sign in to view favorites</h2>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--spacing-lg);">
          Create an account or sign in to save your favorite products
        </p>
        <a href="account.html" class="btn btn-primary">Go to Account</a>
      </div>
    `;
    return;
  }

  showLoading(favoritesContainer, 'Loading your favorites...');

  try {
    const favoriteProducts = await loadFavoriteProducts();

    if (favoriteProducts.length === 0) {
      favoritesContainer.innerHTML = `
        <div class="empty-favorites" style="text-align: center; padding: var(--spacing-3xl);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-muted); margin: 0 auto var(--spacing-lg);">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <h2 style="margin-bottom: var(--spacing-md);">No favorites yet</h2>
          <p style="color: var(--color-text-tertiary); margin-bottom: var(--spacing-lg);">
            Start adding products to your favorites to see them here
          </p>
          <a href="shop.html" class="btn btn-primary">Browse Products</a>
        </div>
      `;
      return;
    }

    renderProductsGrid(favoriteProducts, 'favoritesGrid');
    setupFavoritesPageHandlers();

    console.log('✅ Favorites page initialized');
  } catch (error) {
    console.error('Error initializing favorites page:', error);
    showError(favoritesContainer, 'Failed to load favorites');
  }
}

/**
 * Setup favorites page handlers
 */
function setupFavoritesPageHandlers() {
  const favoritesContainer = document.getElementById('favoritesGrid');
  if (!favoritesContainer) return;

  favoritesContainer.addEventListener('click', async (e) => {
    const favoriteBtn = e.target.closest('.product-favorite');
    if (!favoriteBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const productId = favoriteBtn.dataset.productId;
    const removed = await removeFromFavorites(productId);

    if (removed) {
      showToast('Removed from favorites', 'success');
      await updateFavoritesBadge();
      
      // Refresh favorites page
      setTimeout(() => {
        initializeFavoritesPage();
      }, 500);
    }
  });
}

/* ================================
   AUTO-INITIALIZATION
   ================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);

    if (page === 'favorites.html') {
      initializeFavoritesPage();
    }
  });
} else {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  if (page === 'favorites.html') {
    initializeFavoritesPage();
  }
}

console.log('📦 Favorites module loaded');
