/**
 * UI Utility Functions
 */

// Toast notification system
const toastContainer = createToastContainer();

function createToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-close">✕</div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

function removeToast(toast) {
  toast.classList.add('fade-out');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

export function showSuccessToast(message, duration) {
  return showToast(message, 'success', duration);
}

export function showErrorToast(message, duration) {
  return showToast(message, 'error', duration);
}

export function showWarningToast(message, duration) {
  return showToast(message, 'warning', duration);
}

export function showInfoToast(message, duration) {
  return showToast(message, 'info', duration);
}

/**
 * Loading State Management
 */
export function setLoading(element, isLoading, loadingText = 'Loading...') {
  if (!element) return;

  if (isLoading) {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = `
      <span class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      ${loadingText}
    `;
  } else {
    element.disabled = false;
    element.textContent = element.dataset.originalText || element.textContent;
  }
}

export function createLoadingSkeleton(type = 'card', count = 1) {
  const skeletons = [];
  
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    
    if (type === 'card') {
      skeleton.className = 'skeleton skeleton-card';
    } else if (type === 'text') {
      skeleton.className = 'skeleton skeleton-text';
    } else if (type === 'title') {
      skeleton.className = 'skeleton skeleton-title';
    }
    
    skeletons.push(skeleton);
  }
  
  return skeletons;
}

export function showLoadingOverlay(message = 'Loading...') {
  let overlay = document.querySelector('.loading-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary);">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  return overlay;
}

export function hideLoadingOverlay() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/**
 * Modal Management
 */
export function createModal(title, content, options = {}) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <div class="modal-close">✕</div>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => closeModal(modal));
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
  
  setTimeout(() => modal.classList.add('active'), 10);
  
  return modal;
}

export function closeModal(modal) {
  modal.classList.remove('active');
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }, 300);
}

/**
 * Empty State
 */
export function createEmptyState(icon, title, description, ctaText, ctaAction) {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state fade-in';
  
  emptyState.innerHTML = `
    <div class="empty-state-icon">${icon}</div>
    <h3 class="empty-state-title">${title}</h3>
    <p class="empty-state-description">${description}</p>
    ${ctaText ? `<button class="btn btn-primary empty-state-cta">${ctaText}</button>` : ''}
  `;
  
  if (ctaText && ctaAction) {
    const ctaBtn = emptyState.querySelector('.empty-state-cta');
    ctaBtn.addEventListener('click', ctaAction);
  }
  
  return emptyState;
}

/**
 * Error State
 */
export function createErrorState(message, retryAction) {
  const errorState = document.createElement('div');
  errorState.className = 'empty-state fade-in';
  
  errorState.innerHTML = `
    <div class="empty-state-icon" style="color: var(--danger);">⚠</div>
    <h3 class="empty-state-title">Something went wrong</h3>
    <p class="empty-state-description">${message}</p>
    ${retryAction ? '<button class="btn btn-primary">Try Again</button>' : ''}
  `;
  
  if (retryAction) {
    const retryBtn = errorState.querySelector('.btn');
    retryBtn.addEventListener('click', retryAction);
  }
  
  return errorState;
}

/**
 * Debounce function
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
 * Format currency
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date) {
  if (!date) return '';
  
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
}

/**
 * Truncate text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate star rating HTML
 */
export function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let stars = '';
  
  for (let i = 0; i < fullStars; i++) {
    stars += '★';
  }
  
  if (hasHalfStar) {
    stars += '⯨';
  }
  
  for (let i = 0; i < emptyStars; i++) {
    stars += '☆';
  }
  
  return stars;
}

/**
 * Scroll reveal animation
 */
export function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, {
    threshold: 0.1
  });
  
  revealElements.forEach(el => observer.observe(el));
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate URL
 */
export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle Firebase errors
 */
export function handleFirebaseError(error) {
  console.error('Firebase Error:', error);
  
  const errorMessages = {
    'permission-denied': 'You don\'t have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
    'already-exists': 'This resource already exists.',
    'unauthenticated': 'Please log in to continue.',
    'unavailable': 'Service temporarily unavailable. Please try again.',
    'cancelled': 'Operation was cancelled.',
    'invalid-argument': 'Invalid data provided.',
    'deadline-exceeded': 'Operation timed out. Please try again.'
  };
  
  const code = error.code?.split('/')[1] || error.code;
  return errorMessages[code] || 'An unexpected error occurred. Please try again.';
}

/**
 * Lock body scroll
 */
export function lockBodyScroll() {
  document.body.style.overflow = 'hidden';
}

/**
 * Unlock body scroll
 */
export function unlockBodyScroll() {
  document.body.style.overflow = '';
}
