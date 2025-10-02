/* eslint-disable no-restricted-globals */

// --- CACHE & DB CONFIG ---
const CACHE_NAME = 'story-app-cache-v1';
const DATA_CACHE_NAME = 'story-app-data-v1'; 
const DB_NAME = 'StoryAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline-stories';
const API_BASE_URL = 'https://story-api.dicoding.dev/v1'; // Pastikan base URL ini benar!
const STORY_API_URL = `${API_BASE_URL}/stories`;

const urlsToCache = [
  '/', 
  '/index.html',
  '/manifest.json',
  // Pastikan path icons benar (sesuai build output)
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Aset Leaflet untuk Offline
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache).catch((err) => console.log('Cache add failed:', err)))
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
            return caches.delete(name);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Handler (C3: Caching Dinamis)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // --- Strategy: Stale-While-Revalidate untuk Data API (/stories) ---
  if (event.request.url.includes(STORY_API_URL) && !event.request.url.includes('push-subscribe')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        // Fetch baru di background
        const networkFetch = fetch(event.request)
          .then(async (response) => {
            if (response.status === 200 || response.type === 'opaque') {
              await cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch((err) => {
            console.log('[SW] Network failed for API:', err);
            throw err; 
          });
        
        // Return cache yang sudah ada (Offline Support) atau tunggu network
        return cachedResponse || networkFetch.catch(() => caches.match('/index.html')); 
      })
    );
    return;
  }

  // --- Strategy: Cache Falling Back to Network (Aset Statis) ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html')); // fallback offline shell
    })
  );
});


// ---------------------------------------------------------------------
// --- OFFLINE SYNC HANDLERS (Kriteria 4: IndexedDB & Sync) ---
// ---------------------------------------------------------------------

// Helper: IndexedDB minimal di Service Worker
async function getOfflineStoriesSW() {
  // Implementasi IndexedDB untuk mendapatkan semua story offline
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      // Asumsi semua data di store adalah data yang belum di-sync
      const getAllRequest = store.getAll(); 
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

async function deleteOfflineStorySW(id) {
  // Implementasi IndexedDB untuk menghapus story
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => resolve(true);
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

// Helper: Konversi Base64 ke File/Blob
const dataURLToBlob = (dataurl, filename) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// Helper: Mendapatkan Token dari Client
function getTokenFromClient() {
    return new Promise(resolve => {
        const tokenListener = (event) => {
            if (event.data && event.data.type === 'TOKEN_RESPONSE') {
                self.removeEventListener('message', tokenListener);
                resolve(event.data.token);
            }
        };
        self.addEventListener('message', tokenListener);
        
        // Kirim permintaan ke semua window client
        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clientList => {
            if (clientList.length > 0) {
                // Pilih client yang visible untuk memastikan token fresh
                const client = clientList.find(c => c.visibilityState === 'visible') || clientList[0];
                client.postMessage({ type: 'REQUEST_TOKEN' }); 
            } else {
                resolve(null);
            }
        });
        
        // Timeout
        setTimeout(() => {
            self.removeEventListener('message', tokenListener);
            resolve(null);
        }, 8000); 
    });
}

// --- Sync Handler ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-stories') {
    console.log('SW: Triggering sync-offline-stories');
    event.waitUntil(syncOfflineStories());
  }
});

async function syncOfflineStories() {
  const stories = await getOfflineStoriesSW().catch((e) => {
    console.error('Error getting offline stories:', e);
    return [];
  });
  
  if (stories.length === 0) return;

  const token = await getTokenFromClient(); 

  if (!token) {
    console.error('Token is missing, cannot sync stories. Will retry on next sync event.');
    self.registration.showNotification('Sync Pending', {
      body: 'Offline stories pending. Please ensure you are logged in.',
      icon: '/icons/icon-192.png'
    });
    // Penting: Throw error agar SW mencoba lagi (retry)
    throw new Error('Missing token for sync'); 
  }

  for (const story of stories) {
    try {
      const formData = new FormData();
      formData.append('description', story.description);
      
      const photoFile = dataURLToBlob(story.photoBase64, `offline_${story.id}.jpg`);
      formData.append('photo', photoFile);

      if (story.lat) formData.append('lat', story.lat);
      if (story.lon) formData.append('lon', story.lon);

      const response = await fetch(STORY_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        await deleteOfflineStorySW(story.id);
        self.registration.showNotification('✅ Sync Success', {
          body: `Story: ${story.description.substring(0, 30)}... successfully uploaded.`,
          icon: '/icons/icon-192.png'
        });
      } else {
        // Jika status 401/403 (Unauthorized/Forbidden)
        if (response.status === 401 || response.status === 403) {
          self.registration.showNotification('⚠️ Sync Failed: Login Expired', {
            body: 'Please re-login. Story removed as it cannot be synced.',
            icon: '/icons/icon-192.png'
          });
          await deleteOfflineStorySW(story.id); 
          break; // Stop sync loop
        }
        // Error server lain, throw untuk retry
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (err) {
      console.error(`Error during sync process for story ${story.id}:`, err);
      // Throw error agar SW mencoba lagi (retry)
      throw err;
    }
  }
}


// ---------------------------------------------------------------------
// --- PUSH NOTIFICATION HANDLERS (Kriteria 2) ---
// ---------------------------------------------------------------------

// Push Notification Handler 
self.addEventListener('push', (event) => {
  let data = event.data ? event.data.json() : {};

  const title = data.title || 'New Story Notification';
  const options = {
    body: data.body || 'Ada cerita baru yang menarik!',
    icon: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      id: data.storyId || null, // ID story dari payload API
      url: data.storyId ? `/#/detail/${data.storyId}` : '/#/home',
    },
    // Action untuk navigasi ke detail (Kriteria C2)
    actions: [
      {
        action: 'open_detail',
        title: 'Lihat Cerita',
        icon: '/icons/icon-72.png',
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click (Kriteria C2: Navigasi Action)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let targetUrl = event.notification.data.url || '/#/home';

  // Jika user klik action 'open_detail'
  if (event.action === 'open_detail' && event.notification.data?.id) {
    targetUrl = `/#/detail/${event.notification.data.id}`;
  }

  // Cari klien yang sudah terbuka atau buat tab baru
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        // Fokus ke tab yang sudah terbuka dan berisi URL target
        if (client.url.includes(targetUrl.split('#')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      // Buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});