// Service Worker for The Gadget Hub Store
// Version 1.0.0

const CACHE_NAME = 'gadget-hub-store-v1';
const RUNTIME_CACHE = 'gadget-hub-runtime-v1';

// Assets to cache on installation
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/ui.js',
    '/js/firebase.js',
    '/js/auth.js',
    '/js/products.js',
    '/js/favorites.js',
    '/js/search.js',
    '/js/categories.js',
    '/pages/shop.html',
    '/pages/product.html',
    '/pages/favorites.html',
    '/pages/trending.html',
    '/pages/deals.html',
    '/pages/categories.html',
    '/pages/account.html',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('[ServiceWorker] Removing old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        // Handle Firebase and external resources
        if (url.hostname.includes('firebase') || 
            url.hostname.includes('firebaseio') ||
            url.hostname.includes('googleapis') ||
            url.hostname.includes('gstatic')) {
            // Always fetch Firebase resources from network
            return;
        }
    }
    
    // Handle API requests differently
    if (request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[ServiceWorker] Serving from cache:', request.url);
                    return cachedResponse;
                }
                
                return fetch(request)
                    .then((response) => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache runtime resources
                        if (url.origin === location.origin) {
                            caches.open(RUNTIME_CACHE)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });
                        }
                        
                        return response;
                    })
                    .catch((error) => {
                        console.error('[ServiceWorker] Fetch failed:', error);
                        
                        // Return offline page if available
                        if (request.destination === 'document') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

// Sync favorites when back online
async function syncFavorites() {
    try {
        const cache = await caches.open(RUNTIME_CACHE);
        const cachedFavorites = await cache.match('/sync/favorites');
        
        if (cachedFavorites) {
            const favorites = await cachedFavorites.json();
            
            // Send to server (implement your sync logic here)
            console.log('[ServiceWorker] Syncing favorites:', favorites);
            
            // Remove from cache after successful sync
            await cache.delete('/sync/favorites');
        }
    } catch (error) {
        console.error('[ServiceWorker] Sync failed:', error);
    }
}

// Push notification handler
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: '/assets/icons/favicon.svg',
        badge: '/assets/icons/badge.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Now',
                icon: '/assets/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icons/close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('The Gadget Hub Store', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification click:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// Update notification for users
self.addEventListener('controllerchange', () => {
    console.log('[ServiceWorker] Controller changed - new version available');
});

console.log('[ServiceWorker] Loaded successfully');
