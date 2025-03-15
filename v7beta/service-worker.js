// Service Worker - Bildirimler ve PWA desteği için

const CACHE_NAME = 'v1x7-app-cache-v2'; // Versiyon numarasını artırarak önbellek sorununu çöz
const BASE_PATH = '/v7beta'; // Temel yol ayarı
const ASSETS_TO_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/messages.html',
  BASE_PATH + '/profile.html',
  BASE_PATH + '/settings.html',
  BASE_PATH + '/friends.html',
  BASE_PATH + '/css/style.css',
  BASE_PATH + '/css/theme-styles.css',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/js/firebase-config.js',
  BASE_PATH + '/js/theme-utils.js',
  BASE_PATH + '/js/theme-manager.js',
  BASE_PATH + '/assets/images/logo(192).png'
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
      .then(() => self.skipWaiting()) // Force yeni service worker'ın hemen aktifleşmesi
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
    }).then(() => {
      // Client'ları hemen ele geçir
      return self.clients.claim();
    })
  );
});

// Ağ isteklerini yakalama ve önbellek kontrolü
self.addEventListener('fetch', event => {
  // v7beta klasörüne ait istekleri yönet
  if (event.request.url.includes(self.location.origin + BASE_PATH)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Yanıt başarılıysa, önbelleğe kopyala
          if (response && response.status === 200 && response.type === 'basic' && event.request.method !== 'POST') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Ağ hatası durumunda önbellekten dene
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Navigate istekleri için index.html'e yönlendir
              if (event.request.mode === 'navigate') {
                return caches.match(BASE_PATH + '/index.html');
              }
              
              // Diğer durumlarda hata mesajı döndür
              return new Response('Ağ bağlantısı yok', { 
                status: 503, 
                statusText: 'Ağ bağlantısı yok' 
              });
            });
        })
    );
  } else {
    // v7beta dışındaki içerik için normal fetch işlemi yap
    event.respondWith(fetch(event.request));
  }
});

// Push bildirimleri
self.addEventListener('push', event => {
  console.log('Push bildirimi alındı:', event);
  
  let notificationData = {
    title: 'YKSMate Bildirimi',
    message: 'Yeni bir bildiriminiz var',
    url: BASE_PATH + '/messages.html',
    id: Date.now().toString() // Benzersiz ID ekle
  };
  
  if (event.data) {
    try {
      notificationData = event.data.json();
      // ID yoksa ekle
      if (!notificationData.id) {
        notificationData.id = Date.now().toString();
      }
      
      // URL'ye base path ekle eğer başında yoksa
      if (notificationData.url && !notificationData.url.startsWith(BASE_PATH)) {
        notificationData.url = BASE_PATH + notificationData.url;
      }
    } catch (e) {
      console.error('Push verisi JSON olarak ayrıştırılamadı:', e);
      notificationData.message = event.data.text();
    }
  }
  
  // Bildirim geçmişini kontrol et
  const checkNotificationHistory = async () => {
    // IndexedDB'de bildirim geçmişini sakla
    const db = await openNotificationsDB();
    const tx = db.transaction('notifications', 'readwrite');
    const store = tx.objectStore('notifications');
    
    // Bildirim daha önce gösterilmiş mi kontrol et
    const existingNotification = await store.get(notificationData.id);
    
    if (existingNotification) {
      console.log('Bu bildirim daha önce gösterilmiş, tekrar gösterilmeyecek:', notificationData.id);
      return false;
    }
    
    // Yeni bildirimi kaydet
    await store.put({
      id: notificationData.id,
      timestamp: Date.now()
    });
    
    // Eski bildirimleri temizle (son 50 bildirimi tut)
    const allNotifications = await store.getAll();
    if (allNotifications.length > 50) {
      // Zaman damgasına göre sırala
      allNotifications.sort((a, b) => b.timestamp - a.timestamp);
      
      // Eski bildirimleri sil
      for (let i = 50; i < allNotifications.length; i++) {
        await store.delete(allNotifications[i].id);
      }
    }
    
    await tx.complete;
    return true;
  };
  
  event.waitUntil(
    checkNotificationHistory().then(shouldShow => {
      if (!shouldShow) return;
      
      const options = {
        body: notificationData.message,
        icon: BASE_PATH + '/assets/images/logo(192).png',
        badge: BASE_PATH + '/assets/images/logo(192).png',
        vibrate: [100, 50, 100, 50, 100],
        data: {
          url: notificationData.url || (BASE_PATH + '/messages.html'),
          timestamp: Date.now(),
          senderId: notificationData.senderId || '',
          id: notificationData.id
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
        ],
        tag: notificationData.id,
        renotify: false
      };
      
      return self.registration.showNotification(notificationData.title, options);
    })
  );
});

// IndexedDB açma fonksiyonu
function openNotificationsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notifications-db', 1);
    
    request.onerror = event => {
      console.error('IndexedDB açılamadı:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        const store = db.createObjectStore('notifications', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Bildirime tıklama
self.addEventListener('notificationclick', event => {
  console.log('Bildirime tıklandı:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data.url || (BASE_PATH + '/messages.html');
  const fullUrl = self.location.origin + urlToOpen;
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(windowClients => {
        // Açık bir pencere varsa, onu odakla
        for (const client of windowClients) {
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Açık pencere yoksa, yeni bir pencere aç
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
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