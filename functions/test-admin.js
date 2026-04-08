const admin = require('firebase-admin');

// Conectar al emulator de Firestore
admin.initializeApp({
  projectId: 'conecta-marmato'
});

const db = admin.firestore();
// Conectar al emulator
db.settings({ host: '127.0.0.1:8080', ssl: false });

async function createTestVehicle() {
  const vehicle = {
    placa: 'ABC123',
    conductor: 'Juan Pérez Test',
    telefono: '3001234567',
    departamento: 'CALDAS',
    isActive: true,
    documentos: [
      {
        type: 'SOAT',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastAlertSent: {}
      }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    const ref = await db.collection('vehicles').add(vehicle);
    console.log('✅ Vehículo creado:', ref.id);
    console.log('Placa:', vehicle.placa);
    console.log('SOAT vence en ~5 días');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createTestVehicle();
