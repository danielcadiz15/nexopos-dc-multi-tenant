// functions/routes/ventas.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

const ventasRoutes = async (req, res, path, enriquecerVentasConClientes) => {
  try {
    // Obtener companyId para filtrado multi-tenant
    const companyId = req.companyId || req.user?.companyId || req.query?.orgId || null;
    
    // GET /ventas - Obtener todas las ventas
    if (path === '/ventas' && req.method === 'GET') {
      try {
        console.log('📋 Obteniendo listado de ventas...');
        
        // Construir query base
        if (!companyId) {
          return res.status(400).json({ success:false, message:'CompanyId requerido' });
        }
        let query = db.collection('companies').doc(companyId).collection('ventas');
        
        // Filtros opcionales
        const { 
          fecha_inicio, 
          fecha_fin, 
          estado, 
          cliente_id,
          sucursal_id,
          limit = 50,
          offset = 0,
          startAfter
        } = req.query;
        
        // Aplicar filtros
        if (sucursal_id) {
          query = query.where('sucursal_id', '==', sucursal_id);
        }
        
        if (estado) {
          query = query.where('estado', '==', estado);
        }
        
        if (cliente_id) {
          query = query.where('cliente_id', '==', cliente_id);
        }
        
        // Evitar requerir índices compuestos: no ordenar en Firestore
        
        // Aplicar paginación
        if (startAfter) {
          // Buscar el documento a partir del cual continuar
          const docRef = await db.collection('companies').doc(companyId).collection('ventas').doc(startAfter).get();
          if (docRef.exists) {
            query = query.startAfter(docRef);
          }
        }
        query = query.limit(parseInt(limit));
        
        const ventasSnapshot = await query.get();
        
        const ventas = [];
        ventasSnapshot.forEach(doc => {
          ventas.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Enriquecer con datos de clientes si está disponible
        let ventasEnriquecidas = ventas;
        if (enriquecerVentasConClientes) {
          ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
        }
        
        // Ordenar en memoria por fechaCreacion desc si existe
        ventasEnriquecidas.sort((a, b) => {
          const ta = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : new Date(a.fecha || 0).getTime();
          const tb = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : new Date(b.fecha || 0).getTime();
          return tb - ta;
        });

        console.log(`✅ ${ventasEnriquecidas.length} ventas obtenidas`);
        
        // Log temporal para verificar propiedades de modificación
        const ventasModificadas = ventasEnriquecidas.filter(v => v.modificada);
        console.log(`🔍 Ventas modificadas encontradas: ${ventasModificadas.length}`);
        ventasModificadas.forEach(v => {
          console.log(`  - Venta ${v.id}: modificada=${v.modificada}, fecha_modificacion=${v.fecha_modificacion}`);
        });
        
        // Log temporal para verificar todas las propiedades de la primera venta
        if (ventasEnriquecidas.length > 0) {
          const primeraVenta = ventasEnriquecidas[0];
          console.log(`🔍 Propiedades de la primera venta (${primeraVenta.id}):`);
          console.log(`  - modificada:`, primeraVenta.modificada);
          console.log(`  - fecha_modificacion:`, primeraVenta.fecha_modificacion);
          console.log(`  - modificado_por:`, primeraVenta.modificado_por);
        }
        
        res.json({
          success: true,
          data: ventasEnriquecidas,
          total: ventasEnriquecidas.length,
          message: 'Ventas obtenidas correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al obtener ventas:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener ventas',
          error: error.message
        });
      }
      
      return true;
    }

    // GET /ventas/eliminadas - Obtener ventas eliminadas (DEBE IR ANTES DE LAS RUTAS CON PARÁMETROS)
    if (path === '/ventas/eliminadas' && req.method === 'GET') {
      try {
        if (!companyId) {
          return res.status(400).json({ success:false, message:'CompanyId requerido' });
        }
        console.log('🗑️ [DEBUG] Iniciando obtención de ventas eliminadas...');
        console.log('🗑️ [DEBUG] Path recibido:', path);
        console.log('🗑️ [DEBUG] Método:', req.method);
        
        // Verificar si la colección existe (usar tenant si está disponible)
        const coleccionRef = companyId
          ? db.collection('companies').doc(companyId).collection('ventas_eliminadas')
          : db.collection('ventas_eliminadas');
        console.log('🗑️ [DEBUG] Referencia a colección creada');
        
        const ventasEliminadasSnapshot = await coleccionRef
          .orderBy('fecha_eliminacion', 'desc')
          .limit(100)
          .get();
        
        console.log('🗑️ [DEBUG] Query ejecutada, documentos encontrados:', ventasEliminadasSnapshot.size);
        
        const ventasEliminadas = [];
        ventasEliminadasSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('🗑️ [DEBUG] Procesando documento:', doc.id, 'con fecha:', data.fecha_eliminacion);
          ventasEliminadas.push({
            id: doc.id,
            ...data
          });
        });
        
        console.log(`✅ Ventas eliminadas obtenidas: ${ventasEliminadas.length}`);
        
        res.json({
          success: true,
          data: ventasEliminadas,
          total: ventasEliminadas.length,
          message: 'Ventas eliminadas obtenidas correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al obtener ventas eliminadas:', error);
        console.error('❌ [DEBUG] Stack trace:', error.stack);
        res.status(500).json({
          success: false,
          message: 'Error al obtener ventas eliminadas',
          error: error.message
        });
      }
      
      return true;
    }
    // GET /ventas/buscar - Búsqueda con filtros (multi-tenant, sin índices compuestos)
	if (path === '/ventas/buscar' && req.method === 'GET') {
	  try {
		console.log('🔍 Búsqueda de ventas con filtros');
		
		const { termino, sucursal_id, estado, cliente_id } = req.query;
		
		let query = db.collection('companies').doc(companyId).collection('ventas');
		
		// Evitar índices compuestos: no combinar múltiples where distintos a igualdad con orderBy.
		// Usamos solo limit y filtramos/ordenamos en memoria.
		query = query.limit(200);
		
		const ventasSnapshot = await query.get();
		let ventas = [];
		
		ventasSnapshot.forEach(doc => {
		  const ventaData = doc.data();
		  ventas.push({ id: doc.id, ...ventaData });
		});

		// Filtrar en memoria por sucursal, estado y cliente si se enviaron
		if (sucursal_id) ventas = ventas.filter(v => v.sucursal_id === sucursal_id);
		if (estado) ventas = ventas.filter(v => v.estado === estado);
		if (cliente_id) ventas = ventas.filter(v => v.cliente_id === cliente_id);
		if (termino) {
		  const terminoLower = termino.toLowerCase();
		  ventas = ventas.filter(v =>
			(v.numero || '').toLowerCase().includes(terminoLower) ||
			(v.cliente_info?.nombre_completo || '').toLowerCase().includes(terminoLower)
		  );
		}

		// Ordenar en memoria por fechaCreacion desc
		ventas.sort((a, b) => {
		  const ta = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : new Date(a.fecha || 0).getTime();
		  const tb = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : new Date(b.fecha || 0).getTime();
		  return tb - ta;
		});
		
		// Enriquecer con clientes si está disponible
		let ventasEnriquecidas = ventas;
		if (enriquecerVentasConClientes) {
		  ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
		}
		
		console.log(`✅ Búsqueda completada: ${ventasEnriquecidas.length} ventas encontradas`);
		
		res.json({
		  success: true,
		  data: ventasEnriquecidas,
		  total: ventasEnriquecidas.length,
		  message: 'Búsqueda completada'
		});
		
	  } catch (error) {
		console.error('❌ Error en búsqueda de ventas:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error en búsqueda de ventas',
		  error: error.message
		});
	  }
	  
	  return true;
	}

    // GET /ventas/buscar-cliente - Buscar ventas por nombre de cliente (multi-tenant)
	if (path === '/ventas/buscar-cliente' && req.method === 'GET') {
	  try {
		console.log('🔍 Búsqueda de ventas por nombre de cliente');
		
		const { nombre } = req.query;
		
		if (!nombre || nombre.trim() === '') {
		  res.status(400).json({
			success: false,
			message: 'El nombre del cliente es requerido'
		  });
		  return true;
		}
		
		const nombreCliente = nombre.trim().toLowerCase();
		console.log(`🔍 Buscando ventas para cliente: "${nombreCliente}"`);
		
		// Obtener todos los clientes del tenant y filtrar localmente para búsqueda parcial
		const clientesSnapshot = await db.collection('companies').doc(companyId).collection('clientes').get();
		
		const clientesIds = [];
		clientesSnapshot.forEach(doc => {
		  const clienteData = doc.data();
		  const nombreCompleto = `${clienteData.nombre || ''} ${clienteData.apellido || ''}`.toLowerCase();
		  const nombreSolo = (clienteData.nombre || '').toLowerCase();
		  const apellidoSolo = (clienteData.apellido || '').toLowerCase();
		  
		  // Búsqueda parcial: incluir si el término está en cualquier parte del nombre
		  if (nombreCompleto.includes(nombreCliente) || 
			  nombreSolo.includes(nombreCliente) || 
			  apellidoSolo.includes(nombreCliente)) {
			clientesIds.push(doc.id);
		  }
		});
		
		console.log(`👥 Clientes encontrados: ${clientesIds.length}`);
		
		// Buscar ventas del tenant para todos los clientes encontrados
		const ventas = [];
		for (const clienteId of clientesIds) {
		  const ventasSnapshot = await db.collection('companies').doc(companyId).collection('ventas')
			.where('cliente_id', '==', clienteId)
			.limit(200)
			.get();
		  ventasSnapshot.forEach(doc => {
			ventas.push({ id: doc.id, ...doc.data() });
		  });
		}
		// Ordenar en memoria por fecha
		ventas.sort((a, b) => {
		  const ta = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : new Date(a.fecha || 0).getTime();
		  const tb = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : new Date(b.fecha || 0).getTime();
		  return tb - ta;
		});
		
		// Enriquecer con clientes si está disponible
		let ventasEnriquecidas = ventas;
		if (enriquecerVentasConClientes) {
		  ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
		}
		
		console.log(`✅ Búsqueda por cliente completada: ${ventasEnriquecidas.length} ventas encontradas`);
		
		res.json({
		  success: true,
		  data: ventasEnriquecidas,
		  total: ventasEnriquecidas.length,
		  message: `Ventas encontradas para "${nombre}"`
		});
		
	  } catch (error) {
		console.error('❌ Error en búsqueda de ventas por cliente:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error en búsqueda de ventas por cliente',
		  error: error.message
		});
	  }
	  
	  return true;
	}

	// GET /ventas/estadisticas/dia - Estadísticas del día (multi-tenant, evitar compuestos)
	if (path === '/ventas/estadisticas/dia' && req.method === 'GET') {
	  try {
		console.log('📊 Obteniendo estadísticas del día');
		
		const { sucursal_id } = req.query;
		
		if (!companyId) {
		  return res.status(400).json({ success:false, message:'CompanyId requerido' });
		}
		
		// Obtener fecha de inicio y fin del día actual
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);
		const inicioHoy = admin.firestore.Timestamp.fromDate(hoy);
		const mañana = new Date(hoy);
		mañana.setDate(mañana.getDate() + 1);
		const finHoy = admin.firestore.Timestamp.fromDate(mañana);
		
		// Construir query base en tenant (solo por fecha para evitar índice compuesto)
		let query = db.collection('companies').doc(companyId).collection('ventas')
		  .where('fechaCreacion', '>=', inicioHoy)
		  .where('fechaCreacion', '<', finHoy)
		  .limit(1000);
		
		const ventasSnapshot = await query.get();
		
		// Calcular estadísticas
		let totalVentas = 0;
		let montoTotal = 0;
		let totalEfectivo = 0;
		let totalTarjeta = 0;
		let totalTransferencia = 0;
		let totalCredito = 0;
		let totalPagado = 0;
		let saldoPendienteTotal = 0;
		let ventasConSaldoPendiente = 0;
		const clientesUnicos = new Set();
		
		ventasSnapshot.forEach(doc => {
		  const venta = doc.data();
		  if (sucursal_id && venta.sucursal_id !== sucursal_id) return; // filtrar sucursal en memoria
		  totalVentas++;
		  montoTotal += parseFloat(venta.total || 0);
		  totalPagado += parseFloat(venta.total_pagado || 0);
		  saldoPendienteTotal += parseFloat(venta.saldo_pendiente || 0);
		  
		  if (venta.saldo_pendiente > 0) {
			ventasConSaldoPendiente++;
		  }
		  
		  // Contar por método de pago
		  switch (venta.metodo_pago) {
			case 'efectivo':
			  totalEfectivo += parseFloat(venta.total || 0);
			  break;
			case 'tarjeta':
			  totalTarjeta += parseFloat(venta.total || 0);
			  break;
			case 'transferencia':
			  totalTransferencia += parseFloat(venta.total || 0);
			  break;
			case 'credito':
			  totalCredito += parseFloat(venta.total || 0);
			  break;
		  }
		  
		  // Contar clientes únicos
		  if (venta.cliente_id) {
			clientesUnicos.add(venta.cliente_id);
		  }
		});
		
		const estadisticas = {
		  total_ventas: totalVentas,
		  monto_total: montoTotal,
		  efectivo: totalEfectivo,
		  tarjeta: totalTarjeta,
		  transferencia: totalTransferencia,
		  credito: totalCredito,
		  clientes_atendidos: clientesUnicos.size,
		  promedio_venta: totalVentas > 0 ? montoTotal / totalVentas : 0,
		  totalPagadoHoy: totalPagado,
		  saldoPendienteTotal: saldoPendienteTotal,
		  ventasConSaldoPendiente: ventasConSaldoPendiente
		};
		
		console.log('✅ Estadísticas calculadas:', estadisticas);
		
		res.json({
		  success: true,
		  data: estadisticas,
		  message: 'Estadísticas obtenidas correctamente'
		});
		
	  } catch (error) {
		console.error('❌ Error al obtener estadísticas:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener estadísticas',
		  error: error.message
		});
	  }
	  
	  return true;
	}
	// GET /ventas/estadisticas/periodo - Estadísticas por período con filtro opcional
	if (path === '/ventas/estadisticas/periodo' && req.method === 'GET') {
	  try {
		console.log('📊 Obteniendo estadísticas por período');
		
		const { sucursal_id, periodo, fecha_inicio, fecha_fin } = req.query;
		
		let inicioDate, finDate;
		const ahora = new Date();
		
		// Determinar el rango de fechas según el período
		if (periodo === 'hoy') {
		  inicioDate = new Date();
		  inicioDate.setHours(0, 0, 0, 0);
		  finDate = new Date();
		  finDate.setHours(23, 59, 59, 999);
		} else if (periodo === 'semana') {
		  // Inicio de semana (lunes)
		  inicioDate = new Date();
		  const dia = inicioDate.getDay();
		  const diasHastaLunes = dia === 0 ? 6 : dia - 1;
		  inicioDate.setDate(inicioDate.getDate() - diasHastaLunes);
		  inicioDate.setHours(0, 0, 0, 0);
		  
		  // Fin de semana (domingo)
		  finDate = new Date(inicioDate);
		  finDate.setDate(finDate.getDate() + 6);
		  finDate.setHours(23, 59, 59, 999);
		} else if (periodo === 'mes') {
		  // Inicio del mes
		  inicioDate = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
		  inicioDate.setHours(0, 0, 0, 0);
		  
		  // Fin del mes
		  finDate = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
		  finDate.setHours(23, 59, 59, 999);
		} else if (fecha_inicio && fecha_fin) {
		  // Período personalizado
		  inicioDate = new Date(fecha_inicio);
		  inicioDate.setHours(0, 0, 0, 0);
		  
		  finDate = new Date(fecha_fin);
		  finDate.setHours(23, 59, 59, 999);
		} else {
		  // Por defecto, hoy
		  inicioDate = new Date();
		  inicioDate.setHours(0, 0, 0, 0);
		  finDate = new Date();
		  finDate.setHours(23, 59, 59, 999);
		}
		
		// Convertir a timestamps de Firebase
		const inicioTimestamp = admin.firestore.Timestamp.fromDate(inicioDate);
		const finTimestamp = admin.firestore.Timestamp.fromDate(finDate);
		
		console.log(`📅 Período: ${inicioDate.toLocaleDateString()} - ${finDate.toLocaleDateString()}`);
		
		// Construir query base en tenant (solo por fecha para evitar índices compuestos)
		if (!companyId) {
		  return res.status(400).json({ success:false, message:'CompanyId requerido' });
		}
		let query = db.collection('companies').doc(companyId).collection('ventas')
		  .where('fechaCreacion', '>=', inicioTimestamp)
		  .where('fechaCreacion', '<=', finTimestamp)
		  .limit(5000);
		
		const ventasSnapshot = await query.get();
		
		// Calcular estadísticas
		let totalVentas = 0;
		let montoTotal = 0;
		let totalEfectivo = 0;
		let totalTarjeta = 0;
		let totalTransferencia = 0;
		let totalCredito = 0;
		let totalPagado = 0;
		let saldoPendienteTotal = 0;
		let ventasConSaldoPendiente = 0;
		const clientesUnicos = new Set();
		const ventasPorDia = {};
		
		ventasSnapshot.forEach(doc => {
		  const venta = doc.data();
		  
		  // Solo contar ventas que no estén canceladas
		  if (venta.estado !== 'cancelada') {
			totalVentas++;
			montoTotal += parseFloat(venta.total || 0);
			totalPagado += parseFloat(venta.total_pagado || 0);
			saldoPendienteTotal += parseFloat(venta.saldo_pendiente || 0);
			
			if (venta.saldo_pendiente > 0) {
			  ventasConSaldoPendiente++;
			}
			
			// Contar por método de pago
			const totalVenta = parseFloat(venta.total || 0);
			switch (venta.metodo_pago) {
			  case 'efectivo':
				totalEfectivo += totalVenta;
				break;
			  case 'tarjeta':
				totalTarjeta += totalVenta;
				break;
			  case 'transferencia':
				totalTransferencia += totalVenta;
				break;
			  case 'credito':
				totalCredito += totalVenta;
				break;
			}
			
			// Contar clientes únicos
			if (venta.cliente_id) {
			  clientesUnicos.add(venta.cliente_id);
			}
			
			// Agrupar por día
			const fechaVenta = venta.fechaCreacion?.toDate ? venta.fechaCreacion.toDate() : (venta.fecha ? new Date(venta.fecha) : new Date());
			const diaKey = fechaVenta.toISOString().split('T')[0];
			if (!ventasPorDia[diaKey]) {
			  ventasPorDia[diaKey] = {
				fecha: diaKey,
				cantidad: 0,
				total: 0
			  };
			}
			ventasPorDia[diaKey].cantidad++;
			ventasPorDia[diaKey].total += totalVenta;
		  }
		});
		
		// Convertir ventasPorDia a array y ordenar
		const ventasPorDiaArray = Object.values(ventasPorDia).sort((a, b) => 
		  new Date(a.fecha) - new Date(b.fecha)
		);
		
		const estadisticas = {
		  // Números principales
		  total_ventas: totalVentas,
		  monto_total: montoTotal,
		  
		  // Métodos de pago
		  efectivo: totalEfectivo,
		  tarjeta: totalTarjeta,
		  transferencia: totalTransferencia,
		  credito: totalCredito,
		  
		  // Información adicional
		  clientes_atendidos: clientesUnicos.size,
		  promedio_venta: totalVentas > 0 ? montoTotal / totalVentas : 0,
		  
		  // Pagos
		  totalPagado: totalPagado,
		  saldoPendiente: saldoPendienteTotal,
		  ventasConSaldoPendiente: ventasConSaldoPendiente,
		  
		  // Datos por día
		  ventasPorDia: ventasPorDiaArray,
		  
		  // Información del período
		  periodo: periodo || 'personalizado',
		  fecha_inicio: inicioDate.toISOString(),
		  fecha_fin: finDate.toISOString()
		};
		
		console.log('✅ Estadísticas del período calculadas:', {
		  periodo: estadisticas.periodo,
		  total_ventas: estadisticas.total_ventas,
		  monto_total: estadisticas.monto_total
		});
		
		res.json({
		  success: true,
		  data: estadisticas,
		  message: 'Estadísticas del período obtenidas correctamente'
		});
		
	  } catch (error) {
		console.error('❌ Error al obtener estadísticas del período:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener estadísticas del período',
		  error: error.message
		});
	  }
	  
	  return true;
	}
    // GET /ventas/:id - Obtener una venta específica
    if (path.match(/^\/ventas\/[^\/]+$/) && req.method === 'GET') {
      const ventaId = path.split('/')[2];
      
      // Verificar que no sea una subruta
      if (['stats', 'dashboard', 'resumen', 'reporte'].includes(ventaId)) {
        return false; // Dejar que otra ruta lo maneje
      }
      
      try {
        if (!companyId) {
          return res.status(400).json({ success:false, message:'CompanyId requerido' });
        }
        console.log(`📋 Obteniendo venta ${ventaId}`);
        
        let ventaDoc = null;
        if (companyId) {
          ventaDoc = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).get();
        }
        if (!ventaDoc || !ventaDoc.exists) {
          const legacy = await db.collection('ventas').doc(ventaId).get();
          if (legacy.exists) {
            const data = legacy.data() || {};
            if (companyId && data.orgId && data.orgId !== companyId) {
              return res.status(404).json({ success:false, message:'Venta no encontrada' });
            }
            return res.json({ success:true, data: { id: legacy.id, ...data }, message:'Venta obtenida (legacy)' });
          }
        }
        if (!ventaDoc || !ventaDoc.exists) {
          res.status(404).json({ success:false, message:'Venta no encontrada' });
          return true;
        }
        
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }
        
        const ventaData = ventaDoc.data();
        
        // Generar número de venta si no existe
        if (!ventaData.numero) {
          ventaData.numero = `V-${ventaDoc.id.slice(-6).toUpperCase()}`;
        }
        
        // Asegurar que los campos numéricos sean números
        const venta = {
          id: ventaDoc.id,
          ...ventaData,
          numero: ventaData.numero || `V-${ventaDoc.id.slice(-6).toUpperCase()}`,
          subtotal: parseFloat(ventaData.subtotal || 0),
          descuento: parseFloat(ventaData.descuento || 0),
          impuestos: parseFloat(ventaData.impuestos || 0),
          total: parseFloat(ventaData.total || 0),
          total_pagado: parseFloat(ventaData.total_pagado || 0),
          saldo_pendiente: parseFloat(ventaData.saldo_pendiente || 0),
          // Asegurar que detalles esté presente
          detalles: ventaData.detalles || [],
          // Estado por defecto
          estado: ventaData.estado || 'pendiente'
        };
        
        // Obtener pagos si existen
        const pagosSnapshot = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId)
          .collection('pagos').get();
        
        const pagos = [];
        pagosSnapshot.forEach(doc => {
          pagos.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        venta.pagos = pagos;
        
        console.log(`✅ Venta ${ventaId} obtenida correctamente`);
        
        res.json({
          success: true,
          data: venta,
          message: 'Venta obtenida correctamente'
        });
        
      } catch (error) {
        console.error(`❌ Error al obtener venta ${ventaId}:`, error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener venta',
          error: error.message
        });
      }
      
      return true;
    }
    
    // POST /ventas - Crear nueva venta
	if (path === '/ventas' && req.method === 'POST') {
	  try {
		console.log('📥 [VENTAS] ================== NUEVA VENTA ==================');
		console.log('📥 [VENTAS] Body keys:', Object.keys(req.body));
		console.log('📥 [VENTAS] Body completo:', JSON.stringify(req.body, null, 2));
		
		const { venta, detalles } = req.body;
		if (!companyId) {
		  return res.status(400).json({ success:false, message:'CompanyId requerido' });
		}

		// VALIDACIÓN 1: Verificar estructura básica
		if (!venta) {
		  console.error('❌ [VENTAS] Falta objeto venta');
		  res.status(400).json({
			success: false,
			message: 'Datos de venta no encontrados'
		  });
		  return true;
		}

		if (!detalles || !Array.isArray(detalles)) {
		  console.error('❌ [VENTAS] Detalles no es un array válido:', detalles);
		  res.status(400).json({
			success: false,
			message: 'Detalles de venta inválidos o faltantes'
		  });
		  return true;
		}

		if (detalles.length === 0) {
		  console.error('❌ [VENTAS] Array de detalles vacío');
		  res.status(400).json({
			success: false,
			message: 'La venta debe tener al menos un producto'
		  });
		  return true;
		}

		// VALIDACIÓN 2: Verificar sucursal ANTES de todo
		if (!venta.sucursal_id) {
		  console.error('❌ [VENTAS] Falta sucursal_id en la venta');
		  res.status(400).json({
			success: false,
			message: 'La sucursal es obligatoria para registrar una venta'
		  });
		  return true;
		}

        // Verificar que la sucursal existe (multi-tenant) o crearla si falta
        console.log(`🏪 Verificando sucursal: ${venta.sucursal_id}`);
        let sucursalDoc = await db.collection('companies').doc(companyId).collection('sucursales').doc(venta.sucursal_id).get();
        if (!sucursalDoc.exists) {
          console.warn(`⚠️ Sucursal ${venta.sucursal_id} no existe. Creando automáticamente...`);
          const sucursalNueva = {
            nombre: `Sucursal ${venta.sucursal_id}`,
            tipo: venta.sucursal_id === '1' ? 'principal' : 'secundaria',
            activa: true,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
          };
          await db.collection('companies').doc(companyId).collection('sucursales').doc(venta.sucursal_id).set(sucursalNueva);
          sucursalDoc = await db.collection('companies').doc(companyId).collection('sucursales').doc(venta.sucursal_id).get();
          console.log(`✅ Sucursal creada: ${sucursalDoc.id}`);
        }
        console.log(`✅ Sucursal verificada: ${sucursalDoc.data().nombre}`);
		
		// VALIDACIÓN 3: Verificar estructura de detalles
		console.log('📋 Verificando estructura de detalles...');
		for (let i = 0; i < detalles.length; i++) {
		  const detalle = detalles[i];
		  console.log(`  Detalle ${i}:`, {
			producto_id: detalle.producto_id,
			cantidad: detalle.cantidad,
			tiene_producto_info: !!detalle.producto_info
		  });
		  
		  if (!detalle.producto_id) {
			console.error(`❌ Detalle ${i} sin producto_id`);
			res.status(400).json({
			  success: false,
			  message: `El producto #${i + 1} no tiene ID válido`
			});
			return true;
		  }
		  
		  if (!detalle.cantidad || detalle.cantidad <= 0) {
			console.error(`❌ Detalle ${i} con cantidad inválida:`, detalle.cantidad);
			res.status(400).json({
			  success: false,
			  message: `El producto #${i + 1} tiene cantidad inválida`
			});
			return true;
		  }
		}
		
		// VALIDACIÓN 4: Verificar stock disponible (OPTIMIZADA)
		console.log('🔍 Verificando stock disponible en sucursal...');
		
        // Verificar que todos los productos tengan stock asignado en la sucursal.
        // El stock general del producto no habilita venta hasta que una compra/transferencia lo asigne.
		for (let i = 0; i < detalles.length; i++) {
		  const detalle = detalles[i];
		  console.log(`\n📦 [${i}] Verificando producto:`, {
			index: i,
			producto_id: detalle.producto_id,
			cantidad: detalle.cantidad,
			nombre: detalle.producto_info?.nombre || 'Sin nombre'
		  });
		  
          // Buscar stock en la sucursal específica (multi-tenant)
          let stockQuery = await db.collection('companies').doc(companyId).collection('stock_sucursal')
			.where('producto_id', '==', detalle.producto_id)
			.where('sucursal_id', '==', venta.sucursal_id)
			.limit(1)
			.get();
		  
		  if (stockQuery.empty) {
			return res.status(400).json({
			  success: false,
			  message: `El producto ${detalle.producto_info?.nombre || detalle.producto_id} no tiene stock asignado a esta sucursal. Primero recibí una compra o transferí stock.`
			});
		  }

		  const stockData = stockQuery.docs[0].data();
		  const stockActual = parseFloat(stockData.cantidad || 0);
		  const cantidadVenta = parseFloat(detalle.cantidadParaStock || detalle.cantidad || 0);

		  if (stockActual < cantidadVenta) {
			return res.status(400).json({
			  success: false,
			  message: `Stock insuficiente para ${detalle.producto_info?.nombre || detalle.producto_id}. Disponible: ${stockActual}, solicitado: ${cantidadVenta}`
			});
		  }
		}
		
		console.log('✅ Verificación de stock completada - El frontend ya verificó el stock correctamente');
		
		// CONTINUAR CON LA CREACIÓN DE LA VENTA
		
        // Obtener información del cliente si existe (tenant primero, luego global)
		let cliente_info = null;
		if (venta.cliente_id) {
          let clienteDoc = await db.collection('companies').doc(companyId).collection('clientes').doc(venta.cliente_id).get();
          if (!clienteDoc.exists) {
            const legacyCliente = await db.collection('clientes').doc(venta.cliente_id).get();
            if (legacyCliente.exists && (!legacyCliente.get('orgId') || legacyCliente.get('orgId') === companyId)) {
              clienteDoc = legacyCliente;
            }
          }
		  if (clienteDoc.exists) {
			const clienteData = clienteDoc.data();
			cliente_info = {
			  id: venta.cliente_id,
			  nombre: clienteData.nombre || '',
			  apellido: clienteData.apellido || '',
			  nombre_completo: `${clienteData.nombre || ''} ${clienteData.apellido || ''}`.trim(),
			  telefono: clienteData.telefono || '',
			  email: clienteData.email || ''
			};
		  }
		}
		
		// Generar número de venta (multi-tenant)
		const contador = await db.collection('companies').doc(companyId).collection('contadores').doc('ventas').get();
		let numeroVenta = 1;
		
		if (contador.exists) {
		  numeroVenta = (contador.data().ultimo || 0) + 1;
		  await db.collection('companies').doc(companyId).collection('contadores').doc('ventas').update({ ultimo: numeroVenta });
		} else {
		  await db.collection('companies').doc(companyId).collection('contadores').doc('ventas').set({ ultimo: numeroVenta });
		}
		
		const numeroFormateado = `V-${String(numeroVenta).padStart(6, '0')}`;
		
		// Estructura para Firebase
		const ventaFirebase = {
		  ...venta,
		  numero: numeroFormateado,
		  sucursal_id: venta.sucursal_id,
		  cliente_info: cliente_info || venta.cliente_info || {
			nombre: '',
			apellido: '',
			nombre_completo: venta.cliente_nombre || 'Cliente General'
		  },
		  fecha: venta.fecha || new Date().toISOString(),
		  fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
		  fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
		  estado: venta.estado || 'completada',
		  detalles: detalles,
		  total_pagado: parseFloat(venta.total_pagado || venta.monto_pagado || 0),
		  saldo_pendiente: parseFloat(venta.total) - parseFloat(venta.total_pagado || venta.monto_pagado || 0),
		  estado_pago: venta.estado_pago || 'pendiente',
		  ...(companyId ? { orgId: companyId } : {})
		};
		
		// Calcular estado de pago
		if (ventaFirebase.total_pagado >= parseFloat(venta.total)) {
		  ventaFirebase.estado_pago = 'pagado';
		  ventaFirebase.saldo_pendiente = 0;
		} else if (ventaFirebase.total_pagado > 0) {
		  ventaFirebase.estado_pago = 'parcial';
		}
		
		// USAR TRANSACCIÓN PARA ASEGURAR CONSISTENCIA
		const resultado = await db.runTransaction(async (transaction) => {
		  // Crear la venta
		  const ventaRef = db.collection('companies').doc(companyId).collection('ventas').doc();
		  transaction.set(ventaRef, ventaFirebase);
		  
		  // ACTUALIZAR STOCK EN LA SUCURSAL
		  console.log(`🔄 Actualizando stock en sucursal ${venta.sucursal_id}...`);
		  
		  for (const detalle of detalles) {
			// Buscar el stock en la sucursal
			const stockQuery = await db.collection('companies').doc(companyId).collection('stock_sucursal')
			  .where('producto_id', '==', detalle.producto_id)
			  .where('sucursal_id', '==', venta.sucursal_id)
			  .limit(1)
			  .get();
			
			if (stockQuery.empty) {
			  throw new Error(`Stock no encontrado para ${detalle.producto_info?.nombre || detalle.producto_id} en la sucursal`);
			}

			const stockDoc = stockQuery.docs[0];
			const stockData = stockDoc.data();
			const stockActual = parseFloat(stockData.cantidad || 0);
			// Usar cantidadParaStock si está disponible (para promociones con unidades gratis)
			const cantidadVenta = parseFloat(detalle.cantidadParaStock || detalle.cantidad || 0);
			if (stockActual < cantidadVenta) {
			  throw new Error(`Stock insuficiente para ${detalle.producto_info?.nombre || detalle.producto_id}`);
			}
			const nuevoStock = stockActual - cantidadVenta;
			  
			  console.log(`  📦 ${detalle.producto_info?.nombre || detalle.producto_id}: ${stockActual} - ${cantidadVenta} = ${nuevoStock}`);
			  
			  // Actualizar stock
			  transaction.update(stockDoc.ref, {
				cantidad: nuevoStock,
				ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
			  });
			  
			  // Registrar movimiento
			  const movimientoRef = db.collection('companies').doc(companyId).collection('movimientos_stock').doc();
			  transaction.set(movimientoRef, {
				sucursal_id: venta.sucursal_id,
				producto_id: detalle.producto_id,
				tipo: 'salida',
				cantidad: cantidadVenta, // Ya usa la cantidad correcta
				stock_anterior: stockActual,
				stock_nuevo: nuevoStock,
				motivo: 'Venta',
				referencia_tipo: 'venta',
				referencia_id: ventaRef.id,
				fecha: admin.firestore.FieldValue.serverTimestamp(),
				usuario_id: venta.usuario_id || 'sistema'
			  });
		  }
		  
		  return ventaRef.id;
		});
		
		console.log('✅ Venta procesada correctamente con ID:', resultado);
        // 💰 Registrar movimiento en caja (INGRESO por sucursal y medio de pago)
        try {
          const montoPagado = parseFloat(ventaFirebase.total_pagado || 0) || 0;
          if (montoPagado > 0) {
            const fechaISO = new Date().toISOString();
            const fechaDia = fechaISO.split('T')[0];
            const medio = venta.metodo_pago || 'efectivo';
            await db.collection('companies').doc(companyId).collection('caja')
              .doc(venta.sucursal_id).collection('movimientos').add({
                tipo: 'ingreso',
                monto: montoPagado,
                medio_pago: medio,
                concepto: `Venta ${ventaFirebase.numero} a ${ventaFirebase?.cliente_info?.nombre_completo || ventaFirebase?.cliente_info?.nombre || 'Cliente'}`,
                usuario: req.user?.email || req.user?.uid || 'sistema',
                observaciones: ventaFirebase.metodo_pago ? `Método: ${ventaFirebase.metodo_pago}` : '',
                fecha: fechaDia,
                hora: fechaISO.split('T')[1]?.slice(0,8) || '',
                referencia_tipo: 'venta',
                referencia_id: resultado,
                cliente_id: venta.cliente_id || null,
                cliente_nombre: ventaFirebase?.cliente_info?.nombre_completo || null,
                sucursal_id: venta.sucursal_id || null,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
              });
            console.log('💰 [CAJA] Ingreso registrado por venta:', { id: resultado, monto: montoPagado, medio });
          } else {
            console.log('💰 [CAJA] Venta a crédito - no registra ingreso inicial');
          }
        } catch (e) {
          console.warn('⚠️ [CAJA] No se pudo registrar ingreso por venta:', e.message);
        }
		
		res.status(201).json({
		  success: true,
		  data: {
			id: resultado,
			...ventaFirebase
		  },
		  message: 'Venta creada correctamente'
		});
		
	  } catch (error) {
		console.error('❌ Error al crear venta:', error);
		res.status(500).json({
		  success: false,
		  message: error.message || 'Error al crear venta',
		  error: error.message
		});
	  }
	  
	  return true;
	}
    
    // PUT /ventas/:id/estado - Cambiar estado de venta (multi-tenant)
    if (path.match(/^\/ventas\/[^\/]+\/estado$/) && req.method === 'PUT') {
      const ventaId = path.split('/')[2];
      const { estado, motivo, con_transporte } = req.body;

      console.log('🔍 [ESTADO VENTA] Debugging cambio de estado:', {
        ventaId: ventaId,
        estado: estado,
        motivo: motivo,
        reqUser: req.user,
        reqUserRol: req.user?.rol,
        method: req.method,
        path: path
      });

      const esAdmin = (req.user && req.user.rol && typeof req.user.rol === 'string' &&
        (req.user.rol.toLowerCase() === 'administrador' || req.user.rol.toLowerCase() === 'admin'));

      console.log('🔍 [ESTADO VENTA] Verificación de admin:', {
        tieneUser: !!req.user,
        tieneRol: !!req.user?.rol,
        rol: req.user?.rol,
        esAdmin: esAdmin
      });

      if (!esAdmin) {
        console.log('❌ [ESTADO VENTA] Usuario no es admin:', req.user);
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para cambiar el estado de una venta'
        });
        return true;
      }
      
      try {
        console.log(`🔄 Cambiando estado de venta ${ventaId} a ${estado}`);
        
        // Validar estado
        const estadosValidos = ['en_curso', 'entregado', 'cancelada', 'devuelta'];
        if (!estadosValidos.includes(estado)) {
          res.status(400).json({
            success: false,
            message: 'Estado inválido'
          });
          return true;
        }
        
        // Obtener venta actual desde tenant
        const ventaDoc = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).get();
        
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }
        
        const ventaData = ventaDoc.data();
        
        // Si se cancela o devuelve, revertir stock
        if ((estado === 'cancelada' || estado === 'devuelta') && ventaData.estado !== 'cancelada' && ventaData.estado !== 'devuelta') {
          console.log('🔄 Revirtiendo stock por cancelación/devolución...');
          
          // Revertir stock para cada producto
          for (const detalle of ventaData.detalles || []) {
            const stockQuery = await db.collection('companies').doc(companyId).collection('stock_sucursal')
              .where('producto_id', '==', detalle.producto_id)
              .where('sucursal_id', '==', ventaData.sucursal_id)
              .limit(1)
              .get();
            
            if (!stockQuery.empty) {
              const stockDoc = stockQuery.docs[0];
              const stockActual = parseInt(stockDoc.data().cantidad || 0);
              const cantidadARestaurar = parseInt(detalle.cantidad || 0);
              
              await stockDoc.ref.update({
                cantidad: stockActual + cantidadARestaurar,
                ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
              
              // Registrar movimiento
              await db.collection('companies').doc(companyId).collection('movimientos_stock').add({
                sucursal_id: ventaData.sucursal_id,
                producto_id: detalle.producto_id,
                tipo: 'entrada',
                cantidad: cantidadARestaurar,
                stock_anterior: stockActual,
                stock_nuevo: stockActual + cantidadARestaurar,
                motivo: estado === 'cancelada' ? 'Cancelación de venta' : 'Devolución de venta',
                referencia_tipo: 'venta',
                referencia_id: ventaId,
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                usuario_id: req.user?.uid || 'sistema'
              });
            }
          }
        }
        
        // Actualizar estado de la venta
        const actualizacion = {
          estado,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (motivo) {
          actualizacion.motivo_cambio = motivo;
          actualizacion[`fecha_${estado}`] = admin.firestore.FieldValue.serverTimestamp();
        }
		if (con_transporte !== undefined) actualizacion.con_transporte = con_transporte;
        
        console.log('🔍 [ESTADO VENTA] Actualizando venta con:', actualizacion);
        
        await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).update(actualizacion);
        
        console.log(`✅ Estado de venta ${ventaId} actualizado a ${estado}`);
        
        // Verificar que se actualizó correctamente
        const ventaActualizada = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).get();
        const datosActualizados = ventaActualizada.data();
        console.log('🔍 [ESTADO VENTA] Verificación post-actualización:', {
          estadoActual: datosActualizados.estado,
          fechaActualizacion: datosActualizados.fechaActualizacion
        });
        
        res.json({
          success: true,
          message: `Venta ${estado} correctamente`,
          data: {
            id: ventaId,
            estado: datosActualizados.estado,
            fechaActualizacion: datosActualizados.fechaActualizacion
          }
        });
        
      } catch (error) {
        console.error('❌ Error al cambiar estado de venta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al cambiar estado de venta',
          error: error.message
        });
      }
      
      return true;
    }
    
    // DELETE /ventas/:id - Eliminar venta (solo para usuarios autorizados)
    if (path.match(/^\/ventas\/[^\/]+\/?$/) && req.method === 'DELETE') {
      const ventaId = path.split('/')[2];
      
      console.log('🗑️ [ELIMINAR VENTA] Solicitud de eliminación:', {
        ventaId: ventaId,
        reqUser: req.user,
        reqUserEmail: req.user?.email,
        method: req.method,
        path: path
      });

      // Verificar permisos especiales
      const puedeEliminar = req.user && (
        req.user.email === 'danielcadiz15@gmail.com' ||
        (req.user.rol && typeof req.user.rol === 'string' &&
         (req.user.rol.toLowerCase() === 'administrador' || req.user.rol.toLowerCase() === 'admin' || req.user.rol === 'admin')) ||
        (req.user.permisos && req.user.permisos.ventas && req.user.permisos.ventas.eliminar === true)
      );

      console.log('🔍 [ELIMINAR VENTA] Verificación de permisos:', {
        tieneUser: !!req.user,
        email: req.user?.email,
        esEmailAutorizado: req.user?.email === 'danielcadiz15@gmail.com',
        tieneRol: !!req.user?.rol,
        rol: req.user?.rol,
        puedeEliminar: puedeEliminar
      });

      if (!puedeEliminar) {
        console.log('❌ [ELIMINAR VENTA] Usuario no autorizado:', req.user);
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar ventas'
        });
        return true;
      }
      
      try {
        console.log(`🗑️ Eliminando venta ${ventaId}`);
        console.log('🔍 [ELIMINAR VENTA] Contexto:', { companyId, user: req.user });
        
        // Obtener venta actual (TENANT primero, fallback legacy)
        let ventaDoc = null;
        if (companyId) {
          ventaDoc = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).get();
        }
        if (!ventaDoc || !ventaDoc.exists) {
          const legacyDoc = await db.collection('ventas').doc(ventaId).get();
          if (legacyDoc.exists) {
            // Si la venta está en legacy pero tenemos companyId, evitamos operar para no cruzar tenants
            if (companyId && legacyDoc.get('orgId') && legacyDoc.get('orgId') !== companyId) {
              return res.status(404).json({ success:false, message:'Venta no encontrada' });
            }
            ventaDoc = legacyDoc;
          }
        }
        
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }
        
        const ventaData = ventaDoc.data();
        
        // Restaurar stock antes de eliminar
        console.log('🔄 Restaurando stock por eliminación...');
        
        for (const detalle of ventaData.detalles || []) {
          const stockQuery = await (companyId
            ? db.collection('companies').doc(companyId).collection('stock_sucursal')
            : db.collection('stock_sucursal'))
            .where('producto_id', '==', detalle.producto_id)
            .where('sucursal_id', '==', ventaData.sucursal_id)
            .limit(1)
            .get();
          
          if (!stockQuery.empty) {
            const stockDoc = stockQuery.docs[0];
            const stockActual = parseInt(stockDoc.data().cantidad || 0);
            const cantidadARestaurar = parseInt(detalle.cantidad || 0);
            
            await stockDoc.ref.update({
              cantidad: stockActual + cantidadARestaurar,
              ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Registrar movimiento
            await (companyId
              ? db.collection('companies').doc(companyId).collection('movimientos_stock')
              : db.collection('movimientos_stock'))
              .add({
              sucursal_id: ventaData.sucursal_id,
              producto_id: detalle.producto_id,
              tipo: 'entrada',
              cantidad: cantidadARestaurar,
              stock_anterior: stockActual,
              stock_nuevo: stockActual + cantidadARestaurar,
              motivo: 'Eliminación de venta',
              referencia_tipo: 'venta',
              referencia_id: ventaId,
              fecha: admin.firestore.FieldValue.serverTimestamp(),
              usuario_id: req.user?.uid || 'sistema',
              eliminado_por: req.user?.email || 'sistema'
            });
          }
        }
        
        // Guardar en ventas_eliminadas antes de eliminar (tenant)
        const motivo = req.body?.motivo || 'Eliminación sin motivo especificado';
        
        const ventasEliminadasRef = companyId
          ? db.collection('companies').doc(companyId).collection('ventas_eliminadas').doc(ventaId)
          : db.collection('ventas_eliminadas').doc(ventaId);
        await ventasEliminadasRef.set({
          ...ventaData,
          eliminado_por: req.user?.email || 'sistema',
          fecha_eliminacion: admin.firestore.FieldValue.serverTimestamp(),
          motivo_eliminacion: motivo,
          usuario_eliminacion: req.user?.uid || 'sistema'
        });
        
        console.log(`📝 Venta ${ventaId} guardada en ventas_eliminadas`);

        // 💰 Registrar EGRESOS en caja por montos cobrados (por medio de pago)
        try {
          const sucursalId = ventaData.sucursal_id;
          const cajaMovsCol = companyId
            ? db.collection('companies').doc(companyId).collection('caja').doc(sucursalId).collection('movimientos')
            : null;

          // Sumar pagos registrados en subcolección
          let sumaPagosPorMedio = {};
          let sumaPagosTotal = 0;
          if (companyId && sucursalId) {
            const pagosSnap = await db.collection('companies').doc(companyId)
              .collection('ventas').doc(ventaId).collection('pagos').get();
            pagosSnap.forEach(docP => {
              const p = docP.data();
              const medio = p.medio_pago || p.metodo_pago || ventaData.metodo_pago || 'efectivo';
              const monto = parseFloat(p.monto || 0) || 0;
              sumaPagosPorMedio[medio] = (sumaPagosPorMedio[medio] || 0) + monto;
              sumaPagosTotal += monto;
            });

            // Considerar pago inicial registrado al crear la venta (si no generó doc en pagos)
            const totalPagadoVenta = parseFloat(ventaData.total_pagado || 0) || 0;
            const restanteInicial = totalPagadoVenta - sumaPagosTotal;
            if (restanteInicial > 0) {
              const medioInicial = ventaData.metodo_pago || 'efectivo';
              sumaPagosPorMedio[medioInicial] = (sumaPagosPorMedio[medioInicial] || 0) + restanteInicial;
            }

            // Generar egresos por cada medio
            const fechaISO = new Date().toISOString();
            const fechaDia = fechaISO.split('T')[0];
            for (const [medio, monto] of Object.entries(sumaPagosPorMedio)) {
              if (monto > 0 && cajaMovsCol) {
                await cajaMovsCol.add({
                  tipo: 'egreso',
                  monto: monto,
                  medio_pago: medio,
                  concepto: `Anulación/Reembolso venta ${ventaData.numero || ventaId}`,
                  usuario: req.user?.email || req.user?.uid || 'sistema',
                  observaciones: 'Reverso por eliminación de venta',
                  fecha: fechaDia,
                  hora: fechaISO.split('T')[1]?.slice(0,8) || '',
                  referencia_tipo: 'venta_anulada',
                  referencia_id: ventaId,
                  cliente_id: ventaData?.cliente_id || null,
                  sucursal_id: sucursalId,
                  fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            }

            // Opcional: eliminar documentos de pagos asociados
            const pagosSnap2 = await db.collection('companies').doc(companyId)
              .collection('ventas').doc(ventaId).collection('pagos').get();
            const batch = db.batch();
            pagosSnap2.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        } catch (cajaEgresoErr) {
          console.warn('⚠️ [CAJA] No se pudieron registrar egresos por eliminación:', cajaEgresoErr.message);
        }

        // Eliminar la venta
        if (companyId) {
          await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).delete();
        } else {
          await db.collection('ventas').doc(ventaId).delete();
        }
        
        console.log(`✅ Venta ${ventaId} eliminada correctamente`);
        
        res.json({
          success: true,
          message: 'Venta eliminada correctamente',
          data: {
            id: ventaId,
            eliminado_por: req.user?.email || 'sistema',
            fecha_eliminacion: new Date().toISOString()
          }
        });
        
      } catch (error) {
        console.error(`❌ Error al eliminar venta ${ventaId}:`, error);
        res.status(500).json({
          success: false,
          message: 'Error al eliminar la venta',
          error: error.message
        });
      }
      
      return true;
    }
    
    // PUT /ventas/:id - Actualizar venta completa
    if (path.match(/^\/ventas\/[^\/]+$/) && req.method === 'PUT') {
      const ventaId = path.split('/')[2];
      const datos = req.body;

      try {
        console.log(`✏️ Actualizando venta ${ventaId} con datos:`, datos);
        console.log(`🔍 Propiedades de modificación recibidas:`);
        console.log(`  - modificada:`, datos.modificada);
        console.log(`  - fecha_modificacion:`, datos.fecha_modificacion);
        console.log(`  - modificado_por:`, datos.modificado_por);

        // Validar que la venta existe
        const ventaDoc = await db.collection('ventas').doc(ventaId).get();
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }

        // Solo permitir editar ventas no entregadas
        const ventaActual = ventaDoc.data();
        if (ventaActual.estado === 'entregado') {
          res.status(400).json({
            success: false,
            message: 'No se puede editar una venta entregada'
          });
          return true;
        }

        // NUEVA LÓGICA: Manejar cambios de stock si se modificaron los detalles
        if (datos.detalles && Array.isArray(datos.detalles)) {
          console.log('🔄 Detectados cambios en detalles de venta, ajustando stock...');
          
          const detallesOriginales = ventaActual.detalles || [];
          const detallesNuevos = datos.detalles;
          
          // USAR TRANSACCIÓN PARA GARANTIZAR CONSISTENCIA
          await db.runTransaction(async (transaction) => {
            console.log('📊 Comparando detalles originales vs nuevos...');
            
            // Crear mapas para facilitar la comparación
            const mapaOriginal = new Map();
            const mapaNuevo = new Map();
            
            detallesOriginales.forEach(detalle => {
              const key = detalle.producto_id;
              mapaOriginal.set(key, {
                cantidad: parseInt(detalle.cantidad || 0),
                cantidadParaStock: parseInt(detalle.cantidadParaStock || detalle.cantidad || 0)
              });
            });
            
            detallesNuevos.forEach(detalle => {
              const key = detalle.producto_id;
              mapaNuevo.set(key, {
                cantidad: parseInt(detalle.cantidad || 0),
                cantidadParaStock: parseInt(detalle.cantidadParaStock || detalle.cantidad || 0)
              });
            });
            
            // Procesar todos los productos únicos
            const todosProductos = new Set([
              ...mapaOriginal.keys(),
              ...mapaNuevo.keys()
            ]);
            
            for (const productoId of todosProductos) {
              const original = mapaOriginal.get(productoId) || { cantidad: 0, cantidadParaStock: 0 };
              const nuevo = mapaNuevo.get(productoId) || { cantidad: 0, cantidadParaStock: 0 };
              
              const diferenciaStock = nuevo.cantidadParaStock - original.cantidadParaStock;
              
              console.log(`📦 Producto ${productoId}:`, {
                original: original.cantidadParaStock,
                nuevo: nuevo.cantidadParaStock,
                diferencia: diferenciaStock
              });
              
              if (diferenciaStock !== 0) {
                // Buscar stock en la sucursal
                const stockQuery = await db.collection('stock_sucursal')
                  .where('producto_id', '==', productoId)
                  .where('sucursal_id', '==', ventaActual.sucursal_id)
                  .limit(1)
                  .get();
                
                if (!stockQuery.empty) {
                  const stockDoc = stockQuery.docs[0];
                  const stockActual = parseInt(stockDoc.data().cantidad || 0);
                  const nuevoStock = Math.max(0, stockActual - diferenciaStock);
                  
                  console.log(`  🔄 Ajustando stock: ${stockActual} - ${diferenciaStock} = ${nuevoStock}`);
                  
                  // Actualizar stock
                  transaction.update(stockDoc.ref, {
                    cantidad: nuevoStock,
                    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  // Registrar movimiento
                  const movimientoRef = db.collection('movimientos_stock').doc();
                  transaction.set(movimientoRef, {
                    sucursal_id: ventaActual.sucursal_id,
                    producto_id: productoId,
                    tipo: diferenciaStock > 0 ? 'salida' : 'entrada',
                    cantidad: Math.abs(diferenciaStock),
                    stock_anterior: stockActual,
                    stock_nuevo: nuevoStock,
                    motivo: 'Edición de venta',
                    referencia_tipo: 'venta',
                    referencia_id: ventaId,
                    fecha: admin.firestore.FieldValue.serverTimestamp(),
                    usuario_id: datos.modificado_por || 'sistema'
                  });
                }
              }
            }
          });
          
          console.log('✅ Stock ajustado correctamente por edición de venta');
        }

        // Actualizar los campos permitidos
        const camposPermitidos = [
          'detalles', 'cliente_info', 'metodo_pago', 'notas', 'total', 'subtotal', 'descuento', 'impuestos', 'total_pagado', 'saldo_pendiente', 'estado_pago',
          'modificada', 'fecha_modificacion', 'modificado_por', 'cambios_realizados'
        ];
        const actualizacion = {};
        camposPermitidos.forEach(campo => {
          if (datos[campo] !== undefined) {
            actualizacion[campo] = datos[campo];
          }
        });
        actualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();

        await db.collection('ventas').doc(ventaId).update(actualizacion);

        console.log(`✅ Venta ${ventaId} actualizada correctamente`);
        
        // Log temporal para verificar que se guardaron las propiedades de modificación
        const ventaActualizada = await db.collection('ventas').doc(ventaId).get();
        const datosActualizados = ventaActualizada.data();
        console.log(`🔍 Verificando propiedades guardadas:`);
        console.log(`  - modificada:`, datosActualizados.modificada);
        console.log(`  - fecha_modificacion:`, datosActualizados.fecha_modificacion);
        console.log(`  - modificado_por:`, datosActualizados.modificado_por);
        
        res.json({
          success: true,
          message: 'Venta actualizada correctamente',
          data: actualizacion
        });
      } catch (error) {
        console.error('❌ Error al actualizar venta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar venta',
          error: error.message
        });
      }
      return true;
    }
    
    // POST /ventas/:id/pagos - Registrar pago (multi-tenant + caja por sucursal)
    if (path.match(/^\/ventas\/[^\/]+\/pagos$/) && req.method === 'POST') {
      const ventaId = path.split('/')[2];
      const pagoData = req.body || {};
      
      try {
        console.log(`💰 Registrando pago para venta ${ventaId}`);
        
        if (!companyId) {
          return res.status(400).json({ success:false, message:'CompanyId requerido' });
        }
        
        // Validar datos del pago
        const montoPago = parseFloat(pagoData.monto);
        if (!montoPago || montoPago <= 0) {
          res.status(400).json({ success: false, message: 'El monto del pago debe ser mayor a 0' });
          return true;
        }
        
        const ventaRef = db.collection('companies').doc(companyId).collection('ventas').doc(ventaId);
        const pagoRef = ventaRef.collection('pagos').doc();
        
        // Ejecutar operación atómica sobre la venta + creación del pago
        const resultadoTx = await db.runTransaction(async (transaction) => {
          const ventaSnap = await transaction.get(ventaRef);
          if (!ventaSnap.exists) {
            throw new Error('Venta no encontrada');
          }
          const venta = ventaSnap.data();
          const total = parseFloat(venta.total || 0);
          const totalPagadoActual = parseFloat(venta.total_pagado || 0);
          const sucursalId = venta.sucursal_id;
          
          // Calcular nuevos importes sin sobrepagar
          const pagoAplicable = Math.min(montoPago, Math.max(0, total - totalPagadoActual));
          const nuevoTotalPagado = totalPagadoActual + pagoAplicable;
          const nuevoSaldo = Math.max(0, total - nuevoTotalPagado);
          const nuevoEstadoPago = nuevoSaldo <= 0 ? 'pagado' : (nuevoTotalPagado > 0 ? 'parcial' : 'pendiente');
          
          // Crear pago
          const pago = {
            monto: pagoAplicable,
            medio_pago: pagoData.medio_pago || pagoData.metodo_pago || venta.metodo_pago || 'efectivo',
            concepto: pagoData.concepto || `Pago de venta ${venta.numero || ventaId}`,
            referencia: pagoData.referencia || '',
            observaciones: pagoData.observaciones || '',
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            usuario_id: req.user?.uid || 'sistema',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          };
          transaction.set(pagoRef, pago);
          
          // Actualizar venta
          transaction.update(ventaRef, {
            total_pagado: nuevoTotalPagado,
            saldo_pendiente: nuevoSaldo,
            estado_pago: nuevoEstadoPago,
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
          });
          
          return { pagoAplicable, sucursalId, medio_pago: pago.medio_pago, numero: venta.numero, cliente_info: venta.cliente_info };
        });
        
        // Registrar movimiento en caja (fuera de la transacción)
        try {
          if (resultadoTx.pagoAplicable > 0 && resultadoTx.sucursalId) {
            const fechaISO = new Date().toISOString();
            const fechaDia = fechaISO.split('T')[0];
            await db.collection('companies').doc(companyId).collection('caja')
              .doc(resultadoTx.sucursalId).collection('movimientos').add({
                tipo: 'ingreso',
                monto: resultadoTx.pagoAplicable,
                medio_pago: resultadoTx.medio_pago,
                concepto: `Pago venta ${resultadoTx.numero || ventaId}`,
                usuario: req.user?.email || req.user?.uid || 'sistema',
                observaciones: '',
                fecha: fechaDia,
                hora: fechaISO.split('T')[1]?.slice(0,8) || '',
                referencia_tipo: 'venta_pago',
                referencia_id: ventaId,
                cliente_id: resultadoTx?.cliente_info?.id || null,
                cliente_nombre: resultadoTx?.cliente_info?.nombre_completo || null,
                sucursal_id: resultadoTx.sucursalId,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
              });
            console.log('💰 [CAJA] Ingreso registrado por pago de venta:', { id: ventaId, monto: resultadoTx.pagoAplicable });
          }
        } catch (cajaErr) {
          console.warn('⚠️ [CAJA] No se pudo registrar ingreso por pago:', cajaErr.message);
        }
        
        console.log(`✅ Pago registrado correctamente para venta ${ventaId}`);
        res.json({ success: true, message: 'Pago registrado correctamente' });
        
      } catch (error) {
        console.error('❌ Error al registrar pago:', error);
        res.status(500).json({ success: false, message: 'Error al registrar pago', error: error.message });
      }
      return true;
    }
    
    // DELETE /ventas/:id - Eliminar venta (solo si está pendiente) [LEGACY - se mantiene por compatibilidad]
    if (path.match(/^\/ventas\/[^\/]+$/) && req.method === 'DELETE') {
      const ventaId = path.split('/')[2];
      
      try {
        console.log(`🗑️ Eliminando venta ${ventaId}`);
        
        const ventaDoc = await db.collection('ventas').doc(ventaId).get();
        
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }
        
        const venta = ventaDoc.data();
        
        // Solo permitir eliminar ventas en curso o pendientes
        if (venta.estado !== 'en_curso' && venta.estado !== 'pendiente') {
          res.status(400).json({
            success: false,
            message: 'Solo se pueden eliminar ventas en curso o pendientes'
          });
          return true;
        }
        
        // Crear registro de venta eliminada
        const ventaEliminada = {
          venta_original: venta,
          fecha_eliminacion: admin.firestore.FieldValue.serverTimestamp(),
          motivo: req.body.motivo || 'Eliminación manual',
          usuario_eliminacion: req.user?.email || 'sistema',
          sucursal_id: venta.sucursal_id
        };
        
        // Restaurar stock de productos
        const batch = db.batch();
        
        // Restaurar stock para cada producto
        for (const detalle of venta.detalles || []) {
          const stockQuery = await db.collection('stock_sucursal')
            .where('producto_id', '==', detalle.producto_id)
            .where('sucursal_id', '==', venta.sucursal_id)
            .limit(1)
            .get();
          
          if (!stockQuery.empty) {
            const stockDoc = stockQuery.docs[0];
            const stockActual = parseInt(stockDoc.data().cantidad || 0);
            const cantidadARestaurar = parseInt(detalle.cantidad || 0);
            
            batch.update(stockDoc.ref, {
              cantidad: stockActual + cantidadARestaurar,
              ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Registrar movimiento de stock
            batch.set(db.collection('movimientos_stock').doc(), {
              sucursal_id: venta.sucursal_id,
              producto_id: detalle.producto_id,
              tipo: 'entrada',
              cantidad: cantidadARestaurar,
              stock_anterior: stockActual,
              stock_nuevo: stockActual + cantidadARestaurar,
              motivo: 'Eliminación de venta',
              referencia_tipo: 'venta_eliminada',
              referencia_id: ventaId,
              fecha: admin.firestore.FieldValue.serverTimestamp(),
              usuario_id: req.user?.uid || 'sistema'
            });
          }
        }
        
        // Eliminar pagos asociados
        const pagosSnapshot = await db.collection('ventas').doc(ventaId).collection('pagos').get();
        pagosSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Guardar registro de venta eliminada
        console.log('🗑️ [DEBUG] Guardando venta eliminada en colección ventas_eliminadas');
        console.log('🗑️ [DEBUG] Venta ID:', ventaId);
        console.log('🗑️ [DEBUG] Datos de venta eliminada:', JSON.stringify(ventaEliminada, null, 2));
        batch.set(db.collection('ventas_eliminadas').doc(ventaId), ventaEliminada);
        
        // Eliminar venta original
        batch.delete(ventaDoc.ref);
        
        await batch.commit();
        
        console.log(`✅ Venta ${ventaId} eliminada correctamente`);
        console.log('🗑️ [DEBUG] Batch commit completado');
        
        // Verificar que se guardó correctamente
        try {
          const ventaEliminadaDoc = await db.collection('ventas_eliminadas').doc(ventaId).get();
          if (ventaEliminadaDoc.exists) {
            console.log('🗑️ [DEBUG] ✅ Venta eliminada confirmada en base de datos');
          } else {
            console.log('🗑️ [DEBUG] ❌ Venta eliminada NO encontrada en base de datos');
          }
        } catch (error) {
          console.log('🗑️ [DEBUG] ❌ Error al verificar venta eliminada:', error.message);
        }
        
        res.json({
          success: true,
          message: 'Venta eliminada correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al eliminar venta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al eliminar venta',
          error: error.message
        });
      }
      
      return true;
    }
    
    // RUTA ELIMINADA: Se movió al principio del archivo para evitar conflictos con rutas dinámicas
    
    // PUT /ventas/:id/notas - Actualizar notas de una venta (multi-tenant)
    if (path.match(/^\/ventas\/[^\/]+\/notas$/) && req.method === 'PUT') {
      const ventaId = path.split('/')[2];
      const { notas } = req.body;
      
      try {
        console.log(`📝 Actualizando notas de venta ${ventaId}`);
        
        await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).update({
          notas: notas || '',
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Notas actualizadas para venta ${ventaId}`);
        
        res.json({
          success: true,
          message: 'Notas actualizadas correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al actualizar notas:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar notas',
          error: error.message
        });
      }
      
      return true;
    }
    
    // GET /ventas/:id/pagos - Obtener historial completo de pagos (multi-tenant)
    if (path.match(/^\/ventas\/[^\/]+\/pagos$/) && req.method === 'GET') {
      const ventaId = path.split('/')[2];
      
      try {
        console.log(`💰 Obteniendo historial de pagos para venta ${ventaId}`);
        
        const pagosSnapshot = await (companyId
          ? db.collection('companies').doc(companyId).collection('ventas')
              .doc(ventaId)
          : db.collection('ventas').doc(ventaId))
          .collection('pagos')
          .orderBy('fecha', 'desc')
          .get();
        
        const pagos = [];
        
        for (const doc of pagosSnapshot.docs) {
          const pagoData = doc.data();
          const pago = {
            id: doc.id,
            ...pagoData,
            fecha: pagoData.fecha?.toDate ? pagoData.fecha.toDate().toISOString() : pagoData.fecha
          };
          
          // Enriquecer con nombre de usuario
          if (pago.usuario_id) {
            try {
              const usuarioDoc = await db.collection('usuarios').doc(pago.usuario_id).get();
              if (usuarioDoc.exists) {
                const userData = usuarioDoc.data();
                pago.usuario_nombre = userData.nombre || userData.email || 'Usuario desconocido';
              }
            } catch (error) {
              console.warn('No se pudo obtener nombre de usuario');
            }
          }
          
          pagos.push(pago);
        }
        
        console.log(`✅ ${pagos.length} pagos encontrados`);
        
        res.json({
          success: true,
          data: pagos,
          total: pagos.length,
          message: 'Historial de pagos obtenido correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al obtener pagos:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener historial de pagos',
          error: error.message
        });
      }
      
      return true;
    }
    
    // GET /ventas/cuentas-por-cobrar - Obtener todas las ventas con saldo pendiente
    if (path === '/ventas/cuentas-por-cobrar' && req.method === 'GET') {
      try {
        console.log('📊 Obteniendo cuentas por cobrar...');
        
        const { cliente_id, sucursal_id, desde, hasta } = req.query;
        
        // Query base: ventas con saldo pendiente > 0
        let query = db.collection('companies').doc(companyId).collection('ventas')
          .where('saldo_pendiente', '>', 0)
          .where('estado', '!=', 'cancelada');
        
        // Aplicar filtros opcionales
        if (cliente_id) {
          query = query.where('cliente_id', '==', cliente_id);
        }
        
        if (sucursal_id) {
          query = query.where('sucursal_id', '==', sucursal_id);
        }
        
        const ventasSnapshot = await query.get();
        
        const ventas = [];
        let totalPendiente = 0;
        const clientesDeuda = new Set();
        
        // Filtrar por fechas si se proporcionan
        ventasSnapshot.forEach(doc => {
          const venta = { id: doc.id, ...doc.data() };
          
          // Filtrar por rango de fechas si se especifica
          if (desde || hasta) {
            const fechaVenta = new Date(venta.fecha);
            if (desde && fechaVenta < new Date(desde)) return;
            if (hasta && fechaVenta > new Date(hasta)) return;
          }
          
          ventas.push(venta);
          totalPendiente += venta.saldo_pendiente || 0;
          
          if (venta.cliente_id) {
            clientesDeuda.add(venta.cliente_id);
          }
        });
        
        // Enriquecer con información de clientes
        if (enriquecerVentasConClientes) {
          const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
          
          // Agrupar por cliente
          const porCliente = {};
          ventasEnriquecidas.forEach(venta => {
            const clienteKey = venta.cliente_id || 'sin-cliente';
            if (!porCliente[clienteKey]) {
              porCliente[clienteKey] = {
                cliente_id: venta.cliente_id,
                cliente_info: venta.cliente_info,
                ventas: [],
                total_pendiente: 0,
                cantidad_ventas: 0
              };
            }
            
            porCliente[clienteKey].ventas.push(venta);
            porCliente[clienteKey].total_pendiente += venta.saldo_pendiente;
            porCliente[clienteKey].cantidad_ventas++;
          });
          
          console.log(`✅ Cuentas por cobrar: ${ventas.length} ventas, ${clientesDeuda.size} clientes`);
          
          res.json({
            success: true,
            data: {
              ventas: ventasEnriquecidas,
              por_cliente: Object.values(porCliente),
              resumen: {
                total_pendiente: totalPendiente,
                cantidad_ventas: ventas.length,
                clientes_con_deuda: clientesDeuda.size
              }
            },
            message: 'Cuentas por cobrar obtenidas correctamente'
          });
        } else {
          res.json({
            success: true,
            data: {
              ventas,
              resumen: {
                total_pendiente: totalPendiente,
                cantidad_ventas: ventas.length,
                clientes_con_deuda: clientesDeuda.size
              }
            },
            message: 'Cuentas por cobrar obtenidas correctamente'
          });
        }
        
      } catch (error) {
        console.error('❌ Error al obtener cuentas por cobrar:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener cuentas por cobrar',
          error: error.message
        });
      }
      
      return true;
    }
    
    // POST /ventas/:id/recordatorio - Enviar recordatorio de pago (multi-tenant)
    if (path.match(/^\/ventas\/[^\/]+\/recordatorio$/) && req.method === 'POST') {
      const ventaId = path.split('/')[2];
      const { medio, mensaje, destinatario } = req.body;
      
      try {
        console.log(`📧 Enviando recordatorio para venta ${ventaId}`);
        
        // Obtener datos de la venta
        const ventaDoc = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).get();
        
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }
        
        const venta = ventaDoc.data();
        
        // Registrar el recordatorio
        await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).collection('recordatorios').add({
          medio: medio || 'email',
          mensaje: mensaje || `Recordatorio de pago pendiente por ${venta.saldo_pendiente}`,
          destinatario: destinatario || venta.cliente_info?.email || '',
          fecha_envio: admin.firestore.FieldValue.serverTimestamp(),
          usuario_id: req.user?.uid || 'sistema',
          estado: 'enviado'
        });
        
        // TODO: Aquí integrarías con tu servicio de email/SMS real
        // Por ejemplo: await emailService.enviarEmail(...)
        
        console.log(`✅ Recordatorio enviado para venta ${ventaId}`);
        
        res.json({
          success: true,
          message: 'Recordatorio enviado correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al enviar recordatorio:', error);
        res.status(500).json({
          success: false,
          message: 'Error al enviar recordatorio',
          error: error.message
        });
      }
      
      return true;
    }
    
    // GET /ventas/:id/intereses-mora - Calcular intereses por mora (multi-tenant)
    if (path.match(/^\/ventas\/[^\/]+\/intereses-mora$/) && req.method === 'GET') {
      const ventaId = path.split('/')[2];
      
      try {
        console.log(`💰 Calculando intereses de mora para venta ${ventaId}`);
        
        const ventaDoc = await db.collection('companies').doc(companyId).collection('ventas').doc(ventaId).get();
        
        if (!ventaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Venta no encontrada'
          });
          return true;
        }
        
        const venta = ventaDoc.data();
        
        // Solo calcular si hay saldo pendiente
        if (!venta.saldo_pendiente || venta.saldo_pendiente <= 0) {
          res.json({
            success: true,
            data: {
              dias_mora: 0,
              interes_diario: 0,
              interes_total: 0,
              saldo_con_intereses: venta.saldo_pendiente || 0
            }
          });
          return true;
        }
        
        // Calcular días de mora
        const fechaVenta = new Date(venta.fecha);
        const hoy = new Date();
        const diasTranscurridos = Math.floor((hoy - fechaVenta) / (1000 * 60 * 60 * 24));
        
        // Configuración de intereses (podrías obtenerla de una colección de configuración)
        const DIAS_GRACIA = 30; // Días antes de aplicar intereses
        const TASA_INTERES_DIARIA = 0.001; // 0.1% diario = 3% mensual
        
        const diasMora = Math.max(0, diasTranscurridos - DIAS_GRACIA);
        const interesDiario = venta.saldo_pendiente * TASA_INTERES_DIARIA;
        const interesTotal = diasMora * interesDiario;
        
        const resultado = {
          dias_transcurridos: diasTranscurridos,
          dias_gracia: DIAS_GRACIA,
          dias_mora: diasMora,
          tasa_diaria: TASA_INTERES_DIARIA,
          interes_diario: interesDiario,
          interes_total: interesTotal,
          saldo_original: venta.saldo_pendiente,
          saldo_con_intereses: venta.saldo_pendiente + interesTotal
        };
        
        console.log(`✅ Intereses calculados:`, resultado);
        
        res.json({
          success: true,
          data: resultado,
          message: 'Intereses calculados correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al calcular intereses:', error);
        res.status(500).json({
          success: false,
          message: 'Error al calcular intereses',
          error: error.message
        });
      }
      
      return true;
    }
    // Si ninguna ruta coincide
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = ventasRoutes;