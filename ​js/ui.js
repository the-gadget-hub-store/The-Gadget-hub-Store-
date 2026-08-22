// ui.js - The Gadget Hub Store
// Shared UI Utility Functions
// Production-safe, lightweight, and compatible with Admin Panel
//
// IMPORTANT:
// This file does NOT initialize Firebase.
// This file does NOT depend on categories.js.
// It only provides shared UI/helper functions used by admin pages.
//
// Expected script order:
// firebase.js -> ui.js -> auth.js/categories.js/admin.js
// ============================================================================


// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = 'info', duration = 3000) {
    try {
        const toastContainer = document.getElementById('toastContainer');

        // If the page does not have a toast container, fail safely.
        if (!toastContainer) {
            console.warn('Toast container not found:', message);
            return;
        }

        const validTypes = ['success', 'error', 'warning', 'info'];
        const toastType = validTypes.includes(type) ? type : 'info';

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${toastType}`;

        // Use textContent for user-provided message to avoid injecting HTML.
        toast.innerHTML = `
            <i class="fas ${icons[toastType]} toast-icon"></i>

            <div class="toast-content">
                <div class="toast-title">${titles[toastType]}</div>
                <p class="toast-message"></p>
            </div>

            <button
                type="button"
                class="toast-close"
                aria-label="Close notification"
            >
                <i class="fas fa-times"></i>
            </button>
        `;

        const messageElement = toast.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = String(message ?? '');
        }

        const closeButton = toast.querySelector('.toast-close');

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                closeToast(closeButton);
            });
        }

        toastContainer.appendChild(toast);

        const timeout = Math.max(Number(duration) || 3000, 500);

        setTimeout(() => {
            if (toast.isConnected) {
                closeToast(toast);
            }
        }, timeout);

    } catch (error) {
        console.error('showToast error:', error);
    }
}


// ============================================================================
// CLOSE TOAST
// ============================================================================

function closeToast(target) {
    try {
        if (!target) return;

        const toast = target.classList?.contains('toast')
            ? target
            : target.closest?.('.toast');

        if (!toast) return;

        toast.classList.add('removing');

        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
        }, 300);

    } catch (error) {
        console.error('closeToast error:', error);
    }
}


// ============================================================================
// LOADING SYSTEM
// ============================================================================
//
// Important:
// Some admin pages may contain #loadingOverlay while others may not.
// Therefore these functions NEVER assume that the overlay exists.
//
// A reference counter is used so multiple async operations do not
// accidentally hide each other's loading state.
// ============================================================================

let uiLoadingCounter = 0;


function showLoading() {
    try {
        uiLoadingCounter++;

        const overlay = document.getElementById('loadingOverlay');

        if (!overlay) {
            // No overlay on this page is NOT an error.
            return;
        }

        overlay.classList.remove('hidden');
        overlay.style.display = '';

        overlay.setAttribute('aria-hidden', 'false');

    } catch (error) {
        console.error('showLoading error:', error);
    }
}


function hideLoading(force = false) {
    try {
        if (force) {
            uiLoadingCounter = 0;
        } else {
            uiLoadingCounter = Math.max(0, uiLoadingCounter - 1);
        }

        // Do not hide while another operation is still loading.
        if (uiLoadingCounter > 0 && !force) {
            return;
        }

        const overlay = document.getElementById('loadingOverlay');

        if (!overlay) {
            return;
        }

        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');

    } catch (error) {
        console.error('hideLoading error:', error);
    }
}


// ============================================================================
// FORMAT PRICE
// ============================================================================

function formatPrice(price, currency = 'USD') {
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice)) {
        return `${currency === 'USD' ? '$' : ''}0.00`;
    }

    const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        PKR: 'PKR '
    };

    const symbol = symbols[currency] || `${currency} `;

    return `${symbol}${numericPrice.toFixed(2)}`;
}


// ============================================================================
// FORMAT NUMBER
// ============================================================================

function formatNumber(num) {
    const numericValue = Number(num);

    if (!Number.isFinite(numericValue)) {
        return '0';
    }

    return Math.floor(numericValue)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


// ============================================================================
// CALCULATE DISCOUNT
// ============================================================================

function calculateDiscount(original, current) {
    const originalPrice = Number(original);
    const currentPrice = Number(current);

    if (
        !Number.isFinite(originalPrice) ||
        !Number.isFinite(currentPrice) ||
        originalPrice <= 0
    ) {
        return 0;
    }

    return Math.round(
        ((originalPrice - currentPrice) / originalPrice) * 100
    );
}


// ============================================================================
// TRUNCATE TEXT
// ============================================================================

function truncateText(text, maxLength) {
    const value = String(text ?? '');
    const limit = Number(maxLength);

    if (!Number.isFinite(limit) || limit <= 0) {
        return '';
    }

    if (value.length <= limit) {
        return value;
    }

    return value.substring(0, limit) + '...';
}


// ============================================================================
// STAR RATING
// ============================================================================

function generateStarRating(rating, maxStars = 5) {
    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating)) {
        return '';
    }

    const starsCount = Math.max(1, Number(maxStars) || 5);

    const fullStars = Math.min(
        Math.floor(numericRating),
        starsCount
    );

    const hasHalfStar =
        numericRating % 1 >= 0.5 &&
        fullStars < starsCount;

    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }

    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }

    const emptyStars =
        starsCount - fullStars - (hasHalfStar ? 1 : 0);

    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }

    return stars;
}


// ============================================================================
// DEBOUNCE
// ============================================================================

function debounce(func, wait = 300) {
    if (typeof func !== 'function') {
        throw new TypeError('debounce requires a function');
    }

    let timeout = null;

    return function (...args) {
        const context = this;

        clearTimeout(timeout);

        timeout = setTimeout(() => {
            func.apply(context, args);
        }, Math.max(0, Number(wait) || 0));
    };
}


// ============================================================================
// THROTTLE
// ============================================================================

function throttle(func, limit = 100) {
    if (typeof func !== 'function') {
        throw new TypeError('throttle requires a function');
    }

    let waiting = false;

    return function (...args) {
        if (waiting) {
            return;
        }

        func.apply(this, args);

        waiting = true;

        setTimeout(() => {
            waiting = false;
        }, Math.max(0, Number(limit) || 0));
    };
}


// ============================================================================
// ANIMATE COUNTER
// ============================================================================

function animateCounter(element, target, duration = 2000) {
    if (!element) return;

    const targetValue = Number(target);

    if (!Number.isFinite(targetValue)) {
        element.textContent = '0';
        return;
    }

    const startTime = performance.now();
    const safeDuration = Math.max(Number(duration) || 2000, 100);

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / safeDuration, 1);

        const currentValue =
            Math.floor(targetValue * progress);

        element.textContent = formatNumber(currentValue);

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = formatNumber(targetValue);
        }
    }

    requestAnimationFrame(updateCounter);
}


// ============================================================================
// SCROLL REVEAL
// ============================================================================

function initScrollReveal() {
    const elements = document.querySelectorAll(
        '[data-scroll-reveal]'
    );

    if (!elements.length) {
        return;
    }

    // Respect reduced-motion preference.
    if (
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        elements.forEach(element => {
            element.classList.add('revealed');
        });

        return;
    }

    if (!('IntersectionObserver' in window)) {
        elements.forEach(element => {
            element.classList.add('revealed');
        });

        return;
    }

    const observer = new IntersectionObserver(
        (entries, observerInstance) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add('revealed');
                observerInstance.unobserve(entry.target);
            });
        },
        {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        }
    );

    elements.forEach(element => {
        observer.observe(element);
    });
}


// ============================================================================
// LAZY IMAGE LOADING
// ============================================================================

function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    if (!images.length) {
        return;
    }

    if (!('IntersectionObserver' in window)) {
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
        });

        return;
    }

    const imageObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                }

                const img = entry.target;

                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }

                observer.unobserve(img);
            });
        },
        {
            rootMargin: '100px'
        }
    );

    images.forEach(img => {
        imageObserver.observe(img);
    });
}


// ============================================================================
// SMOOTH SCROLL
// ============================================================================

function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    const reducedMotion =
        window.matchMedia &&
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

    element.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start'
    });
}


// ============================================================================
// COPY TO CLIPBOARD
// ============================================================================

async function copyToClipboard(text) {
    try {
        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === 'function'
        ) {
            await navigator.clipboard.writeText(String(text ?? ''));
            showToast('Copied to clipboard!', 'success');
            return true;
        }

        // Fallback for older browsers.
        const textarea = document.createElement('textarea');

        textarea.value = String(text ?? '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();

        const successful = document.execCommand('copy');

        textarea.remove();

        if (successful) {
            showToast('Copied to clipboard!', 'success');
            return true;
        }

        throw new Error('Copy command failed');

    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy', 'error');
        return false;
    }
}


// ============================================================================
// URL PARAMETERS
// ============================================================================

function getURLParameter(name) {
    try {
        const urlParams = new URLSearchParams(
            window.location.search
        );

        return urlParams.get(name);
    } catch (error) {
        console.error('getURLParameter error:', error);
        return null;
    }
}


function setURLParameter(name, value) {
    try {
        const url = new URL(window.location.href);

        url.searchParams.set(name, value);

        window.history.pushState(
            {},
            '',
            url.toString()
        );

    } catch (error) {
        console.error('setURLParameter error:', error);
    }
}


function removeURLParameter(name) {
    try {
        const url = new URL(window.location.href);

        url.searchParams.delete(name);

        window.history.pushState(
            {},
            '',
            url.toString()
        );

    } catch (error) {
        console.error('removeURLParameter error:', error);
    }
}


// ============================================================================
// RANDOM ID
// ============================================================================

function generateRandomId(length = 8) {
    const safeLength = Math.max(
        1,
        Number(length) || 8
    );

    return Math.random()
        .toString(36)
        .substring(2, safeLength + 2);
}


// ============================================================================
// DATE FORMATTING
// ============================================================================

function formatDate(date) {
    try {
        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '';
        }

        return parsedDate.toLocaleDateString(
            undefined,
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        );

    } catch (error) {
        console.error('formatDate error:', error);
        return '';
    }
}


// ============================================================================
// TIME AGO
// ============================================================================

function timeAgo(date) {
    try {
        const timestamp = new Date(date).getTime();

        if (Number.isNaN(timestamp)) {
            return '';
        }

        const seconds = Math.floor(
            (Date.now() - timestamp) / 1000
        );

        if (seconds < 0) {
            return 'just now';
        }

        if (seconds < 60) {
            return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
        }

        const minutes = Math.floor(seconds / 60);

        if (minutes < 60) {
            return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        }

        const hours = Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        }

        const days = Math.floor(hours / 24);

        if (days < 30) {
            return `${days} day${days === 1 ? '' : 's'} ago`;
        }

        const months = Math.floor(days / 30);

        if (months < 12) {
            return `${months} month${months === 1 ? '' : 's'} ago`;
        }

        const years = Math.floor(months / 12);

        return `${years} year${years === 1 ? '' : 's'} ago`;

    } catch (error) {
        console.error('timeAgo error:', error);
        return '';
    }
}


// ============================================================================
// EMAIL VALIDATION
// ============================================================================

function validateEmail(email) {
    if (typeof email !== 'string') {
        return false;
    }

    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return re.test(email.trim());
}


// ============================================================================
// SANITIZE HTML
// ============================================================================
//
// Converts supplied HTML into plain text safely.
// ============================================================================

function sanitizeHTML(html) {
    const temp = document.createElement('div');

    temp.textContent = String(html ?? '');

    return temp.innerHTML;
}


// ============================================================================
// SKELETON LOADER
// ============================================================================

function createSkeletonLoader(type, count = 1) {
    const safeCount = Math.max(
        0,
        Number(count) || 0
    );

    let skeleton = '';

    for (let i = 0; i < safeCount; i++) {
        if (type === 'product') {
            skeleton += '<div class="product-skeleton"></div>';
        }

        if (type === 'category') {
            skeleton += '<div class="category-skeleton"></div>';
        }
    }

    return skeleton;
}


// ============================================================================
// IMAGE ERROR HANDLER
// ============================================================================

function handleImageError(img) {
    if (!img) return;

    // Prevent an infinite error loop.
    if (img.dataset.errorHandled === 'true') {
        return;
    }

    img.dataset.errorHandled = 'true';

    img.alt = 'Image not available';

    // Only set placeholder if one is available.
    // Keep this path compatible with the existing project structure.
    img.src = '/assets/images/placeholder.jpg';
}


// ============================================================================
// CREATE MODAL
// ============================================================================

function createModal(title, content, options = {}) {
    const modal = document.createElement('div');

    modal.className = 'custom-modal';

    modal.innerHTML = `
        <div class="custom-modal-overlay"></div>

        <div
            class="custom-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="${sanitizeHTML(title)}"
        >
            <div class="custom-modal-header">
                <h3>${sanitizeHTML(title)}</h3>

                <button
                    type="button"
                    class="custom-modal-close"
                    aria-label="Close modal"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="custom-modal-body">
                ${content || ''}
            </div>

            ${
                options.footer
                    ? `<div class="custom-modal-footer">${options.footer}</div>`
                    : ''
            }
        </div>
    `;

    document.body.appendChild(modal);

    const closeButton =
        modal.querySelector('.custom-modal-close');

    const overlay =
        modal.querySelector('.custom-modal-overlay');

    let closed = false;

    const closeModal = () => {
        if (closed) return;

        closed = true;

        modal.classList.remove('active');

        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    };

    if (closeButton) {
        closeButton.addEventListener(
            'click',
            closeModal
        );
    }

    if (overlay) {
        overlay.addEventListener(
            'click',
            closeModal
        );
    }

    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    return modal;
}


// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

const storage = {

    set(key, value) {
        try {
            localStorage.setItem(
                String(key),
                JSON.stringify(value)
            );

            return true;

        } catch (error) {
            console.error(
                'LocalStorage set error:',
                error
            );

            return false;
        }
    },


    get(key) {
        try {
            const item = localStorage.getItem(
                String(key)
            );

            if (item === null) {
                return null;
            }

            return JSON.parse(item);

        } catch (error) {
            console.error(
                'LocalStorage get error:',
                error
            );

            return null;
        }
    },


    remove(key) {
        try {
            localStorage.removeItem(
                String(key)
            );

            return true;

        } catch (error) {
            console.error(
                'LocalStorage remove error:',
                error
            );

            return false;
        }
    },


    clear() {
        try {
            localStorage.clear();

            return true;

        } catch (error) {
            console.error(
                'LocalStorage clear error:',
                error
            );

            return false;
        }
    }
};


// ============================================================================
// GLOBAL EXPORTS
// ============================================================================
//
// Classic <script> files already expose function declarations globally,
// but explicit window assignments make compatibility with onclick handlers
// and other admin scripts clearer and safer.
// ============================================================================

if (typeof window !== 'undefined') {

    window.showToast = showToast;
    window.closeToast = closeToast;

    window.showLoading = showLoading;
    window.hideLoading = hideLoading;

    window.formatPrice = formatPrice;
    window.formatNumber = formatNumber;
    window.calculateDiscount = calculateDiscount;
    window.truncateText = truncateText;
    window.generateStarRating = generateStarRating;

    window.debounce = debounce;
    window.throttle = throttle;
    window.animateCounter = animateCounter;

    window.initScrollReveal = initScrollReveal;
    window.initLazyLoading = initLazyLoading;
    window.smoothScrollTo = smoothScrollTo;

    window.copyToClipboard = copyToClipboard;

    window.getURLParameter = getURLParameter;
    window.setURLParameter = setURLParameter;
    window.removeURLParameter = removeURLParameter;

    window.generateRandomId = generateRandomId;

    window.formatDate = formatDate;
    window.timeAgo = timeAgo;

    window.validateEmail = validateEmail;
    window.sanitizeHTML = sanitizeHTML;

    window.createSkeletonLoader = createSkeletonLoader;
    window.handleImageError = handleImageError;

    window.createModal = createModal;

    window.storage = storage;
}


// ============================================================================
// UI.JS LOADED
// ============================================================================

console.log('UI utilities loaded successfully.');
