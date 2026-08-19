// categories.js - The Gadget Hub Store Category Management System
// Production-ready implementation with robust Firebase/Firestore error handling

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let allCategories = [];
let isSubmittingCategory = false;

// ============================================================================
// FIREBASE/FIRESTORE REFERENCES
// ============================================================================

const getCategoriesCollection = () => {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.collection('categories');
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
// CATEGORY RENDERING
// ============================================================================

function renderCategories(categories, containerId = 'categories-grid') {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container with ID "${containerId}" not found`);
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

// ============================================================================
// LOAD CATEGORIES FROM FIRESTORE
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

        return allCategories;

    } catch (error) {
        console.error('Error loading categories:', error);

        const container = document.getElementById('categories-grid');
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
// ADD CATEGORY FORM HANDLING
// ============================================================================

function initCategoryForm() {
    const form = document.getElementById('category-form');
    const submitButton = document.getElementById('submit-category-btn');

    if (!form || !submitButton) {
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent duplicate submissions
        if (isSubmittingCategory) {
            return;
        }

        // Store original button state
        const originalButtonText = submitButton.textContent;
        const originalButtonDisabled = submitButton.disabled;

        try {
            // Set submitting flag
            isSubmittingCategory = true;

            // Get form data
            const formData = new FormData(form);
            const categoryName = formData.get('name')?.trim();
            const categoryIcon = formData.get('icon')?.trim();
            const categoryDescription = formData.get('description')?.trim();

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

            // Generate slug
            const categorySlug = generateSlug(categoryName);

            if (!categorySlug) {
                throw new Error('Unable to generate valid category slug');
            }

            // Check for duplicate slug
            const duplicateCategory = allCategories.find(cat => cat.slug === categorySlug);
            if (duplicateCategory) {
                throw new Error('A category with this name already exists');
            }

            // Update UI to loading state
            submitButton.textContent = 'Adding...';
            submitButton.disabled = true;

            if (typeof showLoading === 'function') {
                showLoading();
            }

            // Prepare category data
            const categoryData = {
                name: categoryName,
                slug: categorySlug,
                icon: categoryIcon || 'fas fa-th-large',
                description: categoryDescription || '',
                productCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Get Firestore reference
            const categoriesRef = getCategoriesCollection();

            if (!categoriesRef) {
                throw new Error('Unable to access database. Please check your connection.');
            }

            // Add category to Firestore
            const docRef = await categoriesRef.add(categoryData);

            // SUCCESS HANDLING
            if (typeof showToast === 'function') {
                showToast('Category added successfully!', 'success');
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

            // Handle specific error types
            if (error.message.includes('required') || 
                error.message.includes('characters') || 
                error.message.includes('already exists') ||
                error.message.includes('valid category slug')) {
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
            // GUARANTEED CLEANUP - This ALWAYS runs and fixes the hanging issue
            isSubmittingCategory = false;
            submitButton.textContent = originalButtonText;
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
            // Populate form fields
            const nameInput = editForm.querySelector('[name="name"]');
            const iconInput = editForm.querySelector('[name="icon"]');
            const descriptionInput = editForm.querySelector('[name="description"]');

            if (nameInput) nameInput.value = category.name || '';
            if (iconInput) iconInput.value = category.icon || '';
            if (descriptionInput) descriptionInput.value = category.description || '';

            // Store category ID for update
            editForm.setAttribute('data-category-id', categoryId);

            // Show modal
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
    if (!categoryId) {
        console.error('Category ID is required for update');
        return false;
    }

    if (!updateData || typeof updateData !== 'object') {
        console.error('Valid update data is required');
        return false;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const categoriesRef = getCategoriesCollection();

        if (!categoriesRef) {
            throw new Error('Unable to access database');
        }

        const finalUpdateData = {
            ...updateData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await categoriesRef.doc(categoryId).update(finalUpdateData);

        if (typeof showToast === 'function') {
            showToast('Category updated successfully!', 'success');
        }

        // Reload categories
        await loadCategories();

        return true;

    } catch (error) {
        console.error('Error updating category:', error);

        let errorMessage = 'Unable to update category. Please try again.';

        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Category not found.';
        }

        if (typeof showToast === 'function') {
            showToast(errorMessage, 'error');
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

async function handleDeleteCategory(categoryId) {
    if (!categoryId) {
        console.error('Category ID is required for deletion');
        return false;
    }

    const category = allCategories.find(cat => cat.id === categoryId);
    const categoryName = category ? category.name : 'this category';

    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
        return false;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }

        const categoriesRef = getCategoriesCollection();

        if (!categoriesRef) {
            throw new Error('Unable to access database');
        }

        await categoriesRef.doc(categoryId).delete();

        if (typeof showToast === 'function') {
            showToast('Category deleted successfully!', 'success');
        }

        // Reload categories
        await loadCategories();

        return true;

    } catch (error) {
        console.error('Error deleting category:', error);

        let errorMessage = 'Unable to delete category. Please try again.';

        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Category not found.';
        }

        if (typeof showToast === 'function') {
            showToast(errorMessage, 'error');
        }

        return false;

    } finally {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
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

        if (!categoriesRef || !productsRef) {
            return;
        }

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

        const batch = db.batch();

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
    // Load categories from Firestore
    loadCategories().catch(err => console.error('Error during category initialization:', err));

    // Initialize category form
    initCategoryForm();

    // Initialize search functionality
    initCategorySearch();

    // Update product counts (optional, can be called periodically)
    // updateCategoryProductCounts().catch(err => console.error('Error updating product counts:', err));
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
    window.renderCategories = renderCategories;
    window.createCategoryCard = createCategoryCard;
    window.generateSlug = generateSlug;
    window.handleEditCategory = handleEditCategory;
    window.updateCategory = updateCategory;
    window.handleDeleteCategory = handleDeleteCategory;
    window.searchCategories = searchCategories;
    window.updateCategoryProductCounts = updateCategoryProductCounts;
    window.initCategories = initCategories;
    window.init3DTiltCategory = init3DTiltCategory;
    window.handleCategoryTilt = handleCategoryTilt;
    window.resetCategoryTilt = resetCategoryTilt;
}
