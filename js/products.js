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
 * - Currency conversion
 * - Favorites management
 * - Product details
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

import { getCurrentCurrency } from './app.js';

/* ================================
   CURRENCY CONVERSION
   ================================ */

const EXCHANGE_RATES = {
  USD: 1.0,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  CNY: 7.24,
  JPY: 149.50,
  KRW: 1320.00,
  INR: 83.12,
  PKR: 278.50,
  BDT: 109.75,
  NPR: 132.95,
  AED: 3.67,
  SAR: 3.75,
  TRY: 32.15,
  MYR: 4.72,
  IDR: 15625.00,
  SGD: 1.34,
  THB: 35.80,
  ZAR: 18.65
};

function convertCurrency(basePrice, targetCurrency = 'USD') {
  const numericPrice = Number(basePrice);

  if (!Number.isFinite(numericPrice)) {
    return 0;
  }

  const rate = EXCHANGE_RATES[targetCurrency] || 1.0;
  return numericPrice * rate;
}

function formatPrice(price, currency = 'USD') {
  try {
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice)) {
      return `${currency} 0.00`;
    }

    const zeroDecimalCurrencies = ['JPY', 'KRW'];
    const minimumFractionDigits =
      zeroDecimalCurrencies.includes(currency) ? 0 : 2;
    const maximumFractionDigits =
      zeroDecimalCurrencies.includes(currency) ? 0 : 2;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(numericPrice);
  } catch (error) {
    console.error('Error formatting price:', error);
    return `${currency} ${Number(price || 0).toFixed(2)}`;
  }
}

export function getFormattedPrice(basePrice, targetCurrency = null) {
  const currency = targetCurrency || getCurrentCurrency();
  const convertedPrice = convertCurrency(basePrice, currency);

  return formatPrice(convertedPrice, currency);
}

/* ================================
   PRODUCT LOADING
   ================================ */

export async function loadProducts() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const productsCollection = collection(db, 'products');
    const querySnapshot = await getDocs(productsCollection);

    const products = [];

    querySnapshot.forEach((productDoc) => {
      products.push({
        id: productDoc.id,
        ...productDoc.data()
      });
    });

    console.log(`✅ Loaded ${products.length} products`);
    return products;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}

export async function loadProductsByFilter(
  field,
  value,
  maxResults = 50
) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const productsCollection = collection(db, 'products');

    const q = query(
      productsCollection,
      where(field, '==', value),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    const products = [];

    querySnapshot.forEach((productDoc) => {
      products.push({
        id: productDoc.id,
        ...productDoc.data()
      });
    });

    console.log(
      `✅ Loaded ${products.length} products with ${field}=${value}`
    );

    return products;
  } catch (error) {
    console.error('Error loading filtered products:', error);
    throw error;
  }
}

export async function loadTrendingProducts(maxResults = 8) {
  try {
    return await loadProductsByFilter(
      'trending',
      true,
      maxResults
    );
  } catch (error) {
    console.error('Error loading trending products:', error);
    return [];
  }
}

export async function loadFeaturedProducts(maxResults = 8) {
  try {
    return await loadProductsByFilter(
      'featured',
      true,
      maxResults
    );
  } catch (error) {
    console.error('Error loading featured products:', error);
    return [];
  }
}

export async function loadProductsByCategory(
  categoryId,
  maxResults = 50
) {
  try {
    return await loadProductsByFilter(
      'categoryId',
      categoryId,
      maxResults
    );
  } catch (error) {
    console.error('Error loading products by category:', error);
    return [];
  }
}

export async function loadProductById(productId) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  if (!productId) {
    throw new Error('Product ID is required');
  }

  try {
    const productDoc = await getDoc(
      doc(db, 'products', productId)
    );

    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }

    return {
      id: productDoc.id,
      ...productDoc.data()
    };
  } catch (error) {
    console.error('Error loading product:', error);
    throw error;
  }
}

export async function loadDealProducts(maxResults = 8) {
  if (!isFirebaseInitialized()) {
    return [];
  }

  try {
    const productsCollection = collection(db, 'products');

    const q = query(
      productsCollection,
      where('discount', '>', 0),
      orderBy('discount', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);

    const products = [];
    const now = new Date();

    querySnapshot.forEach((productDoc) => {
      const data = productDoc.data();

      let isValidDeal = true;

      if (data.dealExpiration) {
        let expirationDate;

        if (
          data.dealExpiration &&
          typeof data.dealExpiration.toDate === 'function'
        ) {
          expirationDate = data.dealExpiration.toDate();
        } else {
          expirationDate = new Date(data.dealExpiration);
        }

        if (
          Number.isNaN(expirationDate.getTime()) ||
          expirationDate <= now
        ) {
          isValidDeal = false;
        }
      }

      if (isValidDeal) {
        products.push({
          id: productDoc.id,
          ...data
        });
      }
    });

    console.log(`✅ Loaded ${products.length} deal products`);
    return products;
  } catch (error) {
    console.error('Error loading deal products:', error);
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
  const selectedCurrency =
    currency || getCurrentCurrency();

  const basePrice =
    Number(product.basePrice ?? product.price ?? 0);

  const originalPrice =
    Number(product.originalPrice ?? basePrice);

  const discount =
    Number(product.discount ?? 0);

  const currentPrice =
    convertCurrency(basePrice, selectedCurrency);

  const originalPriceConverted =
    convertCurrency(originalPrice, selectedCurrency);

  const formattedCurrentPrice =
    formatPrice(currentPrice, selectedCurrency);

  const formattedOriginalPrice =
    formatPrice(
      originalPriceConverted,
      selectedCurrency
    );

  const imageUrl =
    product.thumbnail ||
    (Array.isArray(product.images)
      ? product.images[0]
      : '') ||
    '/assets/images/placeholder.jpg';

  const rating =
    Math.min(5, Math.max(0, Number(product.rating || 0)));

  const stars = renderStars(rating);

  let badge = '';

  if (product.featured) {
    badge =
      '<span class="product-badge">Featured</span>';
  } else if (product.trending) {
    badge =
      '<span class="product-badge trending">Trending</span>';
  } else if (product.bestseller) {
    badge =
      '<span class="product-badge bestseller">Bestseller</span>';
  } else if (product.newArrival) {
    badge =
      '<span class="product-badge new">New</span>';
  }

  const productId =
    escapeHtml(String(product.id || ''));

  const title =
    escapeHtml(
      product.title || 'Untitled Product'
    );

  const category =
    escapeHtml(
      product.category || 'Gadgets'
    );

  const safeImageUrl =
    escapeHtml(String(imageUrl));

  const affiliateUrl =
    product.affiliateUrl
      ? escapeHtml(String(product.affiliateUrl))
      : '';

  const reviewCount =
    Number(product.reviewCount || 0);

  const safeDiscount =
    Math.max(0, Math.min(100, discount));

  return `
    <div class="product-card" data-product-id="${productId}">
      <div class="product-image-container">
        <img
          src="${safeImageUrl}"
          alt="${title}"
          class="product-image"
          loading="lazy"
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
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
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

function renderStars(rating) {
  const safeRating =
    Math.min(5, Math.max(0, Number(rating) || 0));

  const fullStars =
    Math.floor(safeRating);

  const hasHalfStar =
    safeRating % 1 >= 0.5;

  const emptyStars =
    Math.max(
      0,
      5 - fullStars - (hasHalfStar ? 1 : 0)
    );

  let html = '';

  for (let i = 0; i < fullStars; i++) {
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
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `;
  }

  if (hasHalfStar) {
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
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `;
  }

  for (let i = 0; i < emptyStars; i++) {
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
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `;
  }

  return html;
}

export function renderProductsGrid(
  products,
  containerId,
  currency = null
) {
  const container =
    document.getElementById(containerId);

  if (!container) {
    console.warn(
      `Container ${containerId} not found`
    );
    return;
  }

  if (!Array.isArray(products) || products.length === 0) {
    showEmptyState(
      container,
      'No products found'
    );
    return;
  }

  const html = products
    .map((product) =>
      renderProductCard(product, currency)
    )
    .join('');

  container.innerHTML = html;

  setupFavoriteButtons(container);

  updateFavoriteButtonStates(container);

  console.log(
    `✅ Rendered ${products.length} products in ${containerId}`
  );
}

/* ================================
   FAVORITES
   ================================ */

function setupFavoriteButtons(container) {
  const favoriteButtons =
    container.querySelectorAll(
      '.product-favorite'
    );

  favoriteButtons.forEach((button) => {
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
  });
}

async function updateFavoriteButtonStates(
  container
) {
  if (!isAuthenticated()) {
    return;
  }

  try {
    const favorites =
      await loadUserFavorites();

    const favoriteSet =
      new Set(favorites);

    const buttons =
      container.querySelectorAll(
        '.product-favorite'
      );

    buttons.forEach((button) => {
      const productId =
        button.dataset.productId;

      if (favoriteSet.has(productId)) {
        button.classList.add('active');
        button.setAttribute(
          'aria-label',
          'Remove from favorites'
        );
      }
    });
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
  if (!isAuthenticated()) {
    showToast(
      'Please sign in to add favorites',
      'warning'
    );
    return;
  }

  if (!isFirebaseInitialized()) {
    showToast(
      'Service unavailable',
      'error'
    );
    return;
  }

  const userId = getUserId();

  if (!userId) {
    showToast(
      'Unable to identify your account',
      'error'
    );
    return;
  }

  const isActive =
    button.classList.contains('active');

  try {
    const favoriteRef = doc(
      db,
      'users',
      userId,
      'favorites',
      productId
    );

    if (isActive) {
      await deleteDoc(favoriteRef);

      button.classList.remove('active');

      button.setAttribute(
        'aria-label',
        'Add to favorites'
      );

      showToast(
        'Removed from favorites',
        'success'
      );
    } else {
      await setDoc(favoriteRef, {
        productId,
        addedAt: Timestamp.now()
      });

      button.classList.add('active');

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

  const userId = getUserId();

  if (!userId) {
    return [];
  }

  try {
    const favoritesCollection = collection(
      db,
      'users',
      userId,
      'favorites'
    );

    const querySnapshot =
      await getDocs(favoritesCollection);

    const favorites = [];

    querySnapshot.forEach((favoriteDoc) => {
      favorites.push(favoriteDoc.id);
    });

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
    document.getElementById('favoritesBadge');

  if (!badge) {
    return;
  }

  if (!isAuthenticated()) {
    badge.textContent = '0';
    return;
  }

  try {
    const favorites =
      await loadUserFavorites();

    badge.textContent =
      String(favorites.length);
  } catch (error) {
    console.error(
      'Error updating favorites badge:',
      error
    );

    badge.textContent = '0';
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

  if (trendingContainer) {
    showLoading(
      trendingContainer,
      'Loading trending products...'
    );

    try {
      const trendingProducts =
        await loadTrendingProducts(8);

      renderProductsGrid(
        trendingProducts,
        'trendingProductsGrid'
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

  if (collectionContainer) {
    showLoading(
      collectionContainer,
      'Loading collection...'
    );

    try {
      const featuredProducts =
        await loadFeaturedProducts(8);

      renderProductsGrid(
        featuredProducts,
        'trendingCollectionGrid'
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

async function initializeFeaturedDeal() {
  const dealContainer =
    document.getElementById('dealCard');

  if (!dealContainer) {
    return;
  }

  showLoading(
    dealContainer,
    'Loading featured deal...'
  );

  try {
    const dealProducts =
      await loadDealProducts(1);

    if (dealProducts.length === 0) {
      showEmptyState(
        dealContainer,
        'No active deals at the moment'
      );
      return;
    }

    const deal = dealProducts[0];

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
      Array.isArray(product.images)
        ? product.images[0]
        : ''
    ) ||
    '/assets/images/placeholder.jpg';

  let expirationDate = null;

  if (product.dealExpiration) {
    if (
      typeof product.dealExpiration.toDate ===
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
      expirationDate = null;
    }
  }

  const countdownHtml =
    expirationDate
      ? renderCountdown(expirationDate)
      : '';

  const title =
    escapeHtml(
      product.title ||
      'Featured Deal'
    );

  const safeImageUrl =
    escapeHtml(
      String(imageUrl)
    );

  const affiliateUrl =
    product.affiliateUrl
      ? escapeHtml(
          String(product.affiliateUrl)
        )
      : '';

  const discount =
    Math.max(
      0,
      Math.min(
        100,
        Number(product.discount || 0)
      )
    );

  container.innerHTML = `
    <div class="deal-content">
      <h3>Limited Time Deal!</h3>

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
      >
    </div>
  `;

  if (expirationDate) {
    startCountdown(
      expirationDate,
      container
    );
  }
}

function renderCountdown(
  expirationDate
) {
  return `
    <div class="deal-timer" id="dealTimer">
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
  let timerId = null;

  function updateCountdown() {
    const now = new Date();
    const diff =
      expirationDate.getTime() -
      now.getTime();

    if (diff <= 0) {
      const timer =
        container.querySelector(
          '#dealTimer'
        );

      if (timer) {
        timer.innerHTML =
          '<p style="color: var(--color-error);">Deal Expired</p>';
      }

      if (timerId) {
        clearTimeout(timerId);
      }

      return;
    }

    const days =
      Math.floor(
        diff /
        (1000 * 60 * 60 * 24)
      );

    const hours =
      Math.floor(
        (diff %
          (1000 * 60 * 60 * 24)) /
          (1000 * 60 * 60)
      );

    const minutes =
      Math.floor(
        (diff %
          (1000 * 60 * 60)) /
          (1000 * 60)
      );

    const seconds =
      Math.floor(
        (diff %
          (1000 * 60)) /
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
        String(days).padStart(2, '0');
    }

    if (hoursEl) {
      hoursEl.textContent =
        String(hours).padStart(2, '0');
    }

    if (minutesEl) {
      minutesEl.textContent =
        String(minutes).padStart(2, '0');
    }

    if (secondsEl) {
      secondsEl.textContent =
        String(seconds).padStart(2, '0');
    }

    timerId = setTimeout(
      updateCountdown,
      1000
    );
  }

  updateCountdown();
}

/* ================================
   CURRENCY CHANGE LISTENER
   ================================ */

document.addEventListener(
  'currencyChanged',
  () => {
    console.log(
      '💱 Currency changed, updating product prices...'
    );

    /*
     * Homepage modules can be refreshed by app.js
     * or the relevant page module when needed.
     *
     * No automatic homepage initialization is
     * performed here to avoid duplicate Firestore
     * requests and duplicate rendering.
     */
  }
);

/* ================================
   AUTO-INITIALIZATION
   ================================ */

/*
 * IMPORTANT:
 * Homepage initialization is intentionally NOT
 * performed here.
 *
 * app.js is now the single orchestrator for
 * homepage initialization and dynamically loads
 * this module when needed.
 *
 * This prevents duplicate initialization because
 * categories.js also depends on this module.
 */

console.log('📦 Products module loaded');
