// functions/routes/clientes.routes.js - ACTUALIZADO CON IMPORTACIÓN Y SALDOS
const admin = require('firebase-admin');
const db = admin.firestore();
const { configurarCORS, manejarPreflight } = require('../utils/cors');
const { FieldPath } = require('firebase-admin').firestore;

// Función para manejar todas las rutas de clientes
const clientesRoutes = async (req, res, path) => {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    // CLIENTES - GET todos
    if (path === '/clientes' && req.method === 'GET') {
      let ref = db.collection('clientes');
      if (companyId) ref = ref.where('orgId', '==', companyId);
      const clientesSnapshot = await ref.get();
      const clientes = [];
      
      clientesSnapshot.forEach(doc => {
        clientes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Clientes encontrados: ${clientes.length}`);
      
      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
        message: 'Clientes obtenidos correctamente'
      });
      return true;
    }
    
    // CLIENTES - GET activos
    else if (path === '/clientes/activos' && req.method === 'GET') {
      let ref = db.collection('clientes').where('activo', '==', true);
      if (companyId) ref = ref.where('orgId', '==', companyId);
      const clientesSnapshot = await ref.get();
      
      const clientes = [];
      clientesSnapshot.forEach(doc => {
        clientes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
        message: 'Clientes activos obtenidos correctamente'
      });
      return true;
    }
    
    // CLIENTES - Búsqueda (CORREGIDO)
    else if (path === '/clientes/buscar' && req.method === 'GET') {
      const { termino } = req.query;
      
      if (!termino) {
        // Si no hay término, devolver todos los clientes
        let ref = db.collection('clientes');
        if (companyId) ref = ref.where('companyId', '==', companyId);
        const clientesSnapshot = await ref.get();
        const clientes = [];
        
        clientesSnapshot.forEach(doc => {
          clientes.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        res.json({
          success: true,
          data: clientes,
          message: 'Todos los clientes obtenidos'
        });
        return true;
      }
      
      // Búsqueda flexible por nombre, apellido, teléfono o email
      let refAll = db.collection('clientes');
      if (companyId) refAll = refAll.where('companyId', '==', companyId);
      const clientesSnapshot = await refAll.get();
      const clientes = [];
      const terminoLower = termino.toLowerCase();
      
      for (const doc of clientesSnapshot.docs) {
        try {
          const data = doc.data();
          
          // CORRECCIÓN: Convertir todos los campos a string de forma segura
          const nombre = String(data.nombre || '').toLowerCase();
          const apellido = String(data.apellido || '').toLowerCase();
          const telefono = String(data.telefono || '').toLowerCase();
          const email = String(data.email || '').toLowerCase();
          const dni_cuit = String(data.dni_cuit || '').toLowerCase();
          
          // Búsqueda en todos los campos
          if (nombre.includes(terminoLower) || 
              apellido.includes(terminoLower) || 
              telefono.includes(terminoLower) || 
              email.includes(terminoLower) ||
              dni_cuit.includes(terminoLower) ||
              `${nombre} ${apellido}`.includes(terminoLower)) {
            // Buscar ventas con saldo pendiente para este cliente
            let deudas = [];
            try {
              const ventasSnapshot = await db.collection('ventas')
                .where('cliente_id', '==', doc.id)
                .where('saldo_pendiente', '>', 0)
                .get();
              deudas = ventasSnapshot.docs.map(ventaDoc => {
                const venta = ventaDoc.data();
                return {
                  id_venta: ventaDoc.id,
                  importe: parseFloat(venta.saldo_pendiente || 0),
                  fecha: venta.fecha || null
                };
              });
            } catch (errVentas) {
              console.warn(`⚠️ Error consultando ventas para cliente ${doc.id}:`, errVentas.message);
              deudas = [];
            }
            clientes.push({
              id: doc.id,
              ...data,
              deudas
            });
          }
        } catch (error) {
          console.warn(`⚠️ Error procesando cliente ${doc.id}:`, error.message);
          // Si hay error, igual agregar el cliente sin deudas
          clientes.push({
            id: doc.id,
            ...doc.data(),
            deudas: []
          });
        }
      }
      
      console.log(`🔍 Búsqueda "${termino}": ${clientes.length} clientes encontrados`);
      
      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
        message: 'Búsqueda de clientes completada'
      });
      return true;
    }

    // 🆕 NUEVO: GET /clientes/con-deuda - Optimizado: buscar deudas directamente en ventas
    else if (path === '/clientes/con-deuda') {
      if (manejarPreflight(req, res)) return true;
      if (req.method === 'GET') {
        configurarCORS(res);
        try {
          const MILISEGUNDOS_15_DIAS = 15 * 24 * 60 * 60 * 1000;
          const hoy = new Date();
          // Traer todas las ventas con saldo pendiente > 0
          const ventasSnapshot = await db.collection('ventas')
            .where('saldo_pendiente', '>', 0)
            .get();
          // Agrupar deudas por cliente_id
          const deudasPorCliente = {};
          ventasSnapshot.forEach(ventaDoc => {
            const venta = ventaDoc.data();
            const clienteId = venta.cliente_id;
            if (!clienteId) return;
            const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
            const fechaVenta = venta.fecha ? new Date(venta.fecha) : null;
            const dias = fechaVenta ? (hoy - fechaVenta) : 0;
            // Excluir ventas canceladas
            if (venta.estado === 'cancelada') return;
            if (saldoPendiente > 0 && fechaVenta && dias > MILISEGUNDOS_15_DIAS) {
              if (!deudasPorCliente[clienteId]) deudasPorCliente[clienteId] = [];
              deudasPorCliente[clienteId].push({
                id_venta: ventaDoc.id,
                importe: saldoPendiente,
                fecha: venta.fecha,
                dias_atraso: Math.floor(dias / (1000 * 60 * 60 * 24)),
                estado: venta.estado || 'Pendiente'
              });
            }
          });
          // Traer datos de los clientes con deuda
          const clienteIds = Object.keys(deudasPorCliente);
          let clientesConDeuda = [];
          if (clienteIds.length > 0) {
            // Para evitar sobrecarga, traer los datos de los clientes en lotes de 10
            for (let i = 0; i < clienteIds.length; i += 10) {
              const batchIds = clienteIds.slice(i, i + 10);
              const batchSnapshot = await db.collection('clientes').where(FieldPath.documentId(), 'in', batchIds).get();
              batchSnapshot.forEach(clienteDoc => {
                const cliente = { id: clienteDoc.id, ...clienteDoc.data() };
                const deudas = deudasPorCliente[cliente.id] || [];
                const deuda_total = deudas.reduce((sum, d) => sum + d.importe, 0);
                clientesConDeuda.push({
                  ...cliente,
                  deuda_total,
                  ventas_con_deuda: deudas.length,
                  deudas
                });
              });
            }
          }
          clientesConDeuda.sort((a, b) => b.deuda_total - a.deuda_total);
          res.json({
            success: true,
            data: clientesConDeuda,
            total: clientesConDeuda.length,
            message: 'Clientes con deudas mayores a 15 días (optimizado desde ventas).'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Error al obtener clientes con deuda (optimizado)',
            error: error.message
          });
        }
        return true;
      }
      return false;
    }

    // 🆕 NUEVO: GET /clientes/sin-compras - Clientes sin compras en período
    else if (path === '/clientes/sin-compras') {
      if (manejarPreflight(req, res)) return true;
      if (req.method === 'GET') {
        try {
          configurarCORS(res);
          const { fechaInicio, fechaFin } = req.query;
          console.log(`🔍 Obteniendo clientes sin compras desde ${fechaInicio} hasta ${fechaFin}`);
          
          if (!fechaInicio || !fechaFin) {
            res.status(400).json({
              success: false,
              message: 'fechaInicio y fechaFin son requeridos'
            });
            return true;
          }
          
          // Convertir a string ISO (solo la parte de fecha, sin hora)
          const fechaInicioISO = new Date(fechaInicio).toISOString();
          const fechaFinObj = new Date(fechaFin);
          fechaFinObj.setHours(23, 59, 59, 999);
          const fechaFinISO = fechaFinObj.toISOString();
          
          // Obtener todos los clientes
          const clientesSnapshot = await db.collection('clientes').get();
          const clientesSinCompras = [];
          
          // Procesar cada cliente
          for (const doc of clientesSnapshot.docs) {
            const cliente = { id: doc.id, ...doc.data() };
            
            // Verificar si tiene ventas en el período
            const ventasSnapshot = await db.collection('ventas')
              .where('cliente_id', '==', cliente.id)
              .where('fecha', '>=', fechaInicioISO)
              .where('fecha', '<=', fechaFinISO)
              .get();
            
            // Si no tiene ventas en el período, agregarlo a la lista
            if (ventasSnapshot.empty) {
              // Obtener la última compra para mostrar información adicional
              const ultimaVentaSnapshot = await db.collection('ventas')
                .where('cliente_id', '==', cliente.id)
                .orderBy('fecha', 'desc')
                .limit(1)
                .get();
              
              let ultimaCompra = null;
              let totalHistorico = 0;
              
              if (!ultimaVentaSnapshot.empty) {
                const ultimaVenta = ultimaVentaSnapshot.docs[0].data();
                ultimaCompra = ultimaVenta.fecha;
                
                // Calcular total histórico
                const todasLasVentas = await db.collection('ventas')
                  .where('cliente_id', '==', cliente.id)
                  .get();
                
                todasLasVentas.forEach(ventaDoc => {
                  totalHistorico += parseFloat(ventaDoc.data().total || 0);
                });
              }
              
              clientesSinCompras.push({
                ...cliente,
                ultima_compra: ultimaCompra,
                total_historico: totalHistorico,
                dias_sin_comprar: ultimaCompra ? 
                  Math.floor((new Date() - new Date(ultimaCompra)) / (1000 * 60 * 60 * 24)) : null
              });
            }
          }
          
          // Ordenar por última compra (más antiguos primero)
          clientesSinCompras.sort((a, b) => {
            if (!a.ultima_compra && !b.ultima_compra) return 0;
            if (!a.ultima_compra) return 1;
            if (!b.ultima_compra) return -1;
            return new Date(a.ultima_compra) - new Date(b.ultima_compra);
          });
          
          res.json({
            success: true,
            data: clientesSinCompras,
            total: clientesSinCompras.length,
            message: `Clientes sin compras desde ${fechaInicio} hasta ${fechaFin}`
          });
          
        } catch (error) {
          console.error('❌ Error al obtener clientes sin compras:', error);
          res.status(500).json({
            success: false,
            message: 'Error al obtener clientes sin compras',
            error: error.message
          });
        }
        return true;
      }
      return false;
    }

    // 🆕 NUEVO: GET /clientes/{id}/deudas - Obtener deudas de un cliente específico
    else if (path.match(/^\/clientes\/([^\/]+)\/deudas$/)) {
      if (manejarPreflight(req, res)) return true;
      if (req.method === 'GET') {
        try {
          configurarCORS(res);
          const clienteId = path.match(/^\/clientes\/([^\/]+)\/deudas$/)[1];
          console.log(`🔍 Obteniendo deudas para cliente ID: ${clienteId}`);
          
          // Verificar que el cliente existe
          const clienteDoc = await db.collection('clientes').doc(clienteId).get();
          if (!clienteDoc.exists) {
            res.status(404).json({
              success: false,
              message: 'Cliente no encontrado'
            });
            return true;
          }
          
          // 🆕 CORREGIDO: Obtener tanto ventas pendientes como calcular saldo total
          const ventasSnapshot = await db.collection('ventas')
            .where('cliente_id', '==', clienteId)
            .get();
          
          const deudas = [];
          let totalDeuda = 0;
          let saldoTotal = 0;
          let totalVentas = 0;
          let totalPagado = 0;
          
          // Procesar todas las ventas para calcular saldo total
          console.log(`🔍 Procesando ${ventasSnapshot.size} ventas para cliente ${clienteId}`);
          
          ventasSnapshot.forEach(ventaDoc => {
            const venta = ventaDoc.data();
            
            // Excluir ventas canceladas
            if (venta.estado === 'cancelada') {
              console.log(`⚠️ Venta ${ventaDoc.id} cancelada, saltando`);
              return;
            }
            
            const totalVenta = parseFloat(venta.total || 0);
            const montoPagado = parseFloat(venta.monto_pagado || 0);
            const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
            
            console.log(`📊 Venta ${ventaDoc.id}: Total: $${totalVenta}, Pagado: $${montoPagado}, Pendiente: $${saldoPendiente}`);
            
            totalVentas += totalVenta;
            totalPagado += montoPagado;
            
            // Si hay saldo pendiente específico, agregarlo a las deudas
            if (saldoPendiente > 0) {
              console.log(`💰 Venta ${ventaDoc.id} tiene saldo pendiente: $${saldoPendiente}`);
              
              const fechaVenta = venta.fecha ? new Date(venta.fecha) : new Date();
              const diasAtraso = Math.floor((new Date() - fechaVenta) / (1000 * 60 * 60 * 24));
              
              deudas.push({
                id_venta: ventaDoc.id,
                numero_venta: venta.numero || ventaDoc.id,
                fecha: venta.fecha,
                total_venta: totalVenta,
                saldo_pendiente: saldoPendiente,
                dias_atraso: diasAtraso,
                estado: venta.estado || 'Pendiente',
                sucursal: venta.sucursal || 'Principal'
              });
              
              totalDeuda += saldoPendiente;
            } else {
              console.log(`✅ Venta ${ventaDoc.id} sin saldo pendiente`);
            }
          });
          
          // 🆕 CORREGIDO: Calcular saldo total del cliente considerando deudas pendientes
          // Si hay saldo_pendiente > 0, el cliente debe dinero (saldo negativo)
          saldoTotal = totalDeuda > 0 ? -totalDeuda : 0;
          
          // 🆕 NUEVO: Si no hay deudas pendientes pero sí saldo negativo, crear deuda simulada
          if (deudas.length === 0 && saldoTotal < 0) {
            console.log(`⚠️ Cliente ${clienteId} sin ventas pendientes pero con saldo negativo: $${Math.abs(saldoTotal)}`);
            
            deudas.push({
              id_venta: 'saldo_total',
              numero_venta: 'Saldo Total',
              fecha: new Date().toISOString(),
              total_venta: Math.abs(saldoTotal),
              saldo_pendiente: Math.abs(saldoTotal),
              dias_atraso: 0,
              estado: 'Pendiente',
              sucursal: 'General'
            });
            
            totalDeuda = Math.abs(saldoTotal);
          }
          
          // Ordenar por fecha (más antiguas primero)
          deudas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          
          console.log(`✅ Deudas obtenidas para cliente ${clienteId}: ${deudas.length} ventas, Total: $${totalDeuda}, Saldo Total: $${saldoTotal}`);
          
          res.json({
            success: true,
            data: deudas,
            total_deuda: totalDeuda,
            cantidad_ventas_pendientes: deudas.length,
            cliente_id: clienteId,
            saldo_total: saldoTotal,
            total_ventas: totalVentas,
            total_pagado: totalPagado,
            message: `Deudas del cliente obtenidas correctamente`
          });
          
        } catch (error) {
          console.error('❌ Error al obtener deudas del cliente:', error);
          res.status(500).json({
            success: false,
            message: 'Error al obtener deudas del cliente',
            error: error.message
          });
        }
        return true;
      }
      return false;
    }
    
    // 🆕 NUEVO: GET /clientes/:id/saldo - Calcular saldo en tiempo real
    else if (path.match(/^\/clientes\/[^\/]+\/saldo$/) && req.method === 'GET') {
      const clienteId = path.split('/')[2];
      
      try {
        console.log(`🧮 Calculando saldo para cliente: ${clienteId}`);
        
        // Obtener todas las ventas del cliente
        const ventasSnapshot = await db.collection('ventas')
          .where('cliente_id', '==', clienteId)
          .get();
        
        let saldoTotal = 0;
        let totalVentas = 0;
        let totalPagado = 0;
        
        ventasSnapshot.forEach(doc => {
          const venta = doc.data();
          const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
          const total = parseFloat(venta.total || 0);
          const pagado = parseFloat(venta.total_pagado || 0);
          
          // 🆕 CORREGIDO: Solo sumar saldos pendientes (deudas)
          if (saldoPendiente > 0) {
            saldoTotal += saldoPendiente;
          }
          totalVentas += total;
          totalPagado += pagado;
        });
        
        console.log(`✅ Saldo calculado: ${saldoTotal} (${ventasSnapshot.size} ventas)`);
        
        res.json({
          success: true,
          data: {
            cliente_id: clienteId,
            saldo_actual: saldoTotal,
            total_ventas: totalVentas,
            total_pagado: totalPagado,
            cantidad_ventas: ventasSnapshot.size
          },
          message: 'Saldo calculado correctamente'
        });
        
      } catch (error) {
        console.error(`❌ Error al calcular saldo del cliente ${clienteId}:`, error);
        res.status(500).json({
          success: false,
          message: 'Error al calcular saldo del cliente',
          error: error.message
        });
      }
      return true;
    }

    // CLIENTE - GET por ID
    else if (path.startsWith('/clientes/') && req.method === 'GET') {
      const clienteId = path.split('/clientes/')[1];
      
      // Verificar si es una ruta especial
      if (clienteId === 'activos' || clienteId === 'buscar') {
        return false; // Ya manejado arriba
      }
      
      const clienteDoc = await db.collection('clientes').doc(clienteId).get();
      if (companyId && clienteDoc.exists && clienteDoc.data().orgId && clienteDoc.data().orgId !== companyId) {
        return res.status(403).json({ success:false, message: 'No autorizado' });
      }
      
      if (!clienteDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
        return true;
      }
      
      res.json({
        success: true,
        data: {
          id: clienteDoc.id,
          ...clienteDoc.data()
        },
        message: 'Cliente obtenido correctamente'
      });
      return true;
    }
    
    // CLIENTES - POST crear nuevo
    else if (path === '/clientes' && req.method === 'POST') {
      const nuevoCliente = req.body;
      
      // Validación básica
      if (!nuevoCliente.nombre) {
        res.status(400).json({
          success: false,
          message: 'El nombre del cliente es requerido'
        });
        return true;
      }
      
      // Estructura para Firebase (SIN campos estáticos de saldo)
      const clienteFirebase = {
        nombre: String(nuevoCliente.nombre?.trim() || ''),
        apellido: String(nuevoCliente.apellido?.trim() || ''),
        telefono: String(nuevoCliente.telefono?.trim() || ''),
        email: String(nuevoCliente.email?.trim() || ''),
        direccion: String(nuevoCliente.direccion?.trim() || ''),
        dni_cuit: String(nuevoCliente.dni_cuit?.trim() || ''),
        categoria: nuevoCliente.categoria || 'CONDINEA',
        localidad: nuevoCliente.localidad || '',
        zona: nuevoCliente.zona || '',
        notas: String(nuevoCliente.notas?.trim() || ''),
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevoCliente.activo !== false,
        ...(companyId ? { orgId: companyId } : {})
      };
      
      const docRef = await db.collection('clientes').add(clienteFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...clienteFirebase
        },
        message: 'Cliente creado correctamente'
      });
      return true;
    }
    
    // CLIENTES - PUT actualizar
    else if (path.startsWith('/clientes/') && req.method === 'PUT') {
      const clienteId = path.split('/clientes/')[1];
      const datosActualizacion = req.body;
      
      // Filtrar campos de saldo (ya no se permiten editar)
      const { importe_adeudado, saldo_favor, deuda_inicial, ...datosLimpios } = datosActualizacion;
      
      // Convertir campos a string para evitar problemas
      if (datosLimpios.nombre !== undefined) datosLimpios.nombre = String(datosLimpios.nombre);
      if (datosLimpios.apellido !== undefined) datosLimpios.apellido = String(datosLimpios.apellido);
      if (datosLimpios.telefono !== undefined) datosLimpios.telefono = String(datosLimpios.telefono);
      if (datosLimpios.email !== undefined) datosLimpios.email = String(datosLimpios.email);
      if (datosLimpios.direccion !== undefined) datosLimpios.direccion = String(datosLimpios.direccion);
      if (datosLimpios.dni_cuit !== undefined) datosLimpios.dni_cuit = String(datosLimpios.dni_cuit);
      
      // Agregar timestamp de actualización
      datosLimpios.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('clientes').doc(clienteId).update(datosLimpios);
      
      res.json({
        success: true,
        data: {
          id: clienteId,
          ...datosLimpios
        },
        message: 'Cliente actualizado correctamente'
      });
      return true;
    }
    
    // CLIENTES - DELETE eliminar
    else if (path.startsWith('/clientes/') && req.method === 'DELETE') {
      const clienteId = path.split('/clientes/')[1];
      
      await db.collection('clientes').doc(clienteId).delete();
      
      res.json({
        success: true,
        message: 'Cliente eliminado correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = clientesRoutes;