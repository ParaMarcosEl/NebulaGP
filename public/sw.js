self.addEventListener('install', () => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through, can add caching here
  event.respondWith(fetch(event.request));
});
