import { getFirebaseInstances, safeFirebaseOperation } from './firebase-init.js';
import { COLLECTIONS } from './config.js';
import { setState, getState } from './state.js';
import { showSuccessToast, handleFirebaseError } from './ui.js';

let categoriesListener = null;

/**
 * Initialize categories listener
 */
export async function initCategoriesListener() {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    if (categoriesListener) {
      categoriesListener();
    }
    
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const q = query(categoriesRef, orderBy('name', 'asc'));
    
    categoriesListener = onSnapshot(
      q,
      (snapshot) => {
        const categories = [];
        snapshot.forEach((doc) => {
          categories.push({ id: doc.id, ...doc.data() });
        });
        
        setState('categories', categories);
        console.log(`✅ Categories synchronized: ${categories.length} items`);
      },
      (error) => {
        console.error('Categories listener error:', error);
      }
    );
    
    return categoriesListener;
  }, 'Failed to initialize categories listener');
}

/**
 * Get all categories
 */
export async function getCategories() {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const snapshot = await getDocs(categoriesRef);
    
    const categories = [];
    snapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    
    setState('categories', categories);
    return categories;
  }, 'Failed to fetch categories');
}

/**
 * Get category by ID
 */
export async function getCategoryById(categoryId) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const snapshot = await getDoc(categoryRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    
    throw new Error('Category not found');
  }, 'Failed to fetch category');
}

/**
 * Create category
 */
export async function createCategory(categoryData) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    
    const newCategory = {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(categoriesRef, newCategory);
    showSuccessToast('Category created successfully!');
    
    return { id: docRef.id, ...newCategory };
  }, 'Failed to create category');
}

/**
 * Update category
 */
export async function updateCategory(categoryId, updates) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    showSuccessToast('Category updated successfully!');
  }, 'Failed to update category');
}

/**
 * Delete category
 */
export async function deleteCategory(categoryId) {
  return safeFirebaseOperation(async () => {
    const { db } = getFirebaseInstances();
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    await deleteDoc(categoryRef);
    
    showSuccessToast('Category deleted successfully!');
  }, 'Failed to delete category');
}

/**
 * Get product count by category
 */
export function getProductCountByCategory(categoryId) {
  const products = getState('products');
  return products.filter(p => p.category === categoryId).length;
}

/**
 * Clean up listeners
 */
export function cleanupCategoriesListener() {
  if (categoriesListener) {
    categoriesListener();
    categoriesListener = null;
  }
}
