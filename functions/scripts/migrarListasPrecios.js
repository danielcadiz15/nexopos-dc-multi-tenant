// functions/scripts/migrarListasPrecios.js
// Ejecutar este script una sola vez para migrar productos existentes

const admin = require('firebase-admin');

// Si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrarListasPrecios() {
  try {
    console.log('🔄 Iniciando migración de listas de precios...');
    
    const productosSnapshot = await db.collection('productos').get();
    const batch = db.batch();
    let contador = 0;
    
    productosSnapshot.forEach(doc => {
      const producto = doc.data();
      
      // Si no tiene listas_precios, crearlas
      if (!producto.listas_precios) {
        const precioBase = parseFloat(producto.precio_venta || 0);
        
        const nuevasListas = {
          mayorista: Number((precioBase * 0.85).toFixed(2)),  // 15% descuento
          interior: Number((precioBase * 1.15).toFixed(2)),   // 15% aumento
          posadas: precioBase                                  // Precio base
        };
        
        batch.update(doc.ref, {
          listas_precios: nuevasListas,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        contador++;
        console.log(`📝 Actualizando producto: ${producto.nombre || doc.id}`);
      }
    });
    
    if (contador > 0) {
      await batch.commit();
      console.log(`✅ Migración completada: ${contador} productos actualizados`);
    } else {
      console.log('✅ No hay productos para migrar');
    }
    
    return { success: true, actualizados: contador };
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  }
}

// Para ejecutar desde Firebase Functions (endpoint temporal)
exports.migrarListasPrecios = async (req, res) => {
  try {
    const resultado = await migrarListasPrecios();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Si se ejecuta directamente
if (require.main === module) {
  migrarListasPrecios()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}