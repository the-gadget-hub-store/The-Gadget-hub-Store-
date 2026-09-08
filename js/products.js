/* ================================
   THE GADGET HUB STORE
   Products Module
   ================================ */

/**
 * Products Module
 *
 * Handles:
 * - Loading products from Firestore
 * - Rendering product cards
 * - Product filtering and sorting
 * - Live currency conversion
 * - Favorites management
 * - Product details
 * - Homepage product sections
 * - Featured deals
 *
 * IMPORTANT:
 * app.js is the single application orchestrator.
 * This module does NOT auto-initialize the homepage.
 */

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
  where,
  orderBy,
  limit,
  isAuthenticated,
  getUserId,
  Timestamp
} from './firebase.js';

import {
  showToast,
  showLoading,
  showEmptyState,
  showError,
  escapeHtml
} from './ui.js';

import {
  getCurrentCurrency,
  getExchangeRate
} from './app.js';

/* ================================
   INTERNAL STATE
   ================================ */

/*
 * Stores product data for grids that have
 * already been rendered.
 *
 * This allows the product prices to be
 * re-rendered when the user changes currency.
 */
const renderedProductGrids =
  new Map();

/*
 * Stores the currently displayed featured deal.
 * It is used when the currency changes.
 */
let currentFeaturedDeal = null;

let currentFeaturedDealContainer = null;

/*
 * Prevents multiple countdown timers from
 * being attached to the same deal container.
 */
const countdownTimers =
  new WeakMap();

/* ================================
   CURRENCY CONVERSION
   ================================ */

/**
 * Converts a USD-based product price into
 * the selected currency.
 *
 * All product prices in Firestore are treated
 * as USD base prices.
 */
export function convertCurrency(
  basePrice,
  targetCurrency = null
) {
  const numericPrice =
    Number(basePrice);

  if (
    !Number.isFinite(numericPrice)
  ) {
    return 0;
  }

  const currency =
    String(
      targetCurrency ||
      getCurrentCurrency() ||
      'USD'
    )
      .trim()
      .toUpperCase();

  const rate =
    Number(
      getExchangeRate(currency)
    );

  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return numericPrice;
  }

  return numericPrice * rate;
}

/**
 * Formats a numeric value according
 * to the target currency.
 */
export function formatPrice(
  price,
  currency = null
) {
  const selectedCurrency =
    String(
      currency ||
      getCurrentCurrency() ||
      'USD'
    )
      .trim()
      .toUpperCase();

  try {
    const numericPrice =
      Number(price);

    if (
      !Number.isFinite(numericPrice)
    ) {
      return `${selectedCurrency} 0.00`;
    }

    /*
     * JPY and KRW normally display without
     * decimal places.
     */
    const zeroDecimalCurrencies = [
      'JPY',
      'KRW'
    ];

    const useZeroDecimals =
      zeroDecimalCurrencies.includes(
        selectedCurrency
      );

    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: selectedCurrency,
        minimumFractionDigits:
          useZeroDecimals
            ? 0
            : 2,
        maximumFractionDigits:
          useZeroDecimals
            ? 0
            : 2
      }
    ).format(numericPrice);
  } catch (error) {
    console.error(
      'Error formatting price:',
      error
    );

    return `${selectedCurrency} ${Number(
      price || 0
    ).toFixed(2)}`;
  }
}

/**
 * Returns a product price already converted
 * and formatted for the current currency.
 */
export function getFormattedPrice(
  basePrice,
  targetCurrency = null
) {
  const currency =
    targetCurrency ||
    getCurrentCurrency();

  const convertedPrice =
    convertCurrency(
      basePrice,
      currency
    );

  return formatPrice(
    convertedPrice,
    currency
  );
}

/* ================================
   PRODUCT LOADING
   ================================ */

export async function loadProducts() {
  if (
    !isFirebaseInitialized()
  ) {
    throw new Error(
      'Firebase not initialized'
    );
  }

  try {
    const productsCollection =
      collection(
        db,
        'products'
      );

    const querySnapshot =
      await getDocs(
        productsCollection
      );

    const products = [];

    querySnapshot.forEach(
      (productDoc) => {
        products.push({
          id: productDoc.id,
          ...productDoc.data()
        });
      }
    );

    console.log(
      `✅ Loaded ${products.length} products`
    );

    return products;
  } catch (error) {
    console.error(
      'Error loading products:',
      error
    );

    throw error;
  }
}

export async function loadProductsByFilter(
  field,
  value,
  maxResults = 50
) {
  if (
    !isFirebaseInitialized()
  ) {
    throw new Error(
      'Firebase not initialized'
    );
  }

  try {
    const productsCollection =
      collection(
        db,
        'products'
      );

    const safeLimit =
      Number(maxResults);

    const q =
      query(
        productsCollection,
        where(
          field,
          '==',
          value
        ),
        limit(
          Number.isFinite(
            safeLimit
          ) && safeLimit > 0
            ? safeLimit
            : 50
        )
      );

    const querySnapshot =
      await getDocs(q);

    const products = [];

    querySnapshot.forEach(
      (productDoc) => {
        products.push({
          id: productDoc.id,
          ...productDoc.data()
        });
      }
    );

    console.log(
      `✅ Loaded ${products.length} products with ${field}=${value}`
    );

    return products;
  } catch (error) {
    console.error(
      `Error loading products by ${field}:`,
      error
    );

    throw error;
  }
}

export async function loadTrendingProducts(
  maxResults = 8
) {
  try {
    return await loadProductsByFilter(
      'trending',
      true,
      maxResults
    );
  } catch (error) {
    console.error(
      'Error loading trending products:',
      error
    );

    return [];
  }
}

export async function loadFeaturedProducts(
  maxResults = 8
) {
  try {
    return await loadProductsByFilter(
      'featured',
      true,
      maxResults
    );
  } catch (error) {
    console.error(
      'Error loading featured products:',
      error
    );

    return [];
  }
}

/* ================================
   CATEGORY PRODUCT LOADING
   ================================ */

/**
 * Loads products for a category.
 *
 * Primary lookup:
 *   categoryId
 *
 * Fallback lookups:
 *   categorySlug
 *   category
 *   categoryName
 *
 * The fallback support is important because
 * existing Firestore product documents may
 * use different category fields.
 */
export async function loadProductsByCategory(
  categoryId,
  maxResults = 50,
  categorySlug = '',
  categoryName = ''
) {
  if (
    !isFirebaseInitialized()
  ) {
    console.warn(
      'Firebase is not initialized while loading category products.'
    );

    return [];
  }

  const safeCategoryId =
    String(
      categoryId || ''
    ).trim();

  const safeCategorySlug =
    String(
      categorySlug || ''
    )
      .trim()
      .toLowerCase();

  const safeCategoryName =
    String(
      categoryName || ''
    ).trim();

  /*
   * Build possible category identifiers.
   * Empty values are excluded.
   */
  const attempts = [];

  if (safeCategoryId) {
    attempts.push({
      field: 'categoryId',
      value: safeCategoryId
    });
  }

  if (safeCategorySlug) {
    attempts.push({
      field: 'categorySlug',
      value: safeCategorySlug
    });
  }

  if (safeCategoryName) {
    attempts.push({
      field: 'category',
      value: safeCategoryName
    });
  }

  if (safeCategorySlug) {
    attempts.push({
      field: 'category',
      value: safeCategorySlug
    });
  }

  /*
   * Some existing products may store the
   * Firestore category document ID in a field
   * named "category".
   */
  if (
    safeCategoryId
  ) {
    attempts.push({
      field: 'category',
      value: safeCategoryId
    });
  }

  if (
    attempts.length === 0
  ) {
    return [];
  }

  const seenKeys =
    new Set();

  for (
    const attempt of attempts
  ) {
    const key =
      `${attempt.field}:${attempt.value}`;

    if (
      seenKeys.has(key)
    ) {
      continue;
    }

    seenKeys.add(key);

    try {
      const products =
        await loadProductsByFilter(
          attempt.field,
          attempt.value,
          maxResults
        );

      if (
        Array.isArray(products) &&
        products.length > 0
      ) {
        console.log(
          `✅ Category products found using ${attempt.field}=${attempt.value}`
        );

        return products;
      }
    } catch (error) {
      /*
       * A failed fallback query must not stop
       * the remaining category lookup attempts.
       */
      console.warn(
        `Category lookup failed for ${attempt.field}=${attempt.value}:`,
        error
      );
    }
  }

  console.warn(
    'No products found for category:',
    {
      categoryId:
        safeCategoryId,
      categorySlug:
        safeCategorySlug,
      categoryName:
        safeCategoryName
    }
  );

  return [];
}

/* ================================
   PRODUCT DETAILS
   ================================ */

export async function loadProductById(
  productId
) {
  if (
    !isFirebaseInitialized()
  ) {
    throw new Error(
      'Firebase not initialized'
    );
  }

  const id =
    String(
      productId || ''
    ).trim();

  if (!id) {
    throw new Error(
      'Product ID is required'
    );
  }

  try {
    const productDoc =
      await getDoc(
        doc(
          db,
          'products',
          id
        )
      );

    if (
      !productDoc.exists()
    ) {
      throw new Error(
        'Product not found'
      );
    }

    return {
      id: productDoc.id,
      ...productDoc.data()
    };
  } catch (error) {
    console.error(
      'Error loading product:',
      error
    );

    throw error;
  }
}

/* ================================
   DEAL PRODUCTS
   ================================ */

export async function loadDealProducts(
  maxResults = 8
) {
  if (
    !isFirebaseInitialized()
  ) {
    return [];
  }

  try {
    const productsCollection =
      collection(
        db,
        'products'
      );

    /*
     * Keep the existing Firestore query
     * so current deal functionality remains
     * compatible with the existing data model.
     */
    const q =
      query(
        productsCollection,
        where(
          'discount',
          '>',
          0
        ),
        orderBy(
          'discount',
          'desc'
        ),
        limit(
          maxResults
        )
      );

    const querySnapshot =
      await getDocs(q);

    const products = [];

    const now =
      new Date();

    querySnapshot.forEach(
      (productDoc) => {
        const data =
          productDoc.data();

        let isValidDeal =
          true;

        if (
          data.dealExpiration
        ) {
          let expirationDate;

          if (
            typeof data
              .dealExpiration
              .toDate ===
            'function'
          ) {
            expirationDate =
              data.dealExpiration.toDate();
          } else {
            expirationDate =
              new Date(
                data.dealExpiration
              );
          }

          if (
            Number.isNaN(
              expirationDate.getTime()
            ) ||
            expirationDate <= now
          ) {
            isValidDeal =
              false;
          }
        }

        if (
          isValidDeal
        ) {
          products.push({
            id:
              productDoc.id,
            ...data
          });
        }
      }
    );

    console.log(
      `✅ Loaded ${products.length} deal products`
    );

    return products;
  } catch (error) {
    console.error(
      'Error loading deal products:',
      error
    );

    return [];
  }
}

/* ================================
   PRODUCT RENDERING
   ================================ */

export function renderProductCard(
  product,
  currency = null
) {
  if (
    !product ||
    typeof product !== 'object'
  ) {
    return '';
  }

  const selectedCurrency =
    String(
      currency ||
      getCurrentCurrency() ||
      'USD'
    )
      .trim()
      .toUpperCase();

  const basePrice =
    Number(
      product.basePrice ??
      product.price ??
      0
    );

  const originalPrice =
    Number(
      product.originalPrice ??
      basePrice
    );

  const discount =
    Number(
      product.discount ??
      0
    );

  const currentPrice =
    convertCurrency(
      basePrice,
      selectedCurrency
    );

  const originalPriceConverted =
    convertCurrency(
      originalPrice,
      selectedCurrency
    );

  const formattedCurrentPrice =
    formatPrice(
      currentPrice,
      selectedCurrency
    );

  const formattedOriginalPrice =
    formatPrice(
      originalPriceConverted,
      selectedCurrency
    );

  const imageUrl =
    product.thumbnail ||
    (
      Array.isArray(
        product.images
      )
        ? product.images[0]
        : ''
    ) ||
    '/assets/images/placeholder.jpg';

  const rating =
    Math.min(
      5,
      Math.max(
        0,
        Number(
          product.rating || 0
        )
      )
    );

  const stars =
    renderStars(
      rating
    );

  let badge = '';

  if (
    product.featured
  ) {
    badge =
      '<span class="product-badge">Featured</span>';
  } else if (
    product.trending
  ) {
    badge =
      '<span class="product-badge trending">Trending</span>';
  } else if (
    product.bestseller
  ) {
    badge =
      '<span class="product-badge bestseller">Bestseller</span>';
  } else if (
    product.newArrival
  ) {
    badge =
      '<span class="product-badge new">New</span>';
  }

  const productId =
    escapeHtml(
      String(
        product.id || ''
      )
    );

  const title =
    escapeHtml(
      product.title ||
      'Untitled Product'
    );

  const category =
    escapeHtml(
      product.category ||
      product.categoryName ||
      'Gadgets'
    );

  const safeImageUrl =
    escapeHtml(
      String(
        imageUrl
      )
    );

  const affiliateUrl =
    product.affiliateUrl
      ? escapeHtml(
          String(
            product.affiliateUrl
          )
        )
      : '';

  const reviewCount =
    Number(
      product.reviewCount ||
      0
    );

  const safeDiscount =
    Math.max(
      0,
      Math.min(
        100,
        discount
      )
    );

  return `
    <div
      class="product-card"
      data-product-id="${productId}"
    >
      <div class="product-image-container">
        <img
          src="${safeImageUrl}"
          alt="${title}"
          class="product-image"
          loading="lazy"
          decoding="async"
          onerror="this.onerror=null;this.src='/assets/images/placeholder.jpg';"
        >

        ${badge}

        <button
          class="product-favorite"
          data-product-id="${productId}"
          aria-label="Add to favorites"
          type="button"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </button>
      </div>

      <div class="product-content">
        <p class="product-category">
          ${category}
        </p>

        <h3 class="product-title">
          ${title}
        </h3>

        <div class="product-rating">
          <div class="product-stars">
            ${stars}
          </div>

          <span class="product-review-count">
            (${reviewCount})
          </span>
        </div>

        <div class="product-price">
          <span class="product-price-current">
            ${formattedCurrentPrice}
          </span>

          ${
            safeDiscount > 0
              ? `
                <span class="product-price-original">
                  ${formattedOriginalPrice}
                </span>

                <span class="product-discount">
                  -${safeDiscount}%
                </span>
              `
              : ''
          }
        </div>

        <div class="product-actions">
          ${
            affiliateUrl
              ? `
                <a
                  href="${affiliateUrl}"
                  class="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Shop on AliExpress
                </a>
              `
              : `
                <button
                  class="btn btn-outline"
                  disabled
                  type="button"
                >
                  Unavailable
                </button>
              `
          }
        </div>
      </div>
    </div>
  `;
}

/* ================================
   STAR RENDERING
   ================================ */

function renderStars(
  rating
) {
  const safeRating =
    Math.min(
      5,
      Math.max(
        0,
        Number(rating) || 0
      )
    );

  const fullStars =
    Math.floor(
      safeRating
    );

  const hasHalfStar =
    safeRating % 1 >= 0.5;

  const emptyStars =
    Math.max(
      0,
      5 -
        fullStars -
        (
          hasHalfStar
            ? 1
            : 0
        )
    );

  let html = '';

  for (
    let i = 0;
    i < fullStars;
    i++
  ) {
    html += `
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
    `;
  }

  if (
    hasHalfStar
  ) {
    html += `
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2"
        style="opacity: 0.5;"
        aria-hidden="true"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
    `;
  }

  for (
    let i = 0;
    i < emptyStars;
    i++
  ) {
    html += `
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        style="opacity: 0.3;"
        aria-hidden="true"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
    `;
  }

  return html;
}

/* ================================
   PRODUCT GRID
   ================================ */

/**
 * Resolves either:
 *
 * renderProductsGrid(products, 'gridId')
 *
 * OR:
 *
 * renderProductsGrid(products, domElement)
 */
function resolveContainer(
  containerId
) {
  if (
    typeof containerId ===
    'string'
  ) {
    return document.getElementById(
      containerId
    );
  }

  if (
    containerId &&
    typeof containerId ===
    'object' &&
    typeof containerId.innerHTML ===
    'string'
  ) {
    return containerId;
  }

  return null;
}

export function renderProductsGrid(
  products,
  containerId,
  currency = null
) {
  const container =
    resolveContainer(
      containerId
    );

  if (!container) {
    console.warn(
      'Product grid container not found:',
      containerId
    );

    return;
  }

  /*
   * Remember the products associated with
   * this grid so currency changes can trigger
   * a fresh render.
   */
  if (
    typeof container.id ===
      'string' &&
    container.id
  ) {
    renderedProductGrids.set(
      container.id,
      {
        container,
        products:
          Array.isArray(products)
            ? [...products]
            : []
      }
    );
  }

  if (
    !Array.isArray(products) ||
    products.length === 0
  ) {
    showEmptyState(
      container,
      'No products found'
    );

    return;
  }

  const selectedCurrency =
    currency ||
    getCurrentCurrency();

  const html =
    products
      .map(
        (product) =>
          renderProductCard(
            product,
            selectedCurrency
          )
      )
      .join('');

  container.innerHTML =
    html;

  setupFavoriteButtons(
    container
  );

  updateFavoriteButtonStates(
    container
  );

  console.log(
    `✅ Rendered ${products.length} products in ${
      container.id ||
      'product container'
    }`
  );
}

/* ================================
   FAVORITES
   ================================ */

function setupFavoriteButtons(
  container
) {
  const favoriteButtons =
    container.querySelectorAll(
      '.product-favorite'
    );

  favoriteButtons.forEach(
    (button) => {
      /*
       * Avoid attaching duplicate listeners
       * if the grid is rendered more than once.
       */
      if (
        button.dataset.favoriteInitialized ===
        'true'
      ) {
        return;
      }

      button.dataset.favoriteInitialized =
        'true';

      button.addEventListener(
        'click',
        async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const productId =
            button.dataset.productId;

          if (!productId) {
            return;
          }

          await toggleFavorite(
            productId,
            button
          );
        }
      );
    }
  );
}

async function updateFavoriteButtonStates(
  container
) {
  if (
    !isAuthenticated()
  ) {
    return;
  }

  try {
    const favorites =
      await loadUserFavorites();

    const favoriteSet =
      new Set(
        favorites
      );

    const buttons =
      container.querySelectorAll(
        '.product-favorite'
      );

    buttons.forEach(
      (button) => {
        const productId =
          button.dataset.productId;

        if (
          favoriteSet.has(
            productId
          )
        ) {
          button.classList.add(
            'active'
          );

          button.setAttribute(
            'aria-label',
            'Remove from favorites'
          );
        } else {
          button.classList.remove(
            'active'
          );

          button.setAttribute(
            'aria-label',
            'Add to favorites'
          );
        }
      }
    );
  } catch (error) {
    console.error(
      'Error updating favorite button states:',
      error
    );
  }
}

async function toggleFavorite(
  productId,
  button
) {
  if (
    !isAuthenticated()
  ) {
    showToast(
      'Please sign in to add favorites',
      'warning'
    );

    return;
  }

  if (
    !isFirebaseInitialized()
  ) {
    showToast(
      'Service unavailable',
      'error'
    );

    return;
  }

  const userId =
    getUserId();

  if (!userId) {
    showToast(
      'Unable to identify your account',
      'error'
    );

    return;
  }

  const isActive =
    button.classList.contains(
      'active'
    );

  try {
    const favoriteRef =
      doc(
        db,
        'users',
        userId,
        'favorites',
        productId
      );

    if (
      isActive
    ) {
      await deleteDoc(
        favoriteRef
      );

      button.classList.remove(
        'active'
      );

      button.setAttribute(
        'aria-label',
        'Add to favorites'
      );

      showToast(
        'Removed from favorites',
        'success'
      );
    } else {
      await setDoc(
        favoriteRef,
        {
          productId,
          addedAt:
            Timestamp.now()
        }
      );

      button.classList.add(
        'active'
      );

      button.setAttribute(
        'aria-label',
        'Remove from favorites'
      );

      showToast(
        'Added to favorites',
        'success'
      );
    }

    await updateFavoritesBadge();
  } catch (error) {
    console.error(
      'Error toggling favorite:',
      error
    );

    showToast(
      'Failed to update favorites',
      'error'
    );
  }
}

export async function loadUserFavorites() {
  if (
    !isAuthenticated() ||
    !isFirebaseInitialized()
  ) {
    return [];
  }

  const userId =
    getUserId();

  if (!userId) {
    return [];
  }

  try {
    const favoritesCollection =
      collection(
        db,
        'users',
        userId,
        'favorites'
      );

    const querySnapshot =
      await getDocs(
        favoritesCollection
      );

    const favorites = [];

    querySnapshot.forEach(
      (favoriteDoc) => {
        favorites.push(
          favoriteDoc.id
        );
      }
    );

    console.log(
      `✅ Loaded ${favorites.length} favorites`
    );

    return favorites;
  } catch (error) {
    console.error(
      'Error loading favorites:',
      error
    );

    return [];
  }
}

async function updateFavoritesBadge() {
  const badge =
    document.getElementById(
      'favoritesBadge'
    );

  if (!badge) {
    return;
  }

  if (
    !isAuthenticated()
  ) {
    badge.textContent =
      '0';

    return;
  }

  try {
    const favorites =
      await loadUserFavorites();

    badge.textContent =
      String(
        favorites.length
      );
  } catch (error) {
    console.error(
      'Error updating favorites badge:',
      error
    );

    badge.textContent =
      '0';
  }
}

/* ================================
   HOMEPAGE INITIALIZATION
   ================================ */

export async function initializeHomepageProducts() {
  console.log(
    '🏠 Initializing homepage products...'
  );

  const trendingContainer =
    document.getElementById(
      'trendingProductsGrid'
    );

  if (
    trendingContainer
  ) {
    showLoading(
      trendingContainer,
      'Loading trending products...'
    );

    try {
      const trendingProducts =
        await loadTrendingProducts(
          8
        );

      renderProductsGrid(
        trendingProducts,
        trendingContainer
      );
    } catch (error) {
      console.error(
        'Error loading trending products:',
        error
      );

      showError(
        trendingContainer,
        'Failed to load trending products'
      );
    }
  }

  const collectionContainer =
    document.getElementById(
      'trendingCollectionGrid'
    );

  if (
    collectionContainer
  ) {
    showLoading(
      collectionContainer,
      'Loading collection...'
    );

    try {
      const featuredProducts =
        await loadFeaturedProducts(
          8
        );

      renderProductsGrid(
        featuredProducts,
        collectionContainer
      );
    } catch (error) {
      console.error(
        'Error loading collection:',
        error
      );

      showError(
        collectionContainer,
        'Failed to load collection'
      );
    }
  }

  await initializeFeaturedDeal();

  console.log(
    '✅ Homepage products initialized'
  );
}

/* ================================
   FEATURED DEAL
   ================================ */

async function initializeFeaturedDeal() {
  const dealContainer =
    document.getElementById(
      'dealCard'
    );

  if (!dealContainer) {
    return;
  }

  showLoading(
    dealContainer,
    'Loading featured deal...'
  );

  try {
    const dealProducts =
      await loadDealProducts(
        1
      );

    if (
      dealProducts.length ===
      0
    ) {
      currentFeaturedDeal =
        null;

      currentFeaturedDealContainer =
        null;

      showEmptyState(
        dealContainer,
        'No active deals at the moment'
      );

      return;
    }

    const deal =
      dealProducts[0];

    currentFeaturedDeal =
      deal;

    currentFeaturedDealContainer =
      dealContainer;

    renderFeaturedDeal(
      deal,
      dealContainer
    );
  } catch (error) {
    console.error(
      'Error loading featured deal:',
      error
    );

    showError(
      dealContainer,
      'Failed to load deal'
    );
  }
}

function renderFeaturedDeal(
  product,
  container
) {
  if (
    !product ||
    !container
  ) {
    return;
  }

  const currency =
    getCurrentCurrency();

  const basePrice =
    Number(
      product.basePrice ??
      product.price ??
      0
    );

  const originalPrice =
    Number(
      product.originalPrice ??
      basePrice
    );

  const currentPrice =
    convertCurrency(
      basePrice,
      currency
    );

  const originalPriceConverted =
    convertCurrency(
      originalPrice,
      currency
    );

  const formattedCurrentPrice =
    formatPrice(
      currentPrice,
      currency
    );

  const formattedOriginalPrice =
    formatPrice(
      originalPriceConverted,
      currency
    );

  const imageUrl =
    product.thumbnail ||
    (
      Array.isArray(
        product.images
      )
        ? product.images[0]
        : ''
    ) ||
    '/assets/images/placeholder.jpg';

  let expirationDate =
    null;

  if (
    product.dealExpiration
  ) {
    if (
      typeof product
        .dealExpiration
        .toDate ===
      'function'
    ) {
      expirationDate =
        product.dealExpiration.toDate();
    } else {
      expirationDate =
        new Date(
          product.dealExpiration
        );
    }

    if (
      Number.isNaN(
        expirationDate.getTime()
      )
    ) {
      expirationDate =
        null;
    }
  }

  const countdownHtml =
    expirationDate
      ? renderCountdown(
          expirationDate
        )
      : '';

  const title =
    escapeHtml(
      product.title ||
      'Featured Deal'
    );

  const safeImageUrl =
    escapeHtml(
      String(
        imageUrl
      )
    );

  const affiliateUrl =
    product.affiliateUrl
      ? escapeHtml(
          String(
            product.affiliateUrl
          )
        )
      : '';

  const discount =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          product.discount || 0
        )
      )
    );

  /*
   * Stop an older countdown timer before
   * replacing the container's HTML.
   */
  stopCountdown(
    container
  );

  container.innerHTML = `
    <div class="deal-content">
      <h3>
        Limited Time Deal!
      </h3>

      <p class="deal-title">
        ${title}
      </p>

      ${countdownHtml}

      <div class="deal-price">
        <span class="deal-price-current">
          ${formattedCurrentPrice}
        </span>

        <span class="deal-price-original">
          ${formattedOriginalPrice}
        </span>

        <span class="deal-discount">
          Save ${discount}%
        </span>
      </div>

      ${
        affiliateUrl
          ? `
            <a
              href="${affiliateUrl}"
              class="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get This Deal
            </a>
          `
          : ''
      }
    </div>

    <div class="deal-image">
      <img
        src="${safeImageUrl}"
        alt="${title}"
        loading="lazy"
        decoding="async"
        onerror="this.onerror=null;this.src='/assets/images/placeholder.jpg';"
      >
    </div>
  `;

  if (
    expirationDate
  ) {
    startCountdown(
      expirationDate,
      container
    );
  }
}

/* ================================
   DEAL COUNTDOWN
   ================================ */

function renderCountdown(
  expirationDate
) {
  return `
    <div
      class="deal-timer"
      id="dealTimer"
    >
      <div class="timer-unit">
        <span
          class="timer-value"
          data-unit="days"
        >00</span>

        <span class="timer-label">
          Days
        </span>
      </div>

      <div class="timer-unit">
        <span
          class="timer-value"
          data-unit="hours"
        >00</span>

        <span class="timer-label">
          Hours
        </span>
      </div>

      <div class="timer-unit">
        <span
          class="timer-value"
          data-unit="minutes"
        >00</span>

        <span class="timer-label">
          Minutes
        </span>
      </div>

      <div class="timer-unit">
        <span
          class="timer-value"
          data-unit="seconds"
        >00</span>

        <span class="timer-label">
          Seconds
        </span>
      </div>
    </div>
  `;
}

function startCountdown(
  expirationDate,
  container
) {
  stopCountdown(
    container
  );

  let timerId =
    null;

  function updateCountdown() {
    const now =
      new Date();

    const diff =
      expirationDate.getTime() -
      now.getTime();

    if (
      diff <= 0
    ) {
      const timer =
        container.querySelector(
          '#dealTimer'
        );

      if (timer) {
        timer.innerHTML =
          '<p style="color: var(--color-error);">Deal Expired</p>';
      }

      if (
        timerId
      ) {
        clearTimeout(
          timerId
        );

        timerId =
          null;
      }

      countdownTimers.delete(
        container
      );

      return;
    }

    const days =
      Math.floor(
        diff /
        (
          1000 *
          60 *
          60 *
          24
        )
      );

    const hours =
      Math.floor(
        (
          diff %
          (
            1000 *
            60 *
            60 *
            24
          )
        ) /
        (
          1000 *
          60 *
          60
        )
      );

    const minutes =
      Math.floor(
        (
          diff %
          (
            1000 *
            60 *
            60
          )
        ) /
        (
          1000 *
          60
        )
      );

    const seconds =
      Math.floor(
        (
          diff %
          (
            1000 *
            60
          )
        ) /
        1000
      );

    const daysEl =
      container.querySelector(
        '[data-unit="days"]'
      );

    const hoursEl =
      container.querySelector(
        '[data-unit="hours"]'
      );

    const minutesEl =
      container.querySelector(
        '[data-unit="minutes"]'
      );

    const secondsEl =
      container.querySelector(
        '[data-unit="seconds"]'
      );

    if (daysEl) {
      daysEl.textContent =
        String(
          days
        ).padStart(
          2,
          '0'
        );
    }

    if (hoursEl) {
      hoursEl.textContent =
        String(
          hours
        ).padStart(
          2,
          '0'
        );
    }

    if (minutesEl) {
      minutesEl.textContent =
        String(
          minutes
        ).padStart(
          2,
          '0'
        );
    }

    if (secondsEl) {
      secondsEl.textContent =
        String(
          seconds
        ).padStart(
          2,
          '0'
        );
    }

    timerId =
      setTimeout(
        updateCountdown,
        1000
      );

    countdownTimers.set(
      container,
      timerId
    );
  }

  updateCountdown();
}

function stopCountdown(
  container
) {
  if (!container) {
    return;
  }

  const timerId =
    countdownTimers.get(
      container
    );

  if (
    timerId
  ) {
    clearTimeout(
      timerId
    );
  }

  countdownTimers.delete(
    container
  );
}

/* ================================
   CURRENCY CHANGE HANDLING
   ================================ */

document.addEventListener(
  'currencyChanged',
  () => {
    console.log(
      '💱 Currency changed, updating visible product prices...'
    );

    /*
     * Re-render every product grid that
     * was previously rendered.
     *
     * No Firestore request is required.
     */
    renderedProductGrids.forEach(
      (entry) => {
        if (
          !entry ||
          !entry.container ||
          !document.body.contains(
            entry.container
          )
        ) {
          return;
        }

        renderProductsGrid(
          entry.products,
          entry.container,
          getCurrentCurrency()
        );
      }
    );

    /*
     * Re-render the currently visible
     * featured deal using the new currency.
     *
     * The countdown is restarted safely.
     */
    if (
      currentFeaturedDeal &&
      currentFeaturedDealContainer &&
      document.body.contains(
        currentFeaturedDealContainer
      )
    ) {
      renderFeaturedDeal(
        currentFeaturedDeal,
        currentFeaturedDealContainer
      );
    }
  }
);

/* ================================
   CLEANUP
   ================================ */

/**
 * Removes references to product grids
 * that are no longer attached to the page.
 */
export function cleanupProductGridCache() {
  renderedProductGrids.forEach(
    (entry, key) => {
      if (
        !entry ||
        !entry.container ||
        !document.body.contains(
          entry.container
        )
      ) {
        renderedProductGrids.delete(
          key
        );
      }
    }
  );

  if (
    currentFeaturedDealContainer &&
    !document.body.contains(
      currentFeaturedDealContainer
    )
  ) {
    stopCountdown(
      currentFeaturedDealContainer
    );

    currentFeaturedDeal =
      null;

    currentFeaturedDealContainer =
      null;
  }
}

/* ================================
   AUTO-INITIALIZATION
   ================================ */

/*
 * IMPORTANT:
 *
 * Products are intentionally NOT initialized
 * automatically here.
 *
 * app.js is the single page orchestrator.
 *
 * This prevents:
 * - duplicate Firestore requests
 * - duplicate rendering
 * - duplicate event handlers
 * - homepage initialization races
 */

console.log(
  '📦 Products module loaded'
);
