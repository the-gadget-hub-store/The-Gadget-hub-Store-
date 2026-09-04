/* ============================================================
   THE GADGET HUB STORE - CATEGORIES MODULE
   Category data management and operations
   ============================================================ */

import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCollection,
  getDocument,
  listenToCollection
} from './firebase.js';

// ============================================================
// CATEGORY STATE
// ============================================================

let categoriesCache = [];
let categoriesListeners = [];

// ============================================================
// CATEGORY QUERIES
// ============================================================

/**
 * Get all categories
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of categories
 */
export async function getCategories(options = {}) {
  try {
    const queryOptions = {
      orderBy: {
        field: options.sortBy || 'name',
        direction: options.sortDirection || 'asc'
      }
    };

    const whereConditions = [];

    if (options.featured) {
      whereConditions.push({
        field: 'featured',
        operator: '==',
        value: true
      });
    }

    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    if (options.limit) {
      queryOptions.limit = options.limit;
    }

    const categories = await getCollection('categories', queryOptions);
    categoriesCache = categories;
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

/**
 * Get a single category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object|null>} Category object
 */
export async function getCategory(categoryId) {
  try {
    if (!categoryId) {
      console.warn('Category ID is required');
      return null;
    }

    const category = await getDocument('categories', categoryId);
    return category;
  } catch (error) {
    console.error('Error getting category:', error);
    return null;
  }
}

/**
 * Get category by slug
 * @param {string} slug - Category slug
 * @returns {Promise<Object|null>} Category object
 */
export async function getCategoryBySlug(slug) {
  try {
    if (!slug) {
      console.warn('Category slug is required');
      return null;
    }

    const categories = await getCollection('categories', {
      where: [{
        field: 'slug',
        operator: '==',
        value: slug
      }],
      limit: 1
    });

    return categories.length > 0 ? categories[0] : null;
  } catch (error) {
    console.error('Error getting category by slug:', error);
    return null;
  }
}

/**
 * Get featured categories
 * @param {number} limitCount - Number of categories to fetch
 * @returns {Promise<Array>} Array of featured categories
 */
export async function getFeaturedCategories(limitCount = 8) {
  try {
    return await getCategories({
      featured: true,
      limit: limitCount,
      sortBy: 'name',
      sortDirection: 'asc'
    });
  } catch (error) {
    console.error('Error getting featured categories:', error);
    return [];
  }
}

/**
 * Get category with product count
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object|null>} Category with product count
 */
export async function getCategoryWithProductCount(categoryId) {
  try {
    const category = await getCategory(categoryId);
    if (!category) return null;

    // Get products in this category
    const productsQuery = query(
      collection(db, 'products'),
      where('categoryId', '==', categoryId)
    );

    const productsSnapshot = await getDocs(productsQuery);
    const productCount = productsSnapshot.size;

    return {
      ...category,
      productCount
    };
  } catch (error) {
    console.error('Error getting category with product count:', error);
    return null;
  }
}

/**
 * Get all categories with product counts
 * @returns {Promise<Array>} Array of categories with product counts
 */
export async function getCategoriesWithProductCounts() {
  try {
    const categories = await getCategories();
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        try {
          const productsQuery = query(
            collection(db, 'products'),
            where('categoryId', '==', category.id)
          );

          const productsSnapshot = await getDocs(productsQuery);
          const productCount = productsSnapshot.size;

          return {
            ...category,
            productCount
          };
        } catch (error) {
          console.error(`Error getting product count for category ${category.id}:`, error);
          return {
            ...category,
            productCount: 0
          };
        }
      })
    );

    return categoriesWithCounts;
  } catch (error) {
    console.error('Error getting categories with product counts:', error);
    return [];
  }
}

// ============================================================
// REAL-TIME LISTENERS
// ============================================================

/**
 * Listen to categories collection changes
 * @param {Object} options - Query options
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function listenToCategories(options = {}, callback) {
  try {
    const queryOptions = {
      orderBy: {
        field: options.sortBy || 'name',
        direction: options.sortDirection || 'asc'
      }
    };

    const whereConditions = [];

    if (options.featured) {
      whereConditions.push({
        field: 'featured',
        operator: '==',
        value: true
      });
    }

    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    if (options.limit) {
      queryOptions.limit = options.limit;
    }

    return listenToCollection('categories', queryOptions, (categories, error) => {
      if (error) {
        console.error('Error listening to categories:', error);
        callback([], error);
      } else {
        categoriesCache = categories;
        callback(categories);
      }
    });
  } catch (error) {
    console.error('Error setting up categories listener:', error);
    return () => {};
  }
}

// ============================================================
// CATEGORY UTILITIES
// ============================================================

/**
 * Get category image URL
 * @param {Object} category - Category object
 * @returns {string} Image URL or placeholder
 */
export function getCategoryImage(category) {
  if (category.image) {
    return category.image;
  }

  return '/assets/images/placeholder-category.jpg';
}

/**
 * Generate category URL
 * @param {Object} category - Category object
 * @returns {string} Category URL
 */
export function getCategoryUrl(category) {
  if (category.slug) {
    return `/pages/categories.html?slug=${encodeURIComponent(category.slug)}`;
  }
  return `/pages/categories.html?id=${encodeURIComponent(category.id)}`;
}

/**
 * Generate category shop URL
 * @param {Object} category - Category object
 * @returns {string} Shop URL with category filter
 */
export function getCategoryShopUrl(category) {
  if (category.slug) {
    return `/pages/shop.html?category=${encodeURIComponent(category.slug)}`;
  }
  return `/pages/shop.html?category=${encodeURIComponent(category.id)}`;
}

/**
 * Generate category slug from name
 * @param {string} name - Category name
 * @returns {string} URL-friendly slug
 */
export function generateCategorySlug(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
}

/**
 * Validate category data
 * @param {Object} categoryData - Category data to validate
 * @returns {Object} Validation result
 */
export function validateCategoryData(categoryData) {
  const result = {
    valid: true,
    errors: []
  };

  // Validate name
  if (!categoryData.name || categoryData.name.trim() === '') {
    result.valid = false;
    result.errors.push('Category name is required.');
  }

  // Validate slug (if provided)
  if (categoryData.slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(categoryData.slug)) {
      result.valid = false;
      result.errors.push('Category slug can only contain lowercase letters, numbers, and hyphens.');
    }
  }

  return result;
}

/**
 * Search categories by name
 * @param {string} searchQuery - Search query
 * @returns {Promise<Array>} Array of matching categories
 */
export async function searchCategories(searchQuery) {
  try {
    const categories = await getCategories();

    if (!searchQuery || searchQuery.trim() === '') {
      return categories;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();

    const matchingCategories = categories.filter(category => {
      const nameMatch = category.name?.toLowerCase().includes(normalizedQuery);
      const descriptionMatch = category.description?.toLowerCase().includes(normalizedQuery);

      return nameMatch || descriptionMatch;
    });

    return matchingCategories;
  } catch (error) {
    console.error('Error searching categories:', error);
    return [];
  }
}

/**
 * Sort categories
 * @param {Array} categories - Categories to sort
 * @param {string} sortBy - Sort field
 * @returns {Array} Sorted categories
 */
export function sortCategories(categories, sortBy) {
  const sorted = [...categories];

  switch (sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
      break;

    case 'name-desc':
      sorted.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameB.localeCompare(nameA);
      });
      break;

    case 'product-count':
      sorted.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
      break;

    case 'featured':
      sorted.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      break;

    default:
      // Default: alphabetical by name
      sorted.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
      break;
  }

  return sorted;
}

/**
 * Get categories by IDs
 * @param {Array} categoryIds - Array of category IDs
 * @returns {Promise<Array>} Array of categories
 */
export async function getCategoriesByIds(categoryIds) {
  try {
    if (!categoryIds || categoryIds.length === 0) {
      return [];
    }

    const categoryPromises = categoryIds.map(id => getCategory(id));
    const categories = await Promise.all(categoryPromises);

    // Filter out null values (categories that don't exist)
    return categories.filter(cat => cat !== null);
  } catch (error) {
    console.error('Error getting categories by IDs:', error);
    return [];
  }
}

/**
 * Check if category exists
 * @param {string} categoryId - Category ID
 * @returns {Promise<boolean>} True if category exists
 */
export async function categoryExists(categoryId) {
  try {
    const category = await getCategory(categoryId);
    return category !== null;
  } catch (error) {
    console.error('Error checking category existence:', error);
    return false;
  }
}

/**
 * Check if category slug is available
 * @param {string} slug - Category slug
 * @param {string} excludeId - Category ID to exclude (for editing)
 * @returns {Promise<boolean>} True if slug is available
 */
export async function isCategorySlugAvailable(slug, excludeId = null) {
  try {
    if (!slug) return false;

    const category = await getCategoryBySlug(slug);

    if (!category) return true;

    // If editing, allow the same slug for the same category
    if (excludeId && category.id === excludeId) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking category slug availability:', error);
    return false;
  }
}

/**
 * Get category name by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<string>} Category name or 'Unknown'
 */
export async function getCategoryName(categoryId) {
  try {
    // Check cache first
    const cachedCategory = categoriesCache.find(cat => cat.id === categoryId);
    if (cachedCategory) {
      return cachedCategory.name || 'Unknown Category';
    }

    const category = await getCategory(categoryId);
    return category?.name || 'Unknown Category';
  } catch (error) {
    console.error('Error getting category name:', error);
    return 'Unknown Category';
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  return {
    cachedCategories: categoriesCache.length,
    activeListeners: categoriesListeners.length
  };
}

/**
 * Clear categories cache
 */
export function clearCategoriesCache() {
  categoriesCache = [];
}

/**
 * Get cached categories
 * @returns {Array} Cached categories
 */
export function getCachedCategories() {
  return [...categoriesCache];
}

/**
 * Update category in cache
 * @param {Object} category - Category object
 */
export function updateCategoryInCache(category) {
  const index = categoriesCache.findIndex(cat => cat.id === category.id);
  if (index !== -1) {
    categoriesCache[index] = category;
  } else {
    categoriesCache.push(category);
  }
}

/**
 * Remove category from cache
 * @param {string} categoryId - Category ID
 */
export function removeCategoryFromCache(categoryId) {
  categoriesCache = categoriesCache.filter(cat => cat.id !== categoryId);
}

// ============================================================
// FALLBACK CATEGORIES
// ============================================================

/**
 * Get default fallback categories (for demo/empty state)
 * Note: These are DEMO/FALLBACK only and never overwrite Firestore
 * @returns {Array} Array of fallback categories
 */
export function getFallbackCategories() {
  return [
    {
      id: 'demo-smart-gadgets',
      name: 'Smart Gadgets',
      slug: 'smart-gadgets',
      description: 'Innovative smart devices and accessories',
      image: '/assets/images/categories/smart-gadgets.jpg',
      featured: true,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-mobile-accessories',
      name: 'Mobile Accessories',
      slug: 'mobile-accessories',
      description: 'Essential accessories for your mobile devices',
      image: '/assets/images/categories/mobile-accessories.jpg',
      featured: true,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-gaming',
      name: 'Gaming',
      slug: 'gaming',
      description: 'Gaming gear and accessories',
      image: '/assets/images/categories/gaming.jpg',
      featured: true,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-smart-home',
      name: 'Smart Home',
      slug: 'smart-home',
      description: 'Connected home devices',
      image: '/assets/images/categories/smart-home.jpg',
      featured: true,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-audio',
      name: 'Audio',
      slug: 'audio',
      description: 'Headphones, speakers, and audio gear',
      image: '/assets/images/categories/audio.jpg',
      featured: true,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-wearables',
      name: 'Wearables',
      slug: 'wearables',
      description: 'Smartwatches and fitness trackers',
      image: '/assets/images/categories/wearables.jpg',
      featured: true,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-computer-accessories',
      name: 'Computer Accessories',
      slug: 'computer-accessories',
      description: 'Keyboards, mice, and PC accessories',
      image: '/assets/images/categories/computer-accessories.jpg',
      featured: false,
      productCount: 0,
      isDemo: true
    },
    {
      id: 'demo-car-gadgets',
      name: 'Car Gadgets',
      slug: 'car-gadgets',
      description: 'Tech accessories for your vehicle',
      image: '/assets/images/categories/car-gadgets.jpg',
      featured: false,
      productCount: 0,
      isDemo: true
    }
  ];
}

// ============================================================
// EXPORTS
// ============================================================

export {
  getCategories,
  getCategory,
  getCategoryBySlug,
  getFeaturedCategories,
  getCategoryWithProductCount,
  getCategoriesWithProductCounts,
  listenToCategories,
  getCategoryImage,
  getCategoryUrl,
  getCategoryShopUrl,
  generateCategorySlug,
  validateCategoryData,
  searchCategories,
  sortCategories,
  getCategoriesByIds,
  categoryExists,
  isCategorySlugAvailable,
  getCategoryName,
  getCacheStats,
  clearCategoriesCache,
  getCachedCategories,
  updateCategoryInCache,
  removeCategoryFromCache,
  getFallbackCategories
};

console.log('✅ Categories module loaded successfully');
