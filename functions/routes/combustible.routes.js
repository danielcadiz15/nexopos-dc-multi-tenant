// functions/routes/combustible.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de combustible
const combustibleRoutes = async (req, res, path) => {
  try {
    // CARGAS COMBUSTIBLE - GET todas o por vehículo
    if (path === '/combustible' && req.method === 'GET') {
      const { vehiculo_id, fecha_desde, fecha_hasta } = req.query;
      
      let query = db.collection('cargas_combustible');
      
      // Filtros opcionales
      if (vehiculo_id) {
        query = query.where('vehiculo_id', '==', vehiculo_id);
      }
      
      if (fecha_desde) {
        query = query.where('fecha', '>=', admin.firestore.Timestamp.fromDate(new Date(fecha_desde)));
      }
      
      if (fecha_hasta) {
        query = query.where('fecha', '<=', admin.firestore.Timestamp.fromDate(new Date(fecha_hasta)));
      }
      
      // Ordenar por fecha descendente
      query = query.orderBy('fecha', 'desc').limit(100);
      
      const cargasSnapshot = await query.get();
      const cargas = [];
      
      for (const doc of cargasSnapshot.docs) {
        const carga = doc.data();
        
        // Obtener datos del vehículo
        const vehiculoDoc = await db.collection('vehiculos').doc(carga.vehiculo_id).get();
        const vehiculo = vehiculoDoc.exists ? vehiculoDoc.data() : null;
        
        cargas.push({
          id: doc.id,
          ...carga,
          vehiculo: vehiculo ? {
            id: vehiculoDoc.id,
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo
          } : null
        });
      }
      
      res.json({
        success: true,
        data: cargas,
        total: cargas.length,
        message: 'Cargas de combustible obtenidas correctamente'
      });
      return true;
    }
    
    // CARGA COMBUSTIBLE - POST crear nueva
    else if (path === '/combustible' && req.method === 'POST') {
      const nuevaCarga = req.body;
      
      // Validación básica
      if (!nuevaCarga.vehiculo_id || !nuevaCarga.litros || !nuevaCarga.monto || !nuevaCarga.km_carga) {
        res.status(400).json({
          success: false,
          message: 'Vehículo, litros, monto y kilometraje son requeridos'
        });
        return true;
      }
      
      // Verificar que el vehículo existe
      const vehiculoDoc = await db.collection('vehiculos').doc(nuevaCarga.vehiculo_id).get();
      if (!vehiculoDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Vehículo no encontrado'
        });
        return true;
      }
      
      const vehiculo = vehiculoDoc.data();
      
      // Validar que el kilometraje sea mayor al actual
      if (nuevaCarga.km_carga <= vehiculo.km_actual) {
        res.status(400).json({
          success: false,
          message: `El kilometraje debe ser mayor a ${vehiculo.km_actual} km`
        });
        return true;
      }
      
      // Obtener última carga para calcular rendimiento
      const ultimaCargaSnapshot = await db.collection('cargas_combustible')
        .where('vehiculo_id', '==', nuevaCarga.vehiculo_id)
        .orderBy('fecha', 'desc')
        .limit(1)
        .get();
      
      let rendimiento = null;
      if (!ultimaCargaSnapshot.empty) {
        const ultimaCarga = ultimaCargaSnapshot.docs[0].data();
        const kmRecorridos = nuevaCarga.km_carga - ultimaCarga.km_carga;
        if (kmRecorridos > 0 && nuevaCarga.litros > 0) {
          rendimiento = kmRecorridos / nuevaCarga.litros;
        }
      }
      
      // Estructura para Firebase
      const cargaFirebase = {
        vehiculo_id: nuevaCarga.vehiculo_id,
        fecha: nuevaCarga.fecha 
          ? admin.firestore.Timestamp.fromDate(new Date(nuevaCarga.fecha))
          : admin.firestore.FieldValue.serverTimestamp(),
        litros: parseFloat(nuevaCarga.litros),
        monto: parseFloat(nuevaCarga.monto),
        precio_litro: parseFloat(nuevaCarga.monto) / parseFloat(nuevaCarga.litros),
        km_carga: parseInt(nuevaCarga.km_carga),
        estacion: nuevaCarga.estacion || '',
        tipo_combustible: nuevaCarga.tipo_combustible || 'nafta',
        rendimiento: rendimiento,
        fecha_registro: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Iniciar transacción para actualizar km del vehículo
      const batch = db.batch();
      
      // Crear la carga
      const cargaRef = db.collection('cargas_combustible').doc();
      batch.set(cargaRef, cargaFirebase);
      
      // Actualizar km del vehículo
      const vehiculoRef = db.collection('vehiculos').doc(nuevaCarga.vehiculo_id);
      batch.update(vehiculoRef, {
        km_actual: parseInt(nuevaCarga.km_carga),
        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Ejecutar transacción
      await batch.commit();
      
      res.status(201).json({
        success: true,
        data: {
          id: cargaRef.id,
          ...cargaFirebase
        },
        message: 'Carga de combustible registrada correctamente'
      });
      return true;
    }
    
    // CARGA COMBUSTIBLE - PUT actualizar
    else if (path.match(/^\/combustible\/[^\/]+$/) && req.method === 'PUT') {
      const cargaId = path.split('/combustible/')[1];
      const datosActualizacion = req.body;
      
      // Obtener carga actual
      const cargaDoc = await db.collection('cargas_combustible').doc(cargaId).get();
      if (!cargaDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Carga no encontrada'
        });
        return true;
      }
      
      // Preparar actualización
      const actualizacion = {};
      
      if (datosActualizacion.litros !== undefined) {
        actualizacion.litros = parseFloat(datosActualizacion.litros);
      }
      
      if (datosActualizacion.monto !== undefined) {
        actualizacion.monto = parseFloat(datosActualizacion.monto);
      }
      
      if (actualizacion.litros && actualizacion.monto) {
        actualizacion.precio_litro = actualizacion.monto / actualizacion.litros;
      }
      
      if (datosActualizacion.estacion !== undefined) {
        actualizacion.estacion = datosActualizacion.estacion;
      }
      
      if (datosActualizacion.tipo_combustible !== undefined) {
        actualizacion.tipo_combustible = datosActualizacion.tipo_combustible;
      }
      
      actualizacion.fecha_actualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('cargas_combustible').doc(cargaId).update(actualizacion);
      
      res.json({
        success: true,
        data: {
          id: cargaId,
          ...actualizacion
        },
        message: 'Carga actualizada correctamente'
      });
      return true;
    }
    
    // CARGA COMBUSTIBLE - DELETE eliminar
    else if (path.match(/^\/combustible\/[^\/]+$/) && req.method === 'DELETE') {
      const cargaId = path.split('/combustible/')[1];
      
      await db.collection('cargas_combustible').doc(cargaId).delete();
      
      res.json({
        success: true,
        message: 'Carga eliminada correctamente'
      });
      return true;
    }
    
    // ESTADÍSTICAS COMBUSTIBLE - GET por vehículo
    else if (path.match(/^\/combustible\/estadisticas\/[^\/]+$/) && req.method === 'GET') {
      const vehiculoId = path.split('/combustible/estadisticas/')[1];
      
      // Obtener todas las cargas del vehículo
      const cargasSnapshot = await db.collection('cargas_combustible')
        .where('vehiculo_id', '==', vehiculoId)
        .orderBy('fecha', 'desc')
        .get();
      
      if (cargasSnapshot.empty) {
        res.json({
          success: true,
          data: {
            total_cargas: 0,
            total_litros: 0,
            total_gastado: 0,
            consumo_promedio: 0,
            precio_promedio_litro: 0,
            km_recorridos: 0
          },
          message: 'No hay cargas registradas para este vehículo'
        });
        return true;
      }
      
      let totalLitros = 0;
      let totalGastado = 0;
      const rendimientos = [];
      const precios = [];
      
      const cargas = [];
      cargasSnapshot.forEach(doc => {
        const carga = doc.data();
        cargas.push(carga);
        totalLitros += carga.litros || 0;
        totalGastado += carga.monto || 0;
        
        if (carga.rendimiento) {
          rendimientos.push(carga.rendimiento);
        }
        
        if (carga.precio_litro) {
          precios.push(carga.precio_litro);
        }
      });
      
      // Calcular promedios
      const consumoPromedio = rendimientos.length > 0
        ? rendimientos.reduce((a, b) => a + b, 0) / rendimientos.length
        : 0;
      
      const precioPromedioLitro = precios.length > 0
        ? precios.reduce((a, b) => a + b, 0) / precios.length
        : 0;
      
      // Calcular km recorridos
      const primeraCarga = cargas[cargas.length - 1];
      const ultimaCarga = cargas[0];
      const kmRecorridos = ultimaCarga.km_carga - primeraCarga.km_carga;
      
      res.json({
        success: true,
        data: {
          total_cargas: cargas.length,
          total_litros: totalLitros,
          total_gastado: totalGastado,
          consumo_promedio: consumoPromedio,
          precio_promedio_litro: precioPromedioLitro,
          km_recorridos: kmRecorridos,
          ultima_carga: {
            fecha: ultimaCarga.fecha,
            km: ultimaCarga.km_carga,
            litros: ultimaCarga.litros,
            monto: ultimaCarga.monto
          }
        },
        message: 'Estadísticas de combustible obtenidas correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de combustible:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = combustibleRoutes;