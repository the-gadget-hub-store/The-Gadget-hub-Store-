// ===================================
// FIREBASE CONFIGURATION & SETUP
// The Gadget Hub Store
// Production-ready Firebase / Firestore layer
// ===================================

// ===================================
// FIREBASE CONFIGURATION
// ===================================

const firebaseConfig = {
    apiKey: "AIzaSyDwGH1EmaJS4gjPJvJGWrOIm5lUV4exbpQ",
    authDomain: "the-gadget-hub-store-33876.firebaseapp.com",
    projectId: "the-gadget-hub-store-33876",
    storageBucket: "the-gadget-hub-store-33876.firebasestorage.app",
    messagingSenderId: "1065231323861",
    appId: "1:1065231323861:web:883e8a4724e28db2ce485c"
};

// ===================================
// GLOBAL FIREBASE REFERENCES
// ===================================

let app = null;
let auth = null;
let db = null;
let storage = null;

let isFirebaseConfigured = false;
let firebaseInitializationError = null;
let firebaseReady = false;

// Promise used by other files if Firebase is still initializing.
let firebaseReadyPromise = null;

// ===================================
// FIREBASE ERROR HELPERS
// ===================================

function getFirebaseErrorMessage(error, fallbackMessage = 'An unexpected Firebase error occurred.') {
    if (!error) {
        return fallbackMessage;
    }

    const code = error.code || '';

    const messages = {
        'permission-denied': 'Permission denied. Please check your Firebase authentication and Firestore security rules.',
        'unauthenticated': 'You must be logged in to perform this action.',
        'not-found': 'The requested record was not found.',
        'already-exists': 'This record already exists.',
        'unavailable': 'Firebase is temporarily unavailable. Please check your internet connection and try again.',
        'deadline-exceeded': 'The Firebase request took too long. Please try again.',
        'failed-precondition': 'This Firebase operation cannot be completed because a required condition is not satisfied.',
        'resource-exhausted': 'Firebase quota has been exceeded. Please try again later.',
        'cancelled': 'The Firebase operation was cancelled.',
        'invalid-argument': 'Invalid data was provided to Firebase.',
        'network-request-failed': 'Network connection failed. Please check your internet connection.',
        'storage/unauthorized': 'Storage permission denied.',
        'storage/canceled': 'The file upload was cancelled.',
        'storage/retry-limit-exceeded': 'The file upload took too long. Please try again.',
        'auth/network-request-failed': 'Authentication network request failed.',
        'auth/user-not-found': 'User account was not found.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'The provided login credentials are invalid.'
    };

    if (messages[code]) {
        return messages[code];
    }

    if (error.message && typeof error.message === 'string') {
        return error.message;
    }

    return fallbackMessage;
}

// ===================================
// FIREBASE AVAILABILITY CHECK
// ===================================

function isFirebaseAvailable() {
    return Boolean(
        isFirebaseConfigured &&
        firebaseReady &&
        db &&
        typeof db.collection === 'function'
    );
}

// ===================================
// FIREBASE INITIALIZATION
// ===================================

function initializeFirebase() {
    try {
        firebaseInitializationError = null;
        firebaseReady = false;

        // Check Firebase SDK
        if (typeof firebase === 'undefined') {
            throw new Error(
                'Firebase SDK is not loaded. Make sure the Firebase CDN scripts are loaded before firebase.js.'
            );
        }

        // Check configuration
        if (
            !firebaseConfig ||
            !firebaseConfig.apiKey ||
            firebaseConfig.apiKey === 'YOUR_API_KEY' ||
            !firebaseConfig.projectId
        ) {
            console.warn('Firebase is not configured. Demo mode will be used.');
            isFirebaseConfigured = false;
            firebaseReady = false;
            return false;
        }

        // Reuse an existing Firebase app instead of initializing twice.
        if (firebase.apps && firebase.apps.length > 0) {
            app = firebase.apps[0];
        } else {
            app = firebase.initializeApp(firebaseConfig);
        }

        // Initialize Authentication
        if (typeof firebase.auth === 'function') {
            auth = firebase.auth();
        } else {
            console.warn('Firebase Authentication SDK is unavailable.');
        }

        // Initialize Firestore
        if (typeof firebase.firestore === 'function') {
            db = firebase.firestore();
        } else {
            throw new Error(
                'Firebase Firestore SDK is not loaded. Make sure firebase-firestore is loaded before firebase.js.'
            );
        }

        // Initialize Storage
        if (typeof firebase.storage === 'function') {
            storage = firebase.storage();
        } else {
            console.warn('Firebase Storage SDK is unavailable.');
        }

        isFirebaseConfigured = true;
        firebaseReady = true;

        // Explicitly expose Firebase references globally.
        // This is important for categories.js, products.js and admin files.
        if (typeof window !== 'undefined') {
            window.firebaseApp = app;
            window.app = app;
            window.auth = auth;
            window.db = db;
            window.storage = storage;

            window.isFirebaseConfigured = isFirebaseConfigured;
            window.firebaseReady = firebaseReady;
        }

        console.log('Firebase initialized successfully.');
        console.log('Firestore connection ready.');

        return true;

    } catch (error) {
        firebaseInitializationError = error;
        isFirebaseConfigured = false;
        firebaseReady = false;

        console.error('Firebase initialization error:', error);

        if (typeof window !== 'undefined') {
            window.firebaseApp = null;
            window.app = null;
            window.auth = null;
            window.db = null;
            window.storage = null;
            window.isFirebaseConfigured = false;
            window.firebaseReady = false;
        }

        return false;
    }
}

// ===================================
// FIREBASE READY PROMISE
// ===================================

function createFirebaseReadyPromise() {
    firebaseReadyPromise = new Promise((resolve) => {
        if (firebaseReady && db) {
            resolve(true);
            return;
        }

        // Firebase initialization is synchronous with the compat SDK,
        // but this small timeout gives other scripts a safe opportunity
        // to finish loading if script order is not perfect.
        const startedAt = Date.now();
        const timeout = 10000;

        const checkReady = () => {
            if (firebaseReady && db) {
                resolve(true);
                return;
            }

            if (Date.now() - startedAt >= timeout) {
                resolve(false);
                return;
            }

            setTimeout(checkReady, 50);
        };

        checkReady();
    });

    return firebaseReadyPromise;
}

// ===================================
// GET FIREBASE READY PROMISE
// ===================================

function waitForFirebaseReady() {
    if (firebaseReady && db) {
        return Promise.resolve(true);
    }

    if (!firebaseReadyPromise) {
        return createFirebaseReadyPromise();
    }

    return firebaseReadyPromise;
}

// ===================================
// GET FIRESTORE INSTANCE
// ===================================

function getFirestore() {
    if (db && typeof db.collection === 'function') {
        return db;
    }

    if (
        typeof window !== 'undefined' &&
        window.db &&
        typeof window.db.collection === 'function'
    ) {
        db = window.db;
        return db;
    }

    if (
        typeof firebase !== 'undefined' &&
        typeof firebase.firestore === 'function'
    ) {
        try {
            db = firebase.firestore();

            if (typeof window !== 'undefined') {
                window.db = db;
            }

            return db;
        } catch (error) {
            console.error('Unable to access Firestore:', error);
        }
    }

    return null;
}

// ===================================
// GET AUTH INSTANCE
// ===================================

function getAuth() {
    if (auth) {
        return auth;
    }

    if (
        typeof window !== 'undefined' &&
        window.auth
    ) {
        auth = window.auth;
        return auth;
    }

    if (
        typeof firebase !== 'undefined' &&
        typeof firebase.auth === 'function'
    ) {
        try {
            auth = firebase.auth();

            if (typeof window !== 'undefined') {
                window.auth = auth;
            }

            return auth;
        } catch (error) {
            console.error('Unable to access Firebase Auth:', error);
        }
    }

    return null;
}

// ===================================
// GET STORAGE INSTANCE
// ===================================

function getStorage() {
    if (storage) {
        return storage;
    }

    if (
        typeof window !== 'undefined' &&
        window.storage
    ) {
        storage = window.storage;
        return storage;
    }

    if (
        typeof firebase !== 'undefined' &&
        typeof firebase.storage === 'function'
    ) {
        try {
            storage = firebase.storage();

            if (typeof window !== 'undefined') {
                window.storage = storage;
            }

            return storage;
        } catch (error) {
            console.error('Unable to access Firebase Storage:', error);
        }
    }

    return null;
}

// ===================================
// SAFE FIRESTORE COLLECTION ACCESS
// ===================================

function getCollection(collectionName) {
    try {
        if (!collectionName || typeof collectionName !== 'string') {
            throw new Error('A valid Firestore collection name is required.');
        }

        const database = getFirestore();

        if (!database) {
            throw new Error('Firestore database is not available.');
        }

        return database.collection(collectionName);

    } catch (error) {
        console.error(
            `Unable to access Firestore collection "${collectionName}":`,
            error
        );

        return null;
    }
}

// ===================================
// FIREBASE INITIALIZATION
// ===================================

initializeFirebase();
createFirebaseReadyPromise();

// ===================================
// DEMO DATA (FALLBACK)
// ===================================

const DEMO_CATEGORIES = [
    {
        id: 'cat1',
        name: 'Smart Gadgets',
        slug: 'smart-gadgets',
        icon: 'fa-lightbulb',
        image: '/assets/images/categories/smart-gadgets.jpg',
        description: 'Innovative smart devices for modern living',
        productCount: 156,
        featured: true
    },
    {
        id: 'cat2',
        name: 'Mobile Accessories',
        slug: 'mobile-accessories',
        icon: 'fa-mobile-alt',
        image: '/assets/images/categories/mobile-accessories.jpg',
        description: 'Essential accessories for your smartphone',
        productCount: 243,
        featured: true
    },
    {
        id: 'cat3',
        name: 'Gaming',
        slug: 'gaming',
        icon: 'fa-gamepad',
        image: '/assets/images/categories/gaming.jpg',
        description: 'Level up your gaming experience',
        productCount: 189,
        featured: true
    },
    {
        id: 'cat4',
        name: 'Smart Home',
        slug: 'smart-home',
        icon: 'fa-home',
        image: '/assets/images/categories/smart-home.jpg',
        description: 'Transform your home with smart technology',
        productCount: 134,
        featured: true
    },
    {
        id: 'cat5',
        name: 'Audio',
        slug: 'audio',
        icon: 'fa-headphones',
        image: '/assets/images/categories/audio.jpg',
        description: 'Premium sound for music lovers',
        productCount: 167,
        featured: true
    },
    {
        id: 'cat6',
        name: 'Wearables',
        slug: 'wearables',
        icon: 'fa-watch',
        image: '/assets/images/categories/wearables.jpg',
        description: 'Smart watches and fitness trackers',
        productCount: 98,
        featured: true
    },
    {
        id: 'cat7',
        name: 'Computer Accessories',
        slug: 'computer-accessories',
        icon: 'fa-keyboard',
        image: '/assets/images/categories/computer.jpg',
        description: 'Boost your productivity',
        productCount: 211,
        featured: true
    },
    {
        id: 'cat8',
        name: 'Car Gadgets',
        slug: 'car-gadgets',
        icon: 'fa-car',
        image: '/assets/images/categories/car-gadgets.jpg',
        description: 'Smart solutions for your vehicle',
        productCount: 87,
        featured: true
    }
];

const DEMO_PRODUCTS = [
    {
        id: 'prod1',
        title: 'Wireless Earbuds Pro',
        shortDescription: 'Premium noise cancelling earbuds',
        description: 'Experience crystal-clear audio with active noise cancellation and up to 30 hours of battery life.',
        price: 79.99,
        originalPrice: 129.99,
        discount: 38,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 2341,
        images: [
            '/assets/images/products/earbuds-1.jpg',
            '/assets/images/products/earbuds-2.jpg',
            '/assets/images/products/earbuds-3.jpg'
        ],
        thumbnail: '/assets/images/products/earbuds-thumb.jpg',
        category: 'cat5',
        tags: ['wireless', 'audio', 'earbuds', 'noise-cancelling'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: true,
        trending: true,
        bestseller: false,
        newArrival: false,
        stockStatus: 'in-stock',
        specifications: {
            'Battery Life': 'Up to 30 hours',
            'Connectivity': 'Bluetooth 5.3',
            'Water Resistance': 'IPX5',
            'Driver Size': '10mm dynamic drivers'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod2',
        title: 'Smart Watch Ultra',
        shortDescription: 'Advanced fitness and health tracking',
        description: 'Track your fitness goals with precision. Features heart rate monitoring, GPS, and 100+ sport modes.',
        price: 149.99,
        originalPrice: 249.99,
        discount: 40,
        currency: 'USD',
        rating: 4.9,
        reviewCount: 1876,
        images: [
            '/assets/images/products/watch-1.jpg',
            '/assets/images/products/watch-2.jpg'
        ],
        thumbnail: '/assets/images/products/watch-thumb.jpg',
        category: 'cat6',
        tags: ['smartwatch', 'fitness', 'health', 'wearable'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: true,
        trending: true,
        bestseller: true,
        newArrival: false,
        stockStatus: 'in-stock',
        specifications: {
            'Display': '1.9" AMOLED',
            'Battery Life': 'Up to 14 days',
            'Water Resistance': '5ATM',
            'GPS': 'Built-in GPS + GLONASS'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod3',
        title: 'Mechanical Gaming Keyboard RGB',
        shortDescription: 'Professional gaming keyboard',
        description: 'Dominate your games with responsive mechanical switches and customizable RGB lighting.',
        price: 89.99,
        originalPrice: 159.99,
        discount: 44,
        currency: 'USD',
        rating: 4.7,
        reviewCount: 1543,
        images: [
            '/assets/images/products/keyboard-1.jpg',
            '/assets/images/products/keyboard-2.jpg'
        ],
        thumbnail: '/assets/images/products/keyboard-thumb.jpg',
        category: 'cat3',
        tags: ['gaming', 'keyboard', 'rgb', 'mechanical'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: false,
        trending: true,
        bestseller: false,
        newArrival: true,
        stockStatus: 'in-stock',
        specifications: {
            'Switch Type': 'Cherry MX Red',
            'Connectivity': 'Wired USB-C',
            'RGB Lighting': '16.8M colors',
            'Anti-ghosting': 'Full key'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod4',
        title: 'Portable Power Bank 20000mAh',
        shortDescription: 'Fast charging power bank',
        description: 'Never run out of battery with this high-capacity power bank featuring quick charge technology.',
        price: 34.99,
        originalPrice: 59.99,
        discount: 42,
        currency: 'USD',
        rating: 4.6,
        reviewCount: 3214,
        images: [
            '/assets/images/products/powerbank-1.jpg'
        ],
        thumbnail: '/assets/images/products/powerbank-thumb.jpg',
        category: 'cat2',
        tags: ['powerbank', 'charging', 'portable', 'mobile'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: true,
        trending: false,
        bestseller: true,
        newArrival: false,
        stockStatus: 'in-stock',
        specifications: {
            'Capacity': '20000mAh',
            'Input': 'USB-C 18W',
            'Output': 'Dual USB + USB-C',
            'Fast Charging': 'PD 3.0 & QC 4.0'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod5',
        title: 'Smart LED Light Bulb',
        shortDescription: 'Wi-Fi enabled color changing bulb',
        description: 'Control your lighting from anywhere with app control and voice assistant compatibility.',
        price: 19.99,
        originalPrice: 34.99,
        discount: 43,
        currency: 'USD',
        rating: 4.5,
        reviewCount: 987,
        images: [
            '/assets/images/products/bulb-1.jpg'
        ],
        thumbnail: '/assets/images/products/bulb-thumb.jpg',
        category: 'cat4',
        tags: ['smart-home', 'lighting', 'wifi', 'led'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: false,
        trending: true,
        bestseller: false,
        newArrival: true,
        stockStatus: 'in-stock',
        specifications: {
            'Brightness': '800 lumens',
            'Colors': '16 million colors',
            'Connectivity': 'Wi-Fi 2.4GHz',
            'Compatibility': 'Alexa, Google Home'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod6',
        title: 'Wireless Gaming Mouse',
        shortDescription: 'Ultra-lightweight gaming mouse',
        description: 'Precision gaming with ultra-low latency wireless technology and customizable buttons.',
        price: 59.99,
        originalPrice: 99.99,
        discount: 40,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 1234,
        images: [
            '/assets/images/products/mouse-1.jpg',
            '/assets/images/products/mouse-2.jpg'
        ],
        thumbnail: '/assets/images/products/mouse-thumb.jpg',
        category: 'cat3',
        tags: ['gaming', 'mouse', 'wireless', 'rgb'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: true,
        trending: true,
        bestseller: false,
        newArrival: false,
        stockStatus: 'in-stock',
        specifications: {
            'DPI': 'Up to 25600',
            'Weight': '59g',
            'Battery': 'Up to 70 hours',
            'Polling Rate': '1000Hz'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod7',
        title: 'USB-C Hub Multi-Port Adapter',
        shortDescription: '7-in-1 USB-C docking station',
        description: 'Expand your laptop connectivity with HDMI, USB ports, SD card readers, and more.',
        price: 44.99,
        originalPrice: 79.99,
        discount: 44,
        currency: 'USD',
        rating: 4.6,
        reviewCount: 892,
        images: [
            '/assets/images/products/hub-1.jpg'
        ],
        thumbnail: '/assets/images/products/hub-thumb.jpg',
        category: 'cat7',
        tags: ['usb-c', 'hub', 'adapter', 'computer'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: false,
        trending: false,
        bestseller: true,
        newArrival: false,
        stockStatus: 'in-stock',
        specifications: {
            'Ports': '7-in-1',
            'HDMI': '4K@60Hz',
            'USB Ports': '3x USB 3.0',
            'Power Delivery': 'Up to 100W'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'prod8',
        title: 'Car Dash Camera 4K',
        shortDescription: 'Ultra HD dashcam with night vision',
        description: 'Record your drives in stunning 4K quality with advanced night vision and parking mode.',
        price: 79.99,
        originalPrice: 139.99,
        discount: 43,
        currency: 'USD',
        rating: 4.7,
        reviewCount: 1456,
        images: [
            '/assets/images/products/dashcam-1.jpg',
            '/assets/images/products/dashcam-2.jpg'
        ],
        thumbnail: '/assets/images/products/dashcam-thumb.jpg',
        category: 'cat8',
        tags: ['car', 'dashcam', '4k', 'camera'],
        affiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib',
        featured: false,
        trending: true,
        bestseller: false,
        newArrival: true,
        stockStatus: 'in-stock',
        specifications: {
            'Resolution': '4K UHD',
            'Night Vision': 'Yes',
            'Storage': 'Up to 256GB',
            'Field of View': '170°'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

const DEMO_SETTINGS = {
    storeName: 'The Gadget Hub Store',
    email: 'info@gadgethubstore.com',
    currency: 'USD',
    socialLinks: {
        facebook: 'https://facebook.com/gadgethubstore',
        instagram: 'https://instagram.com/gadgethubstore',
        youtube: 'https://youtube.com/@gadgethubstore',
        tiktok: 'https://tiktok.com/@gadgethubstore'
    },
    masterAffiliateUrl: 'https://s.click.aliexpress.com/e/_c3hTwqib'
};

// ===================================
// INTERNAL FIRESTORE DATA HELPER
// ===================================

function mapSnapshot(snapshot) {
    if (!snapshot || !snapshot.docs) {
        return [];
    }

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// ===================================
// GET ALL PRODUCTS
// ===================================

async function getProducts(limit = null) {
    try {
        if (!isFirebaseAvailable()) {
            return limit
                ? DEMO_PRODUCTS.slice(0, limit)
                : DEMO_PRODUCTS;
        }

        let query = getCollection('products');

        if (!query) {
            throw new Error('Products collection is unavailable.');
        }

        query = query.orderBy('createdAt', 'desc');

        if (limit) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();

        return mapSnapshot(snapshot);

    } catch (error) {
        console.error('Error getting products:', error);

        return limit
            ? DEMO_PRODUCTS.slice(0, limit)
            : DEMO_PRODUCTS;
    }
}

// ===================================
// GET PRODUCT BY ID
// ===================================

async function getProductById(productId) {
    if (!productId) {
        return null;
    }

    try {
        if (!isFirebaseAvailable()) {
            return DEMO_PRODUCTS.find(p => p.id === productId) || null;
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error('Products collection is unavailable.');
        }

        const doc = await productsRef.doc(productId).get();

        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        }

        return null;

    } catch (error) {
        console.error('Error getting product:', error);
        return null;
    }
}

// ===================================
// GET PRODUCTS BY CATEGORY
// ===================================

async function getProductsByCategory(categoryId, limit = null) {
    if (!categoryId) {
        return [];
    }

    try {
        if (!isFirebaseAvailable()) {
            const filtered = DEMO_PRODUCTS.filter(
                product => product.category === categoryId
            );

            return limit
                ? filtered.slice(0, limit)
                : filtered;
        }

        let query = getCollection('products');

        if (!query) {
            throw new Error('Products collection is unavailable.');
        }

        query = query
            .where('category', '==', categoryId)
            .orderBy('createdAt', 'desc');

        if (limit) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();

        return mapSnapshot(snapshot);

    } catch (error) {
        console.error('Error getting products by category:', error);
        return [];
    }
}

// ===================================
// GET TRENDING PRODUCTS
// ===================================

async function getTrendingProducts(limit = 8) {
    try {
        if (!isFirebaseAvailable()) {
            return DEMO_PRODUCTS
                .filter(p => p.trending)
                .slice(0, limit);
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error('Products collection is unavailable.');
        }

        const snapshot = await productsRef
            .where('trending', '==', true)
            .limit(limit)
            .get();

        return mapSnapshot(snapshot);

    } catch (error) {
        console.error('Error getting trending products:', error);

        return DEMO_PRODUCTS
            .filter(p => p.trending)
            .slice(0, limit);
    }
}

// ===================================
// GET FEATURED PRODUCTS
// ===================================

async function getFeaturedProducts(limit = 8) {
    try {
        if (!isFirebaseAvailable()) {
            return DEMO_PRODUCTS
                .filter(p => p.featured)
                .slice(0, limit);
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error('Products collection is unavailable.');
        }

        const snapshot = await productsRef
            .where('featured', '==', true)
            .limit(limit)
            .get();

        return mapSnapshot(snapshot);

    } catch (error) {
        console.error('Error getting featured products:', error);

        return DEMO_PRODUCTS
            .filter(p => p.featured)
            .slice(0, limit);
    }
}

// ===================================
// GET NEW ARRIVAL PRODUCTS
// ===================================

async function getNewArrivalProducts(limit = 8) {
    try {
        if (!isFirebaseAvailable()) {
            return DEMO_PRODUCTS
                .filter(p => p.newArrival)
                .slice(0, limit);
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error('Products collection is unavailable.');
        }

        const snapshot = await productsRef
            .where('newArrival', '==', true)
            .limit(limit)
            .get();

        return mapSnapshot(snapshot);

    } catch (error) {
        console.error('Error getting new arrivals:', error);

        return DEMO_PRODUCTS
            .filter(p => p.newArrival)
            .slice(0, limit);
    }
}

// ===================================
// SEARCH PRODUCTS
// ===================================

async function searchProducts(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) {
        return [];
    }

    const term = searchTerm.toLowerCase().trim();

    try {
        if (!isFirebaseAvailable()) {
            return DEMO_PRODUCTS.filter(product => {
                const title = String(product.title || '').toLowerCase();
                const description = String(product.description || '').toLowerCase();

                const tags = Array.isArray(product.tags)
                    ? product.tags
                    : [];

                return (
                    title.includes(term) ||
                    description.includes(term) ||
                    tags.some(tag =>
                        String(tag).toLowerCase().includes(term)
                    )
                );
            });
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error('Products collection is unavailable.');
        }

        const snapshot = await productsRef.get();
        const allProducts = mapSnapshot(snapshot);

        return allProducts.filter(product => {
            const title = String(product.title || '').toLowerCase();
            const description = String(product.description || '').toLowerCase();

            const tags = Array.isArray(product.tags)
                ? product.tags
                : [];

            return (
                title.includes(term) ||
                description.includes(term) ||
                tags.some(tag =>
                    String(tag).toLowerCase().includes(term)
                )
            );
        });

    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
}

// ===================================
// GET ALL CATEGORIES
// ===================================

async function getCategories() {
    try {
        if (!isFirebaseAvailable()) {
            return DEMO_CATEGORIES;
        }

        const categoriesRef = getCollection('categories');

        if (!categoriesRef) {
            throw new Error('Categories collection is unavailable.');
        }

        const snapshot = await categoriesRef
            .orderBy('name', 'asc')
            .get();

        // IMPORTANT:
        // An empty Firestore collection is a VALID result.
        // Do NOT replace an empty collection with demo categories.
        return mapSnapshot(snapshot);

    } catch (error) {
        console.error('Error getting categories:', error);

        // Demo fallback only when Firebase itself is unavailable
        // or the request genuinely fails.
        return DEMO_CATEGORIES;
    }
}

// ===================================
// GET CATEGORY BY ID
// ===================================

async function getCategoryById(categoryId) {
    if (!categoryId) {
        return null;
    }

    try {
        if (!isFirebaseAvailable()) {
            return DEMO_CATEGORIES.find(
                category => category.id === categoryId
            ) || null;
        }

        const categoriesRef = getCollection('categories');

        if (!categoriesRef) {
            throw new Error('Categories collection is unavailable.');
        }

        const doc = await categoriesRef
            .doc(categoryId)
            .get();

        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        }

        return null;

    } catch (error) {
        console.error('Error getting category:', error);
        return null;
    }
}

// ===================================
// GET SETTINGS
// ===================================

async function getSettings() {
    try {
        if (!isFirebaseAvailable()) {
            return DEMO_SETTINGS;
        }

        const settingsRef = getCollection('settings');

        if (!settingsRef) {
            throw new Error('Settings collection is unavailable.');
        }

        const doc = await settingsRef
            .doc('general')
            .get();

        if (doc.exists) {
            return {
                ...DEMO_SETTINGS,
                ...doc.data()
            };
        }

        return DEMO_SETTINGS;

    } catch (error) {
        console.error('Error getting settings:', error);
        return DEMO_SETTINGS;
    }
}

// ===================================
// SUBSCRIBE TO NEWSLETTER
// ===================================

async function subscribeNewsletter(email) {
    if (!email || typeof email !== 'string') {
        return {
            success: false,
            message: 'A valid email address is required.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log(
                'Demo mode: Newsletter subscription simulated for',
                email
            );

            return {
                success: true,
                message: 'Successfully subscribed!'
            };
        }

        const newsletterRef = getCollection('newsletterSubscribers');

        if (!newsletterRef) {
            throw new Error(
                'Newsletter collection is unavailable.'
            );
        }

        const timestamp =
            firebase.firestore.FieldValue.serverTimestamp();

        await newsletterRef.add({
            email: email.trim().toLowerCase(),
            subscribedAt: timestamp,
            active: true
        });

        return {
            success: true,
            message: 'Successfully subscribed!'
        };

    } catch (error) {
        console.error(
            'Error subscribing to newsletter:',
            error
        );

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Subscription failed. Please try again.'
            )
        };
    }
}

// ===================================
// ADMIN AUTHENTICATION CHECK
// ===================================

function getCurrentUser() {
    try {
        const firebaseAuth = getAuth();

        if (!firebaseAuth) {
            return null;
        }

        return firebaseAuth.currentUser || null;

    } catch (error) {
        console.error('Error getting current Firebase user:', error);
        return null;
    }
}

// ===================================
// ADMIN: ADD PRODUCT
// ===================================

async function addProduct(productData) {
    if (!productData || typeof productData !== 'object') {
        return {
            success: false,
            message: 'Invalid product data.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Product add simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error(
                'Products collection is unavailable.'
            );
        }

        const now =
            firebase.firestore.FieldValue.serverTimestamp();

        const cleanProductData = {
            ...productData,
            createdAt: productData.createdAt || now,
            updatedAt: now
        };

        const docRef = await productsRef.add(cleanProductData);

        return {
            success: true,
            id: docRef.id,
            message: 'Product added successfully.'
        };

    } catch (error) {
        console.error('Error adding product:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to add product. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// ADMIN: UPDATE PRODUCT
// ===================================

async function updateProduct(productId, productData) {
    if (!productId) {
        return {
            success: false,
            message: 'Product ID is required.'
        };
    }

    if (!productData || typeof productData !== 'object') {
        return {
            success: false,
            message: 'Invalid product data.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Product update simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error(
                'Products collection is unavailable.'
            );
        }

        await productsRef
            .doc(productId)
            .update({
                ...productData,
                updatedAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            });

        return {
            success: true,
            message: 'Product updated successfully.'
        };

    } catch (error) {
        console.error('Error updating product:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to update product. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// ADMIN: DELETE PRODUCT
// ===================================

async function deleteProduct(productId) {
    if (!productId) {
        return {
            success: false,
            message: 'Product ID is required.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Product delete simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const productsRef = getCollection('products');

        if (!productsRef) {
            throw new Error(
                'Products collection is unavailable.'
            );
        }

        await productsRef
            .doc(productId)
            .delete();

        return {
            success: true,
            message: 'Product deleted successfully.'
        };

    } catch (error) {
        console.error('Error deleting product:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to delete product. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// ADMIN: ADD CATEGORY
// ===================================

async function addCategory(categoryData) {
    if (!categoryData || typeof categoryData !== 'object') {
        return {
            success: false,
            message: 'Invalid category data.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Category add simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const categoriesRef = getCollection('categories');

        if (!categoriesRef) {
            throw new Error(
                'Categories collection is unavailable.'
            );
        }

        const now =
            firebase.firestore.FieldValue.serverTimestamp();

        const finalCategoryData = {
            ...categoryData,
            createdAt: categoryData.createdAt || now,
            updatedAt: now
        };

        const docRef =
            await categoriesRef.add(finalCategoryData);

        return {
            success: true,
            id: docRef.id,
            message: 'Category added successfully.'
        };

    } catch (error) {
        console.error('Error adding category:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to add category. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// ADMIN: UPDATE CATEGORY
// ===================================

async function updateCategory(categoryId, categoryData) {
    if (!categoryId) {
        return {
            success: false,
            message: 'Category ID is required.'
        };
    }

    if (!categoryData || typeof categoryData !== 'object') {
        return {
            success: false,
            message: 'Invalid category data.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Category update simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const categoriesRef = getCollection('categories');

        if (!categoriesRef) {
            throw new Error(
                'Categories collection is unavailable.'
            );
        }

        await categoriesRef
            .doc(categoryId)
            .update({
                ...categoryData,
                updatedAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            });

        return {
            success: true,
            message: 'Category updated successfully.'
        };

    } catch (error) {
        console.error('Error updating category:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to update category. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// ADMIN: DELETE CATEGORY
// ===================================

async function deleteCategory(categoryId) {
    if (!categoryId) {
        return {
            success: false,
            message: 'Category ID is required.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Category delete simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const categoriesRef = getCollection('categories');

        if (!categoriesRef) {
            throw new Error(
                'Categories collection is unavailable.'
            );
        }

        await categoriesRef
            .doc(categoryId)
            .delete();

        return {
            success: true,
            message: 'Category deleted successfully.'
        };

    } catch (error) {
        console.error('Error deleting category:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to delete category. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// ADMIN: SAVE SETTINGS
// ===================================

async function saveSettings(settingsData) {
    if (!settingsData || typeof settingsData !== 'object') {
        return {
            success: false,
            message: 'Invalid settings data.'
        };
    }

    try {
        if (!isFirebaseAvailable()) {
            console.log('Demo mode: Settings save simulated.');

            return {
                success: false,
                message: 'Firebase not configured.'
            };
        }

        const settingsRef = getCollection('settings');

        if (!settingsRef) {
            throw new Error(
                'Settings collection is unavailable.'
            );
        }

        await settingsRef
            .doc('general')
            .set(settingsData, {
                merge: true
            });

        return {
            success: true,
            message: 'Settings saved successfully.'
        };

    } catch (error) {
        console.error('Error saving settings:', error);

        return {
            success: false,
            message: getFirebaseErrorMessage(
                error,
                'Unable to save settings. Please try again.'
            ),
            code: error.code || null
        };
    }
}

// ===================================
// SAFE BATCH HELPER
// ===================================

function createFirestoreBatch() {
    try {
        const database = getFirestore();

        if (!database || typeof database.batch !== 'function') {
            return null;
        }

        return database.batch();

    } catch (error) {
        console.error('Error creating Firestore batch:', error);
        return null;
    }
}

// ===================================
// CATEGORY PRODUCT COUNTS
// ===================================

async function updateCategoryProductCounts() {
    try {
        if (!isFirebaseAvailable()) {
            console.warn(
                'Cannot update category product counts: Firebase unavailable.'
            );
            return false;
        }

        const categoriesRef = getCollection('categories');
        const productsRef = getCollection('products');

        if (!categoriesRef || !productsRef) {
            throw new Error(
                'Categories or products collection is unavailable.'
            );
        }

        const [
            categoriesSnapshot,
            productsSnapshot
        ] = await Promise.all([
            categoriesRef.get(),
            productsRef.get()
        ]);

        const productCounts = {};

        productsSnapshot.forEach(doc => {
            const product = doc.data() || {};
            const category = product.category;

            if (category) {
                productCounts[category] =
                    (productCounts[category] || 0) + 1;
            }
        });

        const batch = createFirestoreBatch();

        if (!batch) {
            throw new Error(
                'Unable to create Firestore batch.'
            );
        }

        categoriesSnapshot.forEach(doc => {
            const categoryData = doc.data() || {};
            const categorySlug = categoryData.slug || '';
            const count = productCounts[categorySlug] || 0;

            batch.update(doc.ref, {
                productCount: count,
                updatedAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // No documents = nothing to commit.
        if (categoriesSnapshot.empty) {
            return true;
        }

        await batch.commit();

        console.log(
            'Category product counts updated successfully.'
        );

        return true;

    } catch (error) {
        console.error(
            'Error updating category product counts:',
            error
        );

        return false;
    }
}

// ===================================
// FIRESTORE CONNECTION TEST
// ===================================

async function testFirebaseConnection() {
    try {
        if (!isFirebaseAvailable()) {
            return {
                success: false,
                connected: false,
                message: 'Firebase is not initialized.'
            };
        }

        const categoriesRef = getCollection('categories');

        if (!categoriesRef) {
            return {
                success: false,
                connected: false,
                message: 'Categories collection is unavailable.'
            };
        }

        await categoriesRef.limit(1).get();

        return {
            success: true,
            connected: true,
            message: 'Firebase Firestore connection is working.'
        };

    } catch (error) {
        console.error(
            'Firebase connection test failed:',
            error
        );

        return {
            success: false,
            connected: false,
            code: error.code || null,
            message: getFirebaseErrorMessage(
                error,
                'Unable to connect to Firebase Firestore.'
            )
        };
    }
}

// ===================================
// FIREBASE STATUS
// ===================================

function getFirebaseStatus() {
    return {
        configured: isFirebaseConfigured,
        ready: firebaseReady,
        available: isFirebaseAvailable(),
        hasApp: Boolean(app),
        hasAuth: Boolean(auth),
        hasFirestore: Boolean(db),
        hasStorage: Boolean(storage),
        initializationError: firebaseInitializationError
            ? firebaseInitializationError.message
            : null
    };
}

// ===================================
// GLOBAL EXPORTS
// ===================================
// IMPORTANT:
// These exports make the Firebase layer accessible to
// categories.js, products.js, admin.js, UI.js and other
// scripts without depending on fragile local-scope behavior.

if (typeof window !== 'undefined') {

    // Firebase references
    window.firebaseApp = app;
    window.app = app;
    window.auth = auth;
    window.db = db;
    window.storage = storage;

    // Firebase state
    window.isFirebaseConfigured = isFirebaseConfigured;
    window.firebaseReady = firebaseReady;

    // Firebase helpers
    window.isFirebaseAvailable = isFirebaseAvailable;
    window.waitForFirebaseReady = waitForFirebaseReady;
    window.getFirestore = getFirestore;
    window.getAuth = getAuth;
    window.getStorage = getStorage;
    window.getCollection = getCollection;
    window.getCurrentUser = getCurrentUser;
    window.getFirebaseStatus = getFirebaseStatus;
    window.testFirebaseConnection = testFirebaseConnection;
    window.getFirebaseErrorMessage = getFirebaseErrorMessage;

    // Product functions
    window.getProducts = getProducts;
    window.getProductById = getProductById;
    window.getProductsByCategory = getProductsByCategory;
    window.getTrendingProducts = getTrendingProducts;
    window.getFeaturedProducts = getFeaturedProducts;
    window.getNewArrivalProducts = getNewArrivalProducts;
    window.searchProducts = searchProducts;

    // Category functions
    window.getCategories = getCategories;
    window.getCategoryById = getCategoryById;
    window.addCategory = addCategory;
    window.updateCategory = updateCategory;
    window.deleteCategory = deleteCategory;
    window.updateCategoryProductCounts =
        updateCategoryProductCounts;

    // Settings / newsletter
    window.getSettings = getSettings;
    window.saveSettings = saveSettings;
    window.subscribeNewsletter = subscribeNewsletter;

    // Product admin functions
    window.addProduct = addProduct;
    window.updateProduct = updateProduct;
    window.deleteProduct = deleteProduct;

    // Demo data
    window.DEMO_CATEGORIES = DEMO_CATEGORIES;
    window.DEMO_PRODUCTS = DEMO_PRODUCTS;
    window.DEMO_SETTINGS = DEMO_SETTINGS;
}

// ===================================
// FIREBASE AUTH STATE MONITOR
// ===================================

try {
    const firebaseAuth = getAuth();

    if (
        firebaseAuth &&
        typeof firebaseAuth.onAuthStateChanged === 'function'
    ) {
        firebaseAuth.onAuthStateChanged(user => {

            if (typeof window !== 'undefined') {
                window.currentFirebaseUser = user || null;
                window.isFirebaseAuthenticated = Boolean(user);
            }

            if (user) {
                console.log(
                    'Firebase authentication state: signed in.',
                    user.email || ''
                );
            } else {
                console.log(
                    'Firebase authentication state: signed out.'
                );
            }
        });
    }
} catch (error) {
    console.warn(
        'Firebase Auth state listener could not be initialized:',
        error
    );
}

// ===================================
// FINAL GLOBAL STATE SYNCHRONIZATION
// ===================================

if (typeof window !== 'undefined') {
    window.firebaseStatus = getFirebaseStatus();
}

console.log(
    'Firebase.js loaded.',
    getFirebaseStatus()
);
