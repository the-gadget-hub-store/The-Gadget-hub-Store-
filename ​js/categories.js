// categories.js - The Gadget Hub Store Category Management System
// Production-ready implementation
// Compatible with the existing categories.html, ui.js and firebase.js
// ============================================================================

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let allCategories = [];
let isSubmittingCategory = false;
let categoriesInitialized = false;
let categoryFormInitialized = false;
let categorySearchInitialized = false;

// ============================================================================
// FIREBASE / FIRESTORE REFERENCE
// ============================================================================

function getCategoriesCollection() {
    try {
        // Prefer the application's existing Firestore instance.
        if (window.db && typeof window.db.collection === 'function') {
            return window.db.collection('categories');
        }

        // Fallback for environments where db exists globally.
        if (
            typeof db !== 'undefined' &&
            db &&
            typeof db.collection === 'function'
        ) {
            return db.collection('categories');
        }

        // Final Firebase fallback.
        if (
            typeof firebase !== 'undefined' &&
            firebase &&
            typeof firebase.firestore === 'function'
        ) {
            const firestore = firebase.firestore();

            // Keep the same instance globally for the rest of the admin panel.
            if (!window.db) {
                window.db = firestore;
            }

            return firestore.collection('categories');
        }

        console.error('Firestore database is not initialized.');
        return null;

    } catch (error) {
        console.error(
            'Error accessing Firestore categories collection:',
            error
        );
        return null;
    }
}

// ============================================================================
// SLUG GENERATION
// ============================================================================

function generateSlug(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ============================================================================
// ESCAPE HTML
// ============================================================================

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}

// ============================================================================
// CATEGORY CARD CREATION
// ============================================================================

function createCategoryCard(category) {
    const card = document.createElement('div');

    card.className = 'category-card-admin';
    card.setAttribute('data-category-id', category.id || '');
    card.setAttribute('data-category-slug', category.slug || '');

    const iconClass = category.icon || 'fa-th-large';
    const categoryName = category.name || 'Unnamed Category';
    const categorySlug =
        category.slug || generateSlug(categoryName);

    const productCount = Number(category.productCount) || 0;

    card.innerHTML = `
        ${
            category.featured
                ? '<div class="category-featured-badge">Featured</div>'
                : ''
        }

        <div class="category-card-header">

            <div class="category-icon-display">
                <i class="fas ${escapeHTML(iconClass)}"></i>
            </div>

            <div class="category-card-actions">

                <button
                    type="button"
                    class="btn-icon"
                    data-action="edit"
                    data-category-id="${escapeHTML(category.id || '')}"
                    title="Edit Category"
                    aria-label="Edit ${escapeHTML(categoryName)}"
                >
                    <i class="fas fa-edit"></i>
                </button>

                <button
                    type="button"
                    class="btn-icon btn-danger"
                    data-action="delete"
                    data-category-id="${escapeHTML(category.id || '')}"
                    title="Delete Category"
                    aria-label="Delete ${escapeHTML(categoryName)}"
                >
                    <i class="fas fa-trash"></i>
                </button>

            </div>
        </div>

        <div class="category-card-body">

            <h3>${escapeHTML(categoryName)}</h3>

            <p class="category-description">
                ${
                    category.description
                        ? escapeHTML(category.description)
                        : 'No description'
                }
            </p>

            <div class="category-stats">

                <div class="category-stat">

                    <div class="category-stat-value">
                        ${
                            typeof formatNumber === 'function'
                                ? formatNumber(productCount)
                                : productCount.toLocaleString()
                        }
                    </div>

                    <div class="category-stat-label">
                        Products
                    </div>

                </div>

            </div>

        </div>
    `;

    // ------------------------------------------------------------
    // Edit button
    // ------------------------------------------------------------

    const editButton = card.querySelector(
        '[data-action="edit"]'
    );

    if (editButton) {
        editButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            handleEditCategory(category.id);
        });
    }

    // ------------------------------------------------------------
    // Delete button
    // ------------------------------------------------------------

    const deleteButton = card.querySelector(
        '[data-action="delete"]'
    );

    if (deleteButton) {
        deleteButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            handleDeleteCategory(category.id);
        });
    }

    // Optional 3D effect.
    init3DTiltCategory(card);

    return card;
}

// ============================================================================
// CATEGORY RENDERING
// ============================================================================

function renderCategories(
    categories = allCategories,
    containerId = 'categoriesGrid'
) {
    let container = document.getElementById(containerId);

    // Existing categories.html uses categoriesGrid.
    if (!container) {
        container = document.getElementById('categories-grid');
    }

    if (!container) {
        console.error(
            'Categories container not found.'
        );
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(categories) || categories.length === 0) {
        container.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                width: 100%;
            ">
                <div class="empty-state-admin">

                    <i class="fas fa-th"></i>

                    <h3>No Categories Found</h3>

                    <p>
                        Start by creating your first product category.
                    </p>

                    <button
                        type="button"
                        class="btn btn-primary"
                        id="empty-add-category-btn"
                    >
                        <i class="fas fa-plus"></i>
                        <span>Add Category</span>
                    </button>

                </div>
            </div>
        `;

        const addButton = document.getElementById(
            'empty-add-category-btn'
        );

        if (addButton) {
            addButton.addEventListener(
                'click',
                function () {
                    if (
                        typeof window.showAddCategoryModal ===
                        'function'
                    ) {
                        window.showAddCategoryModal();
                    }
                }
            );
        }

        return;
    }

    const fragment = document.createDocumentFragment();

    categories.forEach(category => {
        try {
            const card = createCategoryCard(category);
            fragment.appendChild(card);
        } catch (error) {
            console.error(
                'Error rendering category:',
                category,
                error
            );
        }
    });

    container.appendChild(fragment);
}

// Compatibility alias.
function displayCategories() {
    renderCategories(
        allCategories,
        'categoriesGrid'
    );
}

// ============================================================================
// LOAD CATEGORIES FROM FIRESTORE
// ============================================================================

async function loadCategories() {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const categoriesRef =
            getCategoriesCollection();

        if (!categoriesRef) {
            throw new Error(
                'Firestore database is not available.'
            );
        }

        let snapshot;

        try {
            // Preferred query.
            snapshot = await categoriesRef
                .orderBy('name', 'asc')
                .get();

        } catch (orderError) {
            /*
             * If the query fails because of an index/query issue,
             * fall back to a simple collection read.
             */
            console.warn(
                'Ordered category query failed. Falling back to simple query.',
                orderError
            );

            snapshot = await categoriesRef.get();
        }

        const loadedCategories = [];

        snapshot.forEach(doc => {
            const data = doc.data() || {};

            loadedCategories.push({
                id: doc.id,
                ...data
            });
        });

        // If fallback query was used, sort locally.
        loadedCategories.sort((a, b) => {
            const nameA = String(a.name || '').toLowerCase();
            const nameB = String(b.name || '').toLowerCase();

            return nameA.localeCompare(nameB);
        });

        allCategories = loadedCategories;

        displayCategories();

        return allCategories;

    } catch (error) {
        console.error(
            'Error loading categories:',
            error
        );

        const container =
            document.getElementById('categoriesGrid') ||
            document.getElementById('categories-grid');

        if (container) {
            container.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                ">

                    <i
                        class="fas fa-exclamation-triangle"
                        style="
                            font-size: 3rem;
                            margin-bottom: 1rem;
                            color: var(--danger, #ff4d4d);
                        "
                    ></i>

                    <h3>Unable to Load Categories</h3>

                    <p style="
                        color: var(--text-secondary);
                        margin-bottom: 1.5rem;
                    ">
                        ${
                            error.code === 'permission-denied'
                                ? 'You do not have permission to access categories.'
                                : 'There was a problem connecting to the database.'
                        }
                    </p>

                    <button
                        type="button"
                        class="btn btn-primary"
                        onclick="loadCategories()"
                    >
                        <i class="fas fa-redo"></i>
                        Retry
                    </button>

                </div>
            `;
        }

        if (
            typeof showToast === 'function' &&
            error.code !== 'permission-denied'
        ) {
            showToast(
                'Unable to load categories. Please try again.',
                'error'
            );
        }

        return [];

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// Compatibility alias.
async function loadAllCategories() {
    return loadCategories();
}

// ============================================================================
// ADD CATEGORY FORM
// ============================================================================

function initCategoryForm() {
    const form =
        document.getElementById('category-form');

    const submitButton =
        document.getElementById(
            'submit-category-btn'
        );

    if (!form || !submitButton) {
        console.warn(
            'Category form or submit button not found.'
        );
        return;
    }

    // Prevent duplicate listeners.
    if (categoryFormInitialized) {
        return;
    }

    categoryFormInitialized = true;

    form.addEventListener(
        'submit',
        async function (event) {
            event.preventDefault();

            if (isSubmittingCategory) {
                return;
            }

            const originalButtonHTML =
                submitButton.innerHTML;

            const originalDisabled =
                submitButton.disabled;

            try {
                isSubmittingCategory = true;

                const nameElement =
                    document.getElementById(
                        'categoryName'
                    );

                const descriptionElement =
                    document.getElementById(
                        'categoryDescription'
                    );

                const slugElement =
                    document.getElementById(
                        'categorySlug'
                    );

                const iconElement =
                    document.getElementById(
                        'selectedIcon'
                    );

                const featuredElement =
                    document.getElementById(
                        'categoryFeatured'
                    );

                const categoryName =
                    nameElement
                        ? nameElement.value.trim()
                        : '';

                const categoryDescription =
                    descriptionElement
                        ? descriptionElement.value.trim()
                        : '';

                const enteredSlug =
                    slugElement
                        ? slugElement.value.trim()
                        : '';

                const categoryIcon =
                    iconElement
                        ? iconElement.value.trim()
                        : '';

                const isFeatured =
                    featuredElement
                        ? featuredElement.checked
                        : false;

                // --------------------------------------------------------
                // Validation
                // --------------------------------------------------------

                if (!categoryName) {
                    throw new Error(
                        'Category name is required.'
                    );
                }

                if (categoryName.length < 2) {
                    throw new Error(
                        'Category name must be at least 2 characters.'
                    );
                }

                if (categoryName.length > 50) {
                    throw new Error(
                        'Category name must not exceed 50 characters.'
                    );
                }

                if (!categoryIcon) {
                    throw new Error(
                        'Please select an icon for the category.'
                    );
                }

                const categorySlug =
                    generateSlug(
                        enteredSlug || categoryName
                    );

                if (!categorySlug) {
                    throw new Error(
                        'Unable to generate a valid category slug.'
                    );
                }

                // --------------------------------------------------------
                // Check duplicate slug/name
                // --------------------------------------------------------

                const duplicateCategory =
                    allCategories.find(category => {
                        const existingName =
                            String(
                                category.name || ''
                            )
                                .trim()
                                .toLowerCase();

                        const existingSlug =
                            String(
                                category.slug || ''
                            )
                                .trim()
                                .toLowerCase();

                        return (
                            existingName ===
                                categoryName.toLowerCase() ||
                            existingSlug ===
                                categorySlug.toLowerCase()
                        );
                    });

                if (duplicateCategory) {
                    throw new Error(
                        'A category with this name or slug already exists.'
                    );
                }

                // --------------------------------------------------------
                // Button loading state
                // --------------------------------------------------------

                submitButton.disabled = true;

                submitButton.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Adding...</span>
                `;

                // --------------------------------------------------------
                // Firestore data
                // --------------------------------------------------------

                const categoryData = {
                    name: categoryName,
                    slug: categorySlug,
                    icon: categoryIcon,
                    description: categoryDescription,
                    featured: isFeatured,
                    productCount: 0,
                    createdAt:
                        typeof firebase !== 'undefined' &&
                        firebase.firestore &&
                        firebase.firestore.Timestamp
                            ? firebase.firestore.Timestamp.now()
                            : new Date(),
                    updatedAt:
                        typeof firebase !== 'undefined' &&
                        firebase.firestore &&
                        firebase.firestore.Timestamp
                            ? firebase.firestore.Timestamp.now()
                            : new Date()
                };

                const categoriesRef =
                    getCategoriesCollection();

                if (!categoriesRef) {
                    throw new Error(
                        'Database connection is not ready. Please refresh the page and try again.'
                    );
                }

                // --------------------------------------------------------
                // Add document
                // --------------------------------------------------------

                const documentReference =
                    await categoriesRef.add(
                        categoryData
                    );

                console.log(
                    'Category added successfully:',
                    documentReference.id
                );

                if (typeof showToast === 'function') {
                    showToast(
                        'Category added successfully!',
                        'success'
                    );
                }

                // --------------------------------------------------------
                // Close the ACTUAL modal used by categories.html
                // --------------------------------------------------------

                if (
                    typeof window.closeCategoryModal ===
                    'function'
                ) {
                    window.closeCategoryModal();
                } else {
                    const modal =
                        document.getElementById(
                            'categoryModal'
                        );

                    if (modal) {
                        modal.classList.remove(
                            'active'
                        );

                        document.body.style.overflow =
                            '';
                    }
                }

                // --------------------------------------------------------
                // Reset form
                // --------------------------------------------------------

                form.reset();

                const selectedIcon =
                    document.getElementById(
                        'selectedIcon'
                    );

                if (selectedIcon) {
                    selectedIcon.value = '';
                }

                document
                    .querySelectorAll(
                        '#iconPicker .icon-option'
                    )
                    .forEach(option => {
                        option.classList.remove(
                            'selected'
                        );
                    });

                // --------------------------------------------------------
                // Reload categories
                // --------------------------------------------------------

                await loadCategories();

            } catch (error) {
                console.error(
                    'Error adding category:',
                    error
                );

                let errorMessage =
                    'Unable to add category. Please try again.';

                if (
                    error.code ===
                    'permission-denied'
                ) {
                    errorMessage =
                        'Permission denied. Please check your authentication and Firestore rules.';

                } else if (
                    error.code ===
                    'unauthenticated'
                ) {
                    errorMessage =
                        'You must be logged in to add categories.';

                } else if (
                    error.code ===
                    'unavailable'
                ) {
                    errorMessage =
                        'Database connection failed. Please check your internet connection.';

                } else if (
                    error.message
                ) {
                    errorMessage =
                        error.message;
                }

                if (
                    typeof showToast ===
                    'function'
                ) {
                    showToast(
                        errorMessage,
                        'error'
                    );
                } else {
                    alert(errorMessage);
                }

            } finally {
                isSubmittingCategory = false;

                submitButton.innerHTML =
                    originalButtonHTML;

                submitButton.disabled =
                    originalDisabled;
            }
        }
    );
}

// ============================================================================
// EDIT CATEGORY
// ============================================================================

async function handleEditCategory(categoryId) {
    if (!categoryId) {
        console.error(
            'Category ID is required.'
        );
        return false;
    }

    try {
        const category =
            allCategories.find(
                item =>
                    item.id === categoryId
            );

        if (!category) {
            throw new Error(
                'Category not found.'
            );
        }

        /*
         * The current categories.html only contains
         * the Add Category modal, not an Edit modal.
         *
         * Therefore do not create a broken edit flow.
         * If another page/template provides an edit modal,
         * populate it automatically.
         */

        const editModal =
            document.getElementById(
                'edit-category-modal'
            );

        const editForm =
            document.getElementById(
                'edit-category-form'
            );

        if (editModal && editForm) {
            const nameInput =
                editForm.querySelector(
                    '[name="name"]'
                );

            const slugInput =
                editForm.querySelector(
                    '[name="slug"]'
                );

            const iconInput =
                editForm.querySelector(
                    '[name="icon"]'
                );

            const descriptionInput =
                editForm.querySelector(
                    '[name="description"]'
                );

            const featuredInput =
                editForm.querySelector(
                    '[name="featured"]'
                );

            if (nameInput) {
                nameInput.value =
                    category.name || '';
            }

            if (slugInput) {
                slugInput.value =
                    category.slug ||
                    generateSlug(
                        category.name || ''
                    );
            }

            if (iconInput) {
                iconInput.value =
                    category.icon || '';
            }

            if (descriptionInput) {
                descriptionInput.value =
                    category.description || '';
            }

            if (featuredInput) {
                featuredInput.checked =
                    Boolean(
                        category.featured
                    );
            }

            editForm.setAttribute(
                'data-category-id',
                categoryId
            );

            editModal.classList.add(
                'active'
            );

            return true;
        }

        /*
         * No edit modal exists in the supplied HTML.
         * Show a clear message rather than failing silently.
         */

        if (typeof showToast === 'function') {
            showToast(
                'Edit interface is not available on this page yet.',
                'info'
            );
        }

        return false;

    } catch (error) {
        console.error(
            'Error preparing category for edit:',
            error
        );

        if (typeof showToast === 'function') {
            showToast(
                'Unable to edit category. Please try again.',
                'error'
            );
        }

        return false;
    }
}

// ============================================================================
// UPDATE CATEGORY
// ============================================================================

async function updateCategory(
    categoryId,
    updateData
) {
    if (!categoryId) {
        return false;
    }

    if (
        !updateData ||
        typeof updateData !== 'object'
    ) {
        return false;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const categoriesRef =
            getCategoriesCollection();

        if (!categoriesRef) {
            throw new Error(
                'Unable to access Firestore.'
            );
        }

        const safeUpdateData = {
            ...updateData,
            updatedAt:
                typeof firebase !== 'undefined' &&
                firebase.firestore &&
                firebase.firestore.Timestamp
                    ? firebase.firestore.Timestamp.now()
                    : new Date()
        };

        if (safeUpdateData.slug) {
            safeUpdateData.slug =
                generateSlug(
                    safeUpdateData.slug
                );
        }

        await categoriesRef
            .doc(categoryId)
            .update(safeUpdateData);

        if (typeof showToast === 'function') {
            showToast(
                'Category updated successfully!',
                'success'
            );
        }

        await loadCategories();

        return true;

    } catch (error) {
        console.error(
            'Error updating category:',
            error
        );

        if (typeof showToast === 'function') {
            let message =
                'Unable to update category. Please try again.';

            if (
                error.code ===
                'permission-denied'
            ) {
                message =
                    'Permission denied. Please check your authentication.';
            }

            showToast(
                message,
                'error'
            );
        }

        return false;

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// ============================================================================
// DELETE CATEGORY
// ============================================================================

async function handleDeleteCategory(
    categoryId
) {
    if (!categoryId) {
        return false;
    }

    const category =
        allCategories.find(
            item =>
                item.id === categoryId
        );

    const categoryName =
        category && category.name
            ? category.name
            : 'this category';

    const confirmed = window.confirm(
        `Are you sure you want to delete "${categoryName}"?\n\nProducts in this category will become uncategorized.`
    );

    if (!confirmed) {
        return false;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const categoriesRef =
            getCategoriesCollection();

        if (!categoriesRef) {
            throw new Error(
                'Unable to access Firestore.'
            );
        }

        await categoriesRef
            .doc(categoryId)
            .delete();

        if (typeof showToast === 'function') {
            showToast(
                'Category deleted successfully!',
                'success'
            );
        }

        await loadCategories();

        return true;

    } catch (error) {
        console.error(
            'Error deleting category:',
            error
        );

        let message =
            'Unable to delete category. Please try again.';

        if (
            error.code ===
            'permission-denied'
        ) {
            message =
                'Permission denied. Please check your authentication.';
        }

        if (typeof showToast === 'function') {
            showToast(
                message,
                'error'
            );
        }

        return false;

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// Compatibility aliases.
function deleteCategoryConfirm(
    categoryId
) {
    return handleDeleteCategory(
        categoryId
    );
}

async function performDeleteCategory(
    categoryId
) {
    return handleDeleteCategory(
        categoryId
    );
}

// ============================================================================
// CATEGORY SEARCH / FILTER
// ============================================================================

function searchCategories(query) {
    const searchTerm =
        String(query || '')
            .trim()
            .toLowerCase();

    if (!searchTerm) {
        displayCategories();
        return;
    }

    const filtered =
        allCategories.filter(
            category => {
                const name =
                    String(
                        category.name || ''
                    ).toLowerCase();

                const slug =
                    String(
                        category.slug || ''
                    ).toLowerCase();

                const description =
                    String(
                        category.description ||
                            ''
                    ).toLowerCase();

                return (
                    name.includes(
                        searchTerm
                    ) ||
                    slug.includes(
                        searchTerm
                    ) ||
                    description.includes(
                        searchTerm
                    )
                );
            }
        );

    renderCategories(
        filtered,
        'categoriesGrid'
    );
}

// ============================================================================
// CATEGORY SEARCH INITIALIZATION
// ============================================================================

function initCategorySearch() {
    const searchInput =
        document.getElementById(
            'category-search-input'
        );

    if (!searchInput) {
        return;
    }

    if (categorySearchInitialized) {
        return;
    }

    categorySearchInitialized = true;

    let searchTimeout = null;

    searchInput.addEventListener(
        'input',
        function (event) {
            clearTimeout(
                searchTimeout
            );

            searchTimeout =
                setTimeout(
                    function () {
                        searchCategories(
                            event.target.value
                        );
                    },
                    300
                );
        }
    );
}

// ============================================================================
// UPDATE PRODUCT COUNTS
// ============================================================================

async function updateCategoryProductCounts() {
    try {
        const categoriesRef =
            getCategoriesCollection();

        const database =
            window.db ||
            (
                typeof db !== 'undefined'
                    ? db
                    : null
            );

        if (
            !categoriesRef ||
            !database ||
            typeof database.collection !==
                'function'
        ) {
            return;
        }

        const productsRef =
            database.collection(
                'products'
            );

        const [
            categoriesSnapshot,
            productsSnapshot
        ] = await Promise.all([
            categoriesRef.get(),
            productsRef.get()
        ]);

        const productCounts = {};

        productsSnapshot.forEach(
            document => {
                const product =
                    document.data() || {};

                const category =
                    product.category;

                if (!category) {
                    return;
                }

                const normalizedCategory =
                    String(
                        category
                    )
                        .trim()
                        .toLowerCase();

                productCounts[
                    normalizedCategory
                ] =
                    (
                        productCounts[
                            normalizedCategory
                        ] || 0
                    ) + 1;
            }
        );

        const batch =
            database.batch();

        categoriesSnapshot.forEach(
            document => {
                const data =
                    document.data() || {};

                const slug =
                    String(
                        data.slug || ''
                    )
                        .trim()
                        .toLowerCase();

                const name =
                    String(
                        data.name || ''
                    )
                        .trim()
                        .toLowerCase();

                const count =
                    productCounts[slug] ||
                    productCounts[name] ||
                    0;

                batch.update(
                    document.ref,
                    {
                        productCount:
                            count
                    }
                );
            }
        );

        await batch.commit();

        console.log(
            'Category product counts updated successfully.'
        );

        await loadCategories();

    } catch (error) {
        console.error(
            'Error updating category product counts:',
            error
        );
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initCategories() {
    if (categoriesInitialized) {
        return;
    }

    categoriesInitialized = true;

    try {
        /*
         * Initialize form/search first so they are ready
         * independently of Firestore loading.
         */
        initCategoryForm();
        initCategorySearch();

        /*
         * Load categories only once.
         */
        await loadCategories();

        console.log(
            'Categories system initialized successfully.'
        );

    } catch (error) {
        console.error(
            'Error during category initialization:',
            error
        );

        categoriesInitialized = false;
    }
}

// ============================================================================
// AUTO INITIALIZATION
// ============================================================================

if (
    typeof document !== 'undefined'
) {
    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            initCategories,
            {
                once: true
            }
        );
    } else {
        initCategories();
    }
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (
    typeof window !== 'undefined'
) {
    window.loadCategories =
        loadCategories;

    window.loadAllCategories =
        loadAllCategories;

    window.renderCategories =
        renderCategories;

    window.displayCategories =
        displayCategories;

    window.createCategoryCard =
        createCategoryCard;

    window.generateSlug =
        generateSlug;

    window.handleEditCategory =
        handleEditCategory;

    window.updateCategory =
        updateCategory;

    window.handleDeleteCategory =
        handleDeleteCategory;

    window.deleteCategoryConfirm =
        deleteCategoryConfirm;

    window.performDeleteCategory =
        performDeleteCategory;

    window.searchCategories =
        searchCategories;

    window.updateCategoryProductCounts =
        updateCategoryProductCounts;

    window.initCategories =
        initCategories;

    window.initCategoryForm =
        initCategoryForm;

    window.initCategorySearch =
        initCategorySearch;

    window.init3DTiltCategory =
        init3DTiltCategory;

    window.handleCategoryTilt =
        handleCategoryTilt;

    window.resetCategoryTilt =
        resetCategoryTilt;
}

// ============================================================================
// 3D TILT EFFECT
// ============================================================================

function init3DTiltCategory(card) {
    if (!card) {
        return;
    }

    const reducedMotion =
        window.matchMedia &&
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

    if (reducedMotion) {
        return;
    }

    card.addEventListener(
        'mousemove',
        handleCategoryTilt,
        {
            passive: true
        }
    );

    card.addEventListener(
        'mouseleave',
        resetCategoryTilt,
        {
            passive: true
        }
    );

    card.addEventListener(
        'mouseenter',
        function () {
            this.style.transition =
                'none';
        },
        {
            passive: true
        }
    );
}

function handleCategoryTilt(event) {
    const card =
        event.currentTarget;

    if (!card) {
        return;
    }

    const rect =
        card.getBoundingClientRect();

    if (
        rect.width === 0 ||
        rect.height === 0
    ) {
        return;
    }

    const x =
        event.clientX -
        rect.left;

    const y =
        event.clientY -
        rect.top;

    const centerX =
        rect.width / 2;

    const centerY =
        rect.height / 2;

    const rotateX =
        (y - centerY) / 20;

    const rotateY =
        (centerX - x) / 20;

    requestAnimationFrame(
        function () {
            card.style.transform =
                `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        }
    );
}

function resetCategoryTilt(event) {
    const card =
        event.currentTarget;

    if (!card) {
        return;
    }

    requestAnimationFrame(
        function () {
            card.style.transition =
                'transform 0.4s ease';

            card.style.transform =
                'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        }
    );
}

// ============================================================================
// END OF categories.js
// ============================================================================
