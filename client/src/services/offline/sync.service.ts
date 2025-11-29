/**
 * Serviço de Sincronização Offline
 * Gerencia fila de operações pendentes e sincronização automática
 */

interface PendingRound {
  id?: number;
  data: {
    docAnterior: string;
    transcricao: string;
    apiKeys: {
      cerebras?: string;
      deepseek?: string;
      groq?: string;
      qwen?: string;
    };
    timestamp: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  retryCount: number;
}

class SyncService {
  private dbName = 'RounderDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
    this.setupOnlineListener();
  }

  /**
   * Inicializa IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB inicializado');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar object stores
        if (!db.objectStoreNames.contains('pending_rounds')) {
          db.createObjectStore('pending_rounds', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('cached_rounds')) {
          const roundsStore = db.createObjectStore('cached_rounds', { keyPath: 'id' });
          roundsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('cached_rules')) {
          db.createObjectStore('cached_rules', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('cached_profile')) {
          db.createObjectStore('cached_profile', { keyPath: 'user_id' });
        }

        if (!db.objectStoreNames.contains('cached_api_keys')) {
          db.createObjectStore('cached_api_keys', { keyPath: 'user_id' });
        }

        if (!db.objectStoreNames.contains('pending_uploads')) {
          db.createObjectStore('pending_uploads', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Configura listener para detectar quando volta online
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('Conexão restabelecida! Iniciando sincronização...');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('Conexão perdida. Modo offline ativado.');
    });
  }

  /**
   * Adiciona round à fila de processamento
   */
  async addPendingRound(roundData: PendingRound['data']): Promise<number> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_rounds', 'readwrite');
      const store = tx.objectStore('pending_rounds');

      const pendingRound: PendingRound = {
        data: roundData,
        status: 'pending',
        retryCount: 0
      };

      const request = store.add(pendingRound);

      request.onsuccess = () => {
        const id = request.result as number;
        console.log('Round adicionado à fila:', id);
        
        // Tentar sincronizar imediatamente se estiver online
        if (navigator.onLine) {
          this.syncPendingRounds();
        }
        
        resolve(id);
      };

      request.onerror = () => {
        console.error('Erro ao adicionar round à fila:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Busca todos os rounds pendentes
   */
  async getPendingRounds(): Promise<PendingRound[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_rounds', 'readonly');
      const store = tx.objectStore('pending_rounds');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Sincroniza todos os rounds pendentes
   */
  async syncPendingRounds(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline - sincronização adiada');
      return;
    }

    const pendingRounds = await this.getPendingRounds();
    console.log(`Sincronizando ${pendingRounds.length} rounds pendentes...`);

    for (const round of pendingRounds) {
      try {
        // Atualizar status para processing
        await this.updateRoundStatus(round.id!, 'processing');

        // Processar round (chamar API)
        // TODO: Integrar com serviço de processamento de rounds
        // const result = await processRound(round.data);

        // Simular processamento por enquanto
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Remover da fila se sucesso
        await this.removePendingRound(round.id!);
        console.log('Round sincronizado:', round.id);

      } catch (error) {
        console.error('Erro ao sincronizar round:', error);
        
        // Incrementar contador de tentativas
        await this.incrementRetryCount(round.id!);
        
        // Se passou de 3 tentativas, marcar como erro
        if (round.retryCount >= 3) {
          await this.updateRoundStatus(round.id!, 'error', String(error));
        }
      }
    }
  }

  /**
   * Atualiza status de um round pendente
   */
  private async updateRoundStatus(
    id: number,
    status: PendingRound['status'],
    error?: string
  ): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_rounds', 'readwrite');
      const store = tx.objectStore('pending_rounds');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const round = getRequest.result;
        if (round) {
          round.status = status;
          if (error) round.error = error;
          
          const updateRequest = store.put(round);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Incrementa contador de tentativas
   */
  private async incrementRetryCount(id: number): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_rounds', 'readwrite');
      const store = tx.objectStore('pending_rounds');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const round = getRequest.result;
        if (round) {
          round.retryCount = (round.retryCount || 0) + 1;
          
          const updateRequest = store.put(round);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove round da fila
   */
  private async removePendingRound(id: number): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_rounds', 'readwrite');
      const store = tx.objectStore('pending_rounds');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cacheia round processado
   */
  async cacheRound(round: any): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cached_rounds', 'readwrite');
      const store = tx.objectStore('cached_rounds');
      
      const roundWithTimestamp = {
        ...round,
        timestamp: Date.now()
      };
      
      const request = store.put(roundWithTimestamp);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca rounds cacheados
   */
  async getCachedRounds(limit: number = 10): Promise<any[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cached_rounds', 'readonly');
      const store = tx.objectStore('cached_rounds');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const rounds: any[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          rounds.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(rounds);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sincroniza tudo
   */
  async syncAll(): Promise<void> {
    console.log('Iniciando sincronização completa...');
    
    try {
      await this.syncPendingRounds();
      console.log('Sincronização completa!');
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  }

  /**
   * Verifica status de sincronização
   */
  async getSyncStatus(): Promise<{
    hasPending: boolean;
    pendingCount: number;
    isOnline: boolean;
  }> {
    const pendingRounds = await this.getPendingRounds();
    
    return {
      hasPending: pendingRounds.length > 0,
      pendingCount: pendingRounds.length,
      isOnline: navigator.onLine
    };
  }

  /**
   * Limpa cache antigo (manter apenas últimos 30 dias)
   */
  async cleanOldCache(): Promise<void> {
    if (!this.db) await this.initDB();

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cached_rounds', 'readwrite');
      const store = tx.objectStore('cached_rounds');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(thirtyDaysAgo);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('Cache antigo limpo');
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const syncService = new SyncService();
