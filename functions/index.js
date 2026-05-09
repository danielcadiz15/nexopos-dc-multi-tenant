// functions/index.js - VERSIÓN MODIFICADA PARA MIGRACIÓN + CONFIGURACIÓN
const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

/** Secreto en Google Secret Manager (configurás con Firebase CLI tras deploy). Ver scripts/mercadopago-secret.ps1 */
const mercadopagoAccessTokenSecret = defineSecret('MERCADOPAGO_ACCESS_TOKEN');

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
const billingMercadoPagoRoutes = require('./routes/billing-mercadopago.routes');
const { normalizePlan: normalizeLicensePlanId } = require('./utils/planTiers');

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
const {
  evaluateLicenseState,
  isFacturacionRequest
} = require('./licenseHelpers');

const SUPER_ADMIN_EMAIL = 'danielcadiz15@gmail.com';

function isSuperAdminEmail(email) {
  return (email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
}

async function loadLicenseDoc(companyId) {
  let lic = {};
  try {
    const snap = await db.collection('companies').doc(companyId).collection('config').doc('license').get();
    if (snap.exists) lic = snap.data() || {};
  } catch {}
  if (!lic || Object.keys(lic).length === 0) {
    const s2 = await db.collection('licenses').doc(companyId).get();
    if (s2.exists) lic = s2.data() || {};
  }
  return lic;
}

/**
 * Licencia: activa / gracia 24h post-vencimiento / sin pago (24 h cortesía) / bloqueo total.
 */
async function checkLicense(req, res) {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    if (!companyId) return { ok: true };
    const userEmail = (req.user && req.user.email) || '';
    if (userEmail && isSuperAdminEmail(userEmail)) {
      return { ok: true };
    }

    let lic = await loadLicenseDoc(companyId);
    let state = evaluateLicenseState(lic);

    if (state.phase === 'unpaid_needs_anchor') {
      const ts = new Date().toISOString();
      const seed = { unpaidGraceStartedAt: ts, updatedAt: ts };
      await db.collection('companies').doc(companyId).collection('config').doc('license').set(seed, { merge: true });
      await db.collection('licenses').doc(companyId).set(seed, { merge: true });
      lic = await loadLicenseDoc(companyId);
      state = evaluateLicenseState(lic);
    }

    const path = (req.path || '').replace('/api', '') || '/';
    const method = req.method || 'GET';
    const pagoUrl = lic.pagoBilleteraUrl || lic.pago_billetera_url || null;

    if (state.phase === 'active') {
      return { ok: true };
    }
    if (state.phase === 'blocked') {
      return {
        ok: false,
        reason: lic.reason || 'Licencia bloqueada',
        code: 'LICENSE_BLOCKED',
        graceEndsAt: null,
        pagoBilleteraUrl: pagoUrl
      };
    }
    if (state.phase === 'grace' || state.phase === 'unpaid_grace') {
      if (isFacturacionRequest(method, path)) {
        const isUnpaid = state.phase === 'unpaid_grace';
        return {
          ok: false,
          reason: isUnpaid
            ? 'No hay un abono registrado: tenés 24 horas de cortesía. No podés registrar ventas nuevas hasta pagar. Pagá con Mercado Pago desde la barra superior.'
            : 'La licencia está vencida: estás en período de gracia (24 h). No podés registrar ventas hasta pagar con Mercado Pago (barra superior).',
          code: isUnpaid ? 'LICENSE_NO_PAYMENT_GRACE' : 'LICENSE_GRACE_NO_FACTURACION',
          graceEndsAt: state.graceEndsAt,
          pagoBilleteraUrl: pagoUrl
        };
      }
      return {
        ok: true,
        grace: true,
        graceEndsAt: state.graceEndsAt,
        phase: state.phase
      };
    }
    const isUnpaidExpired = state.phase === 'unpaid_expired';
    return {
      ok: false,
      reason: isUnpaidExpired
        ? 'No hay abono registrado y finalizó la cortesía de 24 h. Completá el pago con Mercado Pago desde la barra superior para volver a operar con normalidad.'
        : 'La licencia venció y superaste el período de gracia. Completá el pago desde la barra superior para seguir usando el sistema.',
      code: 'LICENSE_EXPIRED',
      graceEndsAt: state.graceEndsAt,
      pagoBilleteraUrl: pagoUrl
    };
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

async function nexoposMainApi(req, res) {
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
        path.startsWith('/compras') || path.startsWith('/stock') || path.startsWith('/caja') || path.startsWith('/reportes')) {
      await authenticateUser(req, res, () => {});
      const lic = await checkLicense(req, res);
      if (!lic.ok) {
        return res.status(402).json({
          success: false,
          message: lic.reason || 'Licencia inválida',
          code: lic.code || 'LICENSE_INVALID',
          graceEndsAt: lic.graceEndsAt != null ? new Date(lic.graceEndsAt).toISOString() : null,
          pagoBilleteraUrl: lic.pagoBilleteraUrl || null
        });
      }
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
        const email = req.user?.email || null;
        if (!isSuperAdminEmail(email)) {
          return res.status(403).json({
            success: false,
            message: 'Acceso restringido al panel central de licencias y empresas.'
          });
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

        // DELETE /admin/empresas/:id -> eliminar empresa (solo super admin panel)
        if (path.match(/^\/admin\/empresas\/[^/]+$/) && req.method === 'DELETE') {
          const companyId = path.split('/')[3];
          // Borrar Firestore + usuarios en Firebase Auth (antes solo se borraba Firestore)
          try {
            async function deleteCollectionRecursive(colRef) {
              const snap = await colRef.get();
              const batchSize = 400;
              let docs = snap.docs;
              while (docs.length > 0) {
                const batch = db.batch();
                const portion = docs.slice(0, batchSize);
                portion.forEach(d => batch.delete(d.ref));
                await batch.commit();
                docs = docs.slice(batchSize);
              }
            }

            const companyRef = db.collection('companies').doc(companyId);
            const tenantRef = db.collection('tenants').doc(companyId);

            const uidSet = new Set();
            try {
              const companySnap = await companyRef.get();
              if (companySnap.exists) {
                const ow = companySnap.data()?.ownerUid;
                if (ow) uidSet.add(ow);
              }
            } catch {}
            try {
              const uoSnap = await db.collection('usuariosOrg').where('orgId', '==', companyId).get();
              uoSnap.forEach((d) => uidSet.add(d.id));
            } catch {}
            try {
              const usrSnap = await companyRef.collection('usuarios').get();
              usrSnap.forEach((d) => uidSet.add(d.id));
            } catch {}

            const subcols = ['config','caja','usuarios','sucursales','transferencias','compras','ventas','stock_sucursal','movimientos_stock'];
            for (const sc of subcols) {
              try {
                await deleteCollectionRecursive(companyRef.collection(sc));
              } catch {}
            }
            await companyRef.delete().catch(()=>{});
            for (const sc of ['config','sucursales']) {
              try { await deleteCollectionRecursive(tenantRef.collection(sc)); } catch {}
            }
            await tenantRef.delete().catch(()=>{});

            try {
              const rootSuc = await db.collection('sucursales').where('orgId', '==', companyId).get();
              const batches = [];
              let batch = db.batch();
              let n = 0;
              rootSuc.docs.forEach((d) => {
                batch.delete(d.ref);
                n += 1;
                if (n >= 400) {
                  batches.push(batch.commit());
                  batch = db.batch();
                  n = 0;
                }
              });
              if (n > 0) batches.push(batch.commit());
              await Promise.all(batches);
            } catch {}

            await db.collection('licenses').doc(companyId).delete().catch(()=>{});

            for (const uid of uidSet) {
              try {
                await db.collection('usuariosOrg').doc(uid).delete();
              } catch {}
              try {
                await admin.auth().deleteUser(uid);
              } catch (authErr) {
                console.warn(`[ADMIN DELETE] Auth deleteUser omitido (${uid}):`, authErr?.message || authErr);
              }
            }

            return res.json({ success:true });
          } catch (e) {
            return res.status(500).json({ success:false, message: e.message });
          }
        }

        // PUT /admin/empresas/:id/licencia -> actualizar licencia centralizada
        if (path.match(/^\/admin\/empresas\/[^/]+\/licencia$/) && req.method === 'PUT') {
          const companyId = path.split('/')[3];
          const payload = req.body || {};
          if (payload.plan != null) {
            payload.plan = normalizeLicensePlanId(payload.plan);
          }
          payload.updatedAt = new Date().toISOString();
          if (payload.paidUntil != null && String(payload.paidUntil).trim() !== '') {
            payload.unpaidGraceStartedAt = admin.firestore.FieldValue.delete();
          }
          await db.collection('licenses').doc(companyId).set(payload, { merge: true });
          await db.collection('companies').doc(companyId).collection('config').doc('license').set(payload, { merge: true });
          return res.json({ success:true });
        }

        // PUT /admin/empresas/:id/modulos -> actualizar módulos centralizados
        if (path.match(/^\/admin\/empresas\/[^/]+\/modulos$/) && req.method === 'PUT') {
          const companyId = path.split('/')[3];
          const payload = Object.assign({}, req.body || {}, { updatedAt: new Date().toISOString() });
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

        // GET/PUT /admin/platform/billing — precios licencia por plan (Mercado Pago)
        if (path === '/admin/platform/billing' && req.method === 'GET') {
          const snap = await db.collection('platform').doc('billing').get();
          const raw = snap.exists ? snap.data() || {} : {};
          const planTiers = ['basic', 'intermediate', 'premium'];
          const planPrices = { basic: 0, intermediate: 0, premium: 0 };
          if (raw.planPrices && typeof raw.planPrices === 'object') {
            for (const k of planTiers) {
              if (raw.planPrices[k] != null && !Number.isNaN(Number(raw.planPrices[k]))) {
                planPrices[k] = Number(raw.planPrices[k]);
              }
            }
          }
          const legacy = raw.monthlyPriceARS != null ? Number(raw.monthlyPriceARS) : null;
          if (planPrices.basic <= 0 && legacy != null && !Number.isNaN(legacy) && legacy > 0) {
            planPrices.basic = legacy;
          }
          return res.json({
            success: true,
            data: {
              ...raw,
              planPrices,
              monthlyPriceARS:
                planPrices.basic > 0 ? planPrices.basic : legacy != null ? legacy : null
            }
          });
        }
        if (path === '/admin/platform/billing' && req.method === 'PUT') {
          const body = req.body || {};
          const planTiers = ['basic', 'intermediate', 'premium'];
          const snap = await db.collection('platform').doc('billing').get();
          const existing = snap.exists ? snap.data() || {} : {};
          const mergedPrices = {
            basic: 0,
            intermediate: 0,
            premium: 0,
            ...(existing.planPrices && typeof existing.planPrices === 'object' ? existing.planPrices : {})
          };

          if (body.planPrices && typeof body.planPrices === 'object') {
            for (const k of planTiers) {
              if (body.planPrices[k] === undefined || body.planPrices[k] === null) continue;
              const n = Number(body.planPrices[k]);
              if (Number.isNaN(n) || n < 0) {
                return res.status(400).json({
                  success: false,
                  message: `planPrices.${k} inválido`
                });
              }
              mergedPrices[k] = n;
            }
          }

          if (body.monthlyPriceARS != null) {
            const monthlyPriceARS = Number(body.monthlyPriceARS);
            if (Number.isNaN(monthlyPriceARS) || monthlyPriceARS < 0) {
              return res.status(400).json({
                success: false,
                message: 'monthlyPriceARS inválido'
              });
            }
            mergedPrices.basic = monthlyPriceARS;
          }

          if (!body.planPrices && body.monthlyPriceARS == null) {
            return res.status(400).json({
              success: false,
              message: 'Enviá planPrices (basic, intermediate, premium) o monthlyPriceARS (solo Básica).'
            });
          }

          const monthlyPriceARS = mergedPrices.basic;

          await db.collection('platform').doc('billing').set(
            {
              planPrices: mergedPrices,
              monthlyPriceARS,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
          return res.json({ success: true });
        }
      }

      // 💳 Facturación licencias — Mercado Pago (webhook sin licencia; crear preferencia sin 402)
      if (!responseEnviada && path.startsWith('/billing')) {
        const billingHandled = await billingMercadoPagoRoutes(req, res, path);
        if (billingHandled) {
          responseEnviada = true;
          return;
        }
      }

      // ✅ CONFIGURACIÓN EMPRESARIAL — requiere contexto multi-tenant (req.companyId vía JWT/usuariosOrg)
      if (!responseEnviada && path.startsWith('/configuracion')) {
        await authenticateUser(req, res, () => {});
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
        message: 'API de NexoPOS DC funcionando correctamente',
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
}

exports.api = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    cors: false,
    secrets: [mercadopagoAccessTokenSecret]
  },
  async (req, res) => {
    try {
      const v = mercadopagoAccessTokenSecret.value();
      if (typeof v === 'string' && v.trim()) {
        process.env.MERCADOPAGO_ACCESS_TOKEN = v.trim();
      }
    } catch (e) {
      console.warn('[api] secreto Mercado Pago no disponible aún:', e?.message || e);
    }
    return nexoposMainApi(req, res);
  }
);

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