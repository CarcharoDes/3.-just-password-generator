const CACHE_NAME = 'j_pgen-v0.3.2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Розумне динамічне кешування (працює під будь-які назви файлів)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Якщо файл вже в пам'яті — беремо його (для офлайну)
      }
      return fetch(e.request).then((response) => {
        // Перевіряємо, чи запит успішний, і зберігаємо його в кеш на майбутнє
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      // Заглушка на випадок повної відсутності мережі для некешованих файлів
    })
  );
});

