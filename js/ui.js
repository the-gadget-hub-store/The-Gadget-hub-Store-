/* ============================================================
   THE GADGET HUB STORE - UI MODULE
   User interface controls, interactions, and utilities
   ============================================================ */

// ============================================================
// THEME MANAGEMENT
// ============================================================

let currentTheme = 'dark';
const THEME_STORAGE_KEY = 'gadgetHubTheme';

/**
 * Initialize theme
 */
export function initTheme() {
  // Check localStorage first
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  
  if (savedTheme) {
    currentTheme = savedTheme;
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = prefersDark ? 'dark' : 'light';
  }

  applyTheme(currentTheme);
  updateThemeToggleButtons();
}

/**
 * Apply theme to document
 * @param {string} theme - Theme name ('dark' or 'light')
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Toggle theme
 */
export function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  updateThemeToggleButtons();
  
  // Add transition class
  document.body.classList.add('theme-transition');
  setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, 300);
}

/**
 * Get current theme
 * @returns {string} Current theme
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Update theme toggle buttons
 */
function updateThemeToggleButtons() {
  const themeToggles = document.querySelectorAll('[data-theme-toggle]');
  
  themeToggles.forEach(toggle => {
    const icon = toggle.querySelector('[data-theme-icon]');
    if (icon) {
      icon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    }
    toggle.setAttribute('aria-label', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`);
  });
}

/**
 * Setup theme toggle buttons
 */
export function setupThemeToggle() {
  const themeToggles = document.querySelectorAll('[data-theme-toggle]');
  
  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', toggleTheme);
  });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

let toastContainer = null;
const TOAST_DURATION = 4000; // milliseconds

/**
 * Initialize toast container
 */
function initToastContainer() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('role', 'region');
  toastContainer.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(toastContainer);
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type ('success', 'error', 'warning', 'info')
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-in-right`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Close notification">✕</button>
  `;

  toastContainer.appendChild(toast);

  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    removeToast(toast);
  });

  // Auto remove
  setTimeout(() => {
    removeToast(toast);
  }, duration);

  return toast;
}

/**
 * Remove toast
 * @param {HTMLElement} toast - Toast element
 */
function removeToast(toast) {
  if (!toast || !toast.parentElement) return;

  toast.classList.add('toast-exit');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

/**
 * Show success toast
 * @param {string} message - Message
 */
export function showSuccess(message) {
  return showToast(message, 'success');
}

/**
 * Show error toast
 * @param {string} message - Message
 */
export function showError(message) {
  return showToast(message, 'error');
}

/**
 * Show warning toast
 * @param {string} message - Message
 */
export function showWarning(message) {
  return showToast(message, 'warning');
}

/**
 * Show info toast
 * @param {string} message - Message
 */
export function showInfo(message) {
  return showToast(message, 'info');
}

// ============================================================
// MODAL MANAGEMENT
// ============================================================

let activeModal = null;

/**
 * Open modal
 * @param {string} modalId - Modal element ID
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn(`Modal ${modalId} not found`);
    return;
  }

  const backdrop = modal.querySelector('.modal-backdrop') || createModalBackdrop(modal);
  const content = modal.querySelector('.modal');

  // Show modal
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Trigger animations
  setTimeout(() => {
    backdrop.classList.add('active');
    content.classList.add('active');
  }, 10);

  activeModal = modal;

  // Setup close handlers
  setupModalCloseHandlers(modal);

  // Focus first focusable element
  const firstFocusable = content.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) {
    firstFocusable.focus();
  }

  // Emit event
  modal.dispatchEvent(new CustomEvent('modalOpen'));
}

/**
 * Close modal
 * @param {string|HTMLElement} modal - Modal ID or element
 */
export function closeModal(modal) {
  let modalElement;

  if (typeof modal === 'string') {
    modalElement = document.getElementById(modal);
  } else {
    modalElement = modal;
  }

  if (!modalElement) return;

  const backdrop = modalElement.querySelector('.modal-backdrop');
  const content = modalElement.querySelector('.modal');

  // Hide with animation
  if (backdrop) backdrop.classList.remove('active');
  if (content) content.classList.remove('active');

  setTimeout(() => {
    modalElement.style.display = 'none';
    document.body.style.overflow = '';
  }, 300);

  activeModal = null;

  // Emit event
  modalElement.dispatchEvent(new CustomEvent('modalClose'));
}

/**
 * Create modal backdrop
 * @param {HTMLElement} modal - Modal element
 * @returns {HTMLElement} Backdrop element
 */
function createModalBackdrop(modal) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  modal.insertBefore(backdrop, modal.firstChild);
  return backdrop;
}

/**
 * Setup modal close handlers
 * @param {HTMLElement} modal - Modal element
 */
function setupModalCloseHandlers(modal) {
  // Close button
  const closeButtons = modal.querySelectorAll('[data-modal-close]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => closeModal(modal));
  });

  // Backdrop click
  const backdrop = modal.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => closeModal(modal));
  }

  // Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape' && activeModal === modal) {
      closeModal(modal);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

/**
 * Setup all modals on page
 */
export function setupModals() {
  const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
  
  modalTriggers.forEach(trigger => {
    const modalId = trigger.getAttribute('data-modal-trigger');
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(modalId);
    });
  });
}

// ============================================================
// MOBILE MENU
// ============================================================

let mobileMenuOpen = false;

/**
 * Toggle mobile menu
 */
export function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const backdrop = document.querySelector('.mobile-menu-backdrop') || createMobileMenuBackdrop();

  if (!mobileMenu) return;

  mobileMenuOpen = !mobileMenuOpen;

  if (mobileMenuOpen) {
    mobileMenu.classList.add('active');
    backdrop.classList.add('active');
    menuToggle?.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    mobileMenu.classList.remove('active');
    backdrop.classList.remove('active');
    menuToggle?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Close mobile menu
 */
export function closeMobileMenu() {
  if (!mobileMenuOpen) return;
  toggleMobileMenu();
}

/**
 * Create mobile menu backdrop
 * @returns {HTMLElement} Backdrop element
 */
function createMobileMenuBackdrop() {
  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-menu-backdrop';
  backdrop.addEventListener('click', closeMobileMenu);
  document.body.appendChild(backdrop);
  return backdrop;
}

/**
 * Setup mobile menu
 */
export function setupMobileMenu() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const menuClose = document.querySelector('.mobile-menu-close');

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMobileMenu);
  }

  if (menuClose) {
    menuClose.addEventListener('click', closeMobileMenu);
  }

  // Close on link click
  const mobileMenuLinks = document.querySelectorAll('.mobile-menu .nav-link');
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

// ============================================================
// LOADING STATES
// ============================================================

/**
 * Show loading spinner
 * @param {HTMLElement} container - Container element
 * @param {string} message - Optional loading message
 */
export function showLoading(container, message = 'Loading...') {
  if (!container) return;

  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner loading-spinner"></div>
      ${message ? `<p class="loading-message">${escapeHtml(message)}</p>` : ''}
    </div>
  `;
}

/**
 * Show skeleton loading
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton items
 * @param {string} type - Skeleton type ('product', 'category', 'text')
 */
export function showSkeleton(container, count = 3, type = 'product') {
  if (!container) return;

  const skeletons = {
    product: `
      <div class="product-card skeleton">
        <div class="skeleton-image"></div>
        <div class="product-info">
          <div class="skeleton-text" style="width: 60%"></div>
          <div class="skeleton-text" style="width: 40%"></div>
          <div class="skeleton-text" style="width: 80%"></div>
        </div>
      </div>
    `,
    category: `
      <div class="category-card skeleton">
        <div class="skeleton-image"></div>
        <div class="category-content">
          <div class="skeleton-text" style="width: 70%"></div>
        </div>
      </div>
    `,
    text: `
      <div class="skeleton-text"></div>
    `
  };

  const skeletonHTML = skeletons[type] || skeletons.text;
  container.innerHTML = skeletonHTML.repeat(count);
}

/**
 * Show empty state
 * @param {HTMLElement} container - Container element
 * @param {string} message - Empty state message
 * @param {string} icon - Optional icon
 */
export function showEmptyState(container, message = 'No items found', icon = '📦') {
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <p class="empty-state-message">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Show error state
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 */
export function showErrorState(container, message = 'Something went wrong') {
  if (!container) return;

  container.innerHTML = `
    <div class="error-state">
      <div class="error-state-icon">⚠️</div>
      <p class="error-state-message">${escapeHtml(message)}</p>
      <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
    </div>
  `;
}

// ============================================================
// SCROLL UTILITIES
// ============================================================

/**
 * Scroll to top smoothly
 */
export function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/**
 * Scroll to element
 * @param {string|HTMLElement} element - Element ID or element
 * @param {number} offset - Offset from top
 */
export function scrollToElement(element, offset = 100) {
  let targetElement;

  if (typeof element === 'string') {
    targetElement = document.getElementById(element) || document.querySelector(element);
  } else {
    targetElement = element;
  }

  if (!targetElement) return;

  const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

/**
 * Setup scroll to top button
 */
export function setupScrollToTop() {
  const scrollBtn = document.querySelector('[data-scroll-top]');
  if (!scrollBtn) return;

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  });

  scrollBtn.addEventListener('click', scrollToTop);
}

// ============================================================
// INTERSECTION OBSERVER (Scroll Reveal)
// ============================================================

let revealObserver = null;

/**
 * Initialize scroll reveal
 */
export function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if (revealElements.length === 0) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // Immediately show all elements
    revealElements.forEach(el => el.classList.add('active'));
    return;
  }

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Optionally unobserve after reveal
        // revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });
}

/**
 * Destroy scroll reveal observer
 */
export function destroyScrollReveal() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }
}

// ============================================================
// LAZY LOADING IMAGES
// ============================================================

let imageObserver = null;

/**
 * Initialize lazy loading for images
 */
export function initLazyLoading() {
  const lazyImages = document.querySelectorAll('img[data-src], img.image-lazy');

  if (lazyImages.length === 0) return;

  const observerOptions = {
    threshold: 0,
    rootMargin: '50px'
  };

  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');

        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }

        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    });
  }, observerOptions);

  lazyImages.forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Destroy lazy loading observer
 */
export function destroyLazyLoading() {
  if (imageObserver) {
    imageObserver.disconnect();
    imageObserver = null;
  }
}

// ============================================================
// FORM UTILITIES
// ============================================================

/**
 * Validate form
 * @param {HTMLFormElement} form - Form element
 * @returns {boolean} True if valid
 */
export function validateForm(form) {
  if (!form) return false;

  const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
  let isValid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  });

  return isValid;
}

/**
 * Clear form
 * @param {HTMLFormElement} form - Form element
 */
export function clearForm(form) {
  if (!form) return;
  form.reset();
  
  // Clear error states
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.classList.remove('error');
  });
}

/**
 * Set button loading state
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Loading state
 * @param {string} loadingText - Loading text
 */
export function setButtonLoading(button, loading, loadingText = 'Loading...') {
  if (!button) return;

  if (loading) {
    button.disabled = true;
    button.setAttribute('data-original-text', button.textContent);
    button.innerHTML = `<span class="spinner loading-spinner"></span> ${loadingText}`;
  } else {
    button.disabled = false;
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
      button.textContent = originalText;
      button.removeAttribute('data-original-text');
    }
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj)) return '';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Copy to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard');
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    showError('Failed to copy to clipboard');
    return false;
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize UI components
 */
export function initUI() {
  initTheme();
  setupThemeToggle();
  setupModals();
  setupMobileMenu();
  setupScrollToTop();
  initScrollReveal();
  initLazyLoading();

  console.log('✅ UI module initialized');
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}

// Make showToast available globally for auth.js and other modules
window.showToast = showToast;
window.showAuthRequired = (message) => showWarning(message);

// ============================================================
// EXPORTS
// ============================================================

export {
  // Theme
  initTheme,
  applyTheme,
  toggleTheme,
  getCurrentTheme,
  setupThemeToggle,
  
  // Toast
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  
  // Modal
  openModal,
  closeModal,
  setupModals,
  
  // Mobile Menu
  toggleMobileMenu,
  closeMobileMenu,
  setupMobileMenu,
  
  // Loading States
  showLoading,
  showSkeleton,
  showEmptyState,
  showErrorState,
  
  // Scroll
  scrollToTop,
  scrollToElement,
  setupScrollToTop,
  
  // Observers
  initScrollReveal,
  destroyScrollReveal,
  initLazyLoading,
  destroyLazyLoading,
  
  // Form
  validateForm,
  clearForm,
  setButtonLoading,
  
  // Utilities
  escapeHtml,
  debounce,
  throttle,
  formatDate,
  copyToClipboard,
  
  // Init
  initUI
};

console.log('✅ UI module loaded successfully');
