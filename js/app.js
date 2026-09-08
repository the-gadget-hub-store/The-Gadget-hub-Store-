/* ================================
   THE GADGET HUB STORE
   App Module
   ================================ */

/**
 * Global application controller.
 *
 * Responsibilities:
 * - Firebase/auth startup
 * - Global UI features
 * - Currency selection and live exchange rates
 * - Automatic currency detection from browser locale/region
 * - Homepage/page-specific module initialization
 * - Global error handling
 *
 * NOTE:
 * Product/category modules do NOT auto-initialize the homepage.
 * This module is the single page orchestrator.
 */

import {
  isFirebaseInitialized,
  getCurrentUser,
  isAuthenticated,
  subscribeToAuthState,
  db,
  getDoc,
  doc,
  addDoc,
  collection,
  serverTimestamp
} from './firebase.js';

import {
  showToast,
  closeDropdown,
  toggleDropdown,
  escapeHtml
} from './ui.js';

/* ================================
   APPLICATION STATE
   ================================ */

let currentUser = null;
let appSettings = {};
let supportedCurrencies = [];
let selectedCurrency = 'USD';

let exchangeRates = {};
let exchangeRatesDate = null;
let exchangeRatesSource = 'fallback';
let currencyInitializationPromise = null;

const CURRENCY_CACHE_KEY =
  'gadgetHubExchangeRates_v2';

const CURRENCY_CACHE_TTL =
  6 * 60 * 60 * 1000;

const SELECTED_CURRENCY_KEY =
  'selectedCurrency';

/* ================================
   DEFAULT CURRENCIES
   ================================ */

const DEFAULT_CURRENCIES = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    country: 'United States'
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    country: 'United Kingdom'
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    country: 'European Union'
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    country: 'Canada'
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    country: 'Australia'
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    country: 'China'
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    country: 'Japan'
  },
  {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    country: 'South Korea'
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    country: 'India'
  },
  {
    code: 'PKR',
    name: 'Pakistani Rupee',
    symbol: '₨',
    country: 'Pakistan'
  },
  {
    code: 'BDT',
    name: 'Bangladeshi Taka',
    symbol: '৳',
    country: 'Bangladesh'
  },
  {
    code: 'NPR',
    name: 'Nepalese Rupee',
    symbol: 'Rs.',
    country: 'Nepal'
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    country: 'United Arab Emirates'
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: '﷼',
    country: 'Saudi Arabia'
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    country: 'Türkiye'
  },
  {
    code: 'MYR',
    name: 'Malaysian Ringgit',
    symbol: 'RM',
    country: 'Malaysia'
  },
  {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp',
    country: 'Indonesia'
  },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    country: 'Singapore'
  },
  {
    code: 'THB',
    name: 'Thai Baht',
    symbol: '฿',
    country: 'Thailand'
  },
  {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    country: 'South Africa'
  }
];

/*
 * Fallback values are only used when the live API cannot be reached.
 * Product prices remain stored in USD in Firestore.
 */
const FALLBACK_EXCHANGE_RATES = {
  USD: 1.0,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  CNY: 7.24,
  JPY: 149.50,
  KRW: 1320.00,
  INR: 83.12,
  PKR: 278.50,
  BDT: 109.75,
  NPR: 132.95,
  AED: 3.67,
  SAR: 3.75,
  TRY: 32.15,
  MYR: 4.72,
  IDR: 15625.00,
  SGD: 1.34,
  THB: 35.80,
  ZAR: 18.65
};

const REGION_TO_CURRENCY = {
  US: 'USD',
  GB: 'GBP',
  UK: 'GBP',
  IE: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'AUD',
  CN: 'CNY',
  HK: 'CNY',
  MO: 'CNY',
  JP: 'JPY',
  KR: 'KRW',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  NP: 'NPR',
  AE: 'AED',
  SA: 'SAR',
  TR: 'TRY',
  MY: 'MYR',
  ID: 'IDR',
  SG: 'SGD',
  TH: 'THB',
  ZA: 'ZAR'
};

/* ================================
   APPLICATION STARTUP
   ================================ */

async function initializeApp() {
  try {
    console.log('🚀 Initializing The Gadget Hub Store...');

    if (!isFirebaseInitialized()) {
      console.warn(
        '⚠️ Firebase is not initialized. Firebase-dependent features may be unavailable.'
      );
    }

    subscribeToAuthState((user) => {
      currentUser = user || null;

      updateAuthUI();
      updateFavoritesBadgeSafe();
    });

    await initializeCurrencySelector();
    initializeGlobalFeatures();
    await initializePageFeatures();

    console.log('✅ Application initialized');
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    showToast(
      'Some website features could not be initialized.',
      'warning'
    );
  }
}

/* ================================
   AUTH UI
   ================================ */

function updateAuthUI() {
  const authLinks =
    document.querySelectorAll('[data-auth-required]');

  authLinks.forEach((element) => {
    element.hidden = !currentUser;
  });

  const guestLinks =
    document.querySelectorAll('[data-guest-only]');

  guestLinks.forEach((element) => {
    element.hidden = Boolean(currentUser);
  });

  const userNameElements =
    document.querySelectorAll('[data-user-name]');

  userNameElements.forEach((element) => {
    element.textContent =
      currentUser?.displayName ||
      currentUser?.email ||
      'Account';
  });
}

async function updateFavoritesBadgeSafe() {
  const badge =
    document.getElementById('favoritesBadge');

  if (!badge) {
    return;
  }

  if (!isAuthenticated()) {
    badge.textContent = '0';
    return;
  }

  try {
    const { loadUserFavorites } =
      await import('./products.js');

    const favorites =
      await loadUserFavorites();

    badge.textContent =
      String(favorites.length);
  } catch (error) {
    console.warn(
      'Unable to update favorites badge:',
      error
    );

    badge.textContent = '0';
  }
}

/* ================================
   GLOBAL FEATURES
   ================================ */

function initializeGlobalFeatures() {
  initializeCurrencySelector();
  initializeSocialLinks();
  initializeNewsletterForm();
  initializeDropdowns();
}

/* ================================
   CURRENCY SYSTEM
   ================================ */

async function initializeCurrencySelector() {
  if (currencyInitializationPromise) {
    return currencyInitializationPromise;
  }

  currencyInitializationPromise =
    (async () => {
      try {
        await loadSupportedCurrencies();

        const savedCurrency =
          loadCurrencyPreference();

        selectedCurrency =
          isSupportedCurrency(savedCurrency)
            ? savedCurrency
            : 'USD';

        await loadExchangeRates();

        populateCurrencySelector();
        setupCurrencySelector();
        updateCurrencyUI();

        console.log(
          `💱 Currency initialized: ${selectedCurrency} (${exchangeRatesSource})`
        );
      } catch (error) {
        console.error(
          'Currency initialization failed:',
          error
        );

        exchangeRates = {
          ...FALLBACK_EXCHANGE_RATES
        };

        exchangeRatesSource = 'fallback';

        populateCurrencySelector();
        setupCurrencySelector();
        updateCurrencyUI();
      }
    })();

  return currencyInitializationPromise;
}

async function loadSupportedCurrencies() {
  if (
    !isFirebaseInitialized()
  ) {
    supportedCurrencies =
      [...DEFAULT_CURRENCIES];

    return;
  }

  try {
    const settingsRef =
      doc(db, 'settings', 'global');

    const snapshot =
      await getDoc(settingsRef);

    if (snapshot.exists()) {
      const data =
        snapshot.data() || {};

      appSettings = data;

      const firebaseCurrencies =
        Array.isArray(
          data.supportedCurrencies
        )
          ? data.supportedCurrencies
          : [];

      if (firebaseCurrencies.length > 0) {
        supportedCurrencies =
          normalizeSupportedCurrencies(
            firebaseCurrencies
          );
      }
    }

    if (
      supportedCurrencies.length === 0
    ) {
      supportedCurrencies =
        [...DEFAULT_CURRENCIES];
    }
  } catch (error) {
    console.warn(
      'Unable to load currency settings from Firebase. Using defaults.',
      error
    );

    supportedCurrencies =
      [...DEFAULT_CURRENCIES];
  }
}

function normalizeSupportedCurrencies(
  currencies
) {
  const defaultsByCode =
    new Map(
      DEFAULT_CURRENCIES.map(
        (currency) => [
          currency.code,
          currency
        ]
      )
    );

  return currencies
    .map((item) => {
      if (typeof item === 'string') {
        return (
          defaultsByCode.get(item) || {
            code: item,
            name: item,
            symbol: item,
            country: ''
          }
        );
      }

      if (!item || !item.code) {
        return null;
      }

      const code =
        String(item.code).toUpperCase();

      const fallback =
        defaultsByCode.get(code);

      return {
        code,
        name:
          item.name ||
          fallback?.name ||
          code,
        symbol:
          item.symbol ||
          fallback?.symbol ||
          code,
        country:
          item.country ||
          fallback?.country ||
          ''
      };
    })
    .filter(Boolean);
}

function isSupportedCurrency(currency) {
  return supportedCurrencies.some(
    (item) =>
      item.code === currency
  );
}

function loadCurrencyPreference() {
  try {
    const saved =
      localStorage.getItem(
        SELECTED_CURRENCY_KEY
      );

    if (
      saved &&
      isSupportedCurrency(
        saved.toUpperCase()
      )
    ) {
      return saved.toUpperCase();
    }
  } catch (error) {
    console.warn(
      'Unable to read saved currency preference:',
      error
    );
  }

  const detected =
    detectCurrencyFromBrowser();

  if (
    detected &&
    isSupportedCurrency(detected)
  ) {
    return detected;
  }

  const defaultCurrency =
    appSettings?.defaultCurrency;

  if (
    defaultCurrency &&
    isSupportedCurrency(
      String(defaultCurrency).toUpperCase()
    )
  ) {
    return String(
      defaultCurrency
    ).toUpperCase();
  }

  return 'USD';
}

function detectCurrencyFromBrowser() {
  const languages = [];

  try {
    if (
      Array.isArray(
        navigator.languages
      )
    ) {
      languages.push(
        ...navigator.languages
      );
    }

    if (navigator.language) {
      languages.push(
        navigator.language
      );
    }
  } catch (error) {
    return null;
  }

  for (const language of languages) {
    try {
      const locale =
        new Intl.Locale(language);

      const region =
        locale.region?.toUpperCase();

      if (
        region &&
        REGION_TO_CURRENCY[region]
      ) {
        return REGION_TO_CURRENCY[
          region
        ];
      }
    } catch (error) {
      /*
       * Ignore malformed locale strings and
       * continue with the next available locale.
       */
    }
  }

  return null;
}

async function loadExchangeRates() {
  const cached =
    readCachedExchangeRates();

  if (cached) {
    exchangeRates =
      normalizeExchangeRates(
        cached.rates
      );

    exchangeRatesDate =
      cached.date || null;

    exchangeRatesSource =
      'cache';

    return;
  }

  try {
    const liveRates =
      await fetchLiveExchangeRates();

    exchangeRates =
      {
        ...FALLBACK_EXCHANGE_RATES,
        ...(liveRates?.rates || {})
      };

    exchangeRatesDate =
      liveRates?.date ||
      new Date().toISOString();

    exchangeRatesSource =
      'live';

    saveCachedExchangeRates(
      exchangeRates,
      exchangeRatesDate
    );
  } catch (error) {
    console.warn(
      'Live exchange-rate request failed. Using fallback rates.',
      error
    );

    exchangeRates =
      {
        ...FALLBACK_EXCHANGE_RATES
      };

    exchangeRatesDate = null;
    exchangeRatesSource =
      'fallback';
  }
}

async function fetchLiveExchangeRates() {
  const supportedCodes =
    supportedCurrencies
      .map((currency) => currency.code)
      .filter(
        (code) => code !== 'USD'
      );

  const quotes =
    supportedCodes.join(',');

  const endpoint =
    `https://api.frankfurter.dev/v2/rates?base=USD&quotes=${encodeURIComponent(quotes)}`;

  const response =
    await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

  if (!response.ok) {
    throw new Error(
      `Exchange-rate API returned HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      'Unexpected exchange-rate API response'
    );
  }

  const rates = {
    USD: 1
  };

  for (const row of data) {
    const quote =
      String(row?.quote || '')
        .toUpperCase();

    const rate =
      Number(row?.rate);

    if (
      quote &&
      Number.isFinite(rate) &&
      rate > 0
    ) {
      rates[quote] = rate;
    }
  }

  if (
    Object.keys(rates).length <= 1
  ) {
    throw new Error(
      'No usable exchange rates were returned'
    );
  }

  /*
   * If a supported currency was not returned by the
   * provider, keep its known fallback instead of
   * breaking price rendering.
   */
  for (const currency of supportedCurrencies) {
    const code = currency.code;

    if (
      !Number.isFinite(rates[code]) ||
      rates[code] <= 0
    ) {
      rates[code] =
        FALLBACK_EXCHANGE_RATES[code] ||
        1;
    }
  }

  const rateDate =
    data.find((row) => row?.date)?.date || null;

  return {
    rates,
    date: rateDate
  };
}

function normalizeExchangeRates(rates) {
  const normalized = {
    ...FALLBACK_EXCHANGE_RATES
  };

  if (
    rates &&
    typeof rates === 'object'
  ) {
    Object.entries(rates)
      .forEach(
        ([currency, value]) => {
          const code =
            String(currency)
              .toUpperCase();

          const numeric =
            Number(value);

          if (
            Number.isFinite(numeric) &&
            numeric > 0
          ) {
            normalized[code] =
              numeric;
          }
        }
      );
  }

  normalized.USD = 1;

  return normalized;
}

function readCachedExchangeRates() {
  try {
    const raw =
      localStorage.getItem(
        CURRENCY_CACHE_KEY
      );

    if (!raw) {
      return null;
    }

    const cached =
      JSON.parse(raw);

    if (
      !cached ||
      typeof cached !== 'object'
    ) {
      return null;
    }

    const timestamp =
      Number(cached.timestamp);

    if (
      !Number.isFinite(timestamp)
    ) {
      return null;
    }

    if (
      Date.now() - timestamp >
      CURRENCY_CACHE_TTL
    ) {
      return null;
    }

    const rates =
      normalizeExchangeRates(
        cached.rates
      );

    return {
      rates,
      date: cached.date || null
    };
  } catch (error) {
    console.warn(
      'Unable to read exchange-rate cache:',
      error
    );

    return null;
  }
}

function saveCachedExchangeRates(
  rates,
  date
) {
  try {
    localStorage.setItem(
      CURRENCY_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        date,
        rates
      })
    );
  } catch (error) {
    console.warn(
      'Unable to cache exchange rates:',
      error
    );
  }
}

function populateCurrencySelector() {
  const selectors =
    document.querySelectorAll(
      '[data-currency-selector]'
    );

  selectors.forEach((selector) => {
    selector.innerHTML =
      supportedCurrencies
        .map((currency) => {
          const code =
            escapeHtml(currency.code);

          const name =
            escapeHtml(currency.name);

          const symbol =
            escapeHtml(currency.symbol);

          const selected =
            currency.code ===
            selectedCurrency
              ? ' aria-current="true"'
              : '';

          return `
            <button
              type="button"
              class="currency-option"
              data-currency="${code}"
              ${selected}
            >
              <span class="currency-symbol">${symbol}</span>
              <span class="currency-code">${code}</span>
              <span class="currency-name">${name}</span>
            </button>
          `;
        })
        .join('');
  });
}

function setupCurrencySelector() {
  const selectors =
    document.querySelectorAll(
      '[data-currency-selector]'
    );

  selectors.forEach((selector) => {
    if (
      selector.dataset.currencyInitialized ===
      'true'
    ) {
      return;
    }

    selector.dataset.currencyInitialized =
      'true';

    selector.addEventListener(
      'click',
      (event) => {
        const button =
          event.target.closest(
            '[data-currency]'
          );

        if (!button) {
          return;
        }

        const currency =
          String(
            button.dataset.currency || ''
          ).toUpperCase();

        if (
          !isSupportedCurrency(currency)
        ) {
          return;
        }

        setCurrency(currency);
      }
    );
  });

  const selectorButtons =
    document.querySelectorAll(
      '[data-currency-toggle]'
    );

  selectorButtons.forEach((button) => {
    if (
      button.dataset.currencyInitialized ===
      'true'
    ) {
      return;
    }

    button.dataset.currencyInitialized =
      'true';

    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();

        const targetId =
          button.dataset.currencyToggle;

        if (targetId) {
          toggleDropdown(targetId);
        }
      }
    );
  });
}

function setCurrency(currency) {
  const normalized =
    String(currency || '')
      .toUpperCase();

  if (
    !isSupportedCurrency(normalized)
  ) {
    console.warn(
      `Unsupported currency: ${normalized}`
    );

    return;
  }

  if (
    selectedCurrency === normalized
  ) {
    updateCurrencyUI();
    return;
  }

  selectedCurrency =
    normalized;

  try {
    localStorage.setItem(
      SELECTED_CURRENCY_KEY,
      selectedCurrency
    );
  } catch (error) {
    console.warn(
      'Unable to save currency preference:',
      error
    );
  }

  updateCurrencyUI();

  document.dispatchEvent(
    new CustomEvent(
      'currencyChanged',
      {
        detail: {
          currency:
            selectedCurrency,
          rates:
            { ...exchangeRates },
          source:
            exchangeRatesSource,
          date:
            exchangeRatesDate
        }
      }
    )
  );

  closeAllCurrencyDropdowns();
}

function updateCurrencyUI() {
  document
    .querySelectorAll(
      '[data-current-currency]'
    )
    .forEach((element) => {
      element.textContent =
        selectedCurrency;
    });

  document
    .querySelectorAll(
      '[data-currency-symbol]'
    )
    .forEach((element) => {
      const currency =
        supportedCurrencies.find(
          (item) =>
            item.code ===
            selectedCurrency
        );

      element.textContent =
        currency?.symbol ||
        selectedCurrency;
    });

  document
    .querySelectorAll(
      '[data-currency-option]'
    )
    .forEach((element) => {
      const isSelected =
        element.dataset.currencyOption ===
        selectedCurrency;

      element.setAttribute(
        'aria-selected',
        String(isSelected)
      );
    });
}

function closeAllCurrencyDropdowns() {
  document
    .querySelectorAll(
      '[data-currency-selector]'
    )
    .forEach((selector) => {
      const dropdown =
        selector.closest(
          '[data-dropdown]'
        );

      if (
        dropdown?.id
      ) {
        closeDropdown(dropdown.id);
      }
    });
}

export function getCurrentCurrency() {
  return selectedCurrency;
}

export function getExchangeRate(
  currency = null
) {
  const code =
    String(
      currency || selectedCurrency
    ).toUpperCase();

  if (code === 'USD') {
    return 1;
  }

  const rate =
    Number(exchangeRates[code]);

  if (
    Number.isFinite(rate) &&
    rate > 0
  ) {
    return rate;
  }

  return (
    Number(
      FALLBACK_EXCHANGE_RATES[code]
    ) || 1
  );
}

export function getExchangeRates() {
  return {
    ...exchangeRates
  };
}

export function getExchangeRateInfo() {
  return {
    source: exchangeRatesSource,
    date: exchangeRatesDate,
    currency: selectedCurrency
  };
}

/* ================================
   SOCIAL LINKS
   ================================ */

function initializeSocialLinks() {
  const links =
    appSettings?.socialLinks;

  if (
    !links ||
    typeof links !== 'object'
  ) {
    return;
  }

  document
    .querySelectorAll(
      '[data-social-platform]'
    )
    .forEach((element) => {
      const platform =
        element.dataset.socialPlatform;

      const url =
        links[platform];

      if (
        typeof url !== 'string' ||
        !url.trim()
      ) {
        return;
      }

      element.href = url;
      element.target = '_blank';
      element.rel =
        'noopener noreferrer';
    });
}

/* ================================
   NEWSLETTER
   ================================ */

function initializeNewsletterForm() {
  const forms =
    document.querySelectorAll(
      '[data-newsletter-form]'
    );

  forms.forEach((form) => {
    if (
      form.dataset.newsletterInitialized ===
      'true'
    ) {
      return;
    }

    form.dataset.newsletterInitialized =
      'true';

    form.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const input =
          form.querySelector(
            'input[type="email"]'
          );

        if (!input) {
          return;
        }

        const email =
          input.value.trim();

        if (!email) {
          showToast(
            'Please enter your email address.',
            'warning'
          );
          return;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
          )
        ) {
          showToast(
            'Please enter a valid email address.',
            'warning'
          );
          return;
        }

        if (
          !isFirebaseInitialized()
        ) {
          showToast(
            'Newsletter service is temporarily unavailable.',
            'error'
          );
          return;
        }

        const submitButton =
          form.querySelector(
            'button[type="submit"]'
          );

        if (submitButton) {
          submitButton.disabled = true;
        }

        try {
          await addDoc(
            collection(
              db,
              'newsletterSubscribers'
            ),
            {
              email,
              subscribedAt:
                serverTimestamp(),
              source:
                'homepage',
              active: true
            }
          );

          input.value = '';

          showToast(
            'Thanks for subscribing!',
            'success'
          );
        } catch (error) {
          console.error(
            'Newsletter subscription failed:',
            error
          );

          showToast(
            'Unable to subscribe right now.',
            'error'
          );
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      }
    );
  });
}

/* ================================
   DROPDOWNS
   ================================ */

function initializeDropdowns() {
  document
    .querySelectorAll(
      '[data-dropdown-toggle]'
    )
    .forEach((button) => {
      if (
        button.dataset.dropdownInitialized ===
        'true'
      ) {
        return;
      }

      button.dataset.dropdownInitialized =
        'true';

      button.addEventListener(
        'click',
        (event) => {
          event.preventDefault();

          const dropdownId =
            button.dataset.dropdownToggle;

          if (dropdownId) {
            toggleDropdown(
              dropdownId
            );
          }
        }
      );
    });
}

/* ================================
   PAGE INITIALIZATION
   ================================ */

async function initializePageFeatures() {
  const page =
    getCurrentPageName();

  console.log(
    `📄 Initializing page: ${page}`
  );

  switch (page) {
    case 'index.html':
    case '':
      await initializeHomePage();
      break;

    case 'categories.html':
      await initializeCategoriesPage();
      break;

    case 'shop.html':
      await initializeShopPage();
      break;

    case 'product.html':
    case 'product-details.html':
      await initializeProductPage();
      break;

    case 'favorites.html':
      await initializeFavoritesPage();
      break;

    case 'account.html':
      await initializeAccountPage();
      break;

    case 'trending.html':
      await initializeTrendingPage();
      break;

    case 'deals.html':
      await initializeDealsPage();
      break;

    default:
      break;
  }

  updateActiveNavigation(page);
}

async function initializeHomePage() {
  try {
    const {
      initializeHomepageCategories
    } = await import(
      './categories.js'
    );

    await initializeHomepageCategories();
  } catch (error) {
    console.error(
      'Homepage categories initialization failed:',
      error
    );
  }

  try {
    const {
      initializeHomepageProducts
    } = await import(
      './products.js'
    );

    await initializeHomepageProducts();
  } catch (error) {
    console.error(
      'Homepage products initialization failed:',
      error
    );
  }
}

async function initializeCategoriesPage() {
  try {
    const {
      initializeCategoryPage
    } = await import(
      './categories.js'
    );

    await initializeCategoryPage();
  } catch (error) {
    console.error(
      'Categories page initialization failed:',
      error
    );

    const container =
      document.getElementById(
        'allCategoriesGrid'
      ) ||
      document.getElementById(
        'categoryProductsGrid'
      );

    if (container) {
      container.innerHTML =
        '<div class="error-state">Unable to load categories. Please refresh the page.</div>';
    }
  }
}

async function initializeShopPage() {
  try {
    const {
      initializeShopPage:
        initializeShop
    } = await import(
      './shop.js'
    );

    if (
      typeof initializeShop ===
      'function'
    ) {
      await initializeShop();
    }
  } catch (error) {
    /*
     * shop.js may not exist yet. Do not break
     * the rest of the application when another
     * public module is still being built.
     */
    console.info(
      'Shop module initialization skipped:',
      error
    );
  }
}

async function initializeProductPage() {
  try {
    const {
      initializeProductPage:
        initializeProduct
    } = await import(
      './product.js'
    );

    if (
      typeof initializeProduct ===
      'function'
    ) {
      await initializeProduct();
    }
  } catch (error) {
    console.info(
      'Product details module initialization skipped:',
      error
    );
  }
}

async function initializeFavoritesPage() {
  try {
    const {
      initializeFavoritesPage:
        initializeFavorites
    } = await import(
      './favorites.js'
    );

    if (
      typeof initializeFavorites ===
      'function'
    ) {
      await initializeFavorites();
    }
  } catch (error) {
    console.info(
      'Favorites module initialization skipped:',
      error
    );
  }
}

async function initializeAccountPage() {
  try {
    const {
      initializeAccountPage:
        initializeAccount
    } = await import(
      './account.js'
    );

    if (
      typeof initializeAccount ===
      'function'
    ) {
      await initializeAccount();
    }
  } catch (error) {
    console.info(
      'Account module initialization skipped:',
      error
    );
  }
}

async function initializeTrendingPage() {
  try {
    const {
      initializeTrendingPage:
        initializeTrending
    } = await import(
      './trending.js'
    );

    if (
      typeof initializeTrending ===
      'function'
    ) {
      await initializeTrending();
    }
  } catch (error) {
    console.info(
      'Trending module initialization skipped:',
      error
    );
  }
}

async function initializeDealsPage() {
  try {
    const {
      initializeDealsPage:
        initializeDeals
    } = await import(
      './deals.js'
    );

    if (
      typeof initializeDeals ===
      'function'
    ) {
      await initializeDeals();
    }
  } catch (error) {
    console.info(
      'Deals module initialization skipped:',
      error
    );
  }
}

/* ================================
   NAVIGATION
   ================================ */

function getCurrentPageName() {
  const pathname =
    window.location.pathname || '';

  const lastSegment =
    pathname
      .split('/')
      .filter(Boolean)
      .pop();

  if (
    !lastSegment ||
    !lastSegment.includes('.')
  ) {
    return 'index.html';
  }

  return lastSegment.toLowerCase();
}

function updateActiveNavigation(
  currentPage
) {
  const normalizedPage =
    currentPage === 'index.html'
      ? 'index.html'
      : currentPage;

  document
    .querySelectorAll(
      '[data-nav-page]'
    )
    .forEach((link) => {
      const target =
        String(
          link.dataset.navPage || ''
        ).toLowerCase();

      const active =
        target === normalizedPage;

      link.classList.toggle(
        'active',
        active
      );

      if (active) {
        link.setAttribute(
          'aria-current',
          'page'
        );
      } else {
        link.removeAttribute(
          'aria-current'
        );
      }
    });
}

/* ================================
   GLOBAL ERROR HANDLING
   ================================ */

function initializeGlobalErrorHandlers() {
  window.addEventListener(
    'error',
    (event) => {
      console.error(
        'Global JavaScript error:',
        event.error || event.message
      );
    }
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      console.error(
        'Unhandled promise rejection:',
        event.reason
      );
    }
  );
}

/* ================================
   DOM STARTUP
   ================================ */

function startApplication() {
  initializeGlobalErrorHandlers();

  initializeApp().catch((error) => {
    console.error(
      'Fatal application startup error:',
      error
    );
  });
}

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    startApplication,
    { once: true }
  );
} else {
  startApplication();
}

/* ================================
   PUBLIC API
   ================================ */

export {
  selectedCurrency,
  appSettings,
  supportedCurrencies
};
