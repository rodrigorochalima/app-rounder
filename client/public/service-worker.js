const CACHE_NAME = 'rounder-v1';
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
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache aberto');
      return cache.addAll(ESSENTIAL_FILES);
    })
  );
  
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requisições para APIs externas
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && !url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se tem no cache, retorna
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não tem, busca na rede
      return fetch(event.request)
        .then((response) => {
          // Não cachear respostas inválidas
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clonar resposta (pode ser usada apenas uma vez)
          const responseToCache = response.clone();

          // Adicionar ao cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Se falhar, retornar página offline
          return caches.match(OFFLINE_URL);
        });
    })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronização em background:', event.tag);
  
  if (event.tag === 'sync-rounds') {
    event.waitUntil(syncPendingRounds());
  }
});

// Função para sincronizar rounds pendentes
async function syncPendingRounds() {
  try {
    console.log('[SW] Sincronizando rounds pendentes...');
    
    // Abrir IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending_rounds', 'readonly');
    const store = tx.objectStore('pending_rounds');
    const pendingRounds = await store.getAll();
    
    console.log('[SW] Rounds pendentes:', pendingRounds.length);
    
    // Processar cada round pendente
    for (const round of pendingRounds) {
      try {
        // Enviar para API
        const response = await fetch('/api/process-round', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(round.data)
        });
        
        if (response.ok) {
          // Remover da fila se sucesso
          const deleteTx = db.transaction('pending_rounds', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_rounds');
          await deleteStore.delete(round.id);
          console.log('[SW] Round sincronizado:', round.id);
        }
      } catch (error) {
        console.error('[SW] Erro ao sincronizar round:', error);
      }
    }
    
    console.log('[SW] Sincronização concluída');
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

// Abrir IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RounderDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Criar object stores se não existirem
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

// Notificar cliente sobre status de sincronização
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_SYNC_STATUS') {
    checkSyncStatus().then((status) => {
      event.ports[0].postMessage(status);
    });
  }
});

async function checkSyncStatus() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_rounds', 'readonly');
    const store = tx.objectStore('pending_rounds');
    const count = await store.count();
    
    return {
      hasPending: count > 0,
      pendingCount: count
    };
  } catch (error) {
    return {
      hasPending: false,
      pendingCount: 0,
      error: error.message
    };
  }
}
