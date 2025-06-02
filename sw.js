/**
 * Service Worker for ThannxAI Conversation Topic Selector
 * Provides offline functionality and caching strategies
 * 
 * @author Thanattsitt Thanatt (ThannxAI)
 * @version 2.1.0
 */

const CACHE_NAME = 'thannxai-conversation-v2.1.0';
const STATIC_CACHE = 'thannxai-static-v2.1.0';
const DYNAMIC_CACHE = 'thannxai-dynamic-v2.1.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap'
];

// Files to cache on demand
const DYNAMIC_FILES = [
    'https://cdnjs.cloudflare.com/ajax/libs/notyf/3.10.0/notyf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker: Static files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker: Failed to cache static files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== CACHE_NAME) {
                            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (STATIC_FILES.includes(request.url) || request.url.includes('/assets/')) {
        // Static files - cache first strategy
        event.respondWith(cacheFirst(request));
    } else if (DYNAMIC_FILES.some(file => request.url.includes(file))) {
        // Dynamic files - network first strategy
        event.respondWith(networkFirst(request));
    } else if (url.origin === location.origin) {
        // Same origin - cache first with network fallback
        event.respondWith(cacheFirst(request));
    } else {
        // External resources - network first
        event.respondWith(networkFirst(request));
    }
});

// Cache first strategy
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        return getOfflineFallback(request);
    }
}

// Network first strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return getOfflineFallback(request);
    }
}

// Offline fallback
function getOfflineFallback(request) {
    if (request.destination === 'document') {
        return caches.match('/index.html');
    }
    
    // Return a simple offline response for other requests
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'This feature requires an internet connection'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// Background sync for analytics
self.addEventListener('sync', event => {
    if (event.tag === 'analytics-sync') {
        event.waitUntil(syncAnalytics());
    }
});

async function syncAnalytics() {
    try {
        // Get stored analytics data
        const analyticsData = await getStoredAnalytics();
        if (analyticsData.length > 0) {
            // Send to analytics endpoint
            await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analyticsData)
            });
            
            // Clear stored data after successful sync
            await clearStoredAnalytics();
            console.log('📊 Analytics synced successfully');
        }
    } catch (error) {
        console.error('Failed to sync analytics:', error);
    }
}

// Push notifications (future feature)
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App',
                icon: '/assets/icons/icon-72x72.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icons/icon-72x72.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_NAME });
                break;
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({ success: true });
                });
                break;
        }
    }
});

// Utility functions
async function getStoredAnalytics() {
    // Implementation would depend on IndexedDB or other storage
    return [];
}

async function clearStoredAnalytics() {
    // Implementation would depend on IndexedDB or other storage
}

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// Performance monitoring
self.addEventListener('fetch', event => {
    const start = performance.now();
    
    event.respondWith(
        fetch(event.request).then(response => {
            const duration = performance.now() - start;
            
            // Log slow requests
            if (duration > 1000) {
                console.warn(`Slow request: ${event.request.url} took ${duration}ms`);
            }
            
            return response;
        })
    );
});

console.log('🤖 ThannxAI Service Worker loaded successfully');
