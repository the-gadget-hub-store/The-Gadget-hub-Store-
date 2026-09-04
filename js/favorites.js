/* ============================================================
   THE GADGET HUB STORE - FAVORITES MODULE
   User favorites/wishlist management
   ============================================================ */

import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot
} from './firebase.js';

import {
  getCurrentUser,
  isAuthenticated,
  onAuthChange
} from './auth.js';

// ============================================================
// FAVORITES STATE
// ============================================================

let userFavorites = [];
let favoritesListener = null;
let favoritesChangeCallbacks = [];

// ============================================================
// INITIALIZE FAVORITES
// ============================================================

/**
 * Initialize favorites system
 */
export function initFavorites() {
  // Listen to auth state changes
  onAuthChange((user) => {
    if (user) {
      // User signed in - start listening to favorites
      startFavoritesListener(user.uid);
    } else {
      // User signed out - stop listening and clear favorites
      stopFavoritesListener();
      userFavorites = [];
      notifyFavoritesChange();
    }
  });
}

/**
 * Start real-time listener for user favorites
 * @param {string} userId - User ID
 */
function startFavoritesListener(userId) {
  try {
    // Stop existing listener if any
    stopFavoritesListener();

    const favoritesRef = doc(db, 'favorites', userId);

    favoritesListener = onSnapshot(
      favoritesRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          userFavorites = data.productIds || [];
        } else {
          userFavorites = [];
        }
        notifyFavoritesChange();
      },
      (error) => {
        console.error('Error listening to favorites:', error);
        userFavorites = [];
        notifyFavoritesChange();
      }
    );
  } catch (error) {
    console.error('Error starting favorites listener:', error);
  }
}

/**
 * Stop favorites listener
 */
function stopFavoritesListener() {
  if (favoritesListener) {
    favoritesListener();
    favoritesListener = null;
  }
}

/**
 * Notify all callbacks of favorites changes
 */
function notifyFavoritesChange() {
  favoritesChangeCallbacks.forEach(callback => {
    try {
      callback(userFavorites);
    } catch (error) {
      console.error('Error in favorites change callback:', error);
    }
  });
}

// ============================================================
// FAVORITES OPERATIONS
// ============================================================

/**
 * Add product to favorites
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Result object
 */
export async function addToFavorites(productId) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Please sign in to add favorites.',
        requiresAuth: true
      };
    }

    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Please sign in to add favorites.',
        requiresAuth: true
      };
    }

    if (!productId) {
      return {
        success: false,
        error: 'Invalid product ID.'
      };
    }

    // Check if already in favorites
    if (userFavorites.includes(productId)) {
      return {
        success: true,
        message: 'Product is already in favorites.',
        alreadyExists: true
      };
    }

    const favoritesRef = doc(db, 'favorites', user.uid);
    const favoritesDoc = await getDoc(favoritesRef);

    if (favoritesDoc.exists()) {
      // Update existing document
      await updateDoc(favoritesRef, {
        productIds: arrayUnion(productId),
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document
      await setDoc(favoritesRef, {
        userId: user.uid,
        productIds: [productId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    return {
      success: true,
      message: 'Added to favorites.'
    };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'You do not have permission to modify favorites.'
      };
    }

    return {
      success: false,
      error: 'Failed to add to favorites. Please try again.'
    };
  }
}

/**
 * Remove product from favorites
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Result object
 */
export async function removeFromFavorites(productId) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Please sign in to remove favorites.',
        requiresAuth: true
      };
    }

    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Please sign in to remove favorites.',
        requiresAuth: true
      };
    }

    if (!productId) {
      return {
        success: false,
        error: 'Invalid product ID.'
      };
    }

    // Check if in favorites
    if (!userFavorites.includes(productId)) {
      return {
        success: true,
        message: 'Product is not in favorites.',
        notFound: true
      };
    }

    const favoritesRef = doc(db, 'favorites', user.uid);

    await updateDoc(favoritesRef, {
      productIds: arrayRemove(productId),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Removed from favorites.'
    };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'You do not have permission to modify favorites.'
      };
    }

    return {
      success: false,
      error: 'Failed to remove from favorites. Please try again.'
    };
  }
}

/**
 * Toggle product favorite status
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Result object
 */
export async function toggleFavorite(productId) {
  try {
    if (isFavorite(productId)) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId);
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return {
      success: false,
      error: 'Failed to update favorites. Please try again.'
    };
  }
}

/**
 * Clear all favorites
 * @returns {Promise<Object>} Result object
 */
export async function clearFavorites() {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Please sign in to clear favorites.',
        requiresAuth: true
      };
    }

    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Please sign in to clear favorites.',
        requiresAuth: true
      };
    }

    const favoritesRef = doc(db, 'favorites', user.uid);
    
    await updateDoc(favoritesRef, {
      productIds: [],
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'All favorites cleared.'
    };
  } catch (error) {
    console.error('Error clearing favorites:', error);
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'You do not have permission to modify favorites.'
      };
    }

    return {
      success: false,
      error: 'Failed to clear favorites. Please try again.'
    };
  }
}

// ============================================================
// FAVORITES QUERIES
// ============================================================

/**
 * Get user favorites
 * @returns {Array} Array of product IDs
 */
export function getFavorites() {
  return [...userFavorites];
}

/**
 * Get favorites count
 * @returns {number} Number of favorites
 */
export function getFavoritesCount() {
  return userFavorites.length;
}

/**
 * Check if product is in favorites
 * @param {string} productId - Product ID
 * @returns {boolean} True if product is favorited
 */
export function isFavorite(productId) {
  if (!productId) return false;
  return userFavorites.includes(productId);
}

/**
 * Get user favorites document
 * @returns {Promise<Object|null>} Favorites document
 */
export async function getFavoritesDocument() {
  try {
    if (!isAuthenticated()) {
      return null;
    }

    const user = getCurrentUser();
    if (!user) {
      return null;
    }

    const favoritesRef = doc(db, 'favorites', user.uid);
    const favoritesDoc = await getDoc(favoritesRef);

    if (favoritesDoc.exists()) {
      return {
        id: favoritesDoc.id,
        ...favoritesDoc.data()
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting favorites document:', error);
    return null;
  }
}

// ============================================================
// FAVORITES LISTENERS
// ============================================================

/**
 * Subscribe to favorites changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onFavoritesChange(callback) {
  favoritesChangeCallbacks.push(callback);

  // Immediately call with current state
  callback(userFavorites);

  // Return unsubscribe function
  return () => {
    favoritesChangeCallbacks = favoritesChangeCallbacks.filter(cb => cb !== callback);
  };
}

// ============================================================
// UI HELPER FUNCTIONS
// ============================================================

/**
 * Update favorite button UI
 * @param {HTMLElement} button - Favorite button element
 * @param {string} productId - Product ID
 */
export function updateFavoriteButton(button, productId) {
  if (!button) return;

  const isFav = isFavorite(productId);
  
  if (isFav) {
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('title', 'Remove from favorites');
  } else {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('title', 'Add to favorites');
  }
}

/**
 * Update all favorite buttons on page
 */
export function updateAllFavoriteButtons() {
  const favoriteButtons = document.querySelectorAll('[data-favorite-btn]');
  
  favoriteButtons.forEach(button => {
    const productId = button.getAttribute('data-product-id');
    if (productId) {
      updateFavoriteButton(button, productId);
    }
  });
}

/**
 * Handle favorite button click
 * @param {string} productId - Product ID
 * @param {HTMLElement} button - Button element
 * @returns {Promise<void>}
 */
export async function handleFavoriteClick(productId, button = null) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Show toast/modal asking user to sign in
      if (window.showToast) {
        window.showToast('Please sign in to add favorites', 'warning');
      }
      
      // Optionally redirect to login
      if (window.showAuthRequired) {
        window.showAuthRequired('Please sign in to save favorites');
      }
      
      return;
    }

    // Disable button during operation
    if (button) {
      button.disabled = true;
    }

    const result = await toggleFavorite(productId);

    if (result.success) {
      // Update button UI
      if (button) {
        updateFavoriteButton(button, productId);
      }

      // Show success message
      if (window.showToast && !result.alreadyExists && !result.notFound) {
        const message = isFavorite(productId) 
          ? 'Added to favorites' 
          : 'Removed from favorites';
        window.showToast(message, 'success');
      }
    } else {
      // Show error message
      if (window.showToast) {
        window.showToast(result.error || 'Failed to update favorites', 'error');
      }
    }
  } catch (error) {
    console.error('Error handling favorite click:', error);
    if (window.showToast) {
      window.showToast('An error occurred. Please try again.', 'error');
    }
  } finally {
    // Re-enable button
    if (button) {
      button.disabled = false;
    }
  }
}

/**
 * Setup favorite button listeners
 */
export function setupFavoriteButtons() {
  const favoriteButtons = document.querySelectorAll('[data-favorite-btn]');
  
  favoriteButtons.forEach(button => {
    const productId = button.getAttribute('data-product-id');
    
    if (!productId) {
      console.warn('Favorite button missing data-product-id:', button);
      return;
    }

    // Remove existing listener to prevent duplicates
    button.removeEventListener('click', button._favoriteClickHandler);
    
    // Create and store handler
    button._favoriteClickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleFavoriteClick(productId, button);
    };
    
    // Add listener
    button.addEventListener('click', button._favoriteClickHandler);
    
    // Update initial state
    updateFavoriteButton(button, productId);
  });
}

/**
 * Update favorites count badge
 */
export function updateFavoritesCountBadge() {
  const countBadges = document.querySelectorAll('[data-favorites-count]');
  const count = getFavoritesCount();
  
  countBadges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  });
}

// ============================================================
// STORAGE HELPERS (for logged-out users)
// ============================================================

/**
 * Get temporary favorites from localStorage (for logged-out users)
 * @returns {Array} Array of product IDs
 */
export function getTempFavorites() {
  try {
    const temp = localStorage.getItem('tempFavorites');
    return temp ? JSON.parse(temp) : [];
  } catch (error) {
    console.error('Error getting temp favorites:', error);
    return [];
  }
}

/**
 * Save temporary favorites to localStorage
 * @param {Array} productIds - Array of product IDs
 */
export function saveTempFavorites(productIds) {
  try {
    localStorage.setItem('tempFavorites', JSON.stringify(productIds));
  } catch (error) {
    console.error('Error saving temp favorites:', error);
  }
}

/**
 * Clear temporary favorites
 */
export function clearTempFavorites() {
  try {
    localStorage.removeItem('tempFavorites');
  } catch (error) {
    console.error('Error clearing temp favorites:', error);
  }
}

/**
 * Sync temporary favorites to user account after login
 * @returns {Promise<Object>} Result object
 */
export async function syncTempFavorites() {
  try {
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated.'
      };
    }

    const tempFavorites = getTempFavorites();
    
    if (tempFavorites.length === 0) {
      return {
        success: true,
        message: 'No temporary favorites to sync.'
      };
    }

    const user = getCurrentUser();
    const favoritesRef = doc(db, 'favorites', user.uid);
    const favoritesDoc = await getDoc(favoritesRef);

    if (favoritesDoc.exists()) {
      // Merge with existing favorites
      const existingFavorites = favoritesDoc.data().productIds || [];
      const mergedFavorites = [...new Set([...existingFavorites, ...tempFavorites])];
      
      await updateDoc(favoritesRef, {
        productIds: mergedFavorites,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document with temp favorites
      await setDoc(favoritesRef, {
        userId: user.uid,
        productIds: tempFavorites,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Clear temporary favorites
    clearTempFavorites();

    return {
      success: true,
      message: `Synced ${tempFavorites.length} favorite(s).`,
      count: tempFavorites.length
    };
  } catch (error) {
    console.error('Error syncing temp favorites:', error);
    return {
      success: false,
      error: 'Failed to sync favorites.'
    };
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize favorites on module load
initFavorites();

// Subscribe to favorites changes to update UI
onFavoritesChange((favorites) => {
  updateAllFavoriteButtons();
  updateFavoritesCountBadge();
});

// ============================================================
// EXPORTS
// ============================================================

export {
  initFavorites,
  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  clearFavorites,
  getFavorites,
  getFavoritesCount,
  isFavorite,
  getFavoritesDocument,
  onFavoritesChange,
  updateFavoriteButton,
  updateAllFavoriteButtons,
  handleFavoriteClick,
  setupFavoriteButtons,
  updateFavoritesCountBadge,
  getTempFavorites,
  saveTempFavorites,
  clearTempFavorites,
  syncTempFavorites
};

console.log('✅ Favorites module loaded successfully');
