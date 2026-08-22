import { getFirebaseInstances, safeFirebaseOperation } from './firebase-init.js';
import { COLLECTIONS } from './config.js';
import { getCurrentUser } from './auth.js';
import { setState, getState } from './state.js';
import { showSuccessToast, showErrorToast } from './ui.js';

let favoritesListener = null;

/**
 * Initialize favorites listener
 */
export async function initFavoritesListener(userId) {
  if (!userId) return;
  
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, query, where, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    if (favoritesListener) {
      favoritesListener();
    }
    
    const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
    const q = query(favoritesRef, where('userId', '==', userId));
    
    favoritesListener = onSnapshot(
      q,
      (snapshot) => {
        const favorites = [];
        snapshot.forEach((doc) => {
          favorites.push({ id: doc.id, ...doc.data() });
        });
        
        setState('favorites', favorites);
        updateFavoriteButtons();
      },
      (error) => {
        console.error('Favorites listener error:', error);
      }
    );
    
    return favoritesListener;
  }, 'Failed to initialize favorites listener');
}

/**
 * Add to favorites
 */
export async function addToFavorites(productId) {
  const user = getCurrentUser();
  
  if (!user) {
    showErrorToast('Please sign in to save favorites');
    return false;
  }
  
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
    
    await addDoc(favoritesRef, {
      userId: user.uid,
      productId: productId,
      createdAt: serverTimestamp()
    });
    
    showSuccessToast('Added to favorites!');
    return true;
  }, 'Failed to add to favorites');
}

/**
 * Remove from favorites
 */
export async function removeFromFavorites(productId) {
  const user = getCurrentUser();
  
  if (!user) {
    return false;
  }
  
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, query, where, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
    const q = query(
      favoritesRef,
      where('userId', '==', user.uid),
      where('productId', '==', productId)
    );
    
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    showSuccessToast('Removed from favorites');
    return true;
  }, 'Failed to remove from favorites');
}

/**
 * Toggle favorite
 */
export async function toggleFavorite(productId) {
  if (isFavorite(productId)) {
    return await removeFromFavorites(productId);
  } else {
    return await addToFavorites(productId);
  }
}

/**
 * Check if product is favorite
 */
export function isFavorite(productId) {
  const favorites = getState('favorites');
  return favorites.some(f => f.productId === productId);
}

/**
 * Get favorite products
 */
export function getFavoriteProducts() {
  const favorites = getState('favorites');
  const products = getState('products');
  
  const favoriteProductIds = favorites.map(f => f.productId);
  return products.filter(p => favoriteProductIds.includes(p.id));
}

/**
 * Update favorite buttons UI
 */
function updateFavoriteButtons() {
  const favoriteButtons = document.querySelectorAll('.favorite-btn');
  
  favoriteButtons.forEach(btn => {
    const productId = btn.dataset.productId;
    if (isFavorite(productId)) {
      btn.classList.add('active');
      btn.innerHTML = '❤';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '♡';
    }
  });
}

/**
 * Clean up listeners
 */
export function cleanupFavoritesListener() {
  if (favoritesListener) {
    favoritesListener();
    favoritesListener = null;
  }
}
