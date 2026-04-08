const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'conecta-marmato',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestVehicle() {
  const testVehicle = {
    placa: 'ABC123',
    conductor: 'Juan Pérez Test',
    telefono: '3001234567',
    departamento: 'CALDAS',
    isActive: true,
    documentos: [
      {
        type: 'SOAT',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Vence en 5 días
        lastAlertSent: {}
      },
      {
        type: 'Tecnomecánica',
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // Vence en 45 días
        lastAlertSent: {}
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'vehicles'), testVehicle);
    console.log('✅ Vehículo de prueba creado:', docRef.id);
    console.log('Placa:', testVehicle.placa);
    console.log('SOAT vence en: 5 días (debería generar alerta 🟠 urgente)');
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creando vehículo:', error);
  }
}

createTestVehicle();
