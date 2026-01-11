// ===================================
// SVR Manufacturing Dashboard - Service Worker
// Enables offline access (PWA)
// ===================================

const CACHE_NAME = 'svr-dashboard-v9';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './auth.js',
    './advanced-features.js',
    './backup-system.js',
    './customers.js',
    './expenses.js',
    './expenses-dashboard.js',
    './expense-analytics.js',
    './expense-init.js',
    './expense-reports.js',
    './recurring-expenses.js',
    './search.js',
    './manifest.json'
];

// External CDN resources to cache
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets...');

            // Cache static assets
            const staticPromise = cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Some static assets failed to cache:', err);
            });

            // Try to cache CDN assets (may fail due to CORS)
            const cdnPromises = CDN_ASSETS.map(url =>
                fetch(url, { mode: 'cors' })
                    .then(response => {
                        if (response.ok) {
                            return cache.put(url, response);
                        }
                    })
                    .catch(() => console.warn('[SW] Could not cache:', url))
            );

            return Promise.all([staticPromise, ...cdnPromises]);
        }).then(() => {
            console.log('[SW] Installation complete!');
            return self.skipWaiting(); // Activate immediately
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete!');
            return self.clients.claim(); // Take control of all pages
        })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        // Try network first
        fetch(event.request)
            .then((response) => {
                // If successful, clone and cache the response
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        // If it's a navigation request, return the cached index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }

                        // Return offline fallback for other requests
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({ 'Content-Type': 'text/plain' })
                        });
                    });
            })
    );
});

// Message event - for cache updates
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});

console.log('[SW] Service Worker loaded');
