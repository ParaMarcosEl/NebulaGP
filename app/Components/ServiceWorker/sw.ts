/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;


// sw.ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(fetch(event.request));
});
