const CACHE_NAME = 'badminton-hub-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/app.css',
    '/favicon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/_content/MudBlazor/MudBlazor.min.css',
    '/_content/MudBlazor/MudBlazor.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Basic network-first strategy for Blazor Server (requires active connection, falls back to offline assets)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/');
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
