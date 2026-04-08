'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
  getPendingOperations, 
  markAsSynced, 
  queueOperation 
} from '@/offline/db';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export function useOfflineSync() {
  const { user } = useAuth();

  const syncPendingOperations = useCallback(async () => {
    if (!user) return;
    
    const pending = await getPendingOperations();
    if (pending.length === 0) return;

    // ✅ Usar batch o procesar individualmente
    for (const op of pending) {
      try {
        const ref = doc(db, op.collection, op.docId);
        
        switch (op.type) {
          case 'create':
            await setDoc(ref, { ...op.data, syncedAt: new Date() });
            break;
          case 'update':
            await updateDoc(ref, { ...op.data, syncedAt: new Date() });
            break;
          case 'delete':
            await deleteDoc(ref);
            break;
        }
        
        await markAsSynced(op.id);
        console.log(`✅ Synced: ${op.collection}/${op.docId}`);
      } catch (error: unknown) {
        console.error(`❌ Failed to sync ${op.id}:`, (error as Error).message);
      }
    }
  }, [user]);


  // Escuchar cambios de conexión
  useEffect(() => {
    const handleOnline = () => syncPendingOperations();
    const handleOffline = () => console.log('📴 Modo offline activado');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Intentar sincronizar al montar
    if (navigator.onLine) {
      syncPendingOperations();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingOperations]);

  // Función para guardar con soporte offline
  const saveWithOfflineSupport = useCallback(async (
    collection: string,
    docId: string,
    data: Record<string, unknown>, // ✅ Tipo seguro
    operation: 'create' | 'update' = 'create'
  ) => {
    if (navigator.onLine && user) {
      // Guardar directamente en Firestore
      const ref = doc(db, collection, docId);
      if (operation === 'create') {
        await setDoc(ref, { ...data, createdAt: new Date(), updatedAt: new Date() });
      } else {
        await updateDoc(ref, { ...data, updatedAt: new Date() });
      }
    } else {
      // Encolar para sincronización posterior
      await queueOperation(operation, collection, docId, data);
      console.log('💾 Guardado offline - se sincronizará al recuperar conexión');
    }
  }, [user]);

  return {
    saveWithOfflineSupport,
    syncPendingOperations,
    isOnline: navigator.onLine
  };
}