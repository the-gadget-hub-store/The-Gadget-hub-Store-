// ===================================
// CATEGORIES MANAGEMENT
// ===================================

let allCategories = [];

// Load categories
async function loadCategories() {
    try {
        allCategories = await getCategories();
        return allCategories;
    } catch (error) {
        console.error('Error loading categories:', error);
        return DEMO_CATEGORIES;
    }
}

// Display categories on homepage
async function displayCategories() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
    try {
        const categories = await loadCategories();
        const featuredCategories = categories.filter(c => c.featured).slice(0, 8);
        
        if (featuredCategories.length === 0) {
            container.innerHTML = '<p>No categories available</p>';
            return;
        }
        
        container.innerHTML = featuredCategories.map(category => createCategoryCard(category)).join('');
        
        // Initialize category card interactions
        initCategoryCards();
    } catch (error) {
        console.error('Error displaying categories:', error);
        showToast('Failed to load categories', 'error');
    }
}

// Create category card HTML
function createCategoryCard(category) {
    return `
        <a href="/pages/shop.html?category=${category.id}" class="category-card" data-category-id="${category.id}">
            <div class="category-icon">
                <i class="fas ${category.icon}"></i>
            </div>
            <h3 class="category-name">${category.name}</h3>
            <p class="category-count">${formatNumber(category.productCount)} products</p>
        </a>
    `;
}

// Initialize category card interactions
function initCategoryCards() {
    const cards = document.querySelectorAll('.category-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', handleCategoryTilt);
        card.addEventListener('mouseleave', resetCategoryTilt);
    });
}

// Handle category card tilt
function handleCategoryTilt(e) {
    if (window.innerWidth < 992) return;
    
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
}

// Reset category card tilt
function resetCategoryTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
}

// Get category by slug
function getCategoryBySlug(slug) {
    return allCategories.find(c => c.slug === slug);
}

// Load all categories page
async function loadCategoriesPage() {
    const container = document.getElementById('allCategoriesGrid');
    if (!container) return;
    
    try {
        showLoading();
        const categories = await loadCategories();
        
        container.innerHTML = categories.map(category => createCategoryCard(category)).join('');
        initCategoryCards();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading categories page:', error);
        showToast('Failed to load categories', 'error');
        hideLoading();
    }
}
