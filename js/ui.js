/* ================================
   THE GADGET HUB STORE
   UI Utilities & Interactions
   ================================ */

/**
 * UI Module
 * 
 * Provides shared UI functionality:
 * - Theme management
 * - Toast notifications
 * - Modal/dropdown controls
 * - Loading states
 * - Navigation interactions
 * - Scroll animations
 * - Utility functions
 */

/* ================================
   THEME MANAGEMENT
   ================================ */

const THEME_KEY = 'gadget-hub-theme';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Initialize theme system
 */
export function initializeTheme() {
  try {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem(THEME_KEY);
    
    if (savedTheme) {
      // Use saved preference
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    
    // Listen for system theme changes (only if no saved preference)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
    
    console.log('✅ Theme system initialized');
  } catch (error) {
    console.error('Error initializing theme:', error);
    // Fallback to dark theme
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'dark');
  }
}

/**
 * Set theme
 * @param {string} theme - 'dark' or 'light'
 */
export function setTheme(theme) {
  try {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    localStorage.setItem(THEME_KEY, theme);
    console.log('🎨 Theme set to:', theme);
  } catch (error) {
    console.error('Error setting theme:', error);
  }
}

/**
 * Get current theme
 * @returns {string} Current theme ('dark' or 'light')
 */
export function getTheme() {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) || 'dark';
}

/**
 * Toggle theme
 */
export function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} theme activated`, 'info');
}

/**
 * Setup theme toggle button
 */
export function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    console.log('✅ Theme toggle button initialized');
  }
}

/* ================================
   TOAST NOTIFICATIONS
   ================================ */

let toastContainer;
let toastIdCounter = 0;

/**
 * Initialize toast container
 */
function initializeToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      console.warn('Toast container not found, creating dynamically');
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = initializeToastContainer();
  if (!container) return;
  
  const toastId = `toast-${++toastIdCounter}`;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  
  // Icon based on type
  const icons = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <circle cx="12" cy="12" r="10"/>
             <line x1="12" y1="16" x2="12" y2="12"/>
             <line x1="12" y1="8" x2="12.01" y2="8"/>
           </svg>`
  };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  
  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toastId));
  
  // Add to container
  container.appendChild(toast);
  
  // Auto remove
  if (duration > 0) {
    setTimeout(() => removeToast(toastId), duration);
  }
  
  return toastId;
}

/**
 * Remove toast
 * @param {string} toastId - Toast ID to remove
 */
export function removeToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

/* ================================
   MODAL & DROPDOWN CONTROLS
   ================================ */

/**
 * Open modal
 * @param {string} modalId - Modal element ID
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus first focusable element
    const firstFocusable = modal.querySelector('button, input, textarea, select, a[href]');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }
}

/**
 * Close modal
 * @param {string} modalId - Modal element ID
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

/**
 * Toggle dropdown
 * @param {string} dropdownId - Dropdown element ID
 */
export function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    const isActive = dropdown.classList.contains('active');
    
    // Close all other dropdowns first
    closeAllDropdowns();
    
    if (!isActive) {
      dropdown.classList.add('active');
      dropdown.setAttribute('aria-hidden', 'false');
    }
  }
}

/**
 * Close dropdown
 * @param {string} dropdownId - Dropdown element ID
 */
export function closeDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    dropdown.classList.remove('active');
    dropdown.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Close all dropdowns
 */
export function closeAllDropdowns() {
  const dropdowns = document.querySelectorAll('.currency-dropdown, .dropdown');
  dropdowns.forEach(dropdown => {
    dropdown.classList.remove('active');
    dropdown.setAttribute('aria-hidden', 'true');
  });
}

/* ================================
   NAVIGATION
   ================================ */

/**
 * Setup mobile menu toggle
 */
export function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isActive = mobileMenu.classList.contains('active');
      
      if (isActive) {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      } else {
        mobileMenu.classList.add('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }
    });
    
    // Close menu when clicking links
    const mobileLinks = mobileMenu.querySelectorAll('.mobile-nav-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    
    console.log('✅ Mobile menu initialized');
  }
}

/**
 * Setup navigation scroll behavior
 */
export function setupNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });
  
  console.log('✅ Navigation scroll behavior initialized');
}

/* ================================
   SEARCH MODAL
   ================================ */

/**
 * Setup search modal
 */
export function setupSearchModal() {
  const searchBtn = document.getElementById('searchBtn');
  const searchModal = document.getElementById('searchModal');
  const searchClose = document.getElementById('searchClose');
  const searchInput = document.getElementById('searchInput');
  
  if (searchBtn && searchModal) {
    searchBtn.addEventListener('click', () => {
      openModal('searchModal');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    });
  }
  
  if (searchClose && searchModal) {
    searchClose.addEventListener('click', () => {
      closeModal('searchModal');
    });
  }
  
  // Close on backdrop click
  if (searchModal) {
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        closeModal('searchModal');
      }
    });
  }
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
      closeModal('searchModal');
    }
  });
  
  console.log('✅ Search modal initialized');
}

/* ================================
   LOADING STATES
   ================================ */

/**
 * Show loading state in element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} message - Loading message
 */
export function showLoading(element, message = 'Loading...') {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  
  el.innerHTML = `
    <div class="products-loading">
      <div class="spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Show empty state in element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} message - Empty state message
 */
export function showEmptyState(element, message = 'No items found') {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  
  el.innerHTML = `
    <div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-muted); margin-bottom: var(--spacing-md);">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p style="color: var(--color-text-tertiary); font-size: 1rem;">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Show error state in element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} message - Error message
 */
export function showError(element, message = 'An error occurred') {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  
  el.innerHTML = `
    <div class="error-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-error); margin-bottom: var(--spacing-md);">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <p style="color: var(--color-error); font-size: 1rem; margin-bottom: var(--spacing-md);">${escapeHtml(message)}</p>
      <button class="btn btn-outline" onclick="window.location.reload()">Retry</button>
    </div>
  `;
}

/**
 * Set button loading state
 * @param {HTMLElement|string} button - Button element or ID
 * @param {boolean} loading - Loading state
 */
export function setButtonLoading(button, loading) {
  const btn = typeof button === 'string' ? document.getElementById(button) : button;
  if (!btn) return;
  
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ================================
   SCROLL ANIMATIONS
   ================================ */

/**
 * Setup scroll reveal animations
 */
export function setupScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal, .reveal-stagger, .reveal-left, .reveal-right, .reveal-scale');
  
  if (revealElements.length === 0) return;
  
  const observerOptions = {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  revealElements.forEach(element => observer.observe(element));
  
  console.log(`✅ Scroll animations initialized for ${revealElements.length} elements`);
}

/* ================================
   SCROLL TO TOP
   ================================ */

/**
 * Setup scroll to top button
 */
export function setupScrollToTop() {
  let scrollToTopBtn = document.getElementById('scrollToTop');
  
  // Create button if it doesn't exist
  if (!scrollToTopBtn) {
    scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.id = 'scrollToTop';
    scrollToTopBtn.className = 'scroll-to-top';
    scrollToTopBtn.setAttribute('aria-label', 'Scroll to top');
    scrollToTopBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5"/>
        <polyline points="5 12 12 5 19 12"/>
      </svg>
    `;
    document.body.appendChild(scrollToTopBtn);
  }
  
  // Show/hide based on scroll position
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible');
    }
  });
  
  // Scroll to top on click
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  console.log('✅ Scroll to top button initialized');
}

/* ================================
   UTILITY FUNCTIONS
   ================================ */

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
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
 * Get element safely
 * @param {string} selector - Element selector
 * @returns {HTMLElement|null} Element or null
 */
export function getElement(selector) {
  return document.querySelector(selector);
}

/**
 * Get elements safely
 * @param {string} selector - Elements selector
 * @returns {NodeList} NodeList of elements
 */
export function getElements(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Close dropdowns when clicking outside
 */
export function setupOutsideClickHandler() {
  document.addEventListener('click', (e) => {
    // Close dropdowns
    if (!e.target.closest('.currency-selector') && !e.target.closest('.currency-dropdown')) {
      closeAllDropdowns();
    }
  });
}

/* ================================
   INITIALIZATION
   ================================ */

/**
 * Initialize all UI components
 */
export function initializeUI() {
  console.log('🎨 Initializing UI components...');
  
  initializeTheme();
  setupThemeToggle();
  setupMobileMenu();
  setupNavScroll();
  setupSearchModal();
  setupScrollAnimations();
  setupScrollToTop();
  setupOutsideClickHandler();
  
  console.log('✅ UI initialization complete');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}
