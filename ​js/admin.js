import { getFirebaseInstances, safeFirebaseOperation } from './firebase-init.js';
import { COLLECTIONS, APP_SETTINGS } from './config.js';
import { requireAdmin } from './auth.js';
import { 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  uploadProductImage 
} from './products.js';
import {
  createCategory,
  updateCategory,
  deleteCategory
} from './categories.js';
import { 
  showSuccessToast, 
  showErrorToast, 
  setLoading,
  createEmptyState,
  createErrorState,
  handleFirebaseError
} from './ui.js';
import { getState, subscribe } from './state.js';

/**
 * Initialize admin dashboard
 */
export async function initAdminDashboard() {
  const hasAccess = await requireAdmin();
  
  if (!hasAccess) {
    return;
  }
  
  setupAdminUI();
  loadAdminData();
  setupAdminEventListeners();
}

/**
 * Setup admin UI
 */
function setupAdminUI() {
  // Mobile sidebar toggle
  const sidebarToggle = document.querySelector('.admin-sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  const overlay = document.querySelector('.admin-overlay');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      overlay?.classList.toggle('active');
    });
    
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
}

/**
 * Load admin data
 */
function loadAdminData() {
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('products.html')) {
    loadProductsAdmin();
  } else if (currentPage.includes('categories.html')) {
    loadCategoriesAdmin();
  } else if (currentPage.includes('settings.html')) {
    loadSettingsAdmin();
  } else {
    loadDashboardStats();
  }
}

/**
 * Load dashboard stats
 */
function loadDashboardStats() {
  subscribe('products', (products) => {
    updateStat('total-products', products.length);
  });
  
  subscribe('categories', (categories) => {
    updateStat('total-categories', categories.length);
  });
  
  const products = getState('products');
  const featuredCount = products.filter(p => p.featured).length;
  updateStat('featured-products', featuredCount);
}

/**
 * Update stat
 */
function updateStat(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

/**
 * Load products admin
 */
function loadProductsAdmin() {
  const productsTable = document.getElementById('products-table-body');
  
  if (!productsTable) return;
  
  // Subscribe to products updates
  subscribe('products', (products) => {
    renderProductsTable(products, productsTable);
  });
  
  // Initial render
  const products = getState('products');
  renderProductsTable(products, productsTable);
}

/**
 * Render products table
 */
function renderProductsTable(products, container) {
  if (products.length === 0) {
    container.innerHTML = '';
    const emptyState = createEmptyState(
      '📦',
      'No products yet',
      'Create your first product to get started',
      'Add Product',
      () => showProductModal()
    );
    container.parentElement.parentElement.appendChild(emptyState);
    return;
  }
  
  container.innerHTML = products.map(product => `
    <tr>
      <td>
        <img src="${product.thumbnail || product.images?.[0] || '/assets/images/placeholder.jpg'}" 
             alt="${product.title}" 
             style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" />
      </td>
      <td>${product.title}</td>
      <td>${product.category || 'Uncategorized'}</td>
      <td>$${product.price}</td>
      <td>
        ${product.featured ? '<span class="badge badge-success">Featured</span>' : ''}
        ${product.trending ? '<span class="badge badge-info">Trending</span>' : ''}
      </td>
      <td>
        <button class="btn-icon" onclick="editProduct('${product.id}')" title="Edit">
          ✏️
        </button>
        <button class="btn-icon" onclick="confirmDeleteProduct('${product.id}')" title="Delete">
          🗑️
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Show product modal
 */
export function showProductModal(productId = null) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const title = document.getElementById('modal-title');
  
  if (!modal || !form) return;
  
  if (productId) {
    title.textContent = 'Edit Product';
    loadProductData(productId, form);
  } else {
    title.textContent = 'Add New Product';
    form.reset();
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close product modal
 */
export function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Load product data into form
 */
async function loadProductData(productId, form) {
  try {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const snapshot = await getDoc(productRef);
    
    if (snapshot.exists()) {
      const product = snapshot.data();
      
      form.elements['product-id'].value = productId;
      form.elements['title'].value = product.title || '';
      form.elements['description'].value = product.description || '';
      form.elements['short-description'].value = product.shortDescription || '';
      form.elements['price'].value = product.price || '';
      form.elements['original-price'].value = product.originalPrice || '';
      form.elements['category'].value = product.category || '';
      form.elements['affiliate-url'].value = product.affiliateUrl || '';
      form.elements['stock-status'].value = product.stockStatus || 'in-stock';
      form.elements['featured'].checked = product.featured || false;
      form.elements['trending'].checked = product.trending || false;
      form.elements['bestseller'].checked = product.bestseller || false;
      
      // Display current image
      if (product.thumbnail) {
        const preview = document.getElementById('image-preview');
        if (preview) {
          preview.src = product.thumbnail;
          preview.style.display = 'block';
        }
      }
    }
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  }
}

/**
 * Handle product form submit
 */
export async function handleProductSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const productId = form.elements['product-id'].value;
  
  try {
    setLoading(submitBtn, true, 'Saving...');
    
    // Prepare product data
    const productData = {
      title: form.elements['title'].value.trim(),
      description: form.elements['description'].value.trim(),
      shortDescription: form.elements['short-description'].value.trim(),
      price: parseFloat(form.elements['price'].value),
      originalPrice: parseFloat(form.elements['original-price'].value) || null,
      category: form.elements['category'].value,
      affiliateUrl: form.elements['affiliate-url'].value.trim(),
      stockStatus: form.elements['stock-status'].value,
      featured: form.elements['featured'].checked,
      trending: form.elements['trending'].checked,
      bestseller: form.elements['bestseller'].checked,
      rating: 0,
      reviewCount: 0
    };
    
    // Calculate discount
    if (productData.originalPrice && productData.originalPrice > productData.price) {
      productData.discount = Math.round(
        ((productData.originalPrice - productData.price) / productData.originalPrice) * 100
      );
    }
    
    // Handle image upload
    const imageFile = form.elements['image'].files[0];
    if (imageFile) {
      const imageUrl = await uploadProductImage(imageFile);
      productData.thumbnail = imageUrl;
      productData.images = [imageUrl];
    }
    
    // Create or update product
    if (productId) {
      await updateProduct(productId, productData);
    } else {
      await createProduct(productData);
    }
    
    closeProductModal();
    form.reset();
  } catch (error) {
    console.error('Product submit error:', error);
    showErrorToast(handleFirebaseError(error));
  } finally {
    setLoading(submitBtn, false);
  }
}

/**
 * Confirm delete product
 */
export async function confirmDeleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }
  
  try {
    await deleteProduct(productId);
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  }
}

/**
 * Edit product
 */
export function editProduct(productId) {
  showProductModal(productId);
}

/**
 * Load categories admin
 */
function loadCategoriesAdmin() {
  const categoriesGrid = document.getElementById('categories-grid');
  
  if (!categoriesGrid) return;
  
  subscribe('categories', (categories) => {
    renderCategoriesGrid(categories, categoriesGrid);
  });
  
  const categories = getState('categories');
  renderCategoriesGrid(categories, categoriesGrid);
}

/**
 * Render categories grid
 */
function renderCategoriesGrid(categories, container) {
  if (categories.length === 0) {
    container.innerHTML = '';
    const emptyState = createEmptyState(
      '📂',
      'No categories yet',
      'Create your first category to organize products',
      'Add Category',
      () => showCategoryModal()
    );
    container.appendChild(emptyState);
    return;
  }
  
  container.innerHTML = categories.map(category => `
    <div class="category-admin-card">
      <div class="category-admin-icon">${category.icon || '📦'}</div>
      <h3>${category.name}</h3>
      <p>${category.description || ''}</p>
      <div class="category-admin-actions">
        <button class="btn btn-sm btn-outline" onclick="editCategory('${category.id}')">
          Edit
        </button>
        <button class="btn btn-sm btn-outline" onclick="confirmDeleteCategory('${category.id}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Show category modal
 */
export function showCategoryModal(categoryId = null) {
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const title = document.getElementById('category-modal-title');
  
  if (!modal || !form) return;
  
  if (categoryId) {
    title.textContent = 'Edit Category';
    loadCategoryData(categoryId, form);
  } else {
    title.textContent = 'Add New Category';
    form.reset();
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close category modal
 */
export function closeCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Load category data
 */
async function loadCategoryData(categoryId, form) {
  try {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const snapshot = await getDoc(categoryRef);
    
    if (snapshot.exists()) {
      const category = snapshot.data();
      
      form.elements['category-id'].value = categoryId;
      form.elements['name'].value = category.name || '';
      form.elements['description'].value = category.description || '';
      form.elements['icon'].value = category.icon || '';
    }
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  }
}

/**
 * Handle category form submit
 */
export async function handleCategorySubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const categoryId = form.elements['category-id'].value;
  
  try {
    setLoading(submitBtn, true, 'Saving...');
    
    const categoryData = {
      name: form.elements['name'].value.trim(),
      description: form.elements['description'].value.trim(),
      icon: form.elements['icon'].value.trim() || '📦',
      slug: form.elements['name'].value.trim().toLowerCase().replace(/\s+/g, '-')
    };
    
    if (categoryId) {
      await updateCategory(categoryId, categoryData);
    } else {
      await createCategory(categoryData);
    }
    
    closeCategoryModal();
    form.reset();
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  } finally {
    setLoading(submitBtn, false);
  }
}

/**
 * Confirm delete category
 */
export async function confirmDeleteCategory(categoryId) {
  if (!confirm('Are you sure you want to delete this category?')) {
    return;
  }
  
  try {
    await deleteCategory(categoryId);
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  }
}

/**
 * Edit category
 */
export function editCategory(categoryId) {
  showCategoryModal(categoryId);
}

/**
 * Load settings admin
 */
function loadSettingsAdmin() {
  loadSiteSettings();
  loadSocialSettings();
}

/**
 * Load site settings
 */
async function loadSiteSettings() {
  try {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'site');
    const snapshot = await getDoc(settingsRef);
    
    if (snapshot.exists()) {
      const settings = snapshot.data();
      const form = document.getElementById('site-settings-form');
      
      if (form) {
        form.elements['site-name'].value = settings.siteName || '';
        form.elements['site-description'].value = settings.siteDescription || '';
        form.elements['contact-email'].value = settings.contactEmail || '';
      }
    }
  } catch (error) {
    console.error('Error loading site settings:', error);
  }
}

/**
 * Load social settings
 */
async function loadSocialSettings() {
  try {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'social');
    const snapshot = await getDoc(settingsRef);
    
    if (snapshot.exists()) {
      const settings = snapshot.data();
      const form = document.getElementById('social-settings-form');
      
      if (form) {
        form.elements['facebook-url'].value = settings.facebookUrl || '';
        form.elements['instagram-url'].value = settings.instagramUrl || '';
        form.elements['youtube-url'].value = settings.youtubeUrl || '';
        form.elements['tiktok-url'].value = settings.tiktokUrl || '';
      }
    }
  } catch (error) {
    console.error('Error loading social settings:', error);
  }
}

/**
 * Handle site settings submit
 */
export async function handleSiteSettingsSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  try {
    setLoading(submitBtn, true, 'Saving...');
    
    const { db } = getFirebaseInstances();
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const settingsData = {
      siteName: form.elements['site-name'].value.trim(),
      siteDescription: form.elements['site-description'].value.trim(),
      contactEmail: form.elements['contact-email'].value.trim()
    };
    
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'site');
    await setDoc(settingsRef, settingsData, { merge: true });
    
    showSuccessToast('Settings saved successfully!');
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  } finally {
    setLoading(submitBtn, false);
  }
}

/**
 * Handle social settings submit
 */
export async function handleSocialSettingsSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  try {
    setLoading(submitBtn, true, 'Saving...');
    
    const { db } = getFirebaseInstances();
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const settingsData = {
      facebookUrl: form.elements['facebook-url'].value.trim(),
      instagramUrl: form.elements['instagram-url'].value.trim(),
      youtubeUrl: form.elements['youtube-url'].value.trim(),
      tiktokUrl: form.elements['tiktok-url'].value.trim()
    };
    
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'social');
    await setDoc(settingsRef, settingsData, { merge: true });
    
    showSuccessToast('Social links saved successfully!');
  } catch (error) {
    showErrorToast(handleFirebaseError(error));
  } finally {
    setLoading(submitBtn, false);
  }
}

/**
 * Setup admin event listeners
 */
function setupAdminEventListeners() {
  // Make functions globally available
  window.showProductModal = showProductModal;
  window.closeProductModal = closeProductModal;
  window.editProduct = editProduct;
  window.confirmDeleteProduct = confirmDeleteProduct;
  
  window.showCategoryModal = showCategoryModal;
  window.closeCategoryModal = closeCategoryModal;
  window.editCategory = editCategory;
  window.confirmDeleteCategory = confirmDeleteCategory;
  
  // Product form
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', handleProductSubmit);
  }
  
  // Category form
  const categoryForm = document.getElementById('category-form');
  if (categoryForm) {
    categoryForm.addEventListener('submit', handleCategorySubmit);
  }
  
  // Settings forms
  const siteSettingsForm = document.getElementById('site-settings-form');
  if (siteSettingsForm) {
    siteSettingsForm.addEventListener('submit', handleSiteSettingsSubmit);
  }
  
  const socialSettingsForm = document.getElementById('social-settings-form');
  if (socialSettingsForm) {
    socialSettingsForm.addEventListener('submit', handleSocialSettingsSubmit);
  }
  
  // Image preview
  const imageInput = document.getElementById('product-image');
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = document.getElementById('image-preview');
          if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
}
