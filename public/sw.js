// Service Worker Version
const SW_VERSION = '1.0.0';

// Cache names with version to allow easy updates
const STATIC_CACHE_NAME = `static-cache-v${SW_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-cache-v${SW_VERSION}`;
const ASSETS_CACHE_NAME = `assets-cache-v${SW_VERSION}`;
const API_CACHE_NAME = `api-cache-v${SW_VERSION}`;

// Resources that should be pre-cached
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Maximum number of items in the dynamic cache
const MAX_DYNAMIC_CACHE_ITEMS = 50;

// Install event - pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== STATIC_CACHE_NAME && 
              key !== DYNAMIC_CACHE_NAME && 
              key !== ASSETS_CACHE_NAME && 
              key !== API_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Helper function to limit cache size
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Delete oldest items
    await cache.delete(keys[0]);
    // Recursively trim until we're under limit
    await trimCache(cacheName, maxItems);
  }
}

// Determine which cache to use based on request URL
function getCacheNameForRequest(request) {
  const url = new URL(request.url);
  
  // API requests - short cache time
  if (url.pathname.includes('/rest/v1') || url.host.includes('supabase.co')) {
    return API_CACHE_NAME;
  }
  
  // Static assets - long cache time
  if (url.pathname.includes('/assets/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2')) {
    return ASSETS_CACHE_NAME;
  }
  
  // Everything else goes to dynamic cache
  return DYNAMIC_CACHE_NAME;
}

// Fetch event - network first with cache fallback for APIs, cache first for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip cross-origin requests and non-GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);
  const cacheName = getCacheNameForRequest(request);
  
  // For API/Supabase requests: Network first, then cache
  if (url.pathname.includes('/rest/v1') || url.host.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response to store in cache
          const clonedResponse = response.clone();
          
          // Only cache successful responses
          if (response.ok) {
            caches.open(cacheName)
              .then(cache => {
                cache.put(request, clonedResponse);
              });
          }
          
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request);
        })
    );
    return;
  }
  
  // For static assets: Cache first, then network
  if (cacheName === ASSETS_CACHE_NAME) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached response immediately
            return cachedResponse;
          }
          
          // If not in cache, fetch from network and cache
          return fetch(request)
            .then(response => {
              const clonedResponse = response.clone();
              caches.open(cacheName)
                .then(cache => {
                  cache.put(request, clonedResponse);
                });
              return response;
            });
        })
    );
    return;
  }
  
  // For all other requests: Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        // Clone the response to store in cache
        const clonedResponse = response.clone();
        
        caches.open(DYNAMIC_CACHE_NAME)
          .then(cache => {
            cache.put(request, clonedResponse);
            // Trim cache if it's too large
            trimCache(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_ITEMS);
          });
        
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If request is for a page/HTML route, return the offline page
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
            
            return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
          });
      })
  );
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

// Helper functions for background sync
async function syncPosts() {
  try {
    // Implementation would depend on how you store offline posts
    console.log('[Service Worker] Syncing posts');
  } catch (error) {
    console.error('[Service Worker] Post sync failed:', error);
  }
}

async function syncComments() {
  try {
    // Implementation would depend on how you store offline comments
    console.log('[Service Worker] Syncing comments');
  } catch (error) {
    console.error('[Service Worker] Comment sync failed:', error);
  }
} 