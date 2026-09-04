/* ============================================================
   THE GADGET HUB STORE - PRODUCTS MODULE
   Product data management, queries, and operations
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
  startAfter,
  onSnapshot,
  getCollection,
  getDocument,
  listenToCollection
} from './firebase.js';

// ============================================================
// PRODUCT STATE
// ============================================================

let productsCache = [];
let lastVisibleProduct = null;
let productsListeners = [];

// ============================================================
// PRODUCT QUERIES
// ============================================================

/**
 * Get all products with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of products
 */
export async function getProducts(filters = {}) {
  try {
    const queryOptions = {
      orderBy: {
        field: filters.sortBy || 'createdAt',
        direction: filters.sortDirection || 'desc'
      }
    };

    // Apply where conditions
    const whereConditions = [];

    if (filters.category) {
      whereConditions.push({
        field: 'categoryId',
        operator: '==',
        value: filters.category
      });
    }

    if (filters.featured) {
      whereConditions.push({
        field: 'featured',
        operator: '==',
        value: true
      });
    }

    if (filters.trending) {
      whereConditions.push({
        field: 'trending',
        operator: '==',
        value: true
      });
    }

    if (filters.bestseller) {
      whereConditions.push({
        field: 'bestseller',
        operator: '==',
        value: true
      });
    }

    if (filters.newArrival) {
      whereConditions.push({
        field: 'newArrival',
        operator: '==',
        value: true
      });
    }

    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    if (filters.limit) {
      queryOptions.limit = filters.limit;
    }

    const products = await getCollection('products', queryOptions);
    productsCache = products;
    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
}

/**
 * Get a single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>} Product object
 */
export async function getProduct(productId) {
  try {
    if (!productId) {
      console.warn('Product ID is required');
      return null;
    }

    const product = await getDocument('products', productId);
    return product;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
}

/**
 * Get product by slug
 * @param {string} slug - Product slug
 * @returns {Promise<Object|null>} Product object
 */
export async function getProductBySlug(slug) {
  try {
    if (!slug) {
      console.warn('Product slug is required');
      return null;
    }

    const products = await getCollection('products', {
      where: [{
        field: 'slug',
        operator: '==',
        value: slug
      }],
      limit: 1
    });

    return products.length > 0 ? products[0] : null;
  } catch (error) {
    console.error('Error getting product by slug:', error);
    return null;
  }
}

/**
 * Get featured products
 * @param {number} limitCount - Number of products to fetch
 * @returns {Promise<Array>} Array of featured products
 */
export async function getFeaturedProducts(limitCount = 8) {
  try {
    return await getProducts({
      featured: true,
      limit: limitCount,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });
  } catch (error) {
    console.error('Error getting featured products:', error);
    return [];
  }
}

/**
 * Get trending products
 * @param {number} limitCount - Number of products to fetch
 * @returns {Promise<Array>} Array of trending products
 */
export async function getTrendingProducts(limitCount = 8) {
  try {
    return await getProducts({
      trending: true,
      limit: limitCount,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });
  } catch (error) {
    console.error('Error getting trending products:', error);
    return [];
  }
}

/**
 * Get bestseller products
 * @param {number} limitCount - Number of products to fetch
 * @returns {Promise<Array>} Array of bestseller products
 */
export async function getBestsellerProducts(limitCount = 8) {
  try {
    return await getProducts({
      bestseller: true,
      limit: limitCount,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });
  } catch (error) {
    console.error('Error getting bestseller products:', error);
    return [];
  }
}

/**
 * Get new arrival products
 * @param {number} limitCount - Number of products to fetch
 * @returns {Promise<Array>} Array of new arrival products
 */
export async function getNewArrivals(limitCount = 8) {
  try {
    return await getProducts({
      newArrival: true,
      limit: limitCount,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });
  } catch (error) {
    console.error('Error getting new arrivals:', error);
    return [];
  }
}

/**
 * Get products by category
 * @param {string} categoryId - Category ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of products
 */
export async function getProductsByCategory(categoryId, options = {}) {
  try {
    if (!categoryId) {
      console.warn('Category ID is required');
      return [];
    }

    return await getProducts({
      category: categoryId,
      ...options
    });
  } catch (error) {
    console.error('Error getting products by category:', error);
    return [];
  }
}

/**
 * Get deal products (products with active deals)
 * @param {number} limitCount - Number of products to fetch
 * @returns {Promise<Array>} Array of deal products
 */
export async function getDealProducts(limitCount = 8) {
  try {
    const allProducts = await getProducts({
      limit: 50,
      sortBy: 'discount',
      sortDirection: 'desc'
    });

    // Filter products with valid deals
    const now = new Date();
    const dealProducts = allProducts.filter(product => {
      if (!product.dealExpiration) return false;

      const expirationDate = product.dealExpiration.toDate 
        ? product.dealExpiration.toDate() 
        : new Date(product.dealExpiration);

      return expirationDate > now && product.discount > 0;
    });

    return dealProducts.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting deal products:', error);
    return [];
  }
}

/**
 * Get related products based on category
 * @param {string} productId - Current product ID
 * @param {string} categoryId - Category ID
 * @param {number} limitCount - Number of products to fetch
 * @returns {Promise<Array>} Array of related products
 */
export async function getRelatedProducts(productId, categoryId, limitCount = 4) {
  try {
    if (!categoryId) {
      console.warn('Category ID is required for related products');
      return [];
    }

    const products = await getProductsByCategory(categoryId, {
      limit: limitCount + 5
    });

    // Filter out current product
    const relatedProducts = products.filter(p => p.id !== productId);

    return relatedProducts.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting related products:', error);
    return [];
  }
}

// ============================================================
// SEARCH & FILTER
// ============================================================

/**
 * Search products by title and tags
 * @param {string} searchQuery - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of matching products
 */
export async function searchProducts(searchQuery, filters = {}) {
  try {
    // Get all products (or filtered subset)
    const products = await getProducts(filters);

    if (!searchQuery || searchQuery.trim() === '') {
      return products;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Client-side search across multiple fields
    const matchingProducts = products.filter(product => {
      const titleMatch = product.title?.toLowerCase().includes(normalizedQuery);
      const descriptionMatch = product.description?.toLowerCase().includes(normalizedQuery);
      const tagsMatch = product.tags?.some(tag => 
        tag.toLowerCase().includes(normalizedQuery)
      );
      const categoryMatch = product.category?.toLowerCase().includes(normalizedQuery);

      return titleMatch || descriptionMatch || tagsMatch || categoryMatch;
    });

    return matchingProducts;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

/**
 * Filter products by price range
 * @param {Array} products - Products to filter
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @returns {Array} Filtered products
 */
export function filterByPriceRange(products, minPrice, maxPrice) {
  return products.filter(product => {
    const price = product.price || product.basePrice || 0;
    return price >= minPrice && price <= maxPrice;
  });
}

/**
 * Filter products by rating
 * @param {Array} products - Products to filter
 * @param {number} minRating - Minimum rating
 * @returns {Array} Filtered products
 */
export function filterByRating(products, minRating) {
  return products.filter(product => {
    const rating = product.rating || 0;
    return rating >= minRating;
  });
}

/**
 * Filter products by availability
 * @param {Array} products - Products to filter
 * @param {string} stockStatus - Stock status ('in-stock', 'out-of-stock')
 * @returns {Array} Filtered products
 */
export function filterByAvailability(products, stockStatus) {
  return products.filter(product => {
    return product.stockStatus === stockStatus;
  });
}

/**
 * Sort products
 * @param {Array} products - Products to sort
 * @param {string} sortBy - Sort field
 * @returns {Array} Sorted products
 */
export function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low-high':
      sorted.sort((a, b) => {
        const priceA = a.price || a.basePrice || 0;
        const priceB = b.price || b.basePrice || 0;
        return priceA - priceB;
      });
      break;

    case 'price-high-low':
      sorted.sort((a, b) => {
        const priceA = a.price || a.basePrice || 0;
        const priceB = b.price || b.basePrice || 0;
        return priceB - priceA;
      });
      break;

    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;

    case 'popular':
      sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;

    case 'discount':
      sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      break;

    case 'newest':
      sorted.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      break;

    case 'featured':
    default:
      // Featured products first, then by creation date
      sorted.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      break;
  }

  return sorted;
}

// ============================================================
// REAL-TIME LISTENERS
// ============================================================

/**
 * Listen to products collection changes
 * @param {Object} filters - Filter options
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function listenToProducts(filters = {}, callback) {
  try {
    const queryOptions = {
      orderBy: {
        field: filters.sortBy || 'createdAt',
        direction: filters.sortDirection || 'desc'
      }
    };

    const whereConditions = [];

    if (filters.category) {
      whereConditions.push({
        field: 'categoryId',
        operator: '==',
        value: filters.category
      });
    }

    if (filters.featured) {
      whereConditions.push({
        field: 'featured',
        operator: '==',
        value: true
      });
    }

    if (filters.trending) {
      whereConditions.push({
        field: 'trending',
        operator: '==',
        value: true
      });
    }

    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    if (filters.limit) {
      queryOptions.limit = filters.limit;
    }

    return listenToCollection('products', queryOptions, (products, error) => {
      if (error) {
        console.error('Error listening to products:', error);
        callback([], error);
      } else {
        productsCache = products;
        callback(products);
      }
    });
  } catch (error) {
    console.error('Error setting up products listener:', error);
    return () => {};
  }
}

// ============================================================
// PRODUCT UTILITIES
// ============================================================

/**
 * Calculate final price after discount
 * @param {Object} product - Product object
 * @returns {number} Final price
 */
export function calculateFinalPrice(product) {
  const basePrice = product.price || product.basePrice || 0;
  const discount = product.discount || 0;

  if (discount > 0) {
    return basePrice * (1 - discount / 100);
  }

  return basePrice;
}

/**
 * Calculate savings amount
 * @param {Object} product - Product object
 * @returns {number} Savings amount
 */
export function calculateSavings(product) {
  const originalPrice = product.originalPrice || product.price || product.basePrice || 0;
  const finalPrice = calculateFinalPrice(product);
  return Math.max(0, originalPrice - finalPrice);
}

/**
 * Check if product has active deal
 * @param {Object} product - Product object
 * @returns {boolean} True if deal is active
 */
export function hasActiveDeal(product) {
  if (!product.dealExpiration || !product.discount || product.discount <= 0) {
    return false;
  }

  const now = new Date();
  const expirationDate = product.dealExpiration.toDate 
    ? product.dealExpiration.toDate() 
    : new Date(product.dealExpiration);

  return expirationDate > now;
}

/**
 * Get time remaining for deal
 * @param {Object} product - Product object
 * @returns {Object|null} Time remaining object
 */
export function getDealTimeRemaining(product) {
  if (!hasActiveDeal(product)) {
    return null;
  }

  const now = new Date();
  const expirationDate = product.dealExpiration.toDate 
    ? product.dealExpiration.toDate() 
    : new Date(product.dealExpiration);

  const timeDiff = expirationDate - now;

  if (timeDiff <= 0) {
    return null;
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

/**
 * Get product image URL
 * @param {Object} product - Product object
 * @param {number} index - Image index
 * @returns {string} Image URL or placeholder
 */
export function getProductImage(product, index = 0) {
  if (product.images && product.images.length > index) {
    return product.images[index];
  }

  if (product.thumbnail) {
    return product.thumbnail;
  }

  return '/assets/images/placeholder-product.jpg';
}

/**
 * Get product thumbnail
 * @param {Object} product - Product object
 * @returns {string} Thumbnail URL or placeholder
 */
export function getProductThumbnail(product) {
  return product.thumbnail || getProductImage(product, 0);
}

/**
 * Get product rating stars HTML
 * @param {number} rating - Rating value
 * @returns {string} HTML string for stars
 */
export function getProductRatingStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = '';

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="star star-full">★</i>';
  }

  if (hasHalfStar) {
    starsHTML += '<i class="star star-half">★</i>';
  }

  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="star star-empty">☆</i>';
  }

  return starsHTML;
}

/**
 * Generate product URL
 * @param {Object} product - Product object
 * @returns {string} Product URL
 */
export function getProductUrl(product) {
  if (product.slug) {
    return `/pages/product.html?slug=${encodeURIComponent(product.slug)}`;
  }
  return `/pages/product.html?id=${encodeURIComponent(product.id)}`;
}

/**
 * Validate affiliate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidAffiliateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Check if it's an AliExpress URL
    return urlObj.hostname.includes('aliexpress.com') || 
           urlObj.hostname.includes('s.click.aliexpress.com');
  } catch (error) {
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  return {
    cachedProducts: productsCache.length,
    activeListeners: productsListeners.length
  };
}

/**
 * Clear products cache
 */
export function clearProductsCache() {
  productsCache = [];
  lastVisibleProduct = null;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  getProducts,
  getProduct,
  getProductBySlug,
  getFeaturedProducts,
  getTrendingProducts,
  getBestsellerProducts,
  getNewArrivals,
  getProductsByCategory,
  getDealProducts,
  getRelatedProducts,
  searchProducts,
  filterByPriceRange,
  filterByRating,
  filterByAvailability,
  sortProducts,
  listenToProducts,
  calculateFinalPrice,
  calculateSavings,
  hasActiveDeal,
  getDealTimeRemaining,
  getProductImage,
  getProductThumbnail,
  getProductRatingStars,
  getProductUrl,
  isValidAffiliateUrl,
  getCacheStats,
  clearProductsCache
};

console.log('✅ Products module loaded successfully');
