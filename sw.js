// ATU Pathfinder Service Worker - Bulletproof Offline v1.3
const CACHE_NAME = 'atu-pathfinder-v3';
const ASSETS_TO_CACHE = [
    'index.html',
    './',
    './index.html'
];

// Install Event: Force cache the essential files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Force caching assets');
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (!response.ok) throw new Error(`Request failed for ${url}`);
                                return cache.put(url, response);
                            })
                            .catch(err => console.warn(`[Service Worker] Skipping optional asset: ${url}`, err));
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event: Clear out every single old cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    console.log('[Service Worker] Deleting old cache:', cache);
                    return caches.delete(cache);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Cache-First Strategy with Network Fallback (Perfect for Offline Apps)
self.addEventListener('fetch', (event) => {
    // Only handle standard GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // If found in cache, serve it immediately (instant offline load)
                return cachedResponse;
            }

            // If not in cache, go to network
            return fetch(event.request)
                .then((networkResponse) => {
                    // Dynamically add successfully fetched assets to cache
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // If network fails completely (OFFLINE fallback)
                    if (event.request.mode === 'navigate') {
                        return caches.match('index.html') || caches.match('./index.html');
                    }
                });
        })
    );
});