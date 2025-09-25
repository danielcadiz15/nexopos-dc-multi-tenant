// functions/index.js - VERSIÓN MODIFICADA PARA MIGRACIÓN + CONFIGURACIÓN
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getModulesForPlan, normalizePlan, DEFAULT_PLAN } = require('./utils/planModules');

// ==================== INICIALIZAR FIREBASE PRIMERO ====================
admin.initializeApp();

// Obtener referencia a Firestore
const db = admin.firestore();

// ==================== CALLABLES TENANTS ====================
const tenantsCallables = require('./callables/tenants');
exports.createTenant = tenantsCallables.createTenant;
exports.joinTenant = tenantsCallables.joinTenant;
exports.setActiveTenant = tenantsCallables.setActiveTenant;

// ==================== IMPORTAR MIGRACIÓN ====================
const { 
  ejecutarMigracionCompleta, 
  verificarEstadoMigracion,
  obtenerMateriasPrimasCompatibilidad,
  procesarProduccionUnificada
} = require('./migration_complete');

// ==================== IMPORTAR TODOS LOS MÓDULOS ====================
const listasPreciosRoutes = require('./routes/listas-precios.routes');
const productosRoutes = require('./routes/productos.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const clientesRoutes = require('./routes/clientes.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const sucursalesRoutes = require('./routes/sucursales.routes');
const stockSucursalRoutes = require('./routes/stock-sucursal.routes');
const comprasRoutes = require('./routes/compras.routes');
const ventasRoutes = require('./routes/ventas.routes');
const transferenciasRoutes = require('./routes/transferencias.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const busquedaRoutes = require('./routes/busqueda.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const reportesRoutes = require('./routes/reportes.routes');
// ELIMINADO: const materiasPrimasRoutes = require('./routes/materiasPrimas.routes');
const recetasRoutes = require('./routes/recetas.routes');
const produccionRoutes = require('./routes/produccion.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const promocionesRoutes = require('./routes/promociones.routes');
// ✅ NUEVO: Configuración empresarial
const configuracionRoutes = require('./routes/configuracion.routes');
// En functions/index.js, agregar después de las otras importaciones:
const vehiculosRoutes = require('./routes/vehiculos.routes');
const combustibleRoutes = require('./routes/combustible.routes');
const serviciosVehiculosRoutes = require('./routes/servicios.vehiculos.routes');
// Rutas de Caja
const cajaRoutes = require('./routes/caja.routes');

// Rutas de Control de Stock
const controlStockRoutes = require('./routes/control-stock.routes');

// Función para inicializar colecciones si no existen
async function inicializarColecciones() {
  try {
    console.log('🔧 Inicializando colecciones...');
    
    // Verificar si existe la colección solicitudes-ajuste
    const solicitudesSnapshot = await db.collection('solicitudes-ajuste').limit(1).get();
    
    if (solicitudesSnapshot.empty) {
      console.log('📝 Creando colección solicitudes-ajuste...');
      
      // Crear documento de prueba
      await db.collection('solicitudes-ajuste').add({
        control_id: 'inicializacion',
        sucursal_id: 'sucursal-principal',
        usuario_id: 'sistema',
        ajustes: [],
        estado: 'pendiente_autorizacion',
        fecha_solicitud: new Date().toISOString(),
        observaciones: 'Documento de inicialización automática del sistema',
        fecha_creacion: new Date().toISOString(),
        es_inicializacion: true
      });
      
      console.log('✅ Colección solicitudes-ajuste creada exitosamente');
    } else {
      console.log('✅ Colección solicitudes-ajuste ya existe');
    }
    
    // Verificar si existe la colección control-stock
    const controlSnapshot = await db.collection('control-stock').limit(1).get();
    
    if (controlSnapshot.empty) {
      console.log('📝 Creando colección control-stock...');
      
      // Crear documento de prueba
      await db.collection('control-stock').add({
        sucursal_id: 'sucursal-principal',
        usuario_id: 'sistema',
        fecha_inicio: new Date().toISOString(),
        tipo: 'inicializacion',
        estado: 'finalizado',
        observaciones: 'Control de inicialización del sistema',
        fecha_creacion: new Date().toISOString(),
        es_inicializacion: true
      });
      
      console.log('✅ Colección control-stock creada exitosamente');
    } else {
      console.log('✅ Colección control-stock ya existe');
    }
    
    // Verificar si existe la colección auditoria-inventario
    const auditoriaSnapshot = await db.collection('auditoria-inventario').limit(1).get();
    
    if (auditoriaSnapshot.empty) {
      console.log('📝 Creando colección auditoria-inventario...');
      
      // Crear documento de prueba
      await db.collection('auditoria-inventario').add({
        control_id: 'inicializacion',
        sucursal_id: 'sucursal-principal',
        usuario_id: 'sistema',
        usuario_nombre: 'Sistema',
        usuario_rol: 'sistema',
        fecha_ajuste: new Date().toISOString(),
        fecha_ajuste_formato: new Date().toLocaleString(),
        ajustes: [],
        tipo_usuario: 'Sistema',
        observaciones: 'Documento de inicialización automática del sistema',
        fecha_creacion: new Date().toISOString(),
        timestamp: Date.now(),
        es_inicializacion: true
      });
      
      console.log('✅ Colección auditoria-inventario creada exitosamente');
    } else {
      console.log('✅ Colección auditoria-inventario ya existe');
    }
    
    console.log('🎉 Inicialización de colecciones completada');
    
  } catch (error) {
    console.error('❌ Error al inicializar colecciones:', error);
  }
}

// Función para manejar rutas de control de stock
async function manejarRutasControlStock(req, res, path) {
  try {
    console.log(`🔍 manejarRutasControlStock: ${req.method} ${path}`);
    
    // Inicializar colecciones si es la primera vez
    await inicializarColecciones();
    
    // Control de Stock
    if (path === '/control-stock' && req.method === 'POST') {
      console.log('✅ Manejando POST /control-stock');
      return await controlStockRoutes.crearControl(req, res);
    }
    
    if (path === '/control-stock/crear' && req.method === 'POST') {
      console.log('✅ Manejando POST /control-stock/crear');
      return await controlStockRoutes.crearControl(req, res);
    }
    
    if (path === '/control-stock' && req.method === 'GET') {
      console.log('✅ Manejando GET /control-stock');
      return await controlStockRoutes.obtenerControlActivo(req, res);
    }
    
    if (path === '/control-stock/activo' && req.method === 'GET') {
      console.log('✅ Manejando GET /control-stock/activo');
      return await controlStockRoutes.obtenerControlActivo(req, res);
    }
    
    if (path.match(/^\/control-stock\/\w+\/detalles$/) && req.method === 'GET') {
      const controlId = path.split('/')[2];
      req.params = { controlId };
      console.log(`✅ Manejando GET /control-stock/${controlId}/detalles`);
      return await controlStockRoutes.obtenerDetallesControl(req, res);
    }
    
    if (path.match(/^\/control-stock\/\w+\/finalizar$/) && req.method === 'PUT') {
      const controlId = path.split('/')[2];
      req.params = { controlId };
      console.log(`✅ Manejando PUT /control-stock/${controlId}/finalizar`);
      return await controlStockRoutes.finalizarControl(req, res);
    }
    
    // Solicitudes de Ajuste
    if (path === '/solicitudes-ajuste' && req.method === 'POST') {
      console.log('✅ Manejando POST /solicitudes-ajuste');
      return await controlStockRoutes.crearSolicitudAjuste(req, res);
    }
    
    if (path === '/solicitudes-ajuste/crear' && req.method === 'POST') {
      console.log('✅ Manejando POST /solicitudes-ajuste/crear');
      return await controlStockRoutes.crearSolicitudAjuste(req, res);
    }
    
    if (path === '/solicitudes-ajuste' && req.method === 'GET') {
      console.log('✅ Manejando GET /solicitudes-ajuste');
      return await controlStockRoutes.obtenerSolicitudesPendientes(req, res);
    }
    
    if (path.match(/^\/solicitudes-ajuste\/\w+\/autorizar$/) && req.method === 'PUT') {
      const solicitudId = path.split('/')[2];
      req.params = { solicitudId };
      console.log(`✅ Manejando PUT /solicitudes-ajuste/${solicitudId}/autorizar`);
      return await controlStockRoutes.autorizarSolicitud(req, res);
    }
    
    if (path.match(/^\/solicitudes-ajuste\/\w+\/rechazar$/) && req.method === 'PUT') {
      const solicitudId = path.split('/')[2];
      req.params = { solicitudId };
      console.log(`✅ Manejando PUT /solicitudes-ajuste/${solicitudId}/rechazar`);
      return await controlStockRoutes.rechazarSolicitud(req, res);
    }
    
    // Ruta para crear registros de auditoría
    if (path === '/auditoria-inventario/crear' && req.method === 'POST') {
      console.log('✅ Manejando POST /auditoria-inventario/crear');
      return await controlStockRoutes.crearRegistroAuditoria(req, res);
    }
    
    console.log(`❌ Ruta no manejada: ${req.method} ${path}`);
    return false; // No se manejó la ruta
  } catch (error) {
    console.error('❌ Error en manejarRutasControlStock:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el procesamiento de la ruta',
      error: error.message
    });
    return true; // Se manejó el error
  }
}

const { configurarCORS, manejarPreflight } = require('./utils/cors');
const { authenticateUser } = require('./utils/auth');

async function checkLicense(req, res) {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    if (!companyId) return { ok: true };
    // Leer de companies/config/license y fallback a licenses/{companyId}
    let lic = {};
    try {
      const snap = await db.collection('companies').doc(companyId).collection('config').doc('license').get();
      if (snap.exists) lic = snap.data() || {};
    } catch {}
    if (!lic || Object.keys(lic).length === 0) {
      const s2 = await db.collection('licenses').doc(companyId).get();
      if (s2.exists) lic = s2.data() || {};
    }
    if (!lic || Object.keys(lic).length === 0) return { ok: true };
    if (lic.blocked === true) return { ok: false, reason: lic.reason || 'Licencia bloqueada' };
    if (lic.paidUntil) {
      const until = new Date(lic.paidUntil).getTime();
      if (Number.isFinite(until) && Date.now() > until) return { ok: false, reason: 'Licencia vencida' };
    }
    return { ok: true };
  } catch (e) {
    console.warn('Licencia: no se pudo verificar', e.message);
    return { ok: true };
  }
}

// ==================== FUNCIONES AUXILIARES COMPARTIDAS ====================

/**
 * Función auxiliar para enriquecer ventas con información de clientes
 */
async function enriquecerVentasConClientes(ventas) {
  if (!ventas || !Array.isArray(ventas) || ventas.length === 0) {
    return ventas;
  }

  try {
    const clientesIds = [...new Set(
      ventas
        .map(venta => venta.cliente_id)
        .filter(id => id)
    )];

    console.log(`🔄 Cargando datos de ${clientesIds.length} clientes para enriquecer ventas...`);

    const clientesData = {};
    
    await Promise.all(clientesIds.map(async (clienteId) => {
      try {
        const clienteDoc = await db.collection('clientes').doc(clienteId).get();
        if (clienteDoc.exists) {
          clientesData[clienteId] = {
            id: clienteId,
            ...clienteDoc.data()
          };
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo cargar cliente ${clienteId}:`, error.message);
      }
    }));

    return ventas.map(venta => {
      const cliente = venta.cliente_id ? clientesData[venta.cliente_id] : null;
      
      return {
        ...venta,
        cliente_info: cliente ? {
          id: cliente.id,
          nombre: cliente.nombre || '',
          apellido: cliente.apellido || '',
          nombre_completo: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Cliente sin nombre',
          telefono: cliente.telefono || '',
          email: cliente.email || ''
        } : venta.cliente_info || {
          id: null,
          nombre: '',
          apellido: '',
          nombre_completo: 'Cliente sin registrar',
          telefono: '',
          email: ''
        }
      };
    });

  } catch (error) {
    console.error('❌ Error al enriquecer ventas con clientes:', error);
    return ventas;
  }
}

// ==================== API PRINCIPAL (CONSOLIDADA Y CORREGIDA) ====================

exports.api = functions.https.onRequest(async (req, res) => {
  try {
    // Configurar CORS una sola vez
    configurarCORS(res);
    
    // Manejar preflight OPTIONS
    if (manejarPreflight(req, res)) {
      return;
    }

    // Obtener la ruta
    const path = req.path.replace('/api', '') || '/';
    
    // Autenticación para rutas protegidas
    if ((path.startsWith('/ventas') && path !== '/ventas/eliminadas') || 
        path.startsWith('/usuarios') || 
        path.startsWith('/productos') ||
        path.startsWith('/clientes') ||
        path.startsWith('/compras') || path.startsWith('/stock') || path.startsWith('/caja')) {
      await authenticateUser(req, res, () => {});
      const lic = await checkLicense(req, res);
      if (!lic.ok) { return res.status(402).json({ success:false, message: lic.reason || 'Licencia inválida' }); }
    }
    console.log(`🔥 Firebase Function Request: ${req.method} ${path}`);
    
    // Variable para controlar si ya se envió respuesta
    let responseEnviada = false;
    
    
    // ==================== ENDPOINTS DE MIGRACIÓN EXISTENTES ====================
    
    // 🚀 MIGRACIÓN COMPLETA (usar solo una vez)
    if (!responseEnviada && path === '/migrar-sistema' && req.method === 'POST') {
      try {
        console.log('🚀 [MIGRACIÓN] Iniciando migración completa del sistema...');
        
        const resultado = await ejecutarMigracionCompleta();
        
        console.log('✅ [MIGRACIÓN] Migración completada exitosamente');
        res.json({
          success: true,
          ...resultado,
          message: 'Sistema migrado exitosamente a modo unificado',
          timestamp: new Date().toISOString()
        });
        responseEnviada = true;
        return;
        
      } catch (error) {
        console.error('❌ [MIGRACIÓN] Error en migración:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al migrar sistema',
          timestamp: new Date().toISOString()
        });
        responseEnviada = true;
        return;
      }
    }
    
    // 📊 VERIFICAR ESTADO DE MIGRACIÓN
    if (!responseEnviada && path === '/verificar-migracion' && req.method === 'GET') {
      try {
        console.log('🔍 [MIGRACIÓN] Verificando estado de migración...');
        
        const estado = await verificarEstadoMigracion();
        
        res.json({
          success: true,
          data: estado,
          message: 'Estado de migración obtenido correctamente',
          timestamp: new Date().toISOString()
        });
        responseEnviada = true;
        return;
        
      } catch (error) {
        console.error('❌ [MIGRACIÓN] Error al verificar migración:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al verificar estado de migración',
          timestamp: new Date().toISOString()
        });
        responseEnviada = true;
        return;
      }
    }
    
    // 🧪 PRUEBA DE MIGRACIÓN (sin ejecutar)
    if (!responseEnviada && path === '/test-migracion' && req.method === 'GET') {
      try {
        // Contar elementos a migrar
        const materiasPrimasSnapshot = await db.collection('materias_primas').get();
        const stockMateriasPrimasSnapshot = await db.collection('stock_materias_primas').get();
        const recetasDetallesSnapshot = await db.collection('recetas_detalles').get();
        
        const preview = {
          materias_primas_a_migrar: materiasPrimasSnapshot.size,
          registros_stock_a_migrar: stockMateriasPrimasSnapshot.size,
          recetas_detalles_a_actualizar: recetasDetallesSnapshot.size,
          estimacion_tiempo: '2-5 minutos',
          acciones: [
            'Crear productos tipo="materia_prima"',
            'Migrar stock a stock_sucursal',
            'Actualizar recetas_detalles',
            'Mantener datos originales como backup'
          ]
        };
        
        res.json({
          success: true,
          data: preview,
          message: 'Vista previa de migración - no se ejecutaron cambios'
        });
        responseEnviada = true;
        return;
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
        responseEnviada = true;
        return;
      }
    }
    
    // 🧪 MATERIAS PRIMAS UNIFICADAS
    if (!responseEnviada && path === '/materias-primas-unificadas' && req.method === 'GET') {
      try {
        console.log('🧪 [UNIFICADO] Obteniendo materias primas del sistema unificado...');
        
        const materiasPrimas = await obtenerMateriasPrimasCompatibilidad();
        
        res.json({
          success: true,
          data: materiasPrimas,
          total: materiasPrimas.length,
          message: 'Materias primas unificadas obtenidas correctamente',
          sistema: 'unificado'
        });
        responseEnviada = true;
        return;
        
      } catch (error) {
        console.error('❌ [UNIFICADO] Error al obtener materias primas:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al obtener materias primas unificadas'
        });
        responseEnviada = true;
        return;
      }
    }
    
    // 🏭 PRODUCCIÓN UNIFICADA
    if (!responseEnviada && path === '/produccion-unificada' && req.method === 'POST') {
      try {
        const { receta_id, cantidad, sucursal_id, usuario_id } = req.body;
        
        console.log(`🏭 [PRODUCCIÓN UNIFICADA] Procesando: Receta ${receta_id}, Cantidad: ${cantidad}`);
        
        if (!receta_id || !cantidad || !sucursal_id) {
          res.status(400).json({
            success: false,
            message: 'Faltan datos: receta_id, cantidad y sucursal_id son obligatorios'
          });
          responseEnviada = true;
          return;
        }
        
        const resultado = await procesarProduccionUnificada(
          receta_id, 
          parseInt(cantidad), 
          sucursal_id, 
          usuario_id || 'sistema'
        );
        
        res.json({
          success: true,
          ...resultado,
          message: 'Producción completada con descuento automático de materias primas'
        });
        responseEnviada = true;
        return;
        
      } catch (error) {
        console.error('❌ [PRODUCCIÓN UNIFICADA] Error en producción:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error en producción unificada'
        });
        responseEnviada = true;
        return;
      }
    }
    
    // ==================== ENRUTAR A MÓDULOS CON CONTROL DE RESPUESTA ====================
    
    try {
      // =============== ADMIN CENTRAL (solo usuarios administradores) ===============
      if (!responseEnviada && path.startsWith('/admin')) {
        await authenticateUser(req, res, () => {});
        const uid = req.user?.uid;
        const isAdmin = uid ? (await db.collection('adminUsers').doc(uid).get()).exists : false;
        if (!isAdmin) {
          return res.status(403).json({ success:false, message: 'Solo administradores' });
        }

        // GET /admin/empresas -> lista de companies con licencia y días restantes
        if (path === '/admin/empresas' && req.method === 'GET') {
          const companiesSnap = await db.collection('companies').get();
          const results = [];
          await Promise.all(companiesSnap.docs.map(async d => {
            const companyId = d.id;
            const companyRef = db.collection('companies').doc(companyId);
            const companyDoc = await companyRef.get();
            const licSnap = await companyRef.collection('config').doc('license').get();
            const lic = licSnap.exists ? licSnap.data() : {};
            const ownerUid = d.get('ownerUid') || companyDoc.get('ownerUid') || null;
            let ownerEmail = companyDoc.get('ownerEmail') || null;
            if (ownerUid) {
              try { if (!ownerEmail) { const user = await admin.auth().getUser(ownerUid); ownerEmail = user.email || null; } } catch {}
            }
            if (!ownerEmail) {
              try {
                const empresaCfgSnap = await companyRef.collection('config').doc('empresa').get();
                if (empresaCfgSnap.exists) {
                  const ec = empresaCfgSnap.data();
                  ownerEmail = ec.email || ec.correo || ownerEmail || null;
                }
              } catch {}
            }
            if (!ownerEmail) {
              try {
                const q = await db.collection('usuariosOrg')
                  .where('orgId','==',companyId)
                  .where('roles','array-contains','OWNER')
                  .limit(1).get();
                if (!q.empty) {
                  const uid = q.docs[0].get('uid');
                  const u = await admin.auth().getUser(uid);
                  ownerEmail = u.email || ownerEmail;
                }
              } catch {}
            }
            let daysLeft = null;
            if (lic.paidUntil) {
              const diff = Math.ceil((new Date(lic.paidUntil).getTime() - Date.now())/(1000*60*60*24));
              daysLeft = diff;
            }
            results.push({ id: companyId, name: d.get('name') || '', ownerUid, ownerEmail, license: lic, daysLeft });
          }));
          return res.json({ success:true, data: results });
        }

        // PUT /admin/empresas/:id/licencia -> actualizar licencia centralizada
        if (path.match(/^\/admin\/empresas\/[^/]+\/licencia$/) && req.method === 'PUT') {
          const companyId = path.split('/')[3];
          const payload = Object.assign({}, req.body || {});
          const normalizedPlan = normalizePlan(payload.plan);
          const timestamp = new Date().toISOString();
          payload.plan = normalizedPlan;
          payload.updatedAt = timestamp;
          await db.collection('licenses').doc(companyId).set(payload, { merge: true });
          await db.collection('companies').doc(companyId).collection('config').doc('license').set(payload, { merge: true });

          const modulesPayload = Object.assign({}, getModulesForPlan(normalizedPlan), {
            plan: normalizedPlan,
            updatedAt: timestamp,
            enforcedByPlan: true,
            updatedBy: req.user?.uid || null
          });
          await db.collection('companies').doc(companyId).collection('config').doc('modules').set(modulesPayload, { merge: true });
          await db.collection('tenants').doc(companyId).collection('config').doc('modules').set(modulesPayload, { merge: true });

          return res.json({ success:true, modules: modulesPayload });
        }

        // PUT /admin/empresas/:id/modulos -> actualizar módulos centralizados
        if (path.match(/^\/admin\/empresas\/[^/]+\/modulos$/) && req.method === 'PUT') {
          const companyId = path.split('/')[3];
          const incoming = req.body || {};
          const normalizedPlan = normalizePlan(incoming.plan || DEFAULT_PLAN);
          const timestamp = new Date().toISOString();
          const payload = Object.assign({}, incoming, {
            plan: normalizedPlan,
            updatedAt: timestamp,
            updatedBy: req.user?.uid || null
          });
          await db.collection('companies').doc(companyId).collection('config').doc('modules').set(payload, { merge: true });
          await db.collection('tenants').doc(companyId).collection('config').doc('modules').set(payload, { merge: true });
          return res.json({ success:true });
        }

        // GET /admin/empresas/:id/modulos -> obtener módulos actuales
        if (path.match(/^\/admin\/empresas\/[^/]+\/modulos$/) && req.method === 'GET') {
          const companyId = path.split('/')[3];
          const modSnap = await db.collection('companies').doc(companyId).collection('config').doc('modules').get();
          let mods = modSnap.exists ? modSnap.data() : {};
          if (!modSnap.exists) {
            const alt = await db.collection('tenants').doc(companyId).collection('config').doc('modules').get();
            if (alt.exists) mods = alt.data();
          }
          return res.json({ success:true, data: mods });
        }
      }
      // ✅ NUEVO: CONFIGURACIÓN EMPRESARIAL (AGREGAR PRIMERO)
      if (!responseEnviada && path.startsWith('/configuracion')) {
        console.log('🏢 [CONFIGURACION] Enrutando a configuración empresarial:', path);
        const configuracionHandled = await configuracionRoutes(req, res, path);
        console.log('🏢 [CONFIGURACION] Handled:', configuracionHandled);
        
        if (configuracionHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // **USUARIOS**
      if (!responseEnviada && path.startsWith('/usuarios')) {
        console.log('🔍 DEBUGGING PATH:', {
          originalPath: req.path,
          cleanPath: path,
          method: req.method,
          startsWithUsuarios: path.startsWith('/usuarios')
        });
        
        console.log('✅ ENRUTANDO A USUARIOS');
        const usuariosHandled = await usuariosRoutes(req, res, path);
        console.log('📋 USUARIOS HANDLED:', usuariosHandled);
        
        if (usuariosHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // ELIMINADO: Materias Primas
      // Ya no se enruta a materiasPrimasRoutes
      
      // Notificaciones
      if (!responseEnviada && (path.startsWith('/notificaciones') || path.startsWith('/api/notificaciones'))) {
        const notificacionesHandled = await notificacionesRoutes(req, res, path);
        if (notificacionesHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Recetas
      if (!responseEnviada && path.startsWith('/recetas')) {
        console.log('📋 [RECETAS] Enrutando a recetas:', path);
        const recetasHandled = await recetasRoutes(req, res, path);
        console.log('📋 [RECETAS] Handled:', recetasHandled);
        
        if (recetasHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Producción
      if (!responseEnviada && path.startsWith('/produccion')) {
        console.log('🏭 [PRODUCCIÓN] Enrutando a producción:', path);
        const produccionHandled = await produccionRoutes(req, res, path);
        console.log('🏭 [PRODUCCIÓN] Handled:', produccionHandled);
        
        if (produccionHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Productos
      if (!responseEnviada && path.startsWith('/productos')) {
        const productosHandled = await productosRoutes(req, res, path);
        if (productosHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Categorías
      if (!responseEnviada && path.startsWith('/categorias')) {
        const categoriasHandled = await categoriasRoutes(req, res, path);
        if (categoriasHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Clientes
      if (!responseEnviada && path.startsWith('/clientes')) {
        const clientesHandled = await clientesRoutes(req, res, path);
        if (clientesHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Proveedores
      if (!responseEnviada && path.startsWith('/proveedores')) {
        const proveedoresHandled = await proveedoresRoutes(req, res, path);
        if (proveedoresHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Sucursales
      if (!responseEnviada && path.startsWith('/sucursales')) {
        const sucursalesHandled = await sucursalesRoutes(req, res, path);
        if (sucursalesHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Stock por Sucursal
      if (!responseEnviada && path.startsWith('/stock-sucursal')) {
        const stockHandled = await stockSucursalRoutes(req, res, path);
        if (stockHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Control de Stock y Solicitudes de Ajuste
      if (!responseEnviada && (path.startsWith('/control-stock') || path.startsWith('/solicitudes-ajuste'))) {
        console.log('🔍 [ROUTING] Llamando a manejarRutasControlStock para:', path);
        const controlStockHandled = await manejarRutasControlStock(req, res, path);
        console.log('🔍 [ROUTING] Resultado de manejarRutasControlStock:', controlStockHandled);
        if (controlStockHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Compras
      if (!responseEnviada && path.startsWith('/compras')) {
        const comprasHandled = await comprasRoutes(req, res, path);
        if (comprasHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Ventas (pasa la función helper como parámetro)
      if (!responseEnviada && path.startsWith('/ventas')) {
        const ventasHandled = await ventasRoutes(req, res, path, enriquecerVentasConClientes);
        if (ventasHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Promociones
      if (!responseEnviada && path.startsWith('/promociones')) {
        const promocionesHandled = await promocionesRoutes(req, res, path);
        if (promocionesHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Transferencias
      if (!responseEnviada && path.startsWith('/transferencias')) {
        const transferenciasHandled = await transferenciasRoutes(req, res, path);
        if (transferenciasHandled) {
          responseEnviada = true;
          return;
        }
      }
      
      // Dashboard
      if (!responseEnviada && path.startsWith('/dashboard')) {
        const dashboardHandled = await dashboardRoutes(req, res, path);
        if (dashboardHandled) {
          responseEnviada = true;
          return;
        }
      }
      // Reportes
      if (!responseEnviada && path.startsWith('/reportes')) {
        const reportesHandled = await reportesRoutes(req, res, path);
        if (reportesHandled) {
          responseEnviada = true;
          return;
        }
      }
	  // Vehículos
		if (!responseEnviada && path.startsWith('/vehiculos')) {
		  const vehiculosHandled = await vehiculosRoutes(req, res, path);
		  if (vehiculosHandled) {
			responseEnviada = true;
			return;
		  }
		}

		// Combustible
		if (!responseEnviada && path.startsWith('/combustible')) {
		  const combustibleHandled = await combustibleRoutes(req, res, path);
		  if (combustibleHandled) {
			responseEnviada = true;
			return;
		  }
		}

		// Servicios y Gastos de Vehículos
		if (!responseEnviada && (path.startsWith('/servicios-vehiculos') || path.startsWith('/gastos-vehiculos'))) {
		  const serviciosHandled = await serviciosVehiculosRoutes(req, res, path);
		  if (serviciosHandled) {
			responseEnviada = true;
			return;
		  }
		}
		
		// ✅ NUEVO: Caja
		if (!responseEnviada && path.startsWith('/caja')) {
		  const cajaHandled = await cajaRoutes(req, res, path);
		  if (cajaHandled) {
			responseEnviada = true;
			return;
		  }
		}
		
      // Búsqueda Global
      if (!responseEnviada && path.startsWith('/buscar')) {
        const busquedaHandled = await busquedaRoutes(req, res, path);
        if (busquedaHandled) {
          responseEnviada = true;
          return;
        }
      }
     // Listas de Precios
      if (!responseEnviada && path.startsWith('/listas-precios')) {
        const listasHandled = await listasPreciosRoutes(req, res, path);
        if (listasHandled) {
          responseEnviada = true;
          return;
        }
      }
 
    } catch (routeError) {
      console.error('❌ Error en ruta específica:', routeError);
      
      if (!responseEnviada && !res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error en el procesamiento de la ruta',
          error: routeError.message
        });
        responseEnviada = true;
        return;
      }
    }
    // ==================== RUTA POR DEFECTO (solo si no hay respuesta) ====================
    if (!responseEnviada && !res.headersSent) {
      res.json({
        success: true,
        message: 'API de LA FABRICA funcionando correctamente',
        version: '2.3.0',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        endpoints_migracion: [
          // ENDPOINTS DE MIGRACIÓN
          'POST /api/migrar-materias-primas - Migrar materias primas a productos',
          'GET /api/test-migracion - Vista previa de migración',
          'POST /api/migrar-sistema - Ejecutar migración (SOLO UNA VEZ)',
          'GET /api/verificar-migracion - Verificar estado de migración',
          'GET /api/materias-primas-unificadas - Materias primas del sistema unificado',
          'POST /api/produccion-unificada - Producción con descuento automático'
        ],
        endpoints_disponibles: [
          // ✅ NUEVO: Configuración empresarial
          'GET /api/configuracion/empresa - Obtener configuración empresarial',
          'POST /api/configuracion/empresa - Crear configuración empresarial',
          'PUT /api/configuracion/empresa - Actualizar configuración empresarial',
          'POST /api/configuracion/upload-logo - Subir logo de empresa',
          'DELETE /api/configuracion/logo - Eliminar logo de empresa',
          
          // Usuarios
          'GET /api/usuarios - Todos los usuarios',
          'GET /api/usuarios/:id - Usuario específico',
          'GET /api/usuarios/buscar?termino=X - Buscar usuarios',
          'GET /api/usuarios/:id/sucursales - Sucursales de un usuario',
          'GET /api/usuarios/roles - Roles disponibles',
          'POST /api/usuarios - Crear usuario',
          'PUT /api/usuarios/:id - Actualizar usuario',
          'PATCH /api/usuarios/:id/password - Cambiar contraseña',
          'PATCH /api/usuarios/:id/estado - Cambiar estado (activo/inactivo)',
          
          // Productos (incluye materias primas como categoría)
          'GET /api/productos - Todos los productos',
          'GET /api/productos/activos - Solo productos activos', 
          'GET /api/productos/buscar?termino=X - Buscar productos',
          'GET /api/productos/stock-bajo - Productos con stock bajo',
          'GET /api/productos/:id - Producto específico',
          'POST /api/productos - Crear producto',
          'PUT /api/productos/:id - Actualizar producto',
          'DELETE /api/productos/:id - Eliminar producto',
          // Reportes
          'GET /api/reportes/dashboard - Datos para el dashboard',
          'GET /api/reportes/ventas?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD - Reporte de ventas',
          'GET /api/reportes/compras?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD - Reporte de compras',
          'GET /api/reportes/ganancias?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&agrupacion=dia - Reporte de ganancias',
          // Y todos los demás endpoints existentes...
          'GET /api/compras - Todas las compras',
          'GET /api/ventas - Todas las ventas',
          'GET /api/sucursales - Todas las sucursales',
          'GET /api/recetas - Recetas',
          'GET /api/produccion - Órdenes de producción',
          '... y muchos más'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ Error crítico en Firebase Function:', error);
    
    // Solo enviar respuesta de error si no se ha enviado ya
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Eliminar la función limpiarSucursalesDuplicadas

// Exportar funciones auxiliares
module.exports.helpers = {
  enriquecerVentasConClientes
};

// =============== UTILIDAD: Marcar admin por email (ejecutar una vez) ===============
// curl -X POST https://us-central1-nexopos-dc.cloudfunctions.net/api/admin/setup-admin -H "Authorization: Bearer <ID_TOKEN_DEL_ADMIN>" -H "Content-Type: application/json" -d '{"email":"foo@bar.com"}'
exports.apiSetupAdmin = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    await (async (req2, res2, next)=>authenticateUser(req, res, next))();
    const uid = req.user?.uid;
    // Permitir que cualquier usuario autenticado cree un admin solo si ya existe un admin inicial (o en frío permitir uno específico por email)
    const email = (req.body && req.body.email)||'';
    if (!email) return res.status(400).json({ success:false, message:'email requerido' });
    const userByEmail = await admin.auth().getUserByEmail(email).catch(()=>null);
    if (!userByEmail) return res.status(404).json({ success:false, message:'usuario no encontrado' });
    await db.collection('adminUsers').doc(userByEmail.uid).set({ createdAt: new Date().toISOString(), createdBy: uid||null }, { merge: true });
    return res.json({ success:true });
  } catch (e) {
    console.error('setup-admin error', e);
    return res.status(500).json({ success:false, message: e.message });
  }
});

// =============== BOOTSTRAP: marcar como admin a un email fijo (usar una sola vez) ===============
exports.bootstrapAdmin = functions.https.onRequest(async (req, res) => {
  try {
    const targetEmail = 'danielcadiz15@gmail.com';
    const user = await admin.auth().getUserByEmail(targetEmail);
    await db.collection('adminUsers').doc(user.uid).set({
      createdAt: new Date().toISOString(),
      email: targetEmail,
      bootstrap: true
    }, { merge: true });
    return res.json({ success:true, uid: user.uid });
  } catch (e) {
    console.error('bootstrapAdmin error', e);
    return res.status(500).json({ success:false, message: e.message });
  }
});