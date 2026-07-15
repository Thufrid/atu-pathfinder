// ATU Pathfinder Service Worker - Stable Offline v1.2
const CACHE_NAME = 'atu-pathfinder-v2';

// We cache the bare minimum required to render the map offline
const ASSETS_TO_CACHE = [
    './',
    './index.html'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching core assets...');
                // Using map/catch to prevent the entire install from failing if one asset has a path issue
                return Promise.all(
                    ASSETS_TO_CACHE.map((url) => {
                        return cache.add(url).catch((err) => {
                            console.error(`[Service Worker] Failed to cache: ${url}`, err);
                        });
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Cleans up old cache files
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network first, falling back to offline cache
self.addEventListener('fetch', (event) => {
    // Only intercept local GET requests
    if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // If network works, duplicate the response into the cache
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // If network fails (OFFLINE), look for it in the cache
                    console.log('[Service Worker] Offline mode active. Serving from cache:', event.request.url);
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Fallback fallback: if index.html is requested but not matched exactly
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
                })
        );
    }
});