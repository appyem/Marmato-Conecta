// ✅ offline/db.ts - Versión simplificada sin dependencias de tipos complejos
// Funcionalidad offline básica para brigadistas

const DB_NAME = 'conecta-marmato-offline';
const DB_VERSION = 1;
const STORE_QUEUE = 'offlineQueue';
const STORE_CACHE = 'cachedData';

// Tipos simples para nuestros datos
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

export interface CachedEntry {
  key: string; // format: "collection/docId"
  data: Record<string, unknown>;
  expiresAt: number;
}

// ✅ Función helper para abrir la DB con promesas nativas
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queue = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        queue.createIndex('synced', 'synced');
        queue.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ✅ Queue: agregar operación pendiente
export async function queueOperation(
  type: 'create' | 'update' | 'delete',
  collection: string,
  docId: string,
  data?: Record<string, unknown>
): Promise<string> {
  const db = await openDB();
  const id = `${collection}/${docId}/${Date.now()}`;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    
    const operation: OfflineOperation = {
      id,
      type,
      collection,
      docId,
      data,
      timestamp: Date.now(),
      synced: false
    };
    
    const request = store.add(operation);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// ✅ Queue: obtener operaciones pendientes
export async function getPendingOperations(): Promise<OfflineOperation[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_QUEUE);
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));
    
    request.onsuccess = () => {
      resolve((request.result as OfflineOperation[]) || []);
    };
    request.onerror = () => reject(request.error);
  });
}

// ✅ Queue: marcar como sincronizada
export async function markAsSynced(operationId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const request = store.get(operationId);
    
    request.onsuccess = () => {
      const operation = request.result as OfflineOperation;
      if (operation) {
        const updateRequest = store.put({ ...operation, synced: true });
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve(); // Ya no existe, consideramos éxito
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ✅ Cache: guardar dato
export async function cacheData(
  collection: string, 
  docId: string, 
  data: Record<string, unknown>, 
  ttlHours = 24
): Promise<void> {
  const db = await openDB();
  const key = `${collection}/${docId}`;
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    
    const entry: CachedEntry = {
      key,
      data,
      expiresAt: Date.now() + (ttlHours * 60 * 60 * 1000)
    };
    
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ✅ Cache: obtener dato
export async function getCachedData(
  collection: string, 
  docId: string
): Promise<Record<string, unknown> | null> {
  const db = await openDB();
  const key = `${collection}/${docId}`;
  
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CACHE, 'readonly');
    const store = tx.objectStore(STORE_CACHE);
    const request = store.get(key);
    
    request.onsuccess = () => {
      const entry = request.result as CachedEntry;
      
      if (entry && entry.expiresAt > Date.now()) {
        resolve(entry.data);
      } else {
        // Limpiar entry expirado si existe
        if (entry) {
          const deleteTx = db.transaction(STORE_CACHE, 'readwrite');
          deleteTx.objectStore(STORE_CACHE).delete(key);
        }
        resolve(null);
      }
    };
    
    request.onerror = () => resolve(null); // Fail-safe: retornar null en error
  });
}

// ✅ Cache: limpiar expirados (opcional, llamar periódicamente)
export async function clearExpiredCache(): Promise<void> {
  const db = await openDB();
  const now = Date.now();
  
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    const request = store.openCursor();
    
    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue;
      if (cursor) {
        const entry = cursor.value as CachedEntry;
        if (entry.expiresAt < now) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve(); // No más registros
      }
    };
    
    request.onerror = () => resolve(); // Fail-safe
  });
}

// ✅ Helper: verificar si hay conexión
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ✅ Helper: escuchar cambios de conexión
export function onConnectionChange(callback: (online: boolean) => void): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}