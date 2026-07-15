// ATU Pathfinder Service Worker - Complete Multi-Page Offline v1.4
const CACHE_NAME = 'atu-pathfinder-v4';
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    './index.html',
    'qr-generator.html',
    './qr-generator.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all offline web pages...');
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (!response.ok) throw new Error(`Request failed for ${url}`);
                                return cache.put(url, response);
                            })
                            .catch(err => console.warn(`[Service Worker] Skipping: ${url}`, err));
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    console.log('[Service Worker] Flushing old cache storage:', cache);
                    return caches.delete(cache);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fail-safe router for offline subpage navigation
                    if (event.request.mode === 'navigate') {
                        if (event.request.url.includes('qr-generator.html')) {
                            return caches.match('qr-generator.html') || caches.match('./qr-generator.html');
                        }
                        return caches.match('index.html') || caches.match('./index.html');
                    }
                });
        })
    );
});
