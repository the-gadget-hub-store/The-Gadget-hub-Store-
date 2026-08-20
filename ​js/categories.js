// categories.js - The Gadget Hub Store Category Management System
// Production-ready implementation with robust Firebase/Firestore error handling

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let allCategories = [];
let isSubmittingCategory = false;

// ============================================================================
// FIREBASE/FIRESTORE REFERENCES (Fixed for robust loading)
// ============================================================================

const getCategoriesCollection = () => {
    try {
        // Safe check for global db or firebase.firestore instance
        const database = window.db || (typeof db !== 'undefined' && db ? db : null) || (typeof firebase !== 'undefined' ? firebase.firestore() : null);
        
        if (database) {
            return database.collection('categories');
        }
        
        console.error('Firestore database not initialized');
        return null;
    } catch (error) {
        console.error('Error accessing Firestore categories collection:', error);
        return null;
    }
};

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
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// ============================================================================
// CATEGORY CARD CREATION
// ============================================================================

function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.setAttribute('data-category-id', category.id || '');
    card.setAttribute('data-category-slug', category.slug || '');

    // Generate category icon class or use default
    const iconClass = category.icon || 'fas fa-th-large';
    
    // Category name and slug
    const categoryName = category.name || 'Unnamed Category';
    const categorySlug = category.slug || generateSlug(categoryName);
    
    // Product count (if available)
    const productCount = category.productCount || 0;

    // Construct card HTML
    card.innerHTML = `
        <div class="category-card-inner">
            <div class="category-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="category-info">
                <h3 class="category-name">${categoryName}</h3>
                <p class="category-slug">${categorySlug}</p>
                <span class="category-product-count">${productCount} products</span>
            </div>
            <div class="category-actions">
                <button class="btn-edit-category" data-category-id="${category.id}" title="Edit Category">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete-category" data-category-id="${category.id}" title="Delete Category">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    // Initialize 3D tilt effect
    init3DTiltCategory(card);

    // Attach action handlers
    const editBtn = card.querySelector('.btn-edit-category');
    const deleteBtn = card.querySelector('.btn-delete-category');

    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditCategory(category.id);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteCategory(category.id);
        });
    }

    return card;
}

// ============================================================================
// CATEGORY RENDERING (Support both renderCategories and displayCategories)
// ============================================================================

function renderCategories(categories, containerId = 'categories-grid') {
    let container = document.getElementById(containerId);
    
    // Fallback support if containerId is categoriesGrid
    if (!container) {
        container = document.getElementById('categoriesGrid');
    }

    if (!container) {
        console.error(`Container not found`);
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Handle empty state
    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No categories found.</p>
                <p class="empty-state-hint">Add your first category to get started.</p>
            </div>
        `;
        return;
    }

    // Render each category card
    categories.forEach(category => {
        try {
            const card = createCategoryCard(category);
            container.appendChild(card);
        } catch (error) {
            console.error('Error rendering category card:', error, category);
        }
    });
}

// Alias function to support HTML templates looking for displayCategories
function displayCategories() {
    renderCategories(allCategories, 'categoriesGrid');
}

// ============================================================================
// LOAD CATEGORIES FROM FIRESTORE (Support both loadCategories and loadAllCategories)
// ============================================================================

async function loadCategories() {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const categoriesRef = getCategoriesCollection();

        if (!categoriesRef) {
            throw new Error('Unable to access categories collection');
        }

        const snapshot = await categoriesRef.orderBy('name', 'asc').get();

        allCategories = [];
        snapshot.forEach(doc => {
            allCategories.push({ id: doc.id, ...doc.data() });
        });

        renderCategories(allCategories);
        // Also update the alternative grid if present
        renderCategories(allCategories, 'categoriesGrid');

        return allCategories;

    } catch (error) {
        console.error('Error loading categories:', error);

        const container = document.getElementById('categories-grid') || document.getElementById('categoriesGrid');
        if (container) {
            container.innerHTML = `
                <div class="empty-state error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load categories.</p>
                    <button onclick="loadCategories()" class="btn-retry">Retry</button>
                </div>
            `;
        }

        if (typeof showToast === 'function' && error.code !== 'permission-denied') {
            showToast('Unable to load categories. Please try again.', 'error');
        }

        return [];

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// Alias function to support HTML templates looking for loadAllCategories
async function loadAllCategories() {
    return await loadCategories();
}

// ============================================================================
// 3D TILT EFFECT FOR CATEGORY CARDS
// ============================================================================

function init3DTiltCategory(card) {
    if (!card) return;

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    card.addEventListener('mousemove', handleCategoryTilt);
    card.addEventListener('mouseleave', resetCategoryTilt);
    card.addEventListener('mouseenter', function() {
        this.style.transition = 'none';
    });
}

function handleCategoryTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;

    requestAnimationFrame(() => {
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    });
}

function resetCategoryTilt(e) {
    const card = e.currentTarget;

    requestAnimationFrame(() => {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
}

// ============================================================================
// ADD CATEGORY FORM HANDLING (SAFE & FULLY RESTORED)
// ============================================================================

function initCategoryForm() {
    const form = document.getElementById('category-form');
    const submitButton = document.getElementById('submit-category-btn');

    if (!form || !submitButton) {
        return;
    }

    // Prevent duplicate event listeners
    if (form.getAttribute('data-listener-attached') === 'true') return;
    form.setAttribute('data-listener-attached', 'true');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent duplicate submissions
        if (isSubmittingCategory) {
            return;
        }

        // Store original button state
        const originalButtonText = submitButton.innerHTML;
        const originalButtonDisabled = submitButton.disabled;

        try {
            // Set submitting flag
            isSubmittingCategory = true;

            // Get form data safely supporting multiple naming conventions
            const categoryNameEl = document.getElementById('categoryName') || form.querySelector('[name="name"]');
            const categoryDescEl = document.getElementById('categoryDescription') || form.querySelector('[name="description"]');
            const categorySlugEl = document.getElementById('categorySlug') || form.querySelector('[name="slug"]');
            const categoryIconEl = document.getElementById('selectedIcon') || form.querySelector('[name="icon"]');
            const categoryFeaturedEl = document.getElementById('categoryFeatured') || form.querySelector('[name="featured"]');

            const categoryName = categoryNameEl ? categoryNameEl.value.trim() : '';
            const categoryDescription = categoryDescEl ? categoryDescEl.value.trim() : '';
            const categorySlugInput = categorySlugEl ? categorySlugEl.value.trim() : '';
            const categoryIcon = categoryIconEl ? categoryIconEl.value.trim() : '';
            const isFeatured = categoryFeaturedEl ? categoryFeaturedEl.checked : false;

            // VALIDATION
            if (!categoryName) {
                throw new Error('Category name is required');
            }

            if (categoryName.length < 2) {
                throw new Error('Category name must be at least 2 characters');
            }

            if (categoryName.length > 50) {
                throw new Error('Category name must not exceed 50 characters');
            }

            if (!categoryIcon) {
                throw new Error('Please select an icon for the category');
            }

            // Generate slug
            const categorySlug = categorySlugInput || generateSlug(categoryName);

            if (!categorySlug) {
                throw new Error('Unable to generate valid category slug');
            }

            // Update button to loading state (avoiding full-screen freeze)
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitButton.disabled = true;

            // Prepare category data
            const categoryData = {
                name: categoryName,
                slug: categorySlug,
                icon: categoryIcon || 'fas fa-th-large',
                description: categoryDescription || '',
                featured: isFeatured,
                productCount: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Get Firestore reference with fallback check
            let categoriesRef = getCategoriesCollection();
            if (!categoriesRef && typeof firebase !== 'undefined') {
                window.db = firebase.firestore();
                categoriesRef = getCategoriesCollection();
            }

            if (!categoriesRef) {
                throw new Error('Database connection not ready. Please refresh the page and try again.');
            }

            // Add category to Firestore
            const docRef = await categoriesRef.add(categoryData);

            // SUCCESS HANDLING
            if (typeof showToast === 'function') {
                showToast('Category added successfully!', 'success');
            }

            // Close modal safely (checking multiple ways modals are closed)
            const modal = document.getElementById('category-modal') || document.querySelector('.category-modal') || document.getElementById('addCategoryModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }

            if (typeof closeCategoryModal === 'function') {
                closeCategoryModal();
            }

            // Reset form
            form.reset();

            // Reload categories to show the new addition
            await loadCategories();

            console.log('Category added successfully with ID:', docRef.id);

        } catch (error) {
            // ERROR HANDLING
            console.error('Error adding category:', error);

            let errorMessage = 'Unable to add category. Please try again.';

            if (error.message) {
                errorMessage = error.message;
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Database connection failed. Please check your internet connection.';
            } else if (error.code === 'unauthenticated') {
                errorMessage = 'You must be logged in to add categories.';
            }

            // Display error toast
            if (typeof showToast === 'function') {
                try {
                    showToast(errorMessage, 'error');
                } catch (toastError) {
                    console.error('Error showing toast:', toastError);
                    alert(errorMessage);
                }
            } else {
                alert(errorMessage);
            }

        } finally {
            // GUARANTEED CLEANUP
            isSubmittingCategory = false;
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = originalButtonDisabled;

            if (typeof hideLoading === 'function') {
                try {
                    hideLoading();
                } catch (hideError) {
                    console.error('Error hiding loading state:', hideError);
                }
            }
        }
    });
}

// ============================================================================
// EDIT CATEGORY
// ============================================================================

async function handleEditCategory(categoryId) {
    if (!categoryId) {
        console.error('Category ID is required for editing');
        return;
    }

    try {
        const category = allCategories.find(cat => cat.id === categoryId);

        if (!category) {
            throw new Error('Category not found');
        }

        // Populate edit form or modal
        const editModal = document.getElementById('edit-category-modal');
        const editForm = document.getElementById('edit-category-form');

        if (editModal && editForm) {
            const nameInput = editForm.querySelector('[name="name"]');
            const iconInput = editForm.querySelector('[name="icon"]');
            const descriptionInput = editForm.querySelector('[name="description"]');

            if (nameInput) nameInput.value = category.name || '';
            if (iconInput) iconInput.value = category.icon || '';
            if (descriptionInput) descriptionInput.value = category.description || '';

            editForm.setAttribute('data-category-id', categoryId);
            editModal.classList.add('active');
        } else {
            console.warn('Edit modal or form not found in DOM');
        }

    } catch (error) {
        console.error('Error preparing category for edit:', error);

        if (typeof showToast === 'function') {
            showToast('Unable to edit category. Please try again.', 'error');
        }
    }
}

async function updateCategory(categoryId, updateData) {
    if (!categoryId) return false;

    try {
        if (typeof showLoading === 'function') showLoading();

        const categoriesRef = getCategoriesCollection();
        if (!categoriesRef) throw new Error('Unable to access database');

        const finalUpdateData = {
            ...updateData,
            updatedAt: new Date()
        };

        await categoriesRef.doc(categoryId).update(finalUpdateData);

        if (typeof showToast === 'function') {
            showToast('Category updated successfully!', 'success');
        }

        await loadCategories();
        return true;

    } catch (error) {
        console.error('Error updating category:', error);
        if (typeof showToast === 'function') {
            showToast('Unable to update category. Please try again.', 'error');
        }
        return false;
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// ============================================================================
// DELETE CATEGORY (Support both handleDeleteCategory and performDeleteCategory)
// ============================================================================

async function handleDeleteCategory(categoryId) {
    if (!categoryId) return false;

    const category = allCategories.find(cat => cat.id === categoryId);
    const categoryName = category ? category.name : 'this category';

    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
        return false;
    }

    try {
        if (typeof showLoading === 'function') showLoading();

        const categoriesRef = getCategoriesCollection();
        if (!categoriesRef) throw new Error('Unable to access database');

        await categoriesRef.doc(categoryId).delete();

        if (typeof showToast === 'function') {
            showToast('Category deleted successfully!', 'success');
        }

        await loadCategories();
        return true;

    } catch (error) {
        console.error('Error deleting category:', error);
        if (typeof showToast === 'function') {
            showToast('Unable to delete category. Please try again.', 'error');
        }
        return false;
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// Alias functions for compatibility
function deleteCategoryConfirm(categoryId) {
    handleDeleteCategory(categoryId);
}

async function performDeleteCategory(categoryId) {
    return await handleDeleteCategory(categoryId);
}

// ============================================================================
// CATEGORY SEARCH/FILTER
// ============================================================================

function searchCategories(query) {
    if (!query || query.trim() === '') {
        renderCategories(allCategories);
        return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = allCategories.filter(category => {
        const name = (category.name || '').toLowerCase();
        const slug = (category.slug || '').toLowerCase();
        const description = (category.description || '').toLowerCase();

        return name.includes(searchTerm) || 
               slug.includes(searchTerm) || 
               description.includes(searchTerm);
    });

    renderCategories(filtered);
}

function initCategorySearch() {
    const searchInput = document.getElementById('category-search-input');

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchCategories(e.target.value);
            }, 300);
        });
    }
}

// ============================================================================
// UPDATE PRODUCT COUNTS
// ============================================================================

async function updateCategoryProductCounts() {
    try {
        const categoriesRef = getCategoriesCollection();
        const productsRef = db.collection('products');

        if (!categoriesRef || !productsRef) return;

        const categoriesSnapshot = await categoriesRef.get();
        const productsSnapshot = await productsRef.get();

        const productCounts = {};

        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const category = product.category;

            if (category) {
                productCounts[category] = (productCounts[category] || 0) + 1;
            }
        });

        const database = window.db || db;
        const batch = database.batch();

        categoriesSnapshot.forEach(doc => {
            const categorySlug = doc.data().slug;
            const count = productCounts[categorySlug] || 0;

            batch.update(doc.ref, { productCount: count });
        });

        await batch.commit();
        console.log('Category product counts updated successfully');

    } catch (error) {
        console.error('Error updating category product counts:', error);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initCategories() {
    loadCategories().catch(err => console.error('Error during category initialization:', err));
    initCategoryForm();
    initCategorySearch();
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategories);
} else {
    initCategories();
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.loadCategories = loadCategories;
    window.loadAllCategories = loadAllCategories;
    window.renderCategories = renderCategories;
    window.displayCategories = displayCategories;
    window.createCategoryCard = createCategoryCard;
    window.generateSlug = generateSlug;
    window.handleEditCategory = handleEditCategory;
    window.updateCategory = updateCategory;
    window.handleDeleteCategory = handleDeleteCategory;
    window.deleteCategoryConfirm = deleteCategoryConfirm;
    window.performDeleteCategory = performDeleteCategory;
    window.searchCategories = searchCategories;
    window.updateCategoryProductCounts = updateCategoryProductCounts;
    window.initCategories = initCategories;
    window.init3DTiltCategory = init3DTiltCategory;
    window.handleCategoryTilt = handleCategoryTilt;
    window.resetCategoryTilt = resetCategoryTilt;
}
