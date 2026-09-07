/* ================================
   THE GADGET HUB STORE
   Admin Module
   ================================ */

import {
  isFirebaseInitialized,
  db,
  storage,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  isAuthenticated,
  getCurrentUser,
  validateFile,
  generateUniqueFileName,
  handleFirebaseError
} from './firebase.js';

import {
  showToast,
  showLoading,
  showEmptyState,
  showError,
  setButtonLoading,
  escapeHtml
} from './ui.js';

/* ================================
   ADMIN AUTHORIZATION CHECK
   ================================ */

let isAdmin = false;

async function checkAdminAccess() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }

  const user = getCurrentUser();
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      isAdmin = userData.isAdmin === true || userData.role === 'admin';
    }

    if (!isAdmin) {
      showUnauthorizedPage();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking admin access:', error);
    showUnauthorizedPage();
    return false;
  }
}

function redirectToLogin() {
  window.location.href = '../pages/account.html';
}

function showUnauthorizedPage() {
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: var(--spacing-lg);">
      <div>
        <h1 style="font-size: 3rem; margin-bottom: var(--spacing-md);">403</h1>
        <h2 style="margin-bottom: var(--spacing-md);">Access Denied</h2>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--spacing-lg);">
          You do not have permission to access this area.
        </p>
        <a href="../index.html" class="btn btn-primary">Go Home</a>
      </div>
    </div>
  `;
}

/* ================================
   PRODUCT MANAGEMENT
   ================================ */

export async function loadAdminProducts() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Loaded ${products.length} products for admin`);
    return products;
  } catch (error) {
    console.error('Error loading admin products:', error);
    throw error;
  }
}

export async function createProduct(productData) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Created product: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(productId, productData) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Updated product: ${productId}`);
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(productId) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    await deleteDoc(doc(db, 'products', productId));
    console.log(`✅ Deleted product: ${productId}`);
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/* ================================
   CATEGORY MANAGEMENT
   ================================ */

export async function loadAdminCategories() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const categoriesCollection = collection(db, 'categories');
    const querySnapshot = await getDocs(categoriesCollection);

    const categories = [];
    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data()
      });
    });

    categories.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    console.log(`✅ Loaded ${categories.length} categories for admin`);
    return categories;
  } catch (error) {
    console.error('Error loading admin categories:', error);
    throw error;
  }
}

export async function createCategory(categoryData) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...categoryData,
      createdAt: serverTimestamp()
    });

    console.log(`✅ Created category: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

export async function updateCategory(categoryId, categoryData) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, categoryData);

    console.log(`✅ Updated category: ${categoryId}`);
    return true;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

export async function deleteCategory(categoryId) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    console.log(`✅ Deleted category: ${categoryId}`);
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

/* ================================
   SETTINGS MANAGEMENT
   ================================ */

export async function loadSettings() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));

    if (!settingsDoc.exists()) {
      return null;
    }

    console.log('✅ Loaded global settings');
    return settingsDoc.data();
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
}

export async function updateSettings(settingsData) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const settingsRef = doc(db, 'settings', 'global');
    await setDoc(settingsRef, {
      ...settingsData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log('✅ Updated global settings');
    return true;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

/* ================================
   IMAGE UPLOAD
   ================================ */

export async function uploadProductImage(file, productId = null) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  const validation = validateFile(file, {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    const fileName = generateUniqueFileName(file.name);
    const path = productId ? `products/${productId}/${fileName}` : `products/${fileName}`;
    const fileRef = storageRef(storage, path);

    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);

    console.log(`✅ Uploaded image: ${fileName}`);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function uploadCategoryImage(file, categoryId = null) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  const validation = validateFile(file, {
    maxSize: 3 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    const fileName = generateUniqueFileName(file.name);
    const path = categoryId ? `categories/${categoryId}/${fileName}` : `categories/${fileName}`;
    const fileRef = storageRef(storage, path);

    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);

    console.log(`✅ Uploaded category image: ${fileName}`);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading category image:', error);
    throw error;
  }
}

/* ================================
   ADMIN DASHBOARD
   ================================ */

export async function loadDashboardStats() {
  if (!isFirebaseInitialized()) {
    return {
      totalProducts: 0,
      totalCategories: 0,
      featuredProducts: 0,
      trendingProducts: 0
    };
  }

  try {
    const [products, categories] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'categories'))
    ]);

    let featuredCount = 0;
    let trendingCount = 0;

    products.forEach((doc) => {
      const data = doc.data();
      if (data.featured) featuredCount++;
      if (data.trending) trendingCount++;
    });

    return {
      totalProducts: products.size,
      totalCategories: categories.size,
      featuredProducts: featuredCount,
      trendingProducts: trendingCount
    };
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    return {
      totalProducts: 0,
      totalCategories: 0,
      featuredProducts: 0,
      trendingProducts: 0
    };
  }
}

export async function initializeAdminDashboard() {
  console.log('📊 Initializing admin dashboard...');

  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return;

  const statsContainer = document.getElementById('dashboardStats');
  if (!statsContainer) return;

  showLoading(statsContainer, 'Loading dashboard...');

  try {
    const stats = await loadDashboardStats();

    statsContainer.innerHTML = `
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-2xl);">
        <div class="stat-card" style="background: var(--color-bg-glass); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--spacing-xl);">
          <h3 style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--color-accent);">${stats.totalProducts}</h3>
          <p style="color: var(--color-text-tertiary);">Total Products</p>
        </div>
        <div class="stat-card" style="background: var(--color-bg-glass); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--spacing-xl);">
          <h3 style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--color-secondary);">${stats.totalCategories}</h3>
          <p style="color: var(--color-text-tertiary);">Categories</p>
        </div>
        <div class="stat-card" style="background: var(--color-bg-glass); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--spacing-xl);">
          <h3 style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--color-primary);">${stats.featuredProducts}</h3>
          <p style="color: var(--color-text-tertiary);">Featured</p>
        </div>
        <div class="stat-card" style="background: var(--color-bg-glass); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--spacing-xl);">
          <h3 style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--color-success);">${stats.trendingProducts}</h3>
          <p style="color: var(--color-text-tertiary);">Trending</p>
        </div>
      </div>
      <div class="quick-actions" style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
        <a href="products.html" class="btn btn-primary">Manage Products</a>
        <a href="categories.html" class="btn btn-secondary">Manage Categories</a>
        <a href="settings.html" class="btn btn-outline">Settings</a>
      </div>
    `;

    console.log('✅ Admin dashboard initialized');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showError(statsContainer, 'Failed to load dashboard');
  }
}

/* ================================
   AUTO-INITIALIZATION
   ================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    
    if (path.includes('/admin/')) {
      const hasAccess = await checkAdminAccess();
      
      if (hasAccess && path.includes('index.html')) {
        initializeAdminDashboard();
      }
    }
  });
} else {
  (async () => {
    const path = window.location.pathname;
    
    if (path.includes('/admin/')) {
      const hasAccess = await checkAdminAccess();
      
      if (hasAccess && path.includes('index.html')) {
        initializeAdminDashboard();
      }
    }
  })();
}

console.log('📦 Admin module loaded');
