/**
 * Global Application State Management
 */

const state = {
  products: [],
  categories: [],
  favorites: [],
  settings: {},
  filters: {
    category: null,
    minPrice: null,
    maxPrice: null,
    rating: null,
    search: '',
    sort: 'featured'
  },
  ui: {
    loading: false,
    error: null
  }
};

const subscribers = new Map();

/**
 * Get state
 */
export function getState(key) {
  if (key) {
    return state[key];
  }
  return state;
}

/**
 * Set state
 */
export function setState(key, value) {
  state[key] = value;
  notifySubscribers(key, value);
}

/**
 * Update state
 */
export function updateState(updates) {
  Object.keys(updates).forEach(key => {
    state[key] = updates[key];
    notifySubscribers(key, updates[key]);
  });
}

/**
 * Subscribe to state changes
 */
export function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, []);
  }
  subscribers.get(key).push(callback);
  
  // Return unsubscribe function
  return () => {
    const callbacks = subscribers.get(key);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  };
}

/**
 * Notify subscribers
 */
function notifySubscribers(key, value) {
  if (subscribers.has(key)) {
    subscribers.get(key).forEach(callback => callback(value));
  }
}

/**
 * Reset filters
 */
export function resetFilters() {
  setState('filters', {
    category: null,
    minPrice: null,
    maxPrice: null,
    rating: null,
    search: '',
    sort: 'featured'
  });
}

/**
 * Update filter
 */
export function updateFilter(key, value) {
  const currentFilters = getState('filters');
  setState('filters', { ...currentFilters, [key]: value });
}
