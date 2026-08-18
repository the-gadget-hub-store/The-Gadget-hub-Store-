// ===================================
// FIREBASE CONFIGURATION & SETUP
// ===================================

// Firebase Configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db, storage;
let isFirebaseConfigured = false;

try {
    // Check if Firebase config is set
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        isFirebaseConfigured = true;
        console.log('Firebase initialized successfully');
    } else {
        console.warn('Firebase not configured. Using demo data.');
        isFirebaseConfigured = false;
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    isFirebaseConfigured = false;
}

// ===================================
// DEMO DATA (Fallback)
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
// FIREBASE FIRESTORE FUNCTIONS
// ===================================

// Get all products
async function getProducts(limit = null) {
    if (!isFirebaseConfigured) {
        return limit ? DEMO_PRODUCTS.slice(0, limit) : DEMO_PRODUCTS;
    }
    
    try {
        let query = db.collection('products').orderBy('createdAt', 'desc');
        
        if (limit) {
            query = query.limit(limit);
        }
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting products:', error);
        return DEMO_PRODUCTS;
    }
}

// Get product by ID
async function getProductById(productId) {
    if (!isFirebaseConfigured) {
        return DEMO_PRODUCTS.find(p => p.id === productId);
    }
    
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting product:', error);
        return null;
    }
}

// Get products by category
async function getProductsByCategory(categoryId, limit = null) {
    if (!isFirebaseConfigured) {
        const filtered = DEMO_PRODUCTS.filter(p => p.category === categoryId);
        return limit ? filtered.slice(0, limit) : filtered;
    }
    
    try {
        let query = db.collection('products')
            .where('category', '==', categoryId)
            .orderBy('createdAt', 'desc');
        
        if (limit) {
            query = query.limit(limit);
        }
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting products by category:', error);
        return [];
    }
}

// Get trending products
async function getTrendingProducts(limit = 8) {
    if (!isFirebaseConfigured) {
        return DEMO_PRODUCTS.filter(p => p.trending).slice(0, limit);
    }
    
    try {
        const snapshot = await db.collection('products')
            .where('trending', '==', true)
            .limit(limit)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting trending products:', error);
        return DEMO_PRODUCTS.filter(p => p.trending).slice(0, limit);
    }
}

// Get featured products
async function getFeaturedProducts(limit = 8) {
    if (!isFirebaseConfigured) {
        return DEMO_PRODUCTS.filter(p => p.featured).slice(0, limit);
    }
    
    try {
        const snapshot = await db.collection('products')
            .where('featured', '==', true)
            .limit(limit)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting featured products:', error);
        return DEMO_PRODUCTS.filter(p => p.featured).slice(0, limit);
    }
}

// Get new arrival products
async function getNewArrivalProducts(limit = 8) {
    if (!isFirebaseConfigured) {
        return DEMO_PRODUCTS.filter(p => p.newArrival).slice(0, limit);
    }
    
    try {
        const snapshot = await db.collection('products')
            .where('newArrival', '==', true)
            .limit(limit)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting new arrivals:', error);
        return DEMO_PRODUCTS.filter(p => p.newArrival).slice(0, limit);
    }
}

// Search products
async function searchProducts(searchTerm) {
    if (!isFirebaseConfigured) {
        const term = searchTerm.toLowerCase();
        return DEMO_PRODUCTS.filter(p => 
            p.title.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.tags.some(tag => tag.toLowerCase().includes(term))
        );
    }
    
    try {
        // Note: Firestore doesn't have full-text search built-in
        // This is a simple implementation. Consider using Algolia or similar for production
        const snapshot = await db.collection('products').get();
        const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const term = searchTerm.toLowerCase();
        return allProducts.filter(p => 
            p.title.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term)))
        );
    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
}

// Get all categories
async function getCategories() {
    if (!isFirebaseConfigured) {
        return DEMO_CATEGORIES;
    }
    
    try {
        const snapshot = await db.collection('categories').orderBy('name').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting categories:', error);
        return DEMO_CATEGORIES;
    }
}

// Get category by ID
async function getCategoryById(categoryId) {
    if (!isFirebaseConfigured) {
        return DEMO_CATEGORIES.find(c => c.id === categoryId);
    }
    
    try {
        const doc = await db.collection('categories').doc(categoryId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting category:', error);
        return null;
    }
}

// Get settings
async function getSettings() {
    if (!isFirebaseConfigured) {
        return DEMO_SETTINGS;
    }
    
    try {
        const doc = await db.collection('settings').doc('general').get();
        if (doc.exists) {
            return doc.data();
        }
        return DEMO_SETTINGS;
    } catch (error) {
        console.error('Error getting settings:', error);
        return DEMO_SETTINGS;
    }
}

// Subscribe to newsletter
async function subscribeNewsletter(email) {
    if (!isFirebaseConfigured) {
        console.log('Demo mode: Newsletter subscription simulated for', email);
        return { success: true, message: 'Successfully subscribed!' };
    }
    
    try {
        await db.collection('newsletterSubscribers').add({
            email: email,
            subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
            active: true
        });
        
        return { success: true, message: 'Successfully subscribed!' };
    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        return { success: false, message: 'Subscription failed. Please try again.' };
    }
}

// ===================================
// ADMIN FUNCTIONS (Protected)
// ===================================

// Add product (Admin only)
async function addProduct(productData) {
    if (!isFirebaseConfigured) {
        console.log('Demo mode: Product add simulated');
        return { success: false, message: 'Firebase not configured' };
    }
    
    try {
        const docRef = await db.collection('products').add({
            ...productData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding product:', error);
        return { success: false, message: error.message };
    }
}

// Update product (Admin only)
async function updateProduct(productId, productData) {
    if (!isFirebaseConfigured) {
        console.log('Demo mode: Product update simulated');
        return { success: false, message: 'Firebase not configured' };
    }
    
    try {
        await db.collection('products').doc(productId).update({
            ...productData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, message: error.message };
    }
}

// Delete product (Admin only)
async function deleteProduct(productId) {
    if (!isFirebaseConfigured) {
        console.log('Demo mode: Product delete simulated');
        return { success: false, message: 'Firebase not configured' };
    }
    
    try {
        await db.collection('products').doc(productId).delete();
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, message: error.message };
    }
}

// Save settings (Admin only)
async function saveSettings(settingsData) {
    if (!isFirebaseConfigured) {
        console.log('Demo mode: Settings save simulated');
        return { success: false, message: 'Firebase not configured' };
    }
    
    try {
        await db.collection('settings').doc('general').set(settingsData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, message: error.message };
    }
}
