const CACHE_NAME = 'fittrack-cache-v20';

// Use relative paths so the SW works both on localhost AND on GitHub Pages (/fittrack/)
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/auth.js',
  './js/ui.js',
  './js/timer.js',
  './js/dialog.js',
  './js/toast.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install Event: Pre-cache all app shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      // addAll can fail if any resource 404s; we use individual add to be resilient
      return Promise.allSettled(ASSETS.map(asset => cache.add(asset)));
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Serve from cache, fall back to network
self.addEventListener('fetch', (e) => {
  // Bypass Service Worker completely for the test runner and any requests initiated by it
  const url = e.request.url;
  const referer = e.request.referrer || '';
  if (
    url.includes('test.html') ||
    url.includes('tests/') ||
    referer.includes('test.html')
  ) {
    return; // Force direct network request
  }

  // Only cache same-origin GET requests
  if (e.request.method !== 'GET' || !url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Firebase, CDN, and other external requests
  if (
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('code.jquery.com')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache cloned response for future offline visits
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
