const CACHE_NAME = 'rounder-v2';
const OFFLINE_URL = '/offline.html';

// Arquivos essenciais para cache
const ESSENTIAL_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/logo.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ESSENTIAL_FILES);
    })
  );
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// WEB SHARE TARGET — recebe arquivos compartilhados via iOS/Android
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Interceptar POST para /share-target
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Ignorar requisições que não são GET para outras rotas
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requisições para APIs externas
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL);
        });
    })
  );
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const text = formData.get('text');
    const title = formData.get('title');

    // Guardar no IndexedDB para o cliente recuperar
    const sharedData = {
      timestamp: Date.now(),
      text: text || title || '',
      fileName: file ? file.name : '',
      fileType: file ? file.type : '',
      fileSize: file ? file.size : 0
    };

    // Se tem arquivo, converter para ArrayBuffer e guardar
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      sharedData.fileData = Array.from(new Uint8Array(arrayBuffer));
    }

    // Salvar no cache para o cliente recuperar
    const cache = await caches.open('rounder-share-target');
    await cache.put(
      '/pending-share',
      new Response(JSON.stringify(sharedData), {
        headers: { 'Content-Type': 'application/json' }
      })
    );

    // Notificar todos os clientes abertos
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SHARE_TARGET_RECEIVED', data: sharedData });
    }

    // Redirecionar para a página principal com flag
    return Response.redirect('/?shared=1', 303);
  } catch (err) {
    console.error('[SW] Erro no share target:', err);
    return Response.redirect('/', 303);
  }
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Cliente pedindo dados do share target pendente
  if (event.data && event.data.type === 'GET_PENDING_SHARE') {
    caches.open('rounder-share-target').then(async (cache) => {
      const response = await cache.match('/pending-share');
      if (response) {
        const data = await response.json();
        // Limpar após entregar
        await cache.delete('/pending-share');
        event.source.postMessage({ type: 'PENDING_SHARE_DATA', data });
      } else {
        event.source.postMessage({ type: 'PENDING_SHARE_DATA', data: null });
      }
    });
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-rounds') {
    event.waitUntil(syncPendingRounds());
  }
});

async function syncPendingRounds() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_rounds', 'readonly');
    const store = tx.objectStore('pending_rounds');
    const pendingRounds = await store.getAll();
    for (const round of pendingRounds) {
      try {
        const response = await fetch('/api/process-round', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(round.data)
        });
        if (response.ok) {
          const deleteTx = db.transaction('pending_rounds', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_rounds');
          await deleteStore.delete(round.id);
        }
      } catch (error) {
        console.error('[SW] Erro ao sincronizar round:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RounderDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_rounds')) {
        db.createObjectStore('pending_rounds', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached_rounds')) {
        db.createObjectStore('cached_rounds', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_rules')) {
        db.createObjectStore('cached_rules', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_profile')) {
        db.createObjectStore('cached_profile', { keyPath: 'user_id' });
      }
    };
  });
}
