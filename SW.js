// ATU Pathfinder Service Worker - Version 1.1.0
const CACHE_NAME = 'atu-pathfinder-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html'
];

// 1. Install Event: Cache all critical static resources for offline access
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell and static assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Force immediate activation
    );
});

// 2. Activate Event: Clean up any outdated caches to prevent serving stale maps
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache registry:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all open clients immediately
    );
});

// 3. Fetch Event: Serve cached assets immediately (Cache-First, Fallback to Network)
self.addEventListener('fetch', (event) => {
    // Only intercept local HTTP/HTTPS requests
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return the resource from cache immediately
                        return cachedResponse;
                    }

                    // Fallback to network if not in cache, and dynamically cache the new asset
                    return fetch(event.request).then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        return networkResponse;
                    });
                }).catch(() => {
                    // Optional offline fallback for resources not in cache
                    console.log('[Service Worker] Resource request failed offline.');
                })
        );
    }
});