// verificar-datos.js - SCRIPT PARA VERIFICAR Y LIMPIAR DATOS INCONSISTENTES
const admin = require('firebase-admin');

// 🔥 USA TU CLAVE EXISTENTE - cambia el nombre del archivo por el tuyo
const serviceAccount = require('./serviceAccountKey.json'); // Reemplaza con tu archivo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verificarYLimpiarDatos() {
  console.log('🔍 Verificando consistencia de datos...\n');
  
  try {
    // 1. VERIFICAR CLIENTES EXISTENTES
    console.log('📋 1. Verificando clientes...');
    const clientesSnapshot = await db.collection('clientes').get();
    const clientesExistentes = new Set();
    
    clientesSnapshot.forEach(doc => {
      clientesExistentes.add(doc.id);
    });
    
    console.log(`✅ Total de clientes encontrados: ${clientesExistentes.size}`);
    console.log('📄 IDs de clientes existentes:', Array.from(clientesExistentes));
    
    // 2. VERIFICAR VENTAS Y SUS REFERENCIAS A CLIENTES
    console.log('\n📋 2. Verificando ventas...');
    const ventasSnapshot = await db.collection('ventas').get();
    
    const clientesReferenciadosEnVentas = new Set();
    const ventasConClientesFaltantes = [];
    const ventasSinCliente = [];
    
    ventasSnapshot.forEach(doc => {
      const venta = doc.data();
      
      if (venta.cliente_id) {
        clientesReferenciadosEnVentas.add(venta.cliente_id);
        
        // Verificar si el cliente existe
        if (!clientesExistentes.has(venta.cliente_id)) {
          ventasConClientesFaltantes.push({
            id: doc.id,
            numero: venta.numero,
            cliente_id: venta.cliente_id,
            fecha: venta.fecha
          });
        }
      } else {
        ventasSinCliente.push({
          id: doc.id,
          numero: venta.numero,
          fecha: venta.fecha
        });
      }
    });
    
    console.log(`✅ Total de ventas: ${ventasSnapshot.size}`);
    console.log(`📄 Clientes referenciados en ventas: ${clientesReferenciadosEnVentas.size}`);
    console.log(`❌ Ventas con clientes faltantes: ${ventasConClientesFaltantes.length}`);
    console.log(`⚠️ Ventas sin cliente: ${ventasSinCliente.length}`);
    
    // 3. MOSTRAR PROBLEMAS ENCONTRADOS
    if (ventasConClientesFaltantes.length > 0) {
      console.log('\n🚨 VENTAS CON CLIENTES FALTANTES:');
      ventasConClientesFaltantes.forEach(venta => {
        console.log(`   - Venta ${venta.numero} (${venta.id}): cliente_id "${venta.cliente_id}" no existe`);
      });
    }
    
    // 4. CLIENTES HUÉRFANOS (referenciados pero no existentes)
    const clientesHuerfanos = [...clientesReferenciadosEnVentas].filter(id => !clientesExistentes.has(id));
    
    if (clientesHuerfanos.length > 0) {
      console.log('\n👻 CLIENTES HUÉRFANOS (referenciados pero no existen):');
      clientesHuerfanos.forEach(id => {
        console.log(`   - Cliente ID: "${id}"`);
      });
    }
    
    // 5. PROPONER SOLUCIONES
    console.log('\n💡 OPCIONES DE SOLUCIÓN:');
    
    if (ventasConClientesFaltantes.length > 0) {
      console.log('\n🔧 Opción 1: Crear clientes faltantes');
      console.log('   Se crearán clientes genéricos para los IDs faltantes');
      
      console.log('\n🔧 Opción 2: Limpiar referencias');
      console.log('   Se quitarán las referencias a clientes inexistentes');
      
      const respuesta = await preguntarOpcion();
      
      if (respuesta === '1') {
        await crearClientesFaltantes(clientesHuerfanos);
      } else if (respuesta === '2') {
        await limpiarReferenciasClientes(ventasConClientesFaltantes);
      }
    } else {
      console.log('✅ No se encontraron problemas de consistencia');
    }
    
    console.log('\n🎉 Verificación completada');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

async function crearClientesFaltantes(clientesIds) {
  console.log('\n🔧 Creando clientes faltantes...');
  
  const batch = db.batch();
  
  clientesIds.forEach((clienteId, index) => {
    const clienteRef = db.collection('clientes').doc(clienteId);
    const clienteData = {
      nombre: 'Cliente',
      apellido: `Recuperado ${index + 1}`,
      telefono: '',
      email: '',
      direccion: '',
      notas: 'Cliente creado automáticamente para mantener consistencia de datos',
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
      activo: true
    };
    
    batch.set(clienteRef, clienteData);
    console.log(`   ✅ Preparando cliente "${clienteId}": ${clienteData.nombre} ${clienteData.apellido}`);
  });
  
  await batch.commit();
  console.log(`✅ Se crearon ${clientesIds.length} clientes faltantes`);
}

async function limpiarReferenciasClientes(ventasConProblemas) {
  console.log('\n🧹 Limpiando referencias a clientes...');
  
  const batch = db.batch();
  
  ventasConProblemas.forEach(venta => {
    const ventaRef = db.collection('ventas').doc(venta.id);
    
    batch.update(ventaRef, {
      cliente_id: admin.firestore.FieldValue.delete(),
      cliente_info: {
        id: null,
        nombre: '',
        apellido: '',
        nombre_completo: 'Cliente General',
        telefono: '',
        email: ''
      },
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`   🧹 Limpiando venta ${venta.numero}: removiendo cliente_id "${venta.cliente_id}"`);
  });
  
  await batch.commit();
  console.log(`✅ Se limpiaron ${ventasConProblemas.length} referencias a clientes`);
}

function preguntarOpcion() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\n¿Qué opción prefieres? (1: Crear clientes, 2: Limpiar referencias, Enter: Cancelar): ', (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

// Ejecutar verificación
verificarYLimpiarDatos().catch(console.error);