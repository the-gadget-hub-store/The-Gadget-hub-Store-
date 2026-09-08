/* =========================================
   THE GADGET HUB STORE
   Categories Module
   ========================================= */

/**
 * Categories module.
 *
 * Responsibilities:
 * - Load categories from Firestore
 * - Load a single category by ID or slug
 * - Render homepage category cards
 * - Render all-categories page
 * - Resolve category pages from URL parameters
 * - Load and render products belonging to a category
 *
 * NOTE:
 * app.js is the single page orchestrator.
 * This module does not automatically initialize
 * itself when imported.
 */

import {
  isFirebaseInitialized,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit
} from './firebase.js';

import {
  showLoading,
  showEmptyState,
  showError,
  escapeHtml
} from './ui.js';

import {
  loadProductsByCategory,
  renderProductsGrid
} from './products.js';

/* =========================================
   CONSTANTS
   ========================================= */

const CATEGORIES_COLLECTION = 'categories';

const DEFAULT_CATEGORY_LIMIT = 100;

const CATEGORY_PRODUCT_LIMIT = 100;

/* =========================================
   DEFAULT CATEGORIES
   ========================================= */

const DEFAULT_CATEGORIES = [
  {
    id: 'smart-gadgets',
    name: 'Smart Gadgets',
    slug: 'smart-gadgets',
    description:
      'Discover smart gadgets and useful technology for everyday life.',
    icon: 'smart-gadgets',
    order: 1,
    status: 'Active',
    featured: true
  },
  {
    id: 'mobile-phones',
    name: 'Mobile Phones',
    slug: 'mobile-phones',
    description:
      'Discover the latest mobile phones with powerful performance, stunning displays, advanced cameras, long-lasting batteries, and modern features.',
    icon: 'smartphone',
    order: 2,
    status: 'Active',
    featured: true
  },
  {
    id: 'gaming',
    name: 'Gaming',
    slug: 'gaming',
    description:
      'Gaming devices, accessories and technology for better gaming experiences.',
    icon: 'gaming',
    order: 3,
    status: 'Active',
    featured: true
  },
  {
    id: 'home',
    name: 'Home Technology',
    slug: 'home',
    description:
      'Useful technology and smart devices for your home.',
    icon: 'home',
    order: 4,
    status: 'Active',
    featured: true
  },
  {
    id: 'audio',
    name: 'Audio',
    slug: 'audio',
    description:
      'Headphones, earbuds, speakers and other audio gadgets.',
    icon: 'audio',
    order: 5,
    status: 'Active',
    featured: true
  },
  {
    id: 'wearables',
    name: 'Wearables',
    slug: 'wearables',
    description:
      'Smartwatches, fitness trackers and wearable technology.',
    icon: 'wearables',
    order: 6,
    status: 'Active',
    featured: true
  },
  {
    id: 'computers',
    name: 'Computers',
    slug: 'computers',
    description:
      'Computers, laptops, accessories and productivity technology.',
    icon: 'computer',
    order: 7,
    status: 'Active',
    featured: false
  },
  {
    id: 'car-tech',
    name: 'Car Technology',
    slug: 'car-tech',
    description:
      'Useful gadgets and technology for cars and travel.',
    icon: 'car',
    order: 8,
    status: 'Active',
    featured: false
  }
];

/* =========================================
   INTERNAL STATE
   ========================================= */

let categoriesCache = null;

let categoriesLoadingPromise = null;

/* =========================================
   CATEGORY HELPERS
   ========================================= */

function normalizeCategory(rawCategory, id = '') {
  if (!rawCategory || typeof rawCategory !== 'object') {
    return null;
  }

  const normalizedId =
    String(
      rawCategory.id ||
      id ||
      ''
    ).trim();

  const name =
    String(
      rawCategory.name ||
      rawCategory.title ||
      ''
    ).trim();

  const slug =
    String(
      rawCategory.slug ||
      createSlug(name) ||
      ''
    )
      .trim()
      .toLowerCase();

  if (!name && !normalizedId && !slug) {
    return null;
  }

  return {
    id: normalizedId,
    name: name || normalizedId || slug,
    slug,
    description:
      String(
        rawCategory.description ||
        ''
      ).trim(),

    icon:
      String(
        rawCategory.icon ||
        rawCategory.iconName ||
        'category'
      ).trim(),

    image:
      String(
        rawCategory.image ||
        rawCategory.imageUrl ||
        ''
      ).trim(),

    imageUrl:
      String(
        rawCategory.imageUrl ||
        rawCategory.image ||
        ''
      ).trim(),

    thumbnail:
      String(
        rawCategory.thumbnail ||
        rawCategory.thumbnailUrl ||
        ''
      ).trim(),

    thumbnailUrl:
      String(
        rawCategory.thumbnailUrl ||
        rawCategory.thumbnail ||
        ''
      ).trim(),

    order:
      normalizeOrder(
        rawCategory.order
      ),

    status:
      normalizeStatus(
        rawCategory.status
      ),

    featured:
      Boolean(
        rawCategory.featured
      )
  };
}

function normalizeOrder(value) {
  const numeric =
    Number(value);

  if (
    Number.isFinite(numeric)
  ) {
    return numeric;
  }

  return 999999;
}

function normalizeStatus(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return 'Active';
  }

  const status =
    String(value)
      .trim()
      .toLowerCase();

  if (
    status === 'active' ||
    status === 'enabled' ||
    status === 'true'
  ) {
    return 'Active';
  }

  if (
    status === 'inactive' ||
    status === 'disabled' ||
    status === 'false'
  ) {
    return 'Inactive';
  }

  return String(value).trim();
}

function isCategoryActive(category) {
  if (!category) {
    return false;
  }

  const status =
    String(
      category.status || 'Active'
    )
      .trim()
      .toLowerCase();

  return (
    status === 'active' ||
    status === 'enabled' ||
    status === 'true'
  );
}

function createSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(
      /[^\w\s-]/g,
      ''
    )
    .replace(
      /\s+/g,
      '-'
    )
    .replace(
      /-+/g,
      '-'
    )
    .replace(
      /^-|-$/g,
      ''
    );
}

/* =========================================
   LOAD ALL CATEGORIES
   ========================================= */

export async function loadCategories(
  options = {}
) {
  const {
    includeInactive = false,
    forceRefresh = false,
    limitCount = DEFAULT_CATEGORY_LIMIT
  } = options;

  if (
    !forceRefresh &&
    categoriesCache
  ) {
    return filterAndSortCategories(
      categoriesCache,
      includeInactive
    );
  }

  if (
    categoriesLoadingPromise &&
    !forceRefresh
  ) {
    const categories =
      await categoriesLoadingPromise;

    return filterAndSortCategories(
      categories,
      includeInactive
    );
  }

  if (
    !isFirebaseInitialized()
  ) {
    const fallback =
      DEFAULT_CATEGORIES.map(
        (category) =>
          normalizeCategory(
            category,
            category.id
          )
      ).filter(Boolean);

    categoriesCache =
      fallback;

    return filterAndSortCategories(
      fallback,
      includeInactive
    );
  }

  categoriesLoadingPromise =
    (async () => {
      try {
        const categoriesRef =
          collection(
            db,
            CATEGORIES_COLLECTION
          );

        let snapshot;

        /*
         * We intentionally load the collection
         * without an orderBy query.
         *
         * This avoids requiring a Firestore
         * index just to display categories.
         * Sorting is handled safely in JavaScript.
         */
        if (
          Number.isFinite(
            Number(limitCount)
          ) &&
          Number(limitCount) > 0
        ) {
          const categoriesQuery =
            query(
              categoriesRef,
              limit(
                Number(limitCount)
              )
            );

          snapshot =
            await getDocs(
              categoriesQuery
            );
        } else {
          snapshot =
            await getDocs(
              categoriesRef
            );
        }

        const categories =
          snapshot.docs
            .map((categoryDoc) =>
              normalizeCategory(
                categoryDoc.data(),
                categoryDoc.id
              )
            )
            .filter(Boolean);

        categoriesCache =
          categories;

        return categories;
      } catch (error) {
        console.error(
          'Failed to load categories from Firebase:',
          error
        );

        /*
         * If Firebase fails, use the safe defaults
         * instead of leaving the page permanently
         * stuck on a loading state.
         */
        const fallback =
          DEFAULT_CATEGORIES
            .map((category) =>
              normalizeCategory(
                category,
                category.id
              )
            )
            .filter(Boolean);

        categoriesCache =
          fallback;

        return fallback;
      } finally {
        categoriesLoadingPromise =
          null;
      }
    })();

  const categories =
    await categoriesLoadingPromise;

  return filterAndSortCategories(
    categories,
    includeInactive
  );
}

function filterAndSortCategories(
  categories,
  includeInactive
) {
  const safeCategories =
    Array.isArray(categories)
      ? categories
      : [];

  const filtered =
    includeInactive
      ? safeCategories
      : safeCategories.filter(
          isCategoryActive
        );

  return [...filtered].sort(
    (a, b) => {
      const orderDifference =
        Number(a.order || 999999) -
        Number(b.order || 999999);

      if (
        orderDifference !== 0
      ) {
        return orderDifference;
      }

      return String(
        a.name || ''
      ).localeCompare(
        String(
          b.name || ''
        )
      );
    }
  );
}

/* =========================================
   LOAD CATEGORY BY ID
   ========================================= */

export async function loadCategoryById(
  categoryId
) {
  const id =
    String(
      categoryId || ''
    ).trim();

  if (!id) {
    return null;
  }

  if (
    categoriesCache
  ) {
    const cached =
      categoriesCache.find(
        (category) =>
          category.id === id
      );

    if (cached) {
      return cached;
    }
  }

  if (
    !isFirebaseInitialized()
  ) {
    return (
      DEFAULT_CATEGORIES.find(
        (category) =>
          category.id === id
      ) || null
    );
  }

  try {
    const categoryRef =
      doc(
        db,
        CATEGORIES_COLLECTION,
        id
      );

    const snapshot =
      await getDoc(
        categoryRef
      );

    if (!snapshot.exists()) {
      return null;
    }

    return normalizeCategory(
      snapshot.data(),
      snapshot.id
    );
  } catch (error) {
    console.error(
      `Failed to load category by ID "${id}":`,
      error
    );

    return null;
  }
}

/* =========================================
   LOAD CATEGORY BY SLUG
   ========================================= */

export async function loadCategoryBySlug(
  slug
) {
  const normalizedSlug =
    String(
      slug || ''
    )
      .trim()
      .toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  if (
    categoriesCache
  ) {
    const cached =
      categoriesCache.find(
        (category) =>
          String(
            category.slug || ''
          ).toLowerCase() ===
          normalizedSlug
      );

    if (cached) {
      return cached;
    }
  }

  if (
    !isFirebaseInitialized()
  ) {
    return (
      DEFAULT_CATEGORIES.find(
        (category) =>
          String(
            category.slug || ''
          ).toLowerCase() ===
          normalizedSlug
      ) || null
    );
  }

  try {
    const categoriesRef =
      collection(
        db,
        CATEGORIES_COLLECTION
      );

    const categoryQuery =
      query(
        categoriesRef,
        where(
          'slug',
          '==',
          normalizedSlug
        ),
        limit(1)
      );

    const snapshot =
      await getDocs(
        categoryQuery
      );

    if (
      snapshot.empty
    ) {
      return null;
    }

    const categoryDoc =
      snapshot.docs[0];

    return normalizeCategory(
      categoryDoc.data(),
      categoryDoc.id
    );
  } catch (error) {
    console.error(
      `Failed to load category by slug "${normalizedSlug}":`,
      error
    );

    /*
     * If the slug query fails for any reason,
     * try the local cache/fallback collection.
     */
    try {
      const categories =
        await loadCategories({
          includeInactive: true
        });

      return (
        categories.find(
          (category) =>
            String(
              category.slug || ''
            ).toLowerCase() ===
            normalizedSlug
        ) || null
      );
    } catch (fallbackError) {
      console.error(
        'Category slug fallback failed:',
        fallbackError
      );

      return null;
    }
  }
}

/* =========================================
   GET CATEGORY PRODUCT COUNT
   ========================================= */

export async function getCategoryProductCount(
  categoryId,
  categorySlug = '',
  categoryName = ''
) {
  if (!categoryId) {
    return 0;
  }

  try {
    const products =
      await loadProductsByCategory(
        categoryId,
        1000,
        categorySlug,
        categoryName
      );

    return Array.isArray(products)
      ? products.length
      : 0;
  } catch (error) {
    console.warn(
      `Unable to count products for category "${categoryId}":`,
      error
    );

    return 0;
  }
}

/* =========================================
   CATEGORY CARD
   ========================================= */

export function renderCategoryCard(
  category
) {
  const safeCategory =
    normalizeCategory(
      category,
      category?.id || ''
    );

  if (!safeCategory) {
    return '';
  }

  const categoryId =
    escapeHtml(
      safeCategory.id
    );

  const categoryName =
    escapeHtml(
      safeCategory.name
    );

  const categorySlug =
    escapeHtml(
      safeCategory.slug
    );

  const description =
    escapeHtml(
      safeCategory.description
    );

  const icon =
    renderCategoryIcon(
      safeCategory.icon
    );

  const image =
    safeCategory.imageUrl ||
    safeCategory.image ||
    safeCategory.thumbnailUrl ||
    safeCategory.thumbnail ||
    '';

  const safeImage =
    escapeHtml(
      image
    );

  const href =
    safeCategory.slug
      ? `pages/categories.html?category=${encodeURIComponent(
          safeCategory.slug
        )}`
      : `pages/categories.html?id=${encodeURIComponent(
          safeCategory.id
        )}`;

  const safeHref =
    escapeHtml(
      href
    );

  const imageMarkup =
    safeImage
      ? `
        <img
          src="${safeImage}"
          alt="${categoryName}"
          class="category-card-image"
          loading="lazy"
          decoding="async"
          onerror="this.style.display='none'; this.nextElementSibling.hidden=false;"
        >
        <div
          class="category-card-icon"
          hidden
          aria-hidden="true"
        >
          ${icon}
        </div>
      `
      : `
        <div
          class="category-card-icon"
          aria-hidden="true"
        >
          ${icon}
        </div>
      `;

  return `
    <article
      class="category-card"
      data-category-id="${categoryId}"
      data-category-slug="${categorySlug}"
    >
      <a
        href="${safeHref}"
        class="category-card-link"
        aria-label="Browse ${categoryName}"
      >
        <div class="category-card-media">
          ${imageMarkup}
        </div>

        <div class="category-card-content">
          <h3 class="category-card-title">
            ${categoryName}
          </h3>

          ${
            description
              ? `
                <p class="category-card-description">
                  ${description}
                </p>
              `
              : ''
          }

          <span class="category-card-action">
            Explore
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </a>
    </article>
  `;
}

/* =========================================
   CATEGORY ICONS
   ========================================= */

function renderCategoryIcon(
  iconName
) {
  const icon =
    String(
      iconName || 'category'
    )
      .trim()
      .toLowerCase();

  switch (icon) {
    case 'smart-gadgets':
    case 'smart':
    case 'smart-gadget':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      `;

    case 'smartphone':
    case 'mobile':
    case 'mobile-phone':
    case 'phones':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <line x1="10" y1="5" x2="14" y2="5"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
      `;

    case 'gaming':
    case 'game':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M6.5 8.5h11a4 4 0 0 1 3.8 5.2l-1.2 4a2 2 0 0 1-3.5.7l-2.1-2.4H9.5l-2.1 2.4a2 2 0 0 1-3.5-.7l-1.2-4A4 4 0 0 1 6.5 8.5Z"/>
          <path d="M8 11v4"/>
          <path d="M6 13h4"/>
          <circle cx="16" cy="12" r=".8"/>
          <circle cx="18" cy="14" r=".8"/>
        </svg>
      `;

    case 'home':
    case 'home-tech':
    case 'home-technology':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5"/>
          <path d="M5 9.5V21h14V9.5"/>
          <path d="M9 21v-6h6v6"/>
        </svg>
      `;

    case 'audio':
    case 'headphones':
    case 'earbuds':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M4 13v-1a8 8 0 0 1 16 0v1"/>
          <path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5Z"/>
          <path d="M20 13h-3v6h2a1 1 0 0 0 1-1v-5Z"/>
        </svg>
      `;

    case 'wearables':
    case 'watch':
    case 'smartwatch':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M8 3h8l1 4H7l1-4Z"/>
          <rect x="6" y="7" width="12" height="10" rx="2"/>
          <path d="m8 21-1-4h10l-1 4H8Z"/>
          <path d="M10 10h4"/>
          <path d="M12 10v4"/>
        </svg>
      `;

    case 'computer':
    case 'computers':
    case 'laptop':
    case 'laptops':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <rect x="5" y="3" width="14" height="11" rx="1.5"/>
          <path d="M3 18h18"/>
          <path d="M8 18l1 2h6l1-2"/>
        </svg>
      `;

    case 'car':
    case 'car-tech':
    case 'automotive':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="m5 11 2-5h10l2 5"/>
          <path d="M4 11h16v7H4z"/>
          <path d="M7 18v2"/>
          <path d="M17 18v2"/>
          <circle cx="7" cy="15" r="1"/>
          <circle cx="17" cy="15" r="1"/>
        </svg>
      `;

    default:
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 8v8"/>
          <path d="M8 12h8"/>
        </svg>
      `;
  }
}

/* =========================================
   RENDER CATEGORIES GRID
   ========================================= */

export async function renderCategoriesGrid(
  categories,
  containerId
) {
  const container =
    typeof containerId === 'string'
      ? document.getElementById(
          containerId
        )
      : containerId;

  if (!container) {
    console.warn(
      `Category container not found: ${containerId}`
    );

    return;
  }

  if (
    !Array.isArray(categories) ||
    categories.length === 0
  ) {
    showEmptyState(
      container,
      'No categories are available right now.'
    );

    return;
  }

  try {
    /*
     * Product counts are useful when the UI has
     * a count element, but they must never prevent
     * category cards from rendering.
     */
    const cards =
      await Promise.all(
        categories.map(
          async (category) => {
            try {
              const count =
                await getCategoryProductCount(
                  category.id,
                  category.slug,
                  category.name
                );

              return {
                category,
                count
              };
            } catch (error) {
              return {
                category,
                count: 0
              };
            }
          }
        )
      );

    container.innerHTML =
      cards
        .map(
          ({
            category,
            count
          }) => {
            const card =
              renderCategoryCard(
                category
              );

            if (!card) {
              return '';
            }

            /*
             * If the card markup contains a
             * category-product-count element,
             * populate it without changing the
             * card's basic structure.
             */
            return card.replace(
              '</article>',
              `
                <span
                  class="category-product-count"
                  data-category-product-count="${escapeHtml(
                    category.id
                  )}"
                  hidden
                >
                  ${count}
                </span>
              </article>
              `
            );
          }
        )
        .join('');

    container
      .classList
      .add('categories-loaded');
  } catch (error) {
    console.error(
      'Failed to render categories grid:',
      error
    );

    showError(
      container,
      'Unable to display categories right now. Please try again.'
    );
  }
}

/* =========================================
   HOMEPAGE CATEGORIES
   ========================================= */

export async function initializeHomepageCategories() {
  const container =
    document.getElementById(
      'categoriesGrid'
    );

  if (!container) {
    return;
  }

  showLoading(
    container
  );

  try {
    const categories =
      await loadCategories({
        includeInactive: false
      });

    const featuredCategories =
      categories.filter(
        (category) =>
          category.featured === true
      );

    /*
     * If no category is explicitly marked
     * featured, show all active categories.
     */
    const categoriesToRender =
      featuredCategories.length > 0
        ? featuredCategories
        : categories;

    await renderCategoriesGrid(
      categoriesToRender,
      container
    );
  } catch (error) {
    console.error(
      'Homepage categories initialization failed:',
      error
    );

    showError(
      container,
      'Unable to load categories. Please refresh the page.'
    );
  }
}

/* =========================================
   ALL CATEGORIES PAGE
   ========================================= */

export async function initializeCategoriesPage() {
  const container =
    document.getElementById(
      'allCategoriesGrid'
    );

  if (!container) {
    return;
  }

  showLoading(
    container
  );

  try {
    const categories =
      await loadCategories({
        includeInactive: false
      });

    await renderCategoriesGrid(
      categories,
      container
    );
  } catch (error) {
    console.error(
      'Categories page initialization failed:',
      error
    );

    showError(
      container,
      'Unable to load categories. Please refresh the page.'
    );
  }
}

/* =========================================
   CATEGORY PRODUCT PAGE
   ========================================= */

export async function loadCategoryProducts(
  categoryId,
  containerId,
  categorySlug = '',
  categoryName = ''
) {
  const container =
    typeof containerId === 'string'
      ? document.getElementById(
          containerId
        )
      : containerId;

  if (!container) {
    console.warn(
      `Category products container not found: ${containerId}`
    );

    return;
  }

  showLoading(
    container
  );

  try {
    let category = null;

    /*
     * First try the Firestore document ID.
     */
    if (categoryId) {
      category =
        await loadCategoryById(
          categoryId
        );
    }

    /*
     * If no category was found by ID,
     * try the slug.
     */
    if (
      !category &&
      categorySlug
    ) {
      category =
        await loadCategoryBySlug(
          categorySlug
        );
    }

    /*
     * Final fallback:
     * try the URL's category value as an ID
     * or slug.
     */
    if (
      !category &&
      categoryId
    ) {
      category =
        await loadCategoryBySlug(
          categoryId
        );
    }

    if (!category) {
      showError(
        container,
        'Category not found.'
      );

      return;
    }

    if (
      !isCategoryActive(category)
    ) {
      showError(
        container,
        'This category is currently unavailable.'
      );

      return;
    }

    updateCategoryPageHeader(
      category
    );

    const products =
      await loadProductsByCategory(
        category.id,
        CATEGORY_PRODUCT_LIMIT,
        category.slug,
        category.name
      );

    if (
      !Array.isArray(products) ||
      products.length === 0
    ) {
      showEmptyState(
        container,
        `No products are available in ${category.name} yet.`
      );

      return;
    }

    /*
     * products.js already contains the complete
     * product-card rendering logic.
     */
    renderProductsGrid(
      products,
      container
    );

    container
      .classList
      .add('category-products-loaded');
  } catch (error) {
    console.error(
      'Failed to load category products:',
      error
    );

    showError(
      container,
      'Unable to load products for this category. Please try again.'
    );
  }
}

/* =========================================
   CATEGORY URL RESOLUTION
   ========================================= */

function getCategoryParametersFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const category =
    String(
      params.get('category') ||
      ''
    ).trim();

  const id =
    String(
      params.get('id') ||
      ''
    ).trim();

  return {
    category,
    id
  };
}

async function resolveCategoryFromUrl() {
  const {
    category,
    id
  } =
    getCategoryParametersFromUrl();

  /*
   * Preferred format:
   * ?category=mobile-phones
   */
  if (category) {
    const bySlug =
      await loadCategoryBySlug(
        category
      );

    if (bySlug) {
      return bySlug;
    }

    /*
     * Some older links may use the category
     * parameter as a document ID.
     */
    const byId =
      await loadCategoryById(
        category
      );

    if (byId) {
      return byId;
    }
  }

  /*
   * Legacy/alternate format:
   * ?id=DOCUMENT_ID
   */
  if (id) {
    const byId =
      await loadCategoryById(
        id
      );

    if (byId) {
      return byId;
    }

    const bySlug =
      await loadCategoryBySlug(
        id
      );

    if (bySlug) {
      return bySlug;
    }
  }

  return null;
}

/* =========================================
   CATEGORY PAGE HEADER
   ========================================= */

function updateCategoryPageHeader(
  category
) {
  if (!category) {
    return;
  }

  const name =
    String(
      category.name || ''
    ).trim();

  const description =
    String(
      category.description || ''
    ).trim();

  const titleElements =
    document.querySelectorAll(
      '[data-category-title]'
    );

  titleElements.forEach(
    (element) => {
      element.textContent =
        name;
    }
  );

  const descriptionElements =
    document.querySelectorAll(
      '[data-category-description]'
    );

  descriptionElements.forEach(
    (element) => {
      element.textContent =
        description;
    }
  );

  const breadcrumbElements =
    document.querySelectorAll(
      '[data-category-breadcrumb]'
    );

  breadcrumbElements.forEach(
    (element) => {
      element.textContent =
        name;
    }
  );

  /*
   * Compatibility with common existing IDs.
   */
  const titleById =
    document.getElementById(
      'categoryTitle'
    );

  if (titleById) {
    titleById.textContent =
      name;
  }

  const descriptionById =
    document.getElementById(
      'categoryDescription'
    );

  if (descriptionById) {
    descriptionById.textContent =
      description;
  }

  const breadcrumbById =
    document.getElementById(
      'categoryBreadcrumb'
    );

  if (breadcrumbById) {
    breadcrumbById.textContent =
      name;
  }

  if (name) {
    document.title =
      `${name} | The Gadget Hub Store`;
  }
}

/* =========================================
   INITIALIZE CATEGORY PAGE
   ========================================= */

export async function initializeCategoryPage() {
  /*
   * If this is the general categories page,
   * render all categories.
   *
   * If a category parameter exists,
   * render products for that category.
   */
  const {
    category,
    id
  } =
    getCategoryParametersFromUrl();

  const categoryProductsContainer =
    document.getElementById(
      'categoryProductsGrid'
    );

  const allCategoriesContainer =
    document.getElementById(
      'allCategoriesGrid'
    );

  const hasCategoryParameter =
    Boolean(
      category ||
      id
    );

  if (
    hasCategoryParameter ||
    categoryProductsContainer
  ) {
    if (
      !categoryProductsContainer
    ) {
      /*
       * If a category URL was opened but
       * the expected product grid does not
       * exist in the HTML, do not silently fail.
       */
      console.error(
        'Category product container #categoryProductsGrid was not found.'
      );

      return;
    }

    showLoading(
      categoryProductsContainer
    );

    try {
      const resolvedCategory =
        await resolveCategoryFromUrl();

      if (!resolvedCategory) {
        showError(
          categoryProductsContainer,
          'The requested category could not be found.'
        );

        return;
      }

      if (
        !isCategoryActive(
          resolvedCategory
        )
      ) {
        showError(
          categoryProductsContainer,
          'This category is currently unavailable.'
        );

        return;
      }

      updateCategoryPageHeader(
        resolvedCategory
      );

      await loadCategoryProducts(
        resolvedCategory.id,
        categoryProductsContainer,
        resolvedCategory.slug,
        resolvedCategory.name
      );
    } catch (error) {
      console.error(
        'Category page initialization failed:',
        error
      );

      showError(
        categoryProductsContainer,
        'Unable to load this category. Please refresh the page.'
      );
    }

    return;
  }

  if (
    allCategoriesContainer
  ) {
    await initializeCategoriesPage();
  }
}

/* =========================================
   CACHE CONTROL
   ========================================= */

export function clearCategoriesCache() {
  categoriesCache =
    null;

  categoriesLoadingPromise =
    null;
}

/* =========================================
   PUBLIC HELPERS
   ========================================= */

export function getCachedCategories() {
  return Array.isArray(
    categoriesCache
  )
    ? [...categoriesCache]
    : [];
}

export function isActiveCategory(
  category
) {
  return isCategoryActive(
    category
  );
}

export {
  DEFAULT_CATEGORIES
};
