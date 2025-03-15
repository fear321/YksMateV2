// Service Worker - Bildirimler ve PWA desteği için

const CACHE_NAME = 'v1x6-app-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/img/logo.png'
];

// Service Worker kurulumu
self.addEventListener('install', event => {
  console.log('Service Worker kurulumu başladı');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Önbellek açıldı');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Service Worker aktifleştirilmesi
self.addEventListener('activate', event => {
  console.log('Service Worker aktifleştirildi');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek temizleniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Ağ isteklerini yakalama
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Önbellekte varsa, önbellekten döndür
        if (response) {
          return response;
        }
        
        // Önbellekte yoksa, ağdan al ve önbelleğe ekle
        return fetch(event.request).then(response => {
          // Geçersiz yanıt veya POST isteği ise önbelleğe ekleme
          if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method === 'POST') {
            return response;
          }
          
          // Yanıtın bir kopyasını önbelleğe ekle
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
  );
});

// Push bildirimleri
self.addEventListener('push', event => {
  console.log('Push bildirimi alındı:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message || 'Yeni bir bildiriminiz var',
      icon: '/img/logo.png',
      badge: '/img/badge.png',
      data: {
        url: data.url || '/messages.html'
      },
      actions: [
        {
          action: 'open',
          title: 'Görüntüle'
        },
        {
          action: 'close',
          title: 'Kapat'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Yeni Mesaj', options)
    );
  }
});

// Bildirime tıklama
self.addEventListener('notificationclick', event => {
  console.log('Bildirime tıklandı:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const url = event.notification.data.url || '/messages.html';
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(windowClients => {
        // Açık bir pencere varsa, onu odakla
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Açık pencere yoksa, yeni bir pencere aç
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Bildirim kapatma
self.addEventListener('notificationclose', event => {
  console.log('Bildirim kapatıldı:', event);
});

// Arka plan senkronizasyonu
self.addEventListener('sync', event => {
  console.log('Arka plan senkronizasyonu:', event);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Mesajları senkronize et
function syncMessages() {
  // Burada mesajları senkronize etmek için gerekli kodlar olacak
  // Örneğin, IndexedDB'den bekleyen mesajları alıp sunucuya gönderme
  return Promise.resolve();
} 