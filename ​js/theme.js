/**
 * Theme Management System
 */

const THEME_KEY = 'gadget-hub-theme';
let currentTheme = 'dark';

/**
 * Initialize theme
 */
export function initTheme() {
  // Get saved theme or system preference
  const savedTheme = getSavedTheme();
  const systemTheme = getSystemTheme();
  
  currentTheme = savedTheme || systemTheme;
  applyTheme(currentTheme);
  
  // Setup theme toggle
  setupThemeToggle();
  
  // Listen for system theme changes
  listenToSystemThemeChanges();
}

/**
 * Get saved theme from localStorage
 */
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY);
}

/**
 * Get system theme preference
 */
function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

/**
 * Apply theme
 */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  updateThemeToggle();
}

/**
 * Toggle theme
 */
export function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Setup theme toggle button
 */
function setupThemeToggle() {
  const themeToggles = document.querySelectorAll('.theme-toggle');
  
  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggleTheme();
    });
  });
}

/**
 * Update theme toggle UI
 */
function updateThemeToggle() {
  const themeToggles = document.querySelectorAll('.theme-toggle-slider');
  
  themeToggles.forEach(slider => {
    if (currentTheme === 'dark') {
      slider.innerHTML = '🌙';
    } else {
      slider.innerHTML = '☀️';
    }
  });
}

/**
 * Listen to system theme changes
 */
function listenToSystemThemeChanges() {
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only apply if user hasn't manually set a preference
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
