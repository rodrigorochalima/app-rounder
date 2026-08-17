import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registrado:', registration);
          
          // Verificar atualizações
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  if (confirm('Nova versão disponível! Atualizar agora?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Erro ao registrar Service Worker:', error);
        });
    }

    // Listeners de conexão
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Conexão restabelecida');
      
      // Tentar sincronizar
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          const backgroundSync = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
          return backgroundSync?.register('sync-rounds');
        }).catch((error) => {
          console.error('Erro ao registrar sincronização:', error);
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Conexão perdida - modo offline ativado');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar status de sincronização periodicamente
    const checkSyncStatus = async () => {
      try {
        const db = await openDB();
        const tx = db.transaction('pending_rounds', 'readonly');
        const store = tx.objectStore('pending_rounds');
        const count = await new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        setHasPendingSync(count > 0);
        setPendingCount(count);
      } catch (error) {
        // IndexedDB ainda não inicializado
      }
    };

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000); // Verificar a cada 5s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    hasPendingSync,
    pendingCount
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RounderDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
