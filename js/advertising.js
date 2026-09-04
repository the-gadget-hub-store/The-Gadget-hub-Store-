/* ============================================================
   THE GADGET HUB STORE - ADVERTISING MODULE
   Centralized advertisement management system
   ============================================================ */

import {
  getGlobalSettings,
  updateGlobalSettings
} from './firebase.js';

// ============================================================
// ADVERTISEMENT SLOT DEFINITIONS
// ============================================================

export const AD_SLOTS = {
  PRODUCTS: {
    id: 'ad-products',
    name: 'Products Advertisement',
    description: 'Advertisement slot below products section',
    position: 'products-section',
    defaultEnabled: false
  },
  PRE_FOOTER: {
    id: 'ad-pre-footer',
    name: 'Pre-Footer Advertisement',
    description: 'Advertisement slot above footer',
    position: 'pre-footer',
    defaultEnabled: false
  }
};

// ============================================================
// ADVERTISING STATE
// ============================================================

let advertisingSettings = null;
let adSlotsRendered = new Set();
let adsenseScriptLoaded = false;

// ============================================================
// INITIALIZE ADVERTISING
// ============================================================

/**
 * Initialize advertising system
 */
export async function initAdvertising() {
  try {
    // Load advertising settings from Firebase
    await loadAdvertisingSettings();

    console.log('✅ Advertising module initialized');
  } catch (error) {
    console.error('Error initializing advertising:', error);
  }
}

/**
 * Load advertising settings from Firebase
 */
async function loadAdvertisingSettings() {
  try {
    const settings = await getGlobalSettings();
    
    if (settings?.advertising) {
      advertisingSettings = {
        enabled: settings.advertising.enabled || false,
        adsenseEnabled: settings.advertising.adsenseEnabled || false,
        publisherId: settings.advertising.publisherId || '',
        slots: {
          products: {
            enabled: settings.advertising.slots?.products?.enabled || false,
            adUnitId: settings.advertising.slots?.products?.adUnitId || '',
            format: settings.advertising.slots?.products?.format || 'auto',
            responsive: settings.advertising.slots?.products?.responsive !== false
          },
          preFooter: {
            enabled: settings.advertising.slots?.preFooter?.enabled || false,
            adUnitId: settings.advertising.slots?.preFooter?.adUnitId || '',
            format: settings.advertising.slots?.preFooter?.format || 'auto',
            responsive: settings.advertising.slots?.preFooter?.responsive !== false
          }
        }
      };
    } else {
      // Default settings (all disabled)
      advertisingSettings = {
        enabled: false,
        adsenseEnabled: false,
        publisherId: '',
        slots: {
          products: {
            enabled: false,
            adUnitId: '',
            format: 'auto',
            responsive: true
          },
          preFooter: {
            enabled: false,
            adUnitId: '',
            format: 'auto',
            responsive: true
          }
        }
      };
    }
  } catch (error) {
    console.error('Error loading advertising settings:', error);
    // Use default settings on error
    advertisingSettings = {
      enabled: false,
      adsenseEnabled: false,
      publisherId: '',
      slots: {
        products: { enabled: false, adUnitId: '', format: 'auto', responsive: true },
        preFooter: { enabled: false, adUnitId: '', format: 'auto', responsive: true }
      }
    };
  }
}

// ============================================================
// ADVERTISEMENT RENDERING
// ============================================================

/**
 * Render advertisement slot
 * @param {string} slotName - Slot name ('products' or 'preFooter')
 * @param {HTMLElement} container - Container element
 */
export function renderAdSlot(slotName, container) {
  if (!container) {
    console.warn(`Container not found for ad slot: ${slotName}`);
    return;
  }

  // Check if advertising is enabled
  if (!advertisingSettings || !advertisingSettings.enabled) {
    // Keep container but don't render ad
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  // Get slot configuration
  const slotConfig = advertisingSettings.slots[slotName];

  if (!slotConfig || !slotConfig.enabled) {
    // Slot disabled
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  // Check if AdSense is enabled and configured
  if (!advertisingSettings.adsenseEnabled) {
    // AdSense not enabled
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  // Check for publisher ID and ad unit ID
  if (!advertisingSettings.publisherId || !slotConfig.adUnitId) {
    // Missing required configuration
    console.warn(`Missing AdSense configuration for slot: ${slotName}`);
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  // Render AdSense ad
  renderAdSenseAd(container, slotConfig, slotName);
}

/**
 * Render Google AdSense advertisement
 * @param {HTMLElement} container - Container element
 * @param {Object} slotConfig - Slot configuration
 * @param {string} slotName - Slot name
 */
function renderAdSenseAd(container, slotConfig, slotName) {
  try {
    // Check if already rendered
    if (adSlotsRendered.has(slotName)) {
      console.warn(`Ad slot already rendered: ${slotName}`);
      return;
    }

    // Create AdSense ad element
    const adElement = document.createElement('ins');
    adElement.className = 'adsbygoogle';
    adElement.style.display = 'block';
    adElement.setAttribute('data-ad-client', advertisingSettings.publisherId);
    adElement.setAttribute('data-ad-slot', slotConfig.adUnitId);
    adElement.setAttribute('data-ad-format', slotConfig.format || 'auto');
    
    if (slotConfig.responsive !== false) {
      adElement.setAttribute('data-full-width-responsive', 'true');
    }

    // Clear container and append ad
    container.innerHTML = '';
    container.appendChild(adElement);
    container.style.display = 'block';

    // Load AdSense script if not already loaded
    if (!adsenseScriptLoaded) {
      loadAdSenseScript();
    } else {
      // Push ad if script already loaded
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('Error pushing AdSense ad:', error);
      }
    }

    // Mark as rendered
    adSlotsRendered.add(slotName);

  } catch (error) {
    console.error('Error rendering AdSense ad:', error);
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

/**
 * Load Google AdSense script
 */
function loadAdSenseScript() {
  if (adsenseScriptLoaded) return;

  // Check if script already exists
  const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
  if (existingScript) {
    adsenseScriptLoaded = true;
    return;
  }

  try {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${advertisingSettings.publisherId}`;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      adsenseScriptLoaded = true;
      console.log('✅ AdSense script loaded');
      
      // Push all ads
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('Error pushing AdSense ads:', error);
      }
    };

    script.onerror = () => {
      console.error('Failed to load AdSense script');
      adsenseScriptLoaded = false;
    };

    document.head.appendChild(script);
  } catch (error) {
    console.error('Error loading AdSense script:', error);
    adsenseScriptLoaded = false;
  }
}

// ============================================================
// ADVERTISEMENT SLOT MANAGEMENT
// ============================================================

/**
 * Render all advertisement slots on page
 */
export function renderAllAdSlots() {
  // Render Products Ad Slot
  const productsAdContainer = document.getElementById('ad-products');
  if (productsAdContainer) {
    renderAdSlot('products', productsAdContainer);
  }

  // Render Pre-Footer Ad Slot
  const preFooterAdContainer = document.getElementById('ad-pre-footer');
  if (preFooterAdContainer) {
    renderAdSlot('preFooter', preFooterAdContainer);
  }
}

/**
 * Check if advertising is enabled
 * @returns {boolean} True if enabled
 */
export function isAdvertisingEnabled() {
  return advertisingSettings?.enabled === true;
}

/**
 * Check if AdSense is enabled
 * @returns {boolean} True if enabled
 */
export function isAdSenseEnabled() {
  return advertisingSettings?.adsenseEnabled === true && 
         !!advertisingSettings?.publisherId;
}

/**
 * Check if ad slot is enabled
 * @param {string} slotName - Slot name
 * @returns {boolean} True if enabled
 */
export function isAdSlotEnabled(slotName) {
  if (!isAdvertisingEnabled()) return false;
  return advertisingSettings?.slots?.[slotName]?.enabled === true;
}

/**
 * Get advertising settings
 * @returns {Object|null} Advertising settings
 */
export function getAdvertisingSettings() {
  return advertisingSettings ? { ...advertisingSettings } : null;
}

/**
 * Get ad slot configuration
 * @param {string} slotName - Slot name
 * @returns {Object|null} Slot configuration
 */
export function getAdSlotConfig(slotName) {
  return advertisingSettings?.slots?.[slotName] || null;
}

// ============================================================
// ADMIN HELPERS
// ============================================================

/**
 * Update advertising settings (Admin only)
 * @param {Object} settings - New settings
 * @returns {Promise<Object>} Result
 */
export async function updateAdvertisingSettings(settings) {
  try {
    // Validate settings
    const validationResult = validateAdvertisingSettings(settings);
    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors
      };
    }

    // Get current global settings
    const globalSettings = await getGlobalSettings() || {};

    // Update advertising section
    globalSettings.advertising = {
      enabled: settings.enabled || false,
      adsenseEnabled: settings.adsenseEnabled || false,
      publisherId: settings.publisherId || '',
      slots: {
        products: {
          enabled: settings.slots?.products?.enabled || false,
          adUnitId: settings.slots?.products?.adUnitId || '',
          format: settings.slots?.products?.format || 'auto',
          responsive: settings.slots?.products?.responsive !== false
        },
        preFooter: {
          enabled: settings.slots?.preFooter?.enabled || false,
          adUnitId: settings.slots?.preFooter?.adUnitId || '',
          format: settings.slots?.preFooter?.format || 'auto',
          responsive: settings.slots?.preFooter?.responsive !== false
        }
      }
    };

    // Save to Firebase
    await updateGlobalSettings(globalSettings);

    // Reload settings
    await loadAdvertisingSettings();

    // Clear rendered slots to force re-render
    adSlotsRendered.clear();

    return {
      success: true,
      message: 'Advertising settings updated successfully'
    };
  } catch (error) {
    console.error('Error updating advertising settings:', error);
    return {
      success: false,
      error: 'Failed to update advertising settings'
    };
  }
}

/**
 * Validate advertising settings
 * @param {Object} settings - Settings to validate
 * @returns {Object} Validation result
 */
export function validateAdvertisingSettings(settings) {
  const result = {
    valid: true,
    errors: []
  };

  // If AdSense is enabled, publisher ID is required
  if (settings.adsenseEnabled && !settings.publisherId) {
    result.valid = false;
    result.errors.push('Publisher ID is required when AdSense is enabled');
  }

  // Validate publisher ID format if provided
  if (settings.publisherId) {
    const publisherIdRegex = /^ca-pub-\d{16}$/;
    if (!publisherIdRegex.test(settings.publisherId)) {
      result.valid = false;
      result.errors.push('Invalid Publisher ID format (should be ca-pub-XXXXXXXXXXXXXXXX)');
    }
  }

  // If individual slots are enabled, ad unit IDs are required
  if (settings.slots?.products?.enabled && !settings.slots.products.adUnitId) {
    result.valid = false;
    result.errors.push('Products ad slot requires an Ad Unit ID');
  }

  if (settings.slots?.preFooter?.enabled && !settings.slots.preFooter.adUnitId) {
    result.valid = false;
    result.errors.push('Pre-Footer ad slot requires an Ad Unit ID');
  }

  // Validate ad unit ID format if provided
  const validateAdUnitId = (id, slotName) => {
    if (id) {
      const adUnitIdRegex = /^\d{10}$/;
      if (!adUnitIdRegex.test(id)) {
        result.valid = false;
        result.errors.push(`Invalid Ad Unit ID format for ${slotName} (should be 10 digits)`);
      }
    }
  };

  if (settings.slots?.products?.adUnitId) {
    validateAdUnitId(settings.slots.products.adUnitId, 'Products slot');
  }

  if (settings.slots?.preFooter?.adUnitId) {
    validateAdUnitId(settings.slots.preFooter.adUnitId, 'Pre-Footer slot');
  }

  return result;
}

/**
 * Test AdSense configuration
 * @returns {Object} Test result
 */
export function testAdSenseConfiguration() {
  const result = {
    valid: true,
    warnings: [],
    errors: []
  };

  // Check if advertising is enabled
  if (!isAdvertisingEnabled()) {
    result.warnings.push('Advertising is disabled in settings');
  }

  // Check if AdSense is enabled
  if (!isAdSenseEnabled()) {
    result.warnings.push('AdSense is disabled or Publisher ID is missing');
  }

  // Check publisher ID
  if (!advertisingSettings?.publisherId) {
    result.valid = false;
    result.errors.push('Publisher ID is not configured');
  }

  // Check individual slots
  Object.entries(AD_SLOTS).forEach(([key, slot]) => {
    const slotName = key.toLowerCase().replace('_', '');
    const slotConfig = advertisingSettings?.slots?.[slotName];

    if (slotConfig?.enabled) {
      if (!slotConfig.adUnitId) {
        result.valid = false;
        result.errors.push(`${slot.name}: Missing Ad Unit ID`);
      }
    } else {
      result.warnings.push(`${slot.name}: Slot is disabled`);
    }
  });

  // Check if script can be loaded
  if (adsenseScriptLoaded) {
    result.warnings.push('AdSense script is already loaded');
  }

  return result;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Clear rendered ad slots (for re-rendering)
 */
export function clearRenderedSlots() {
  adSlotsRendered.clear();
}

/**
 * Get rendered slots count
 * @returns {number} Number of rendered slots
 */
export function getRenderedSlotsCount() {
  return adSlotsRendered.size;
}

/**
 * Check if AdSense script is loaded
 * @returns {boolean} True if loaded
 */
export function isAdSenseScriptLoaded() {
  return adsenseScriptLoaded;
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize advertising on module load
initAdvertising();

// ============================================================
// EXPORTS
// ============================================================

export {
  initAdvertising,
  renderAdSlot,
  renderAllAdSlots,
  isAdvertisingEnabled,
  isAdSenseEnabled,
  isAdSlotEnabled,
  getAdvertisingSettings,
  getAdSlotConfig,
  updateAdvertisingSettings,
  validateAdvertisingSettings,
  testAdSenseConfiguration,
  clearRenderedSlots,
  getRenderedSlotsCount,
  isAdSenseScriptLoaded
};

console.log('✅ Advertising module loaded successfully');
