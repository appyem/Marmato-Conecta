import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Schema para IndexedDB
interface MarmatoDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      collection: string;
      docId: string;
      data?: any;
      timestamp: number;
      synced: boolean;
    };
  };
  cachedData: {
    key: string;
    value: {
      collection: string;
      docId: string;
      data: any;
      cachedAt: number;
      expiresAt: number;
    };
  };
}

const DB_NAME = 'conecta-marmato-offline';
const DB_VERSION = 1;

export async function initOfflineDB(): Promise<IDBPDatabase<MarmatoDB>> {
  return openDB<MarmatoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Queue para operaciones pendientes
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const queue = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        queue.createIndex('synced', 'synced');
        queue.createIndex('timestamp', 'timestamp');
      }
      
      // Cache para datos frecuentes
      if (!db.objectStoreNames.contains('cachedData')) {
        const cache = db.createObjectStore('cachedData', { keyPath: ['collection', 'docId'] });
        cache.createIndex('expiresAt', 'expiresAt');
      }
    },
  });
}

export async function queueOperation(
  type: 'create' | 'update' | 'delete',
  collection: string,
  docId: string,
  data?: any
): Promise<string> {
  const db = await initOfflineDB();
  const id = `${collection}/${docId}/${Date.now()}`;
  
  await db.add('offlineQueue', {
    id,
    type,
    collection,
    docId,
    data,
    timestamp: Date.now(),
    synced: false
  });
  
  return id;
}

export async function getPendingOperations(): Promise<Array<MarmatoDB['offlineQueue']['value']>> {
  const db = await initOfflineDB();
  return db.getAllFromIndex('offlineQueue', 'synced', false);
}

export async function markAsSynced(operationId: string): Promise<void> {
  const db = await initOfflineDB();
  const op = await db.get('offlineQueue', operationId);
  if (op) {
    await db.put('offlineQueue', { ...op, synced: true });
  }
}

export async function cacheData(collection: string, docId: string, data: any, ttlHours = 24): Promise<void> {
  const db = await initOfflineDB();
  const now = Date.now();
  
  await db.put('cachedData', {
    collection,
    docId,
    data,
    cachedAt: now,
    expiresAt: now + (ttlHours * 60 * 60 * 1000)
  });
}

export async function getCachedData(collection: string, docId: string): Promise<any | null> {
  const db = await initOfflineDB();
  const cached = await db.get('cachedData', [collection, docId]);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  // Limpiar cache expirado
  if (cached) {
    await db.delete('cachedData', [collection, docId]);
  }
  return null;
}