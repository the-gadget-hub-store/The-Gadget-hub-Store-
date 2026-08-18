// ===================================
// MAIN APPLICATION INITIALIZATION
// ===================================

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('The Gadget Hub Store - Initializing...');
    
    // Initialize core features
    initNavigation();
    initScrollEffects();
    initHeroAnimations();
    initSearch();
    initializeFavorites();
    initNewsletterForm();
    initSocialLinks();
    initDealTimer();
    initCollectionSlider();
    initScrollReveal();
    
    // Load dynamic content based on current page
    loadPageContent();
    
    // Hide loading overlay
    setTimeout(() => {
        hideLoading();
    }, 500);
    
    console.log('The Gadget Hub Store - Initialized successfully');
});

// Initialize navigation
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const mobileDrawerOverlay = document.getElementById('mobileDrawerOverlay');
    const accountBtn = document.getElementById('accountBtn');
    const favoritesBtn = document.getElementById('favoritesBtn');
    
    // Scroll effect for navbar
    let lastScroll = 0;
    window.addEventListener('scroll', throttle(() => {
        const currentScroll = window.pageYOffset;
        
        if (navbar) {
            if (currentScroll > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        
        lastScroll = currentScroll;
    }, 100));
    
    // Mobile menu toggle
    if (mobileMenuBtn && mobileDrawer) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileDrawer.classList.add('active');
            mobileMenuBtn.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    // Close mobile drawer
    const closeMobileDrawer = () => {
        if (mobileDrawer) {
            mobileDrawer.classList.remove('active');
            if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
            document.body.style.overflow = '';
        }
    };
    
    if (closeDrawer) {
        closeDrawer.addEventListener('click', closeMobileDrawer);
    }
    
    if (mobileDrawerOverlay) {
        mobileDrawerOverlay.addEventListener('click', closeMobileDrawer);
    }
    
    // Account button
    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            if (isUserSignedIn()) {
                window.location.href = '/pages/account.html';
            } else {
                showLoginModal();
            }
        });
    }
    
    // Favorites button
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', () => {
            window.location.href = '/pages/favorites.html';
        });
    }
}

// Initialize scroll effects
function initScrollEffects() {
    // Parallax effect for hero elements
    const heroVisual = document.querySelector('.hero-visual');
    
    if (heroVisual) {
        window.addEventListener('scroll', throttle(() => {
            const scrolled = window.pageYOffset;
            const floatingProducts = document.querySelectorAll('.floating-product');
            
            floatingProducts.forEach(product => {
                const speed = product.dataset.speed || 1;
                const yPos = -(scrolled * speed * 0.1);
                product.style.transform = `translateY(${yPos}px)`;
            });
        }, 16));
    }
}

// Initialize hero animations
function initHeroAnimations() {
    // Animate stat counters
    const statValues = document.querySelectorAll('.stat-value');
    
    if (statValues.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.target);
                    animateCounter(entry.target, target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        statValues.forEach(stat => observer.observe(stat));
    }
}

// Initialize newsletter form
function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('newsletterEmail');
            const email = emailInput.value.trim();
            
            if (!validateEmail(email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            try {
                const result = await subscribeNewsletter(email);
                
                if (result.success) {
                    showToast(result.message, 'success');
                    emailInput.value = '';
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                console.error('Newsletter subscription error:', error);
                showToast('Subscription failed. Please try again.', 'error');
            }
        });
    }
}

// Initialize social links
async function initSocialLinks() {
    try {
        const settings = await getSettings();
        const socialLinks = document.querySelectorAll('.social-link');
        
        socialLinks.forEach(link => {
            const platform = link.dataset.social;
            if (settings.socialLinks && settings.socialLinks[platform]) {
                link.href = settings.socialLinks[platform];
            }
        });
    } catch (error) {
        console.error('Error loading social links:', error);
    }
}

// Initialize deal timer
function initDealTimer() {
    const timerElement = document.getElementById('dealTimer');
    if (!timerElement) return;
    
    // Set deal end time (24 hours from now for demo)
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    
    function updateTimer() {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance < 0) {
            timerElement.innerHTML = '<span>Deal Expired</span>';
            return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// Initialize collection slider
function initCollectionSlider() {
    const track = document.getElementById('collectionTrack');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    
    if (!track || !prevBtn || !nextBtn) return;
    
    let scrollAmount = 0;
    const scrollStep = 320; // Card width + gap
    
    nextBtn.addEventListener('click', () => {
        scrollAmount += scrollStep;
        track.style.scrollBehavior = 'smooth';
        track.scrollLeft = scrollAmount;
    });
    
    prevBtn.addEventListener('click', () => {
        scrollAmount -= scrollStep;
        if (scrollAmount < 0) scrollAmount = 0;
        track.style.scrollBehavior = 'smooth';
        track.scrollLeft = scrollAmount;
    });
    
    // Update scroll amount on manual scroll
    track.addEventListener('scroll', debounce(() => {
        scrollAmount = track.scrollLeft;
    }, 100));
}

// Load page-specific content
async function loadPageContent() {
    const path = window.location.pathname;
    
    if (path === '/' || path.endsWith('index.html')) {
        // Homepage
        await displayCategories();
        await loadTrendingProducts();
        await loadNewArrivals();
    } else if (path.includes('shop.html')) {
        // Shop page
        await loadShopPage();
    } else if (path.includes('product.html')) {
        // Product details page
        const productId = getURLParameter('id');
        if (productId) {
            await loadProductDetails(productId);
        }
    } else if (path.includes('favorites.html')) {
        // Favorites page
        await loadFavoritesPage();
    } else if (path.includes('trending.html')) {
        // Trending page
        await loadTrendingPage();
    } else if (path.includes('deals.html')) {
        // Deals page
        await loadDealsPage();
    } else if (path.includes('categories.html')) {
        // Categories page
        await loadCategoriesPage();
    } else if (path.includes('account.html')) {
        // Account page
        loadAccountPage();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
    }
    
    // Escape to close overlays
    if (e.key === 'Escape') {
        closeSearch();
        closeAuthModal();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('No internet connection', 'warning');
});

// Service Worker registration (optional for PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered:', registration))
            .catch(err => console.log('SW registration failed:', err));
    });
}
