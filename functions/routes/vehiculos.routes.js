// functions/routes/vehiculos.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de vehículos
const vehiculosRoutes = async (req, res, path) => {
  try {
    // VEHÍCULOS - GET todos
    if (path === '/vehiculos' && req.method === 'GET') {
      const vehiculosSnapshot = await db.collection('vehiculos')
        .orderBy('patente')
        .get();
      
      const vehiculos = [];
      
      for (const doc of vehiculosSnapshot.docs) {
        const vehiculoData = doc.data();
        
        // Obtener última carga de combustible
        const ultimaCargaSnapshot = await db.collection('cargas_combustible')
          .where('vehiculo_id', '==', doc.id)
          .orderBy('fecha', 'desc')
          .limit(1)
          .get();
        
        const ultimaCarga = !ultimaCargaSnapshot.empty 
          ? ultimaCargaSnapshot.docs[0].data() 
          : null;
        
        // Verificar alertas
        const alertas = [];
        
        // Alerta de seguro próximo a vencer (30 días)
        if (vehiculoData.fecha_vencimiento_seguro) {
          const fechaVencimiento = vehiculoData.fecha_vencimiento_seguro.toDate();
          const diasParaVencer = Math.floor((fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24));
          
          if (diasParaVencer <= 30 && diasParaVencer >= 0) {
            alertas.push({
              tipo: 'seguro',
              mensaje: `Seguro vence en ${diasParaVencer} días`,
              nivel: diasParaVencer <= 7 ? 'critico' : 'advertencia'
            });
          } else if (diasParaVencer < 0) {
            alertas.push({
              tipo: 'seguro',
              mensaje: `Seguro vencido hace ${Math.abs(diasParaVencer)} días`,
              nivel: 'critico'
            });
          }
        }
        
        vehiculos.push({
          id: doc.id,
          ...vehiculoData,
          ultima_carga: ultimaCarga,
          alertas
        });
      }
      
      console.log(`✅ Vehículos encontrados: ${vehiculos.length}`);
      
      res.json({
        success: true,
        data: vehiculos,
        total: vehiculos.length,
        message: 'Vehículos obtenidos correctamente'
      });
      return true;
    }
    
    // VEHÍCULO - GET por ID con historial
    else if (path.match(/^\/vehiculos\/[^\/]+$/) && req.method === 'GET') {
      const vehiculoId = path.split('/vehiculos/')[1];
      
      const vehiculoDoc = await db.collection('vehiculos').doc(vehiculoId).get();
      
      if (!vehiculoDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Vehículo no encontrado'
        });
        return true;
      }
      
      // Obtener historial de combustible
      const combustibleSnapshot = await db.collection('cargas_combustible')
        .where('vehiculo_id', '==', vehiculoId)
        .orderBy('fecha', 'desc')
        .limit(10)
        .get();
      
      const historialCombustible = [];
      combustibleSnapshot.forEach(doc => {
        historialCombustible.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Obtener servicios
      const serviciosSnapshot = await db.collection('servicios_vehiculos')
        .where('vehiculo_id', '==', vehiculoId)
        .orderBy('fecha', 'desc')
        .limit(10)
        .get();
      
      const historialServicios = [];
      serviciosSnapshot.forEach(doc => {
        historialServicios.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Obtener gastos
      const gastosSnapshot = await db.collection('gastos_vehiculos')
        .where('vehiculo_id', '==', vehiculoId)
        .orderBy('fecha', 'desc')
        .limit(10)
        .get();
      
      const historialGastos = [];
      gastosSnapshot.forEach(doc => {
        historialGastos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Calcular estadísticas
      let consumoPromedio = 0;
      if (historialCombustible.length > 1) {
        let totalKm = 0;
        let totalLitros = 0;
        
        for (let i = 0; i < historialCombustible.length - 1; i++) {
          const cargaActual = historialCombustible[i];
          const cargaAnterior = historialCombustible[i + 1];
          
          const kmRecorridos = cargaActual.km_carga - cargaAnterior.km_carga;
          if (kmRecorridos > 0) {
            totalKm += kmRecorridos;
            totalLitros += cargaActual.litros;
          }
        }
        
        if (totalLitros > 0) {
          consumoPromedio = totalKm / totalLitros;
        }
      }
      
      res.json({
        success: true,
        data: {
          id: vehiculoDoc.id,
          ...vehiculoDoc.data(),
          historial_combustible: historialCombustible,
          historial_servicios: historialServicios,
          historial_gastos: historialGastos,
          estadisticas: {
            consumo_promedio: consumoPromedio,
            total_cargas: historialCombustible.length,
            total_servicios: historialServicios.length,
            total_gastos: historialGastos.length
          }
        },
        message: 'Vehículo obtenido correctamente'
      });
      return true;
    }
    
    // VEHÍCULOS - POST crear nuevo
    else if (path === '/vehiculos' && req.method === 'POST') {
      const nuevoVehiculo = req.body;
      
      // Validación básica
      if (!nuevoVehiculo.patente || !nuevoVehiculo.marca || !nuevoVehiculo.modelo) {
        res.status(400).json({
          success: false,
          message: 'Patente, marca y modelo son requeridos'
        });
        return true;
      }
      
      // Verificar si ya existe la patente
      const patenteExiste = await db.collection('vehiculos')
        .where('patente', '==', nuevoVehiculo.patente.toUpperCase())
        .get();
      
      if (!patenteExiste.empty) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un vehículo con esa patente'
        });
        return true;
      }
      
      // Estructura para Firebase
      const vehiculoFirebase = {
        patente: nuevoVehiculo.patente.toUpperCase(),
        marca: nuevoVehiculo.marca,
        modelo: nuevoVehiculo.modelo,
        año: parseInt(nuevoVehiculo.año) || new Date().getFullYear(),
        km_actual: parseInt(nuevoVehiculo.km_actual) || 0,
        tipo: nuevoVehiculo.tipo || 'auto',
        activo: true,
        fecha_alta: admin.firestore.FieldValue.serverTimestamp(),
        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Agregar fecha de vencimiento de seguro si se proporciona
      if (nuevoVehiculo.fecha_vencimiento_seguro) {
        vehiculoFirebase.fecha_vencimiento_seguro = admin.firestore.Timestamp.fromDate(
          new Date(nuevoVehiculo.fecha_vencimiento_seguro)
        );
      }
      
      const docRef = await db.collection('vehiculos').add(vehiculoFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...vehiculoFirebase
        },
        message: 'Vehículo creado correctamente'
      });
      return true;
    }
    
    // VEHÍCULOS - PUT actualizar
    else if (path.match(/^\/vehiculos\/[^\/]+$/) && req.method === 'PUT') {
      const vehiculoId = path.split('/vehiculos/')[1];
      const datosActualizacion = req.body;
      
      // Preparar datos para actualizar
      const actualizacion = {
        ...datosActualizacion,
        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Convertir patente a mayúsculas si se proporciona
      if (actualizacion.patente) {
        actualizacion.patente = actualizacion.patente.toUpperCase();
      }
      
      // Convertir fecha de seguro si se proporciona
      if (actualizacion.fecha_vencimiento_seguro) {
        actualizacion.fecha_vencimiento_seguro = admin.firestore.Timestamp.fromDate(
          new Date(actualizacion.fecha_vencimiento_seguro)
        );
      }
      
      await db.collection('vehiculos').doc(vehiculoId).update(actualizacion);
      
      res.json({
        success: true,
        data: {
          id: vehiculoId,
          ...actualizacion
        },
        message: 'Vehículo actualizado correctamente'
      });
      return true;
    }
    
    // VEHÍCULOS - DELETE desactivar
    else if (path.match(/^\/vehiculos\/[^\/]+$/) && req.method === 'DELETE') {
      const vehiculoId = path.split('/vehiculos/')[1];
      
      // Soft delete - solo desactivar
      await db.collection('vehiculos').doc(vehiculoId).update({
        activo: false,
        fecha_baja: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        success: true,
        message: 'Vehículo desactivado correctamente'
      });
      return true;
    }
    
    // ESTADÍSTICAS - GET resumen de flota
    else if (path === '/vehiculos/estadisticas/resumen' && req.method === 'GET') {
      const vehiculosSnapshot = await db.collection('vehiculos')
        .where('activo', '==', true)
        .get();
      
      let totalVehiculos = 0;
      let totalKm = 0;
      const alertasSeguro = [];
      
      for (const doc of vehiculosSnapshot.docs) {
        const vehiculo = doc.data();
        totalVehiculos++;
        totalKm += vehiculo.km_actual || 0;
        
        // Verificar vencimiento de seguro
        if (vehiculo.fecha_vencimiento_seguro) {
          const fechaVencimiento = vehiculo.fecha_vencimiento_seguro.toDate();
          const diasParaVencer = Math.floor((fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24));
          
          if (diasParaVencer <= 30) {
            alertasSeguro.push({
              vehiculo_id: doc.id,
              patente: vehiculo.patente,
              dias_para_vencer: diasParaVencer,
              fecha_vencimiento: fechaVencimiento.toISOString()
            });
          }
        }
      }
      
      // Obtener gastos del mes actual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      
      let gastosCombustibleMes = 0;
      let gastosServiciosMes = 0;
      let gastosVariosMes = 0;
      
      // Gastos combustible
      const combustibleMesSnapshot = await db.collection('cargas_combustible')
        .where('fecha', '>=', admin.firestore.Timestamp.fromDate(inicioMes))
        .get();
      
      combustibleMesSnapshot.forEach(doc => {
        gastosCombustibleMes += doc.data().monto || 0;
      });
      
      // Gastos servicios
      const serviciosMesSnapshot = await db.collection('servicios_vehiculos')
        .where('fecha', '>=', admin.firestore.Timestamp.fromDate(inicioMes))
        .get();
      
      serviciosMesSnapshot.forEach(doc => {
        gastosServiciosMes += doc.data().monto || 0;
      });
      
      // Gastos varios
      const gastosMesSnapshot = await db.collection('gastos_vehiculos')
        .where('fecha', '>=', admin.firestore.Timestamp.fromDate(inicioMes))
        .get();
      
      gastosMesSnapshot.forEach(doc => {
        gastosVariosMes += doc.data().monto || 0;
      });
      
      res.json({
        success: true,
        data: {
          total_vehiculos: totalVehiculos,
          total_km_flota: totalKm,
          gastos_mes_actual: {
            combustible: gastosCombustibleMes,
            servicios: gastosServiciosMes,
            varios: gastosVariosMes,
            total: gastosCombustibleMes + gastosServiciosMes + gastosVariosMes
          },
          alertas_seguro: alertasSeguro.sort((a, b) => a.dias_para_vencer - b.dias_para_vencer)
        },
        message: 'Estadísticas obtenidas correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = vehiculosRoutes;