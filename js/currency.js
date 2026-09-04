/* ============================================================
   THE GADGET HUB STORE - CURRENCY MODULE
   International currency management and conversion
   ============================================================ */

import {
  getGlobalSettings,
  updateGlobalSettings
} from './firebase.js';

// ============================================================
// CURRENCY CONFIGURATION
// ============================================================

// 20 Supported Currencies (Fixed Initial Set)
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States', region: 'Americas' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', country: 'United Kingdom', region: 'Europe' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'Eurozone', region: 'Europe' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada', region: 'Americas' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia', region: 'Oceania' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China', region: 'Asia' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan', region: 'Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', country: 'South Korea', region: 'Asia' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India', region: 'Asia' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', country: 'Pakistan', region: 'Asia' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', country: 'Bangladesh', region: 'Asia' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', country: 'Nepal', region: 'Asia' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', country: 'UAE', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', country: 'Saudi Arabia', region: 'Middle East' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', country: 'Turkey', region: 'Middle East' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', country: 'Malaysia', region: 'Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', country: 'Indonesia', region: 'Asia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore', region: 'Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', country: 'Thailand', region: 'Asia' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', country: 'South Africa', region: 'Africa' }
];

// Country to Currency Mapping (for automatic detection)
const COUNTRY_CURRENCY_MAP = {
  'US': 'USD', 'United States': 'USD',
  'GB': 'GBP', 'United Kingdom': 'GBP', 'UK': 'GBP',
  'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR',
  'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR', 'GR': 'EUR',
  'CA': 'CAD', 'Canada': 'CAD',
  'AU': 'AUD', 'Australia': 'AUD',
  'CN': 'CNY', 'China': 'CNY',
  'JP': 'JPY', 'Japan': 'JPY',
  'KR': 'KRW', 'South Korea': 'KRW',
  'IN': 'INR', 'India': 'INR',
  'PK': 'PKR', 'Pakistan': 'PKR',
  'BD': 'BDT', 'Bangladesh': 'BDT',
  'NP': 'NPR', 'Nepal': 'NPR',
  'AE': 'AED', 'UAE': 'AED', 'United Arab Emirates': 'AED',
  'SA': 'SAR', 'Saudi Arabia': 'SAR',
  'TR': 'TRY', 'Turkey': 'TRY',
  'MY': 'MYR', 'Malaysia': 'MYR',
  'ID': 'IDR', 'Indonesia': 'IDR',
  'SG': 'SGD', 'Singapore': 'SGD',
  'TH': 'THB', 'Thailand': 'THB',
  'ZA': 'ZAR', 'South Africa': 'ZAR'
};

// ============================================================
// CURRENCY STATE
// ============================================================

let currentCurrency = 'USD';
let exchangeRates = {};
let ratesLastUpdated = null;
let currencySettings = null;
let currencyChangeCallbacks = [];

const STORAGE_KEY_CURRENCY = 'selectedCurrency';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// ============================================================
// INITIALIZE CURRENCY SYSTEM
// ============================================================

/**
 * Initialize currency system
 */
export async function initCurrency() {
  try {
    // Load settings from Firebase
    await loadCurrencySettings();

    // Determine initial currency based on priority
    const detectedCurrency = await determineInitialCurrency();
    currentCurrency = detectedCurrency;

    // Load exchange rates
    await loadExchangeRates();

    console.log('✅ Currency module initialized:', currentCurrency);
  } catch (error) {
    console.error('Error initializing currency:', error);
    // Fallback to USD
    currentCurrency = 'USD';
  }
}

/**
 * Determine initial currency based on priority
 * @returns {Promise<string>} Currency code
 */
async function determineInitialCurrency() {
  // Priority 1: Explicit user selection
  const savedCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY);
  if (savedCurrency && isCurrencySupported(savedCurrency)) {
    console.log('Using saved currency:', savedCurrency);
    return savedCurrency;
  }

  // Priority 2: Detected country/region
  const detectedCurrency = await detectCurrencyFromLocation();
  if (detectedCurrency) {
    console.log('Using detected currency:', detectedCurrency);
    return detectedCurrency;
  }

  // Priority 3: Browser locale
  const localeCurrency = getCurrencyFromLocale();
  if (localeCurrency) {
    console.log('Using locale currency:', localeCurrency);
    return localeCurrency;
  }

  // Priority 4: Admin default
  if (currencySettings?.defaultCurrency && isCurrencySupported(currencySettings.defaultCurrency)) {
    console.log('Using admin default currency:', currencySettings.defaultCurrency);
    return currencySettings.defaultCurrency;
  }

  // Priority 5: Final fallback
  console.log('Using fallback currency: USD');
  return 'USD';
}

// ============================================================
// CURRENCY SETTINGS
// ============================================================

/**
 * Load currency settings from Firebase
 */
async function loadCurrencySettings() {
  try {
    const settings = await getGlobalSettings();
    
    if (settings) {
      currencySettings = {
        defaultCurrency: settings.defaultCurrency || 'USD',
        supportedCurrencies: settings.supportedCurrencies || SUPPORTED_CURRENCIES.map(c => c.code),
        exchangeRateProvider: settings.exchangeRateProvider || 'manual',
        exchangeRates: settings.exchangeRates || {},
        exchangeRatesUpdatedAt: settings.exchangeRatesUpdatedAt,
        currencyDetectionEnabled: settings.currencyDetectionEnabled !== false,
        manualSelectionEnabled: settings.manualSelectionEnabled !== false
      };

      // Use stored exchange rates if available
      if (currencySettings.exchangeRates && Object.keys(currencySettings.exchangeRates).length > 0) {
        exchangeRates = currencySettings.exchangeRates;
        ratesLastUpdated = currencySettings.exchangeRatesUpdatedAt?.toDate 
          ? currencySettings.exchangeRatesUpdatedAt.toDate() 
          : new Date(currencySettings.exchangeRatesUpdatedAt || Date.now());
      }
    } else {
      // Use defaults
      currencySettings = {
        defaultCurrency: 'USD',
        supportedCurrencies: SUPPORTED_CURRENCIES.map(c => c.code),
        exchangeRateProvider: 'manual',
        exchangeRates: {},
        currencyDetectionEnabled: true,
        manualSelectionEnabled: true
      };
    }
  } catch (error) {
    console.error('Error loading currency settings:', error);
    // Use defaults on error
    currencySettings = {
      defaultCurrency: 'USD',
      supportedCurrencies: SUPPORTED_CURRENCIES.map(c => c.code),
      exchangeRateProvider: 'manual',
      exchangeRates: {},
      currencyDetectionEnabled: true,
      manualSelectionEnabled: true
    };
  }
}

/**
 * Get enabled currencies
 * @returns {Array} Array of enabled currency objects
 */
export function getEnabledCurrencies() {
  const enabledCodes = currencySettings?.supportedCurrencies || SUPPORTED_CURRENCIES.map(c => c.code);
  return SUPPORTED_CURRENCIES.filter(currency => enabledCodes.includes(currency.code));
}

// ============================================================
// CURRENCY DETECTION
// ============================================================

/**
 * Detect currency from user location
 * @returns {Promise<string|null>} Detected currency code
 */
async function detectCurrencyFromLocation() {
  try {
    // Check if detection is enabled
    if (currencySettings && !currencySettings.currencyDetectionEnabled) {
      return null;
    }

    // Note: This is a client-side approximation
    // For production, consider using a GeoIP service
    
    // Try using browser timezone as a hint
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currencyFromTimezone = getCurrencyFromTimezone(timeZone);
    
    if (currencyFromTimezone) {
      return currencyFromTimezone;
    }

    return null;
  } catch (error) {
    console.error('Error detecting currency from location:', error);
    return null;
  }
}

/**
 * Get currency from timezone
 * @param {string} timeZone - IANA timezone
 * @returns {string|null} Currency code
 */
function getCurrencyFromTimezone(timeZone) {
  const timezoneMap = {
    'America/New_York': 'USD',
    'America/Chicago': 'USD',
    'America/Los_Angeles': 'USD',
    'America/Denver': 'USD',
    'America/Toronto': 'CAD',
    'America/Vancouver': 'CAD',
    'Europe/London': 'GBP',
    'Europe/Paris': 'EUR',
    'Europe/Berlin': 'EUR',
    'Europe/Rome': 'EUR',
    'Europe/Madrid': 'EUR',
    'Asia/Shanghai': 'CNY',
    'Asia/Tokyo': 'JPY',
    'Asia/Seoul': 'KRW',
    'Asia/Kolkata': 'INR',
    'Asia/Karachi': 'PKR',
    'Asia/Dhaka': 'BDT',
    'Asia/Kathmandu': 'NPR',
    'Asia/Dubai': 'AED',
    'Asia/Riyadh': 'SAR',
    'Asia/Istanbul': 'TRY',
    'Asia/Kuala_Lumpur': 'MYR',
    'Asia/Jakarta': 'IDR',
    'Asia/Singapore': 'SGD',
    'Asia/Bangkok': 'THB',
    'Australia/Sydney': 'AUD',
    'Africa/Johannesburg': 'ZAR'
  };

  return timezoneMap[timeZone] || null;
}

/**
 * Get currency from browser locale
 * @returns {string|null} Currency code
 */
function getCurrencyFromLocale() {
  try {
    const locale = navigator.language || navigator.userLanguage;
    
    // Extract country code from locale (e.g., 'en-US' -> 'US')
    const countryCode = locale.split('-')[1];
    
    if (countryCode) {
      const currency = COUNTRY_CURRENCY_MAP[countryCode];
      if (currency && isCurrencySupported(currency)) {
        return currency;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting currency from locale:', error);
    return null;
  }
}

// ============================================================
// EXCHANGE RATES
// ============================================================

/**
 * Load exchange rates
 */
async function loadExchangeRates() {
  try {
    // Check if we have cached rates
    if (exchangeRates && Object.keys(exchangeRates).length > 0) {
      const now = new Date();
      const cacheAge = ratesLastUpdated ? now - ratesLastUpdated : Infinity;
      
      if (cacheAge < CACHE_DURATION) {
        console.log('Using cached exchange rates');
        return;
      }
    }

    // If no cached rates or cache expired, use fallback rates
    exchangeRates = getFallbackExchangeRates();
    ratesLastUpdated = new Date();
    
    console.log('Using fallback exchange rates');
  } catch (error) {
    console.error('Error loading exchange rates:', error);
    // Use fallback rates on error
    exchangeRates = getFallbackExchangeRates();
    ratesLastUpdated = new Date();
  }
}

/**
 * Get fallback exchange rates (approximate rates as of 2024)
 * Note: These are FALLBACK rates only. Production should use live rates.
 * @returns {Object} Exchange rates object
 */
function getFallbackExchangeRates() {
  return {
    'USD': 1.00,
    'GBP': 0.79,
    'EUR': 0.92,
    'CAD': 1.36,
    'AUD': 1.52,
    'CNY': 7.24,
    'JPY': 149.50,
    'KRW': 1320.00,
    'INR': 83.12,
    'PKR': 278.50,
    'BDT': 109.75,
    'NPR': 132.80,
    'AED': 3.67,
    'SAR': 3.75,
    'TRY': 32.15,
    'MYR': 4.72,
    'IDR': 15650.00,
    'SGD': 1.34,
    'THB': 35.80,
    'ZAR': 18.65
  };
}

/**
 * Get exchange rate
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number} Exchange rate
 */
export function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;

  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    console.warn(`Exchange rate not found for ${fromCurrency} -> ${toCurrency}`);
    return 1; // Fallback to 1:1 to prevent NaN
  }

  // Convert via USD base
  return toRate / fromRate;
}

/**
 * Get exchange rates status
 * @returns {Object} Status object
 */
export function getExchangeRatesStatus() {
  return {
    source: currencySettings?.exchangeRateProvider || 'fallback',
    lastUpdated: ratesLastUpdated,
    ratesCount: Object.keys(exchangeRates).length,
    baseCurrency: 'USD'
  };
}

// ============================================================
// CURRENCY CONVERSION
// ============================================================

/**
 * Convert price from base currency to display currency
 * @param {number} amount - Amount in base currency
 * @param {string} baseCurrency - Base currency code
 * @param {string} targetCurrency - Target currency code (optional, uses current)
 * @returns {number} Converted amount
 */
export function convertPrice(amount, baseCurrency = 'USD', targetCurrency = null) {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn('Invalid amount for conversion:', amount);
      return 0;
    }

    const target = targetCurrency || currentCurrency;
    
    if (baseCurrency === target) {
      return amount;
    }

    const rate = getExchangeRate(baseCurrency, target);
    const converted = amount * rate;

    return converted;
  } catch (error) {
    console.error('Error converting price:', error);
    return amount; // Return original on error
  }
}

/**
 * Format price with currency
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (optional, uses current)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted price
 */
export function formatPrice(amount, currencyCode = null, options = {}) {
  try {
    const currency = currencyCode || currentCurrency;
    const currencyInfo = getCurrencyInfo(currency);

    if (typeof amount !== 'number' || isNaN(amount)) {
      return `${currencyInfo.symbol}0.00`;
    }

    // Determine decimal places based on currency
    const decimals = shouldShowDecimals(currency) ? 2 : 0;

    // Use Intl.NumberFormat for proper formatting
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...options
    }).format(amount);

    return formatted;
  } catch (error) {
    console.error('Error formatting price:', error);
    const currencyInfo = getCurrencyInfo(currencyCode || currentCurrency);
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Check if currency should show decimals
 * @param {string} currencyCode - Currency code
 * @returns {boolean} True if decimals should be shown
 */
function shouldShowDecimals(currencyCode) {
  // Currencies that typically don't use decimal places
  const noDecimalCurrencies = ['JPY', 'KRW', 'IDR'];
  return !noDecimalCurrencies.includes(currencyCode);
}

// ============================================================
// CURRENCY SELECTION
// ============================================================

/**
 * Set current currency
 * @param {string} currencyCode - Currency code
 */
export function setCurrentCurrency(currencyCode) {
  if (!isCurrencySupported(currencyCode)) {
    console.warn('Currency not supported:', currencyCode);
    return;
  }

  // Check if manual selection is enabled
  if (currencySettings && !currencySettings.manualSelectionEnabled) {
    console.warn('Manual currency selection is disabled');
    return;
  }

  currentCurrency = currencyCode;
  
  // Save to localStorage (explicit user preference)
  localStorage.setItem(STORAGE_KEY_CURRENCY, currencyCode);

  // Notify listeners
  notifyCurrencyChange();

  console.log('Currency changed to:', currencyCode);
}

/**
 * Get current currency
 * @returns {string} Current currency code
 */
export function getCurrentCurrency() {
  return currentCurrency;
}

/**
 * Get currency info
 * @param {string} currencyCode - Currency code
 * @returns {Object} Currency info object
 */
export function getCurrencyInfo(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency || SUPPORTED_CURRENCIES[0]; // Default to USD if not found
}

/**
 * Check if currency is supported
 * @param {string} currencyCode - Currency code
 * @returns {boolean} True if supported
 */
export function isCurrencySupported(currencyCode) {
  return SUPPORTED_CURRENCIES.some(c => c.code === currencyCode);
}

/**
 * Check if currency is enabled
 * @param {string} currencyCode - Currency code
 * @returns {boolean} True if enabled
 */
export function isCurrencyEnabled(currencyCode) {
  const enabledCodes = currencySettings?.supportedCurrencies || SUPPORTED_CURRENCIES.map(c => c.code);
  return enabledCodes.includes(currencyCode);
}

// ============================================================
// CURRENCY CHANGE LISTENERS
// ============================================================

/**
 * Subscribe to currency changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onCurrencyChange(callback) {
  currencyChangeCallbacks.push(callback);

  // Immediately call with current currency
  callback(currentCurrency);

  return () => {
    currencyChangeCallbacks = currencyChangeCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Notify all currency change callbacks
 */
function notifyCurrencyChange() {
  currencyChangeCallbacks.forEach(callback => {
    try {
      callback(currentCurrency);
    } catch (error) {
      console.error('Error in currency change callback:', error);
    }
  });
}

// ============================================================
// UI HELPERS
// ============================================================

/**
 * Update all prices on page
 */
export function updateAllPrices() {
  const priceElements = document.querySelectorAll('[data-price]');
  
  priceElements.forEach(element => {
    const basePrice = parseFloat(element.getAttribute('data-price'));
    const baseCurrency = element.getAttribute('data-currency') || 'USD';
    
    if (isNaN(basePrice)) return;

    const convertedPrice = convertPrice(basePrice, baseCurrency);
    const formattedPrice = formatPrice(convertedPrice);
    
    element.textContent = formattedPrice;
  });
}

/**
 * Setup currency selector
 * @param {HTMLElement} selector - Currency selector element
 */
export function setupCurrencySelector(selector) {
  if (!selector) return;

  const enabledCurrencies = getEnabledCurrencies();

  // Render currency options
  selector.innerHTML = enabledCurrencies.map(currency => `
    <option value="${currency.code}" ${currency.code === currentCurrency ? 'selected' : ''}>
      ${currency.code} - ${currency.name} (${currency.symbol})
    </option>
  `).join('');

  // Handle change
  selector.addEventListener('change', (e) => {
    setCurrentCurrency(e.target.value);
    updateAllPrices();
  });
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize currency on module load
initCurrency().then(() => {
  // Subscribe to currency changes to update UI
  onCurrencyChange(() => {
    updateAllPrices();
  });
});

// ============================================================
// EXPORTS
// ============================================================

export {
  initCurrency,
  getEnabledCurrencies,
  getExchangeRate,
  getExchangeRatesStatus,
  convertPrice,
  formatPrice,
  setCurrentCurrency,
  getCurrentCurrency,
  getCurrencyInfo,
  isCurrencySupported,
  isCurrencyEnabled,
  onCurrencyChange,
  updateAllPrices,
  setupCurrencySelector
};

console.log('✅ Currency module loaded successfully');
