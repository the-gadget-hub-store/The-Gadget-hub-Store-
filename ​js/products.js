import { getFirebaseInstances, safeFirebaseOperation } from './firebase-init.js';
import { COLLECTIONS } from './config.js';
import { setState, getState } from './state.js';
import { showSuccessToast, showErrorToast, handleFirebaseError } from './ui.js';

let productsListener = null;

/**
 * Initialize products listener
 */
export async function initProductsListener() {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // Clean up existing listener
    if (productsListener) {
      productsListener();
    }
    
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    
    productsListener = onSnapshot(
      q,
      (snapshot) => {
        const products = [];
        snapshot.forEach((doc) => {
          products.push({ id: doc.id, ...doc.data() });
        });
        
        setState('products', products);
        console.log(`✅ Products synchronized: ${products.length} items`);
      },
      (error) => {
        console.error('Products listener error:', error);
        setState('ui', { ...getState('ui'), error: handleFirebaseError(error) });
      }
    );
    
    return productsListener;
  }, 'Failed to initialize products listener');
}

/**
 * Get all products
 */
export async function getProducts() {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const products = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    setState('products', products);
    return products;
  }, 'Failed to fetch products');
}

/**
 * Get product by ID
 */
export async function getProductById(productId) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const snapshot = await getDoc(productRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    
    throw new Error('Product not found');
  }, 'Failed to fetch product');
}

/**
 * Get featured products
 */
export function getFeaturedProducts() {
  const products = getState('products');
  return products.filter(p => p.featured === true);
}

/**
 * Get trending products
 */
export function getTrendingProducts() {
  const products = getState('products');
  return products.filter(p => p.trending === true);
}

/**
 * Get products by category
 */
export function getProductsByCategory(categoryId) {
  const products = getState('products');
  return products.filter(p => p.category === categoryId);
}

/**
 * Search products
 */
export function searchProducts(searchTerm) {
  const products = getState('products');
  const term = searchTerm.toLowerCase();
  
  return products.filter(product => {
    return (
      product.title?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term) ||
      product.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  });
}

/**
 * Filter products
 */
export function filterProducts(filters) {
  let products = getState('products');
  
  // Category filter
  if (filters.category) {
    products = products.filter(p => p.category === filters.category);
  }
  
  // Price range filter
  if (filters.minPrice !== null) {
    products = products.filter(p => p.price >= filters.minPrice);
  }
  
  if (filters.maxPrice !== null) {
    products = products.filter(p => p.price <= filters.maxPrice);
  }
  
  // Rating filter
  if (filters.rating) {
    products = products.filter(p => p.rating >= filters.rating);
  }
  
  // Search filter
  if (filters.search) {
    const term = filters.search.toLowerCase();
    products = products.filter(p =>
      p.title?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    );
  }
  
  return products;
}

/**
 * Sort products
 */
export function sortProducts(products, sortBy) {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'newest':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });
    case 'discount':
      return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    case 'featured':
    default:
      return sorted.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
  }
}

/**
 * Create product
 */
export async function createProduct(productData) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    
    const newProduct = {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(productsRef, newProduct);
    showSuccessToast('Product created successfully!');
    
    return { id: docRef.id, ...newProduct };
  }, 'Failed to create product');
}

/**
 * Update product
 */
export async function updateProduct(productId, updates) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    
    await updateDoc(productRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    showSuccessToast('Product updated successfully!');
  }, 'Failed to update product');
}

/**
 * Delete product
 */
export async function deleteProduct(productId) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    await deleteDoc(productRef);
    
    showSuccessToast('Product deleted successfully!');
  }, 'Failed to delete product');
}

/**
 * Upload product image
 */
export async function uploadProductImage(file) {
  return safeFirebaseOperation(async () => {
    const { storage } = getFirebaseInstances();
    const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    
    const fileName = `products/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  }, 'Failed to upload image');
}

/**
 * Clean up listeners
 */
export function cleanupProductsListener() {
  if (productsListener) {
    productsListener();
    productsListener = null;
  }
}
