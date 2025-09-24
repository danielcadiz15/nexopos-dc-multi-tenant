// functions/routes/servicios-vehiculos.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de servicios de vehículos
const serviciosVehiculosRoutes = async (req, res, path) => {
  try {
    // SERVICIOS - GET todos o por vehículo
    if (path === '/servicios-vehiculos' && req.method === 'GET') {
      const { vehiculo_id, tipo, pendientes } = req.query;
      
      let query = db.collection('servicios_vehiculos');
      
      // Filtros opcionales
      if (vehiculo_id) {
        query = query.where('vehiculo_id', '==', vehiculo_id);
      }
      
      if (tipo) {
        query = query.where('tipo', '==', tipo);
      }
      
      // Ordenar por fecha descendente
      query = query.orderBy('fecha', 'desc').limit(100);
      
      const serviciosSnapshot = await query.get();
      const servicios = [];
      
      for (const doc of serviciosSnapshot.docs) {
        const servicio = doc.data();
        
        // Obtener datos del vehículo
        const vehiculoDoc = await db.collection('vehiculos').doc(servicio.vehiculo_id).get();
        const vehiculo = vehiculoDoc.exists ? vehiculoDoc.data() : null;
        
        // Verificar si el servicio está próximo
        let estado = 'realizado';
        let diasParaServicio = null;
        
        if (vehiculo && servicio.proximo_km) {
          const kmFaltantes = servicio.proximo_km - vehiculo.km_actual;
          if (kmFaltantes <= 500 && kmFaltantes > 0) {
            estado = 'proximo';
          } else if (kmFaltantes <= 0) {
            estado = 'vencido';
          }
        }
        
        if (servicio.proximo_fecha) {
          const fechaProxima = servicio.proximo_fecha.toDate();
          diasParaServicio = Math.floor((fechaProxima - new Date()) / (1000 * 60 * 60 * 24));
          
          if (diasParaServicio <= 30 && diasParaServicio > 0) {
            estado = estado === 'vencido' ? 'vencido' : 'proximo';
          } else if (diasParaServicio <= 0) {
            estado = 'vencido';
          }
        }
        
        const servicioData = {
          id: doc.id,
          ...servicio,
          estado,
          dias_para_servicio: diasParaServicio,
          vehiculo: vehiculo ? {
            id: vehiculoDoc.id,
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            km_actual: vehiculo.km_actual
          } : null
        };
        
        // Filtrar por pendientes si se solicita
        if (pendientes === 'true' && (estado === 'proximo' || estado === 'vencido')) {
          servicios.push(servicioData);
        } else if (!pendientes) {
          servicios.push(servicioData);
        }
      }
      
      res.json({
        success: true,
        data: servicios,
        total: servicios.length,
        message: 'Servicios obtenidos correctamente'
      });
      return true;
    }
    
    // SERVICIO - POST crear nuevo
    else if (path === '/servicios-vehiculos' && req.method === 'POST') {
      const nuevoServicio = req.body;
      
      // Validación básica
      if (!nuevoServicio.vehiculo_id || !nuevoServicio.tipo || !nuevoServicio.km_servicio) {
        res.status(400).json({
          success: false,
          message: 'Vehículo, tipo de servicio y kilometraje son requeridos'
        });
        return true;
      }
      
      // Verificar que el vehículo existe
      const vehiculoDoc = await db.collection('vehiculos').doc(nuevoServicio.vehiculo_id).get();
      if (!vehiculoDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Vehículo no encontrado'
        });
        return true;
      }
      
      // Estructura para Firebase
      const servicioFirebase = {
        vehiculo_id: nuevoServicio.vehiculo_id,
        fecha: nuevoServicio.fecha 
          ? admin.firestore.Timestamp.fromDate(new Date(nuevoServicio.fecha))
          : admin.firestore.FieldValue.serverTimestamp(),
        tipo: nuevoServicio.tipo,
        descripcion: nuevoServicio.descripcion || '',
        km_servicio: parseInt(nuevoServicio.km_servicio),
        monto: parseFloat(nuevoServicio.monto) || 0,
        taller: nuevoServicio.taller || '',
        fecha_registro: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Agregar próximo servicio si se especifica
      if (nuevoServicio.proximo_km) {
        servicioFirebase.proximo_km = parseInt(nuevoServicio.proximo_km);
      }
      
      if (nuevoServicio.proximo_fecha) {
        servicioFirebase.proximo_fecha = admin.firestore.Timestamp.fromDate(
          new Date(nuevoServicio.proximo_fecha)
        );
      }
      
      // Crear el servicio
      const docRef = await db.collection('servicios_vehiculos').add(servicioFirebase);
      
      // Actualizar km del vehículo si es mayor
      const vehiculo = vehiculoDoc.data();
      if (nuevoServicio.km_servicio > vehiculo.km_actual) {
        await db.collection('vehiculos').doc(nuevoServicio.vehiculo_id).update({
          km_actual: parseInt(nuevoServicio.km_servicio),
          fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...servicioFirebase
        },
        message: 'Servicio registrado correctamente'
      });
      return true;
    }
    
    // SERVICIO - PUT actualizar
    else if (path.match(/^\/servicios-vehiculos\/[^\/]+$/) && req.method === 'PUT') {
      const servicioId = path.split('/servicios-vehiculos/')[1];
      const datosActualizacion = req.body;
      
      // Obtener servicio actual
      const servicioDoc = await db.collection('servicios_vehiculos').doc(servicioId).get();
      if (!servicioDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
        return true;
      }
      
      // Preparar actualización
      const actualizacion = {};
      
      if (datosActualizacion.descripcion !== undefined) {
        actualizacion.descripcion = datosActualizacion.descripcion;
      }
      
      if (datosActualizacion.monto !== undefined) {
        actualizacion.monto = parseFloat(datosActualizacion.monto);
      }
      
      if (datosActualizacion.taller !== undefined) {
        actualizacion.taller = datosActualizacion.taller;
      }
      
      if (datosActualizacion.proximo_km !== undefined) {
        actualizacion.proximo_km = parseInt(datosActualizacion.proximo_km);
      }
      
      if (datosActualizacion.proximo_fecha !== undefined) {
        actualizacion.proximo_fecha = admin.firestore.Timestamp.fromDate(
          new Date(datosActualizacion.proximo_fecha)
        );
      }
      
      actualizacion.fecha_actualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('servicios_vehiculos').doc(servicioId).update(actualizacion);
      
      res.json({
        success: true,
        data: {
          id: servicioId,
          ...actualizacion
        },
        message: 'Servicio actualizado correctamente'
      });
      return true;
    }
    
    // SERVICIO - DELETE eliminar
    else if (path.match(/^\/servicios-vehiculos\/[^\/]+$/) && req.method === 'DELETE') {
      const servicioId = path.split('/servicios-vehiculos/')[1];
      
      await db.collection('servicios_vehiculos').doc(servicioId).delete();
      
      res.json({
        success: true,
        message: 'Servicio eliminado correctamente'
      });
      return true;
    }
    
    // GASTOS VEHÍCULO - GET todos
    if (path === '/gastos-vehiculos' && req.method === 'GET') {
      const { vehiculo_id, categoria, fecha_desde, fecha_hasta } = req.query;
      
      let query = db.collection('gastos_vehiculos');
      
      // Filtros opcionales
      if (vehiculo_id) {
        query = query.where('vehiculo_id', '==', vehiculo_id);
      }
      
      if (categoria) {
        query = query.where('categoria', '==', categoria);
      }
      
      if (fecha_desde) {
        query = query.where('fecha', '>=', admin.firestore.Timestamp.fromDate(new Date(fecha_desde)));
      }
      
      if (fecha_hasta) {
        query = query.where('fecha', '<=', admin.firestore.Timestamp.fromDate(new Date(fecha_hasta)));
      }
      
      query = query.orderBy('fecha', 'desc').limit(100);
      
      const gastosSnapshot = await query.get();
      const gastos = [];
      
      for (const doc of gastosSnapshot.docs) {
        const gasto = doc.data();
        
        // Obtener datos del vehículo
        const vehiculoDoc = await db.collection('vehiculos').doc(gasto.vehiculo_id).get();
        const vehiculo = vehiculoDoc.exists ? vehiculoDoc.data() : null;
        
        gastos.push({
          id: doc.id,
          ...gasto,
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
        data: gastos,
        total: gastos.length,
        message: 'Gastos obtenidos correctamente'
      });
      return true;
    }
    
    // GASTO VEHÍCULO - POST crear nuevo
    else if (path === '/gastos-vehiculos' && req.method === 'POST') {
      const nuevoGasto = req.body;
      
      // Validación básica
      if (!nuevoGasto.vehiculo_id || !nuevoGasto.categoria || !nuevoGasto.monto) {
        res.status(400).json({
          success: false,
          message: 'Vehículo, categoría y monto son requeridos'
        });
        return true;
      }
      
      // Verificar que el vehículo existe
      const vehiculoDoc = await db.collection('vehiculos').doc(nuevoGasto.vehiculo_id).get();
      if (!vehiculoDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Vehículo no encontrado'
        });
        return true;
      }
      
      // Estructura para Firebase
      const gastoFirebase = {
        vehiculo_id: nuevoGasto.vehiculo_id,
        fecha: nuevoGasto.fecha 
          ? admin.firestore.Timestamp.fromDate(new Date(nuevoGasto.fecha))
          : admin.firestore.FieldValue.serverTimestamp(),
        categoria: nuevoGasto.categoria,
        concepto: nuevoGasto.concepto || '',
        monto: parseFloat(nuevoGasto.monto),
        fecha_registro: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('gastos_vehiculos').add(gastoFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...gastoFirebase
        },
        message: 'Gasto registrado correctamente'
      });
      return true;
    }
    
    // GASTO VEHÍCULO - DELETE eliminar
    else if (path.match(/^\/gastos-vehiculos\/[^\/]+$/) && req.method === 'DELETE') {
      const gastoId = path.split('/gastos-vehiculos/')[1];
      
      await db.collection('gastos_vehiculos').doc(gastoId).delete();
      
      res.json({
        success: true,
        message: 'Gasto eliminado correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de servicios vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = serviciosVehiculosRoutes;