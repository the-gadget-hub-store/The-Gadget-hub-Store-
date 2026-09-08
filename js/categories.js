/* ================================
   THE GADGET HUB STORE
   Categories Module
   ================================ */

/**
 * Categories Module
 *
 * Handles:
 * - Loading categories from Firestore
 * - Rendering category cards
 * - Category navigation
 * - Product count per category
 * - Category filtering
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

import { loadProductsByCategory } from './products.js';

/* ================================
   CATEGORY LOADING
   ================================ */

export async function loadCategories() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const categoriesCollection =
      collection(db, 'categories');

    const querySnapshot =
      await getDocs(categoriesCollection);

    const categories = [];

    querySnapshot.forEach((categoryDoc) => {
      categories.push({
        id: categoryDoc.id,
        ...categoryDoc.data()
      });
    });

    categories.sort((a, b) => {
      const orderA =
        a.order !== undefined
          ? Number(a.order)
          : Number.POSITIVE_INFINITY;

      const orderB =
        b.order !== undefined
          ? Number(b.order)
          : Number.POSITIVE_INFINITY;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return String(a.name || '')
        .localeCompare(
          String(b.name || '')
        );
    });

    console.log(
      `✅ Loaded ${categories.length} categories`
    );

    return categories;
  } catch (error) {
    console.error(
      'Error loading categories:',
      error
    );

    throw error;
  }
}

export async function loadCategoryById(
  categoryId
) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  if (!categoryId) {
    throw new Error(
      'Category ID is required'
    );
  }

  try {
    const categoryDoc =
      await getDoc(
        doc(
          db,
          'categories',
          categoryId
        )
      );

    if (!categoryDoc.exists()) {
      throw new Error(
        'Category not found'
      );
    }

    return {
      id: categoryDoc.id,
      ...categoryDoc.data()
    };
  } catch (error) {
    console.error(
      'Error loading category:',
      error
    );

    throw error;
  }
}

export async function loadCategoryBySlug(
  slug
) {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  if (!slug) {
    return null;
  }

  try {
    const categoriesCollection =
      collection(db, 'categories');

    const q = query(
      categoriesCollection,
      where('slug', '==', slug),
      limit(1)
    );

    const querySnapshot =
      await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const categoryDoc =
      querySnapshot.docs[0];

    return {
      id: categoryDoc.id,
      ...categoryDoc.data()
    };
  } catch (error) {
    console.error(
      'Error loading category by slug:',
      error
    );

    throw error;
  }
}

export async function getCategoryProductCount(
  categoryId
) {
  if (
    !isFirebaseInitialized() ||
    !categoryId
  ) {
    return 0;
  }

  try {
    const products =
      await loadProductsByCategory(
        categoryId,
        1000
      );

    return products.length;
  } catch (error) {
    console.error(
      'Error getting category product count:',
      error
    );

    return 0;
  }
}

/* ================================
   CATEGORY FALLBACK DATA
   ================================ */

function getDefaultCategories() {
  return [
    {
      id: 'smart-gadgets',
      name: 'Smart Gadgets',
      slug: 'smart-gadgets',
      description:
        'Innovative smart devices for modern living',
      icon: 'smart-gadgets',
      productCount: 0
    },
    {
      id: 'mobile-accessories',
      name: 'Mobile Accessories',
      slug: 'mobile-accessories',
      description:
        'Essential accessories for your mobile devices',
      icon: 'mobile',
      productCount: 0
    },
    {
      id: 'gaming',
      name: 'Gaming',
      slug: 'gaming',
      description:
        'Gaming gear and accessories',
      icon: 'gaming',
      productCount: 0
    },
    {
      id: 'smart-home',
      name: 'Smart Home',
      slug: 'smart-home',
      description:
        'Connected devices for your smart home',
      icon: 'home',
      productCount: 0
    },
    {
      id: 'audio',
      name: 'Audio',
      slug: 'audio',
      description:
        'Headphones, speakers, and audio equipment',
      icon: 'audio',
      productCount: 0
    },
    {
      id: 'wearables',
      name: 'Wearables',
      slug: 'wearables',
      description:
        'Smartwatches and fitness trackers',
      icon: 'wearables',
      productCount: 0
    },
    {
      id: 'computer-accessories',
      name: 'Computer Accessories',
      slug: 'computer-accessories',
      description:
        'Keyboards, mice, and PC peripherals',
      icon: 'computer',
      productCount: 0
    },
    {
      id: 'car-gadgets',
      name: 'Car Gadgets',
      slug: 'car-gadgets',
      description:
        'Tech accessories for your vehicle',
      icon: 'car',
      productCount: 0
    }
  ];
}

/* ================================
   CATEGORY RENDERING
   ================================ */

export function renderCategoryCard(
  category
) {
  const imageUrl =
    category.image ||
    category.thumbnail ||
    '';

  const iconName =
    category.icon || 'category';

  const productCount =
    Number(category.productCount || 0);

  const categoryId =
    String(category.id || '');

  const categoryName =
    category.name ||
    'Untitled Category';

  const categoryLink =
    category.slug
      ? `pages/categories.html?category=${encodeURIComponent(
          category.slug
        )}`
      : `pages/categories.html?id=${encodeURIComponent(
          categoryId
        )}`;

  return `
    <a
      href="${escapeHtml(categoryLink)}"
      class="category-card"
      data-category-id="${escapeHtml(categoryId)}"
    >
      <div class="category-card-content">

        <div class="category-icon">
          ${
            imageUrl
              ? `
                <img
                  src="${escapeHtml(
                    String(imageUrl)
                  )}"
                  alt="${escapeHtml(
                    categoryName
                  )}"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: var(--radius-xl);
                  "
                >
              `
              : renderCategoryIcon(
                  iconName
                )
          }
        </div>

        <h3 class="category-name">
          ${escapeHtml(categoryName)}
        </h3>

        <p class="category-count">
          ${productCount}
          ${
            productCount === 1
              ? 'Product'
              : 'Products'
          }
        </p>

      </div>
    </a>
  `;
}

function renderCategoryIcon(
  iconName
) {
  const icons = {
    'smart-gadgets': `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="8"
          rx="2"
          ry="2"
        />
        <rect
          x="2"
          y="14"
          width="20"
          height="8"
          rx="2"
          ry="2"
        />
        <line
          x1="6"
          y1="6"
          x2="6.01"
          y2="6"
        />
        <line
          x1="6"
          y1="18"
          x2="6.01"
          y2="18"
        />
      </svg>
    `,

    mobile: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect
          x="5"
          y="2"
          width="14"
          height="20"
          rx="2"
          ry="2"
        />
        <line
          x1="12"
          y1="18"
          x2="12.01"
          y2="18"
        />
      </svg>
    `,

    gaming: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <line
          x1="6"
          y1="12"
          x2="10"
          y2="12"
        />
        <line
          x1="8"
          y1="10"
          x2="8"
          y2="14"
        />
        <line
          x1="15"
          y1="13"
          x2="15.01"
          y2="13"
        />
        <line
          x1="18"
          y1="11"
          x2="18.01"
          y2="11"
        />
        <rect
          x="2"
          y="6"
          width="20"
          height="12"
          rx="2"
        />
      </svg>
    `,

    home: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        />
        <polyline
          points="9 22 9 12 15 12 15 22"
        />
      </svg>
    `,

    audio: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M3 18v-6a9 9 0 0 1 18 0v6"
        />
        <path
          d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2H3z"
        />
      </svg>
    `,

    wearables: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="7"
        />
        <polyline
          points="12 9 12 12 13.5 13.5"
        />
        <path
          d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"
        />
      </svg>
    `,

    computer: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="3"
          width="20"
          height="14"
          rx="2"
          ry="2"
        />
        <line
          x1="8"
          y1="21"
          x2="16"
          y2="21"
        />
        <line
          x1="12"
          y1="17"
          x2="12"
          y2="21"
        />
      </svg>
    `,

    car: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M5 11l1.5-4.5h11L19 11m-14 0v7a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-7"
        />
        <circle
          cx="8"
          cy="15"
          r="1"
        />
        <circle
          cx="16"
          cy="15"
          r="1"
        />
      </svg>
    `,

    category: `
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
        />
      </svg>
    `
  };

  return (
    icons[iconName] ||
    icons.category
  );
}

export async function renderCategoriesGrid(
  categories,
  containerId
) {
  const container =
    document.getElementById(containerId);

  if (!container) {
    console.warn(
      `Container ${containerId} not found`
    );
    return;
  }

  if (
    !Array.isArray(categories) ||
    categories.length === 0
  ) {
    showEmptyState(
      container,
      'No categories found'
    );
    return;
  }

  try {
    const categoriesWithCounts =
      await Promise.all(
        categories.map(
          async (category) => {
            const productCount =
              await getCategoryProductCount(
                category.id
              );

            return {
              ...category,
              productCount
            };
          }
        )
      );

    const html =
      categoriesWithCounts
        .map((category) =>
          renderCategoryCard(category)
        )
        .join('');

    container.innerHTML = html;

    console.log(
      `✅ Rendered ${categories.length} categories in ${containerId}`
    );
  } catch (error) {
    console.error(
      'Error rendering category grid:',
      error
    );

    showError(
      container,
      'Failed to load category information'
    );
  }
}

/* ================================
   HOMEPAGE INITIALIZATION
   ================================ */

export async function initializeHomepageCategories() {
  console.log(
    '🏠 Initializing homepage categories...'
  );

  const categoriesContainer =
    document.getElementById(
      'categoriesGrid'
    );

  if (!categoriesContainer) {
    console.warn(
      'Categories container not found on homepage'
    );
    return;
  }

  showLoading(
    categoriesContainer,
    'Loading categories...'
  );

  try {
    if (!isFirebaseInitialized()) {
      showError(
        categoriesContainer,
        'Unable to load categories'
      );

      console.warn(
        'Cannot load categories - Firebase not initialized'
      );

      return;
    }

    const categories =
      await loadCategories();

    if (categories.length === 0) {
      showEmptyState(
        categoriesContainer,
        'Categories not yet configured'
      );

      console.log(
        'ℹ️ No categories found in Firestore - Admin should add categories'
      );

      return;
    }

    await renderCategoriesGrid(
      categories,
      'categoriesGrid'
    );
  } catch (error) {
    console.error(
      'Error initializing homepage categories:',
      error
    );

    showError(
      categoriesContainer,
      'Failed to load categories'
    );

    return;
  }

  console.log(
    '✅ Homepage categories initialized'
  );
}

/* ================================
   CATEGORIES PAGE INITIALIZATION
   ================================ */

export async function initializeCategoriesPage() {
  console.log(
    '📂 Initializing categories page...'
  );

  const categoriesContainer =
    document.getElementById(
      'allCategoriesGrid'
    );

  if (!categoriesContainer) {
    console.warn(
      'All categories container not found'
    );
    return;
  }

  showLoading(
    categoriesContainer,
    'Loading categories...'
  );

  try {
    if (!isFirebaseInitialized()) {
      showError(
        categoriesContainer,
        'Service unavailable'
      );

      return;
    }

    const categories =
      await loadCategories();

    if (categories.length === 0) {
      showEmptyState(
        categoriesContainer,
        'No categories available'
      );

      return;
    }

    await renderCategoriesGrid(
      categories,
      'allCategoriesGrid'
    );
  } catch (error) {
    console.error(
      'Error initializing categories page:',
      error
    );

    showError(
      categoriesContainer,
      'Failed to load categories'
    );

    return;
  }

  console.log(
    '✅ Categories page initialized'
  );
}

/* ================================
   CATEGORY FILTERING
   ================================ */

export async function loadCategoryProducts(
  categoryId,
  containerId
) {
  const container =
    document.getElementById(containerId);

  if (!container) {
    console.warn(
      `Container ${containerId} not found`
    );
    return;
  }

  showLoading(
    container,
    'Loading products...'
  );

  try {
    if (!isFirebaseInitialized()) {
      showError(
        container,
        'Service unavailable'
      );

      return;
    }

    let category = null;

    try {
      category =
        await loadCategoryById(
          categoryId
        );
    } catch (idError) {
      category =
        await loadCategoryBySlug(
          categoryId
        );
    }

    if (!category) {
      showError(
        container,
        'Category not found'
      );

      return;
    }

    const products =
      await loadProductsByCategory(
        category.id
      );

    if (products.length === 0) {
      showEmptyState(
        container,
        `No products in ${category.name} yet`
      );

      return;
    }

    const {
      renderProductsGrid
    } = await import(
      './products.js'
    );

    renderProductsGrid(
      products,
      containerId
    );
  } catch (error) {
    console.error(
      'Error loading category products:',
      error
    );

    showError(
      container,
      'Failed to load products'
    );
  }
}

/* ================================
   CATEGORY NAVIGATION
   ================================ */

export function getCategoryFromUrl() {
  const urlParams =
    new URLSearchParams(
      window.location.search
    );

  return (
    urlParams.get('category') ||
    urlParams.get('id')
  );
}

export function updateCategoryPageTitle(
  categoryName
) {
  const safeCategoryName =
    categoryName ||
    'Categories';

  const pageTitle =
    document.querySelector('h1');

  if (pageTitle) {
    pageTitle.textContent =
      safeCategoryName;
  }

  document.title =
    `${safeCategoryName} - The Gadget Hub Store`;
}

/* ================================
   CATEGORY BREADCRUMB
   ================================ */

export function renderCategoryBreadcrumb(
  category,
  containerId = 'breadcrumb'
) {
  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }

  const categoryName =
    escapeHtml(
      category?.name ||
      'Category'
    );

  container.innerHTML = `
    <nav
      aria-label="Breadcrumb"
      style="
        padding: var(--spacing-md) 0;
        font-size: 0.875rem;
      "
    >
      <ol
        style="
          display: flex;
          gap: var(--spacing-xs);
          list-style: none;
          color: var(--color-text-tertiary);
        "
      >
        <li>
          <a
            href="../index.html"
            style="
              color: var(--color-text-tertiary);
              text-decoration: none;
            "
          >
            Home
          </a>
        </li>

        <li aria-hidden="true">/</li>

        <li>
          <a
            href="categories.html"
            style="
              color: var(--color-text-tertiary);
              text-decoration: none;
            "
          >
            Categories
          </a>
        </li>

        <li aria-hidden="true">/</li>

        <li
          aria-current="page"
          style="
            color: var(--color-text-primary);
            font-weight: var(--font-weight-semibold);
          "
        >
          ${categoryName}
        </li>
      </ol>
    </nav>
  `;
}

/* ================================
   AUTO-INITIALIZATION
   ================================ */

/**
 * Categories page keeps its own auto-initialization.
 *
 * Homepage initialization is intentionally NOT
 * performed here because app.js is now the single
 * homepage orchestrator.
 */
function autoInitialize() {
  const path =
    window.location.pathname;

  const page =
    path.substring(
      path.lastIndexOf('/') + 1
    ) || 'index.html';

  /*
   * Homepage:
   * app.js handles initialization.
   */
  if (
    page === 'index.html' ||
    page === ''
  ) {
    return;
  }

  if (page !== 'categories.html') {
    return;
  }

  const categoryParam =
    getCategoryFromUrl();

  if (categoryParam) {
    console.log(
      `📂 Loading category: ${categoryParam}`
    );

    (async () => {
      try {
        let category = null;

        try {
          category =
            await loadCategoryById(
              categoryParam
            );
        } catch (idError) {
          category =
            await loadCategoryBySlug(
              categoryParam
            );
        }

        if (!category) {
          const container =
            document.getElementById(
              'categoryProductsGrid'
            );

          if (container) {
            showError(
              container,
              'Category not found'
            );
          }

          return;
        }

        updateCategoryPageTitle(
          category.name
        );

        renderCategoryBreadcrumb(
          category
        );

        document.getElementById('allCategoriesGrid').style.display = 'none';

        await loadCategoryProducts(
          category.id,
          'categoryProductsGrid'
        );
      } catch (error) {
        console.error(
          'Error loading category:',
          error
        );

        const container =
          document.getElementById(
            'categoryProductsGrid'
          );

        if (container) {
          showError(
            container,
            'Failed to load category'
          );
        }
      }
    })();

    return;
  }

  initializeCategoriesPage();
}

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    autoInitialize,
    { once: true }
  );
} else {
  autoInitialize();
}

console.log(
  '📦 Categories module loaded'
);
