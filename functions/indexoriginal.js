// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

// Inicializar Firebase Admin
admin.initializeApp();

// Obtener referencia a Firestore
const db = admin.firestore();

// Importar funciones de usuarios (si existe el archivo)
// const usuariosFunctions = require('./usuarios.functions');

// O si las funciones están en línea, definirlas aquí
const usuariosFunctions = {
  crearUsuario: functions.https.onCall(async (data, context) => {
    // Implementación pendiente
    return { success: true, message: 'Función no implementada' };
  }),
  actualizarUsuario: functions.https.onCall(async (data, context) => {
    // Implementación pendiente
    return { success: true, message: 'Función no implementada' };
  }),
  cambiarPassword: functions.https.onCall(async (data, context) => {
    // Implementación pendiente
    return { success: true, message: 'Función no implementada' };
  }),
  cambiarEstadoUsuario: functions.https.onCall(async (data, context) => {
    // Implementación pendiente
    return { success: true, message: 'Función no implementada' };
  }),
  asignarSucursales: functions.https.onCall(async (data, context) => {
    // Implementación pendiente
    return { success: true, message: 'Función no implementada' };
  }),
  obtenerUsuarios: async (req, res) => {
    try {
      const snapshot = await db.collection('usuarios').get();
      const usuarios = [];
      snapshot.forEach(doc => {
        usuarios.push({
          id: doc.id,
          ...doc.data()
        });
      });
      res.json({
        success: true,
        data: usuarios
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  obtenerUsuario: async (req, res) => {
    try {
      const userId = req.path.split('/')[3];
      const doc = await db.collection('usuarios').doc(userId).get();
      
      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: doc.id,
          ...doc.data()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

// AQUÍ CONTINÚA EL RESTO DE TU CÓDIGO (la función enriquecerVentasConClientes y todo lo demás)

/**
 * Función auxiliar para enriquecer ventas con información de clientes
 * @param {Array} ventas - Lista de ventas a enriquecer
 * @returns {Promise<Array>} Ventas con información de cliente
 */
async function enriquecerVentasConClientes(ventas) {
  if (!ventas || !Array.isArray(ventas) || ventas.length === 0) {
    return ventas;
  }

  try {
    // Obtener IDs únicos de clientes
    const clientesIds = [...new Set(
      ventas
        .map(venta => venta.cliente_id)
        .filter(id => id) // Filtrar IDs nulos
    )];

    console.log(`🔄 Cargando datos de ${clientesIds.length} clientes para enriquecer ventas...`);

    // Obtener datos de clientes
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

    // Enriquecer ventas con datos de cliente
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
    return ventas; // Devolver ventas originales en caso de error
  }
}

// Exportar funciones de usuarios
exports.crearUsuario = usuariosFunctions.crearUsuario;
exports.actualizarUsuario = usuariosFunctions.actualizarUsuario;
exports.cambiarPassword = usuariosFunctions.cambiarPassword;
exports.cambiarEstadoUsuario = usuariosFunctions.cambiarEstadoUsuario;
exports.asignarSucursales = usuariosFunctions.asignarSucursales;

// Endpoints HTTP para usuarios
exports.apiUsuarios = functions.https.onRequest(async (req, res) => {
  // Habilitar CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  const path = req.path.replace(/^\/+|\/+$/g, '');
  const pathParts = path.split('/');
  
  console.log(`📡 API Usuarios - ${req.method} ${req.path}`);

  try {
    // GET /api/usuarios
    if (req.method === 'GET' && pathParts.length === 2) {
      return usuariosFunctions.obtenerUsuarios(req, res);
    }
    
    // GET /api/usuarios/:id
    if (req.method === 'GET' && pathParts.length === 3) {
      return usuariosFunctions.obtenerUsuario(req, res);
    }
    
    // GET /api/usuarios/buscar?termino=xxx
    if (req.method === 'GET' && pathParts[2] === 'buscar') {
      const termino = req.query.termino || '';
      const snapshot = await admin.firestore()
        .collection('usuarios')
        .get();
      
      const usuarios = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const nombre = (data.nombre || '').toLowerCase();
        const apellido = (data.apellido || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        const terminoLower = termino.toLowerCase();
        
        if (nombre.includes(terminoLower) || 
            apellido.includes(terminoLower) || 
            email.includes(terminoLower)) {
          usuarios.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return res.json({
        success: true,
        data: usuarios
      });
    }
    
    // GET /api/usuarios/:id/sucursales
    if (req.method === 'GET' && pathParts.length === 4 && pathParts[3] === 'sucursales') {
      const uid = pathParts[2];
      const userDoc = await admin.firestore()
        .collection('usuarios')
        .doc(uid)
        .get();
      
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      const sucursales = userDoc.data().sucursales || [];
      
      // Obtener detalles de las sucursales
      const sucursalesDetalle = [];
      for (const sucursalId of sucursales) {
        const sucDoc = await admin.firestore()
          .collection('sucursales')
          .doc(sucursalId)
          .get();
        
        if (sucDoc.exists) {
          sucursalesDetalle.push({
            id: sucDoc.id,
            ...sucDoc.data()
          });
        }
      }
      
      return res.json({
        success: true,
        data: sucursalesDetalle
      });
    }
    
    // GET /api/usuarios/roles
    if (req.method === 'GET' && pathParts[2] === 'roles') {
      // Retornar roles predefinidos
      const roles = [
        {
          id: 'admin',
          nombre: 'Administrador',
          descripcion: 'Acceso total al sistema'
        },
        {
          id: 'empleado', 
          nombre: 'Empleado',
          descripcion: 'Acceso a ventas y productos'
        },
        {
          id: 'gerente',
          nombre: 'Gerente', 
          descripcion: 'Acceso a reportes y gestión'
        }
      ];
      
      return res.json({
        success: true,
        data: roles
      });
    }
    
    // Método no soportado
    res.status(405).json({
      success: false,
      error: 'Método no permitido'
    });
    
  } catch (error) {
    console.error('❌ Error en API usuarios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
exports.api = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.set('Access-Control-Max-Age', '3600');
  
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    // Obtener la ruta sin /api
    const path = req.path.replace('/api', '') || '/';
    console.log(`🔥 Firebase Function Request: ${req.method} ${path}`);
    
    // ==================== PRODUCTOS ====================
    
    // PRODUCTOS - GET todos
    if (path === '/productos' && req.method === 'GET') {
      const productosSnapshot = await db.collection('productos').get();
      const productos = [];
      
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        productos.push({
          id: doc.id,
          ...data,
          // Asegurar campos numéricos
          precio_venta: parseFloat(data.precio_venta || 0),
          precio_costo: parseFloat(data.precio_costo || 0),
          stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
          stock_minimo: parseInt(data.stock_minimo || 5)
        });
      });
      
      console.log(`✅ Productos encontrados: ${productos.length}`);
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        message: 'Productos obtenidos correctamente'
      });
      return;
    }
    
    // PRODUCTOS - GET solo activos
    else if (path === '/productos/activos' && req.method === 'GET') {
      const productosSnapshot = await db.collection('productos')
        .where('activo', '==', true)
        .get();
      
      const productos = [];
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        productos.push({
          id: doc.id,
          ...data,
          precio_venta: parseFloat(data.precio_venta || 0),
          precio_costo: parseFloat(data.precio_costo || 0),
          stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
          stock_minimo: parseInt(data.stock_minimo || 5)
        });
      });
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        message: 'Productos activos obtenidos correctamente'
      });
      return;
    }
    
    // PRODUCTOS - Búsqueda (CRÍTICO para PuntoVenta)
    else if (path === '/productos/buscar' && req.method === 'GET') {
      const termino = req.query.termino;
      
      if (!termino) {
        // Devolver todos los productos si no hay término
        const productosSnapshot = await db.collection('productos').get();
        const productos = [];
        
        productosSnapshot.forEach(doc => {
          const data = doc.data();
          productos.push({
            id: doc.id,
            ...data,
            precio_venta: parseFloat(data.precio_venta || 0),
            stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0)
          });
        });
        
        res.json({
          success: true,
          data: productos,
          message: 'Todos los productos obtenidos'
        });
        return;
      }
      
      // Búsqueda flexible - por nombre, código, o código de barras
      const productosSnapshot = await db.collection('productos').get();
      const productos = [];
      const terminoLower = termino.toLowerCase();
      
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        const nombre = (data.nombre || '').toLowerCase();
        const codigo = (data.codigo || '').toLowerCase();
        const codigoBarras = (data.codigo_barras || '').toLowerCase();
        
        // Búsqueda flexible
        if (nombre.includes(terminoLower) || 
            codigo.includes(terminoLower) || 
            codigoBarras.includes(terminoLower)) {
          productos.push({
            id: doc.id,
            ...data,
            precio_venta: parseFloat(data.precio_venta || 0),
            precio_costo: parseFloat(data.precio_costo || 0),
            stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
            stock_minimo: parseInt(data.stock_minimo || 5)
          });
        }
      });
      
      // Ordenar por relevancia (coincidencias exactas primero)
      productos.sort((a, b) => {
        const aNombre = (a.nombre || '').toLowerCase();
        const aCodigo = (a.codigo || '').toLowerCase();
        const bNombre = (b.nombre || '').toLowerCase();
        const bCodigo = (b.codigo || '').toLowerCase();
        
        // Coincidencias exactas de código primero
        if (aCodigo === terminoLower) return -1;
        if (bCodigo === terminoLower) return 1;
        
        // Coincidencias que empiezan con el término
        if (aNombre.startsWith(terminoLower) && !bNombre.startsWith(terminoLower)) return -1;
        if (bNombre.startsWith(terminoLower) && !aNombre.startsWith(terminoLower)) return 1;
        
        return 0;
      });
      
      console.log(`🔍 Búsqueda "${termino}": ${productos.length} productos encontrados`);
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        message: 'Búsqueda de productos completada'
      });
      return;
    }
    
    // PRODUCTOS - GET con stock bajo
    else if (path === '/productos/stock-bajo' && req.method === 'GET') {
      const productosSnapshot = await db.collection('productos')
        .where('stock_actual', '<=', 5)
        .get();
      
      const productos = [];
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        productos.push({
          id: doc.id,
          ...data,
          stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0)
        });
      });
      
      res.json({
        success: true,
        data: productos,
        message: 'Productos con stock bajo obtenidos'
      });
      return;
    }
    
    // PRODUCTO - GET por ID
    else if (path.startsWith('/productos/') && req.method === 'GET') {
      const productId = path.split('/productos/')[1];
      
      // Verificar si es una subconsulta especial
      if (productId === 'stock-bajo' || productId === 'activos' || productId === 'buscar') {
        // Estas rutas ya se manejan arriba
        return;
      }
      
      const productDoc = await db.collection('productos').doc(productId).get();
      
      if (!productDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
        return;
      }
      
      const data = productDoc.data();
      const producto = {
        id: productDoc.id,
        ...data,
        precio_venta: parseFloat(data.precio_venta || 0),
        precio_costo: parseFloat(data.precio_costo || 0),
        stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
        stock_minimo: parseInt(data.stock_minimo || 5)
      };
      
      res.json({
        success: true,
        data: producto,
        message: 'Producto obtenido correctamente'
      });
      return;
    }
    
    // PRODUCTOS - POST crear nuevo
    else if (path === '/productos' && req.method === 'POST') {
      const nuevoProducto = req.body;
      
      // Validación básica
      if (!nuevoProducto.codigo && !nuevoProducto.nombre) {
        res.status(400).json({
          success: false,
          message: 'El código o nombre del producto es requerido'
        });
        return;
      }
      
      // Estructura para Firebase con campos numéricos correctos
      const productoFirebase = {
        ...nuevoProducto,
        codigo: nuevoProducto.codigo || '',
        nombre: nuevoProducto.nombre || '',
        descripcion: nuevoProducto.descripcion || '',
        precio_costo: parseFloat(nuevoProducto.precio_costo || 0),
        precio_venta: parseFloat(nuevoProducto.precio_venta || 0),
        stock_actual: parseInt(nuevoProducto.stock_actual || nuevoProducto.stock_inicial || 0),
        stock_minimo: parseInt(nuevoProducto.stock_minimo || 5),
        categoria_id: nuevoProducto.categoria_id || '',
        proveedor_id: nuevoProducto.proveedor_id || '',
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevoProducto.activo !== false
      };
      
      const docRef = await db.collection('productos').add(productoFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...productoFirebase
        },
        message: 'Producto creado correctamente'
      });
      return;
    }
    
    // PRODUCTOS - PUT actualizar
    else if (path.startsWith('/productos/') && req.method === 'PUT') {
      const productId = path.split('/productos/')[1];
      const datosActualizacion = req.body;
      
      // Formatear campos numéricos
      if (datosActualizacion.precio_costo !== undefined) {
        datosActualizacion.precio_costo = parseFloat(datosActualizacion.precio_costo || 0);
      }
      if (datosActualizacion.precio_venta !== undefined) {
        datosActualizacion.precio_venta = parseFloat(datosActualizacion.precio_venta || 0);
      }
      if (datosActualizacion.stock_actual !== undefined) {
        datosActualizacion.stock_actual = parseInt(datosActualizacion.stock_actual || 0);
      }
      if (datosActualizacion.stock_minimo !== undefined) {
        datosActualizacion.stock_minimo = parseInt(datosActualizacion.stock_minimo || 5);
      }
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('productos').doc(productId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: productId,
          ...datosActualizacion
        },
        message: 'Producto actualizado correctamente'
      });
      return;
    }
    
    // PRODUCTOS - DELETE eliminar
    else if (path.startsWith('/productos/') && req.method === 'DELETE') {
      const productId = path.split('/productos/')[1];
      
      await db.collection('productos').doc(productId).delete();
      
      res.json({
        success: true,
        message: 'Producto eliminado correctamente'
      });
      return;
    }
    
    // ==================== CATEGORÍAS ====================
    
    // CATEGORIAS - GET todas
    else if (path === '/categorias' && req.method === 'GET') {
      const categoriasSnapshot = await db.collection('categorias').get();
      const categorias = [];
      
      categoriasSnapshot.forEach(doc => {
        categorias.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Categorías encontradas: ${categorias.length}`);
      
      res.json({
        success: true,
        data: categorias,
        total: categorias.length,
        message: 'Categorías obtenidas correctamente'
      });
      return;
    }
    
    // CATEGORIAS - GET activas
    else if (path === '/categorias/activas' && req.method === 'GET') {
      const categoriasSnapshot = await db.collection('categorias')
        .where('activo', '==', true)
        .get();
      
      const categorias = [];
      categoriasSnapshot.forEach(doc => {
        categorias.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({
        success: true,
        data: categorias,
        total: categorias.length,
        message: 'Categorías activas obtenidas correctamente'
      });
      return;
    }
    
    // CATEGORIA - GET por ID
    else if (path.startsWith('/categorias/') && req.method === 'GET') {
      const categoriaId = path.split('/categorias/')[1];
      const categoriaDoc = await db.collection('categorias').doc(categoriaId).get();
      
      if (!categoriaDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          id: categoriaDoc.id,
          ...categoriaDoc.data()
        },
        message: 'Categoría obtenida correctamente'
      });
      return;
    }
    
    // CATEGORIAS - POST crear nueva
    else if (path === '/categorias' && req.method === 'POST') {
      const nuevaCategoria = req.body;
      
      // Validación básica
      if (!nuevaCategoria.nombre) {
        res.status(400).json({
          success: false,
          message: 'El nombre de la categoría es requerido'
        });
        return;
      }
      
      // Estructura para Firebase
      const categoriaFirebase = {
        ...nuevaCategoria,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevaCategoria.activo !== false
      };
      
      const docRef = await db.collection('categorias').add(categoriaFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...categoriaFirebase
        },
        message: 'Categoría creada correctamente'
      });
      return;
    }
    
    // CATEGORIAS - PUT actualizar
    else if (path.startsWith('/categorias/') && req.method === 'PUT') {
      const categoriaId = path.split('/categorias/')[1];
      const datosActualizacion = req.body;
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('categorias').doc(categoriaId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: categoriaId,
          ...datosActualizacion
        },
        message: 'Categoría actualizada correctamente'
      });
      return;
    }
    
    // CATEGORIAS - DELETE eliminar
    else if (path.startsWith('/categorias/') && req.method === 'DELETE') {
      const categoriaId = path.split('/categorias/')[1];
      
      await db.collection('categorias').doc(categoriaId).delete();
      
      res.json({
        success: true,
        message: 'Categoría eliminada correctamente'
      });
      return;
    }
    
    // ==================== CLIENTES ====================
    
    // CLIENTES - GET todos
    else if (path === '/clientes' && req.method === 'GET') {
      const clientesSnapshot = await db.collection('clientes').get();
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
      return;
    }
    
    // CLIENTES - GET activos
    else if (path === '/clientes/activos' && req.method === 'GET') {
      const clientesSnapshot = await db.collection('clientes')
        .where('activo', '==', true)
        .get();
      
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
      return;
    }
    
    // CLIENTES - Búsqueda
    else if (path === '/clientes/buscar' && req.method === 'GET') {
      const { termino } = req.query;
      
      if (!termino) {
        // Si no hay término, devolver todos los clientes
        const clientesSnapshot = await db.collection('clientes').get();
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
        return;
      }
      
      // Búsqueda flexible por nombre, apellido, teléfono o email
      const clientesSnapshot = await db.collection('clientes').get();
      const clientes = [];
      const terminoLower = termino.toLowerCase();
      
      clientesSnapshot.forEach(doc => {
        const data = doc.data();
        const nombre = (data.nombre || '').toLowerCase();
        const apellido = (data.apellido || '').toLowerCase();
        const telefono = (data.telefono || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        
        // Búsqueda en todos los campos
        if (nombre.includes(terminoLower) || 
            apellido.includes(terminoLower) || 
            telefono.includes(terminoLower) || 
            email.includes(terminoLower) ||
            `${nombre} ${apellido}`.includes(terminoLower)) {
          clientes.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log(`🔍 Búsqueda "${termino}": ${clientes.length} clientes encontrados`);
      
      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
        message: 'Búsqueda de clientes completada'
      });
      return;
    }
    
    // CLIENTE - GET por ID
    else if (path.startsWith('/clientes/') && req.method === 'GET') {
      const clienteId = path.split('/clientes/')[1];
      
      // Verificar si es una ruta especial
      if (clienteId === 'activos' || clienteId === 'buscar') {
        return; // Ya manejado arriba
      }
      
      const clienteDoc = await db.collection('clientes').doc(clienteId).get();
      
      if (!clienteDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          id: clienteDoc.id,
          ...clienteDoc.data()
        },
        message: 'Cliente obtenido correctamente'
      });
      return;
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
        return;
      }
      
      // Estructura para Firebase
      const clienteFirebase = {
        ...nuevoCliente,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevoCliente.activo !== false
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
      return;
    }
    
    // CLIENTES - PUT actualizar
    else if (path.startsWith('/clientes/') && req.method === 'PUT') {
      const clienteId = path.split('/clientes/')[1];
      const datosActualizacion = req.body;
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('clientes').doc(clienteId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: clienteId,
          ...datosActualizacion
        },
        message: 'Cliente actualizado correctamente'
      });
      return;
    }
    
    // CLIENTES - DELETE eliminar
    else if (path.startsWith('/clientes/') && req.method === 'DELETE') {
      const clienteId = path.split('/clientes/')[1];
      
      await db.collection('clientes').doc(clienteId).delete();
      
      res.json({
        success: true,
        message: 'Cliente eliminado correctamente'
      });
      return;
    }
    
    // ==================== PROVEEDORES ====================
    
    // PROVEEDORES - GET todos
    else if (path === '/proveedores' && req.method === 'GET') {
      const proveedoresSnapshot = await db.collection('proveedores').get();
      const proveedores = [];
      
      proveedoresSnapshot.forEach(doc => {
        proveedores.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Proveedores encontrados: ${proveedores.length}`);
      
      res.json({
        success: true,
        data: proveedores,
        total: proveedores.length,
        message: 'Proveedores obtenidos correctamente'
      });
      return;
    }
    
    // PROVEEDORES - GET activos
    else if (path === '/proveedores/activos' && req.method === 'GET') {
      const proveedoresSnapshot = await db.collection('proveedores')
        .where('activo', '==', true)
        .get();
      
      const proveedores = [];
      proveedoresSnapshot.forEach(doc => {
        proveedores.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({
        success: true,
        data: proveedores,
        total: proveedores.length,
        message: 'Proveedores activos obtenidos correctamente'
      });
      return;
    }
    
    // PROVEEDOR - GET por ID
    else if (path.startsWith('/proveedores/') && req.method === 'GET') {
      const proveedorId = path.split('/proveedores/')[1];
      
      // Verificar si es una ruta especial
      if (proveedorId === 'activos') {
        return; // Ya manejado arriba
      }
      
      const proveedorDoc = await db.collection('proveedores').doc(proveedorId).get();
      
      if (!proveedorDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          id: proveedorDoc.id,
          ...proveedorDoc.data()
        },
        message: 'Proveedor obtenido correctamente'
      });
      return;
    }
    
    // PROVEEDORES - POST crear nuevo
    else if (path === '/proveedores' && req.method === 'POST') {
      const nuevoProveedor = req.body;
      
      // Validación básica
      if (!nuevoProveedor.nombre) {
        res.status(400).json({
          success: false,
          message: 'El nombre del proveedor es requerido'
        });
        return;
      }
      
      // Estructura para Firebase
      const proveedorFirebase = {
        ...nuevoProveedor,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevoProveedor.activo !== false
      };
      
      const docRef = await db.collection('proveedores').add(proveedorFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...proveedorFirebase
        },
        message: 'Proveedor creado correctamente'
      });
      return;
    }
    
    // PROVEEDORES - PUT actualizar
    else if (path.startsWith('/proveedores/') && req.method === 'PUT') {
      const proveedorId = path.split('/proveedores/')[1];
      const datosActualizacion = req.body;
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('proveedores').doc(proveedorId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: proveedorId,
          ...datosActualizacion
        },
        message: 'Proveedor actualizado correctamente'
      });
      return;
    }
    
    // PROVEEDORES - DELETE eliminar
    else if (path.startsWith('/proveedores/') && req.method === 'DELETE') {
      const proveedorId = path.split('/proveedores/')[1];
      
      await db.collection('proveedores').doc(proveedorId).delete();
      
      res.json({
        success: true,
        message: 'Proveedor eliminado correctamente'
      });
      return;
    }
    // ==================== SUCURSALES ====================

	// SUCURSALES - GET todas
	else if (path === '/sucursales' && req.method === 'GET') {
	  const sucursalesSnapshot = await db.collection('sucursales').get();
	  const sucursales = [];
	  
	  sucursalesSnapshot.forEach(doc => {
		sucursales.push({
		  id: doc.id,
		  ...doc.data()
		});
	  });
	  
	  console.log(`✅ Sucursales encontradas: ${sucursales.length}`);
	  
	  res.json({
		success: true,
		data: sucursales,
		total: sucursales.length,
		message: 'Sucursales obtenidas correctamente'
	  });
	  return;
	}

	// SUCURSALES - GET activas
	else if (path === '/sucursales/activas' && req.method === 'GET') {
	  const sucursalesSnapshot = await db.collection('sucursales')
		.where('activa', '==', true)
		.get();
	  
	  const sucursales = [];
	  sucursalesSnapshot.forEach(doc => {
		sucursales.push({
		  id: doc.id,
		  ...doc.data()
		});
	  });
	  
	  res.json({
		success: true,
		data: sucursales,
		total: sucursales.length,
		message: 'Sucursales activas obtenidas correctamente'
	  });
	  return;
	}

	// SUCURSALES - GET por usuario
	else if (path.match(/^\/sucursales\/usuario\/[^\/]+$/) && req.method === 'GET') {
	  const usuarioId = path.split('/usuario/')[1];
	  
	  // Primero obtener el usuario
	  const usuarioDoc = await db.collection('usuarios').doc(usuarioId).get();
	  
	  if (!usuarioDoc.exists) {
		res.status(404).json({
		  success: false,
		  message: 'Usuario no encontrado'
		});
		return;
	  }
	  
	  const usuario = usuarioDoc.data();
	  
	  // Si es administrador, devolver todas las sucursales
	  if (usuario.rol === 'Administrador') {
		const sucursalesSnapshot = await db.collection('sucursales')
		  .where('activa', '==', true)
		  .get();
		
		const sucursales = [];
		sucursalesSnapshot.forEach(doc => {
		  sucursales.push({
			id: doc.id,
			...doc.data()
		  });
		});
		
		res.json({
		  success: true,
		  data: sucursales,
		  message: 'Todas las sucursales (usuario administrador)'
		});
		return;
	  }
	  
	  // Si no es admin, devolver solo sus sucursales asignadas
	  const sucursalIds = usuario.sucursales || [];
	  
	  if (sucursalIds.length === 0) {
		res.json({
		  success: true,
		  data: [],
		  message: 'Usuario sin sucursales asignadas'
		});
		return;
	  }
	  
	  // Obtener las sucursales asignadas
	  const sucursales = [];
	  for (const sucursalId of sucursalIds) {
		const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
		if (sucursalDoc.exists && sucursalDoc.data().activa) {
		  sucursales.push({
			id: sucursalDoc.id,
			...sucursalDoc.data()
		  });
		}
	  }
	  
	  res.json({
		success: true,
		data: sucursales,
		message: 'Sucursales del usuario obtenidas correctamente'
	  });
	  return;
	}

	// SUCURSALES - GET stock de una sucursal
	else if (path.match(/^\/sucursales\/[^\/]+\/stock$/) && req.method === 'GET') {
	  const sucursalId = path.split('/')[2];
	  
	  // Verificar que la sucursal existe
	  const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
	  
	  if (!sucursalDoc.exists) {
		res.status(404).json({
		  success: false,
		  message: 'Sucursal no encontrada'
		});
		return;
	  }
	  
	  // Obtener stock de la sucursal
	  const stockSnapshot = await db.collection('stock_sucursal')
		.where('sucursal_id', '==', sucursalId)
		.get();
	  
	  const stock = [];
	  
	  // Para cada item de stock, obtener información del producto
	  for (const doc of stockSnapshot.docs) {
		const stockData = doc.data();
		
		// Obtener información del producto
		const productoDoc = await db.collection('productos').doc(stockData.producto_id).get();
		
		if (productoDoc.exists) {
		  const productoData = productoDoc.data();
		  stock.push({
			id: doc.id,
			...stockData,
			producto: {
			  id: productoDoc.id,
			  codigo: productoData.codigo,
			  nombre: productoData.nombre,
			  descripcion: productoData.descripcion,
			  categoria_id: productoData.categoria_id
			}
		  });
		}
	  }
	  
	  res.json({
		success: true,
		data: stock,
		total: stock.length,
		message: 'Stock de sucursal obtenido correctamente'
	  });
	  return;
	}

	// SUCURSAL - GET por ID
	else if (path.match(/^\/sucursales\/[^\/]+$/) && req.method === 'GET') {
	  const sucursalId = path.split('/sucursales/')[1];
	  
	  // Verificar si no es una ruta especial
	  if (['activas', 'usuario'].includes(sucursalId)) {
		return; // Ya manejado arriba
	  }
	  
	  const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
	  
	  if (!sucursalDoc.exists) {
		res.status(404).json({
		  success: false,
		  message: 'Sucursal no encontrada'
		});
		return;
	  }
	  
	  res.json({
		success: true,
		data: {
		  id: sucursalDoc.id,
		  ...sucursalDoc.data()
		},
		message: 'Sucursal obtenida correctamente'
	  });
	  return;
	}

	// SUCURSALES - POST crear nueva
	else if (path === '/sucursales' && req.method === 'POST') {
	  const nuevaSucursal = req.body;
	  
	  // Validación básica
	  if (!nuevaSucursal.nombre) {
		res.status(400).json({
		  success: false,
		  message: 'El nombre de la sucursal es requerido'
		});
		return;
	  }
	  
	  // Estructura para Firebase
	  const sucursalFirebase = {
		...nuevaSucursal,
		fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
		fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
		activa: nuevaSucursal.activa !== false
	  };
	  
	  const docRef = await db.collection('sucursales').add(sucursalFirebase);
	  
	  res.status(201).json({
		success: true,
		data: {
		  id: docRef.id,
		  ...sucursalFirebase
		},
		message: 'Sucursal creada correctamente'
	  });
	  return;
	}

	// SUCURSALES - PUT actualizar
	else if (path.match(/^\/sucursales\/[^\/]+$/) && req.method === 'PUT') {
	  const sucursalId = path.split('/sucursales/')[1];
	  const datosActualizacion = req.body;
	  
	  // Agregar timestamp de actualización
	  datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
	  
	  await db.collection('sucursales').doc(sucursalId).update(datosActualizacion);
	  
	  res.json({
		success: true,
		data: {
		  id: sucursalId,
		  ...datosActualizacion
		},
		message: 'Sucursal actualizada correctamente'
	  });
	  return;
	}

	// SUCURSALES - DELETE eliminar
	else if (path.match(/^\/sucursales\/[^\/]+$/) && req.method === 'DELETE') {
	  const sucursalId = path.split('/sucursales/')[1];
	  
	  // Verificar que no sea la sucursal principal
	  const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
	  
	  if (!sucursalDoc.exists) {
		res.status(404).json({
		  success: false,
		  message: 'Sucursal no encontrada'
		});
		return;
	  }
	  
	  const sucursal = sucursalDoc.data();
	  
	  if (sucursal.tipo === 'principal') {
		res.status(400).json({
		  success: false,
		  message: 'No se puede eliminar la sucursal principal'
		});
		return;
	  }
	  
	  // Verificar que no tenga stock
	  const stockSnapshot = await db.collection('stock_sucursal')
		.where('sucursal_id', '==', sucursalId)
		.where('cantidad', '>', 0)
		.limit(1)
		.get();
	  
	  if (!stockSnapshot.empty) {
		res.status(400).json({
		  success: true,
		  message: 'No se puede eliminar una sucursal con stock'
		});
		return;
	  }
	  
	  await db.collection('sucursales').doc(sucursalId).delete();
	  
	  res.json({
		success: true,
		message: 'Sucursal eliminada correctamente'
	  });
	  return;
	}
	// functions/index.js - AGREGAR DESPUÉS DE LA SECCIÓN DE SUCURSALES

// ==================== STOCK POR SUCURSAL ====================

	// STOCK-SUCURSAL - GET stock de una sucursal específica
	else if (path.match(/^\/stock-sucursal\/sucursal\/[^\/]+$/) && req.method === 'GET') {
	  const sucursalId = path.split('/sucursal/')[1];
	  
	  try {
		// Verificar que la sucursal existe
		const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
		if (!sucursalDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Sucursal no encontrada'
		  });
		  return;
		}
		
		// Obtener stock de la sucursal con información de productos
		const stockSnapshot = await db.collection('stock_sucursal')
		  .where('sucursal_id', '==', sucursalId)
		  .get();
		
		const stock = [];
		
		// Obtener información de productos en paralelo
		const productosPromises = stockSnapshot.docs.map(async (doc) => {
		  const stockData = doc.data();
		  const productoDoc = await db.collection('productos').doc(stockData.producto_id).get();
		  
		  if (productoDoc.exists) {
			const productoData = productoDoc.data();
			return {
			  id: doc.id,
			  ...stockData,
			  producto: {
				id: productoDoc.id,
				codigo: productoData.codigo,
				nombre: productoData.nombre,
				descripcion: productoData.descripcion,
				precio_venta: productoData.precio_venta,
				precio_costo: productoData.precio_costo,
				categoria_id: productoData.categoria_id
			  }
			};
		  }
		  return null;
		});
		
		const stockConProductos = await Promise.all(productosPromises);
		const stockFiltrado = stockConProductos.filter(item => item !== null);
		
		res.json({
		  success: true,
		  data: stockFiltrado,
		  total: stockFiltrado.length,
		  message: 'Stock de sucursal obtenido correctamente'
		});
	  } catch (error) {
		console.error('Error al obtener stock de sucursal:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener stock de sucursal',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - GET stock de un producto en todas las sucursales
	else if (path.match(/^\/stock-sucursal\/producto\/[^\/]+$/) && req.method === 'GET') {
	  const productoId = path.split('/producto/')[1];
	  
	  try {
		// Verificar que el producto existe
		const productoDoc = await db.collection('productos').doc(productoId).get();
		if (!productoDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Producto no encontrado'
		  });
		  return;
		}
		
		// Obtener stock del producto en todas las sucursales
		const stockSnapshot = await db.collection('stock_sucursal')
		  .where('producto_id', '==', productoId)
		  .get();
		
		const stock = [];
		
		// Obtener información de sucursales
		for (const doc of stockSnapshot.docs) {
		  const stockData = doc.data();
		  const sucursalDoc = await db.collection('sucursales').doc(stockData.sucursal_id).get();
		  
		  if (sucursalDoc.exists) {
			const sucursalData = sucursalDoc.data();
			stock.push({
			  id: doc.id,
			  ...stockData,
			  sucursal: {
				id: sucursalDoc.id,
				nombre: sucursalData.nombre,
				tipo: sucursalData.tipo
			  }
			});
		  }
		}
		
		res.json({
		  success: true,
		  data: stock,
		  total: stock.length,
		  message: 'Stock del producto obtenido correctamente'
		});
	  } catch (error) {
		console.error('Error al obtener stock del producto:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener stock del producto',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - GET productos con stock bajo en una sucursal
	else if (path.match(/^\/stock-sucursal\/sucursal\/[^\/]+\/stock-bajo$/) && req.method === 'GET') {
	  const sucursalId = path.split('/sucursal/')[1].split('/stock-bajo')[0];
	  
	  try {
		// Obtener stock bajo (donde cantidad <= stock_minimo)
		const stockSnapshot = await db.collection('stock_sucursal')
		  .where('sucursal_id', '==', sucursalId)
		  .get();
		
		const stockBajo = [];
		
		for (const doc of stockSnapshot.docs) {
		  const stockData = doc.data();
		  
		  // Verificar si el stock está bajo
		  if (stockData.cantidad <= stockData.stock_minimo) {
			const productoDoc = await db.collection('productos').doc(stockData.producto_id).get();
			
			if (productoDoc.exists) {
			  const productoData = productoDoc.data();
			  stockBajo.push({
				id: doc.id,
				...stockData,
				producto: {
				  id: productoDoc.id,
				  codigo: productoData.codigo,
				  nombre: productoData.nombre,
				  categoria_id: productoData.categoria_id
				},
				diferencia: stockData.stock_minimo - stockData.cantidad
			  });
			}
		  }
		}
		
		// Ordenar por diferencia (más críticos primero)
		stockBajo.sort((a, b) => b.diferencia - a.diferencia);
		
		res.json({
		  success: true,
		  data: stockBajo,
		  total: stockBajo.length,
		  message: 'Productos con stock bajo obtenidos correctamente'
		});
	  } catch (error) {
		console.error('Error al obtener stock bajo:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener stock bajo',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - PUT actualizar stock de un producto en una sucursal
	else if (path.match(/^\/stock-sucursal\/[^\/]+\/[^\/]+$/) && req.method === 'PUT') {
	  const [sucursalId, productoId] = path.split('/stock-sucursal/')[1].split('/');
	  const { cantidad, stock_minimo } = req.body;
	  
	  try {
		// Buscar el registro de stock existente
		const stockQuery = await db.collection('stock_sucursal')
		  .where('sucursal_id', '==', sucursalId)
		  .where('producto_id', '==', productoId)
		  .limit(1)
		  .get();
		
		if (stockQuery.empty) {
		  // Si no existe, crear uno nuevo
		  const nuevoStock = {
			sucursal_id: sucursalId,
			producto_id: productoId,
			cantidad: parseInt(cantidad || 0),
			stock_minimo: parseInt(stock_minimo || 5),
			ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
		  };
		  
		  const docRef = await db.collection('stock_sucursal').add(nuevoStock);
		  
		  res.json({
			success: true,
			data: {
			  id: docRef.id,
			  ...nuevoStock
			},
			message: 'Stock creado correctamente'
		  });
		} else {
		  // Si existe, actualizar
		  const stockDoc = stockQuery.docs[0];
		  const actualizacion = {
			ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
		  };
		  
		  if (cantidad !== undefined) {
			actualizacion.cantidad = parseInt(cantidad);
		  }
		  if (stock_minimo !== undefined) {
			actualizacion.stock_minimo = parseInt(stock_minimo);
		  }
		  
		  await stockDoc.ref.update(actualizacion);
		  
		  res.json({
			success: true,
			data: {
			  id: stockDoc.id,
			  ...stockDoc.data(),
			  ...actualizacion
			},
			message: 'Stock actualizado correctamente'
		  });
		}
	  } catch (error) {
		console.error('Error al actualizar stock:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al actualizar stock',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - POST ajustar stock (sumar o restar)
	else if (path === '/stock-sucursal/ajustar' && req.method === 'POST') {
	  const { sucursal_id, producto_id, ajuste, motivo } = req.body;
	  
	  try {
		// Validaciones
		if (!sucursal_id || !producto_id || ajuste === undefined || !motivo) {
		  res.status(400).json({
			success: false,
			message: 'Faltan datos requeridos'
		  });
		  return;
		}
		
		const ajusteNum = parseInt(ajuste);
		
		// Buscar el stock actual
		const stockQuery = await db.collection('stock_sucursal')
		  .where('sucursal_id', '==', sucursal_id)
		  .where('producto_id', '==', producto_id)
		  .limit(1)
		  .get();
		
		if (stockQuery.empty) {
		  res.status(404).json({
			success: false,
			message: 'Stock no encontrado para este producto en esta sucursal'
		  });
		  return;
		}
		
		const stockDoc = stockQuery.docs[0];
		const stockActual = stockDoc.data().cantidad || 0;
		const nuevaCantidad = Math.max(0, stockActual + ajusteNum);
		
		// Actualizar stock
		await stockDoc.ref.update({
		  cantidad: nuevaCantidad,
		  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
		});
		
		// Registrar movimiento
		await db.collection('movimientos_stock').add({
		  sucursal_id,
		  producto_id,
		  tipo: ajusteNum > 0 ? 'entrada' : 'salida',
		  cantidad: Math.abs(ajusteNum),
		  stock_anterior: stockActual,
		  stock_nuevo: nuevaCantidad,
		  motivo,
		  fecha: admin.firestore.FieldValue.serverTimestamp(),
		  usuario_id: req.body.usuario_id || 'sistema'
		});
		
		res.json({
		  success: true,
		  data: {
			stock_anterior: stockActual,
			ajuste: ajusteNum,
			stock_nuevo: nuevaCantidad
		  },
		  message: 'Stock ajustado correctamente'
		});
	  } catch (error) {
		console.error('Error al ajustar stock:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al ajustar stock',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - POST inicializar stock para una sucursal
	else if (path === '/stock-sucursal/inicializar' && req.method === 'POST') {
	  const { sucursal_id, productos } = req.body;
	  
	  try {
		if (!sucursal_id || !Array.isArray(productos)) {
		  res.status(400).json({
			success: false,
			message: 'Datos inválidos'
		  });
		  return;
		}
		
		const batch = db.batch();
		const registrosCreados = [];
		
		for (const producto of productos) {
		  if (!producto.producto_id) continue;
		  
		  // Verificar si ya existe
		  const stockExistente = await db.collection('stock_sucursal')
			.where('sucursal_id', '==', sucursal_id)
			.where('producto_id', '==', producto.producto_id)
			.limit(1)
			.get();
		  
		  if (stockExistente.empty) {
			const nuevoStock = {
			  sucursal_id,
			  producto_id: producto.producto_id,
			  cantidad: parseInt(producto.cantidad || 0),
			  stock_minimo: parseInt(producto.stock_minimo || 5),
			  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
			};
			
			const docRef = db.collection('stock_sucursal').doc();
			batch.set(docRef, nuevoStock);
			registrosCreados.push({
			  id: docRef.id,
			  ...nuevoStock
			});
		  }
		}
		
		await batch.commit();
		
		res.json({
		  success: true,
		  data: registrosCreados,
		  total: registrosCreados.length,
		  message: `Stock inicializado: ${registrosCreados.length} productos`
		});
	  } catch (error) {
		console.error('Error al inicializar stock:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al inicializar stock',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - POST transferir stock entre sucursales
	else if (path === '/stock-sucursal/transferir' && req.method === 'POST') {
	  const { 
		sucursal_origen_id, 
		sucursal_destino_id, 
		productos, // Array de {producto_id, cantidad}
		motivo,
		usuario_id 
	  } = req.body;
	  
	  try {
		// Validaciones
		if (!sucursal_origen_id || !sucursal_destino_id || !Array.isArray(productos) || productos.length === 0) {
		  res.status(400).json({
			success: false,
			message: 'Datos inválidos para la transferencia'
		  });
		  return;
		}
		
		// Crear registro de transferencia
		const transferencia = {
		  sucursal_origen_id,
		  sucursal_destino_id,
		  usuario_solicita_id: usuario_id || 'sistema',
		  estado: 'pendiente',
		  motivo: motivo || '',
		  fecha_solicitud: admin.firestore.FieldValue.serverTimestamp(),
		  productos: productos
		};
		
		const transferenciaRef = await db.collection('transferencias').add(transferencia);
		
		res.json({
		  success: true,
		  data: {
			id: transferenciaRef.id,
			...transferencia
		  },
		  message: 'Transferencia creada y pendiente de aprobación'
		});
	  } catch (error) {
		console.error('Error al crear transferencia:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al crear transferencia',
		  error: error.message
		});
	  }
	  return;
	}

	// STOCK-SUCURSAL - GET movimientos de stock de una sucursal
	else if (path.match(/^\/stock-sucursal\/sucursal\/[^\/]+\/movimientos$/) && req.method === 'GET') {
	  const sucursalId = path.split('/sucursal/')[1].split('/movimientos')[0];
	  const { fecha_inicio, fecha_fin, tipo } = req.query;
	  
	  try {
		let query = db.collection('movimientos_stock')
		  .where('sucursal_id', '==', sucursalId);
		
		if (tipo) {
		  query = query.where('tipo', '==', tipo);
		}
		
		// Por ahora ordenar por fecha descendente
		query = query.orderBy('fecha', 'desc').limit(100);
		
		const movimientosSnapshot = await query.get();
		const movimientos = [];
		
		// Enriquecer con información de productos
		for (const doc of movimientosSnapshot.docs) {
		  const movimiento = doc.data();
		  const productoDoc = await db.collection('productos').doc(movimiento.producto_id).get();
		  
		  if (productoDoc.exists) {
			movimientos.push({
			  id: doc.id,
			  ...movimiento,
			  producto: {
				id: productoDoc.id,
				codigo: productoDoc.data().codigo,
				nombre: productoDoc.data().nombre
			  }
			});
		  }
		}
		
		res.json({
		  success: true,
		  data: movimientos,
		  total: movimientos.length,
		  message: 'Movimientos obtenidos correctamente'
		});
	  } catch (error) {
		console.error('Error al obtener movimientos:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener movimientos',
		  error: error.message
		});
	  }
	  return;
	}
    // ==================== COMPRAS ====================
    
    // COMPRAS - GET todas
    else if (path === '/compras' && req.method === 'GET') {
      const comprasSnapshot = await db.collection('compras').get();
      const compras = [];
      
      comprasSnapshot.forEach(doc => {
        compras.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Compras encontradas: ${compras.length}`);
      
      res.json({
        success: true,
        data: compras,
        total: compras.length,
        message: 'Compras obtenidas correctamente'
      });
      return;
    }
    
    // COMPRA - GET por ID
    else if (path.startsWith('/compras/') && req.method === 'GET') {
      const compraId = path.split('/compras/')[1];
      const compraDoc = await db.collection('compras').doc(compraId).get();
      
      if (!compraDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Compra no encontrada'
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          id: compraDoc.id,
          ...compraDoc.data()
        },
        message: 'Compra obtenida correctamente'
      });
      return;
    }
    
    // COMPRAS - POST crear nueva (CORREGIDO PARA ACTUALIZAR STOCK)
	else if (path === '/compras' && req.method === 'POST') {
	  const nuevaCompra = req.body;
	  
	  console.log('📦 Creando nueva compra:', nuevaCompra);
	  
	  // Validación básica
	  if (!nuevaCompra.proveedor_id || !nuevaCompra.detalles || nuevaCompra.detalles.length === 0) {
		res.status(400).json({
		  success: false,
		  message: 'Datos de compra incompletos (proveedor y detalles requeridos)'
		});
		return;
	  }
	  
	  try {
		// Obtener la sucursal principal
		const sucursalPrincipalSnapshot = await db.collection('sucursales')
		  .where('tipo', '==', 'principal')
		  .limit(1)
		  .get();
		
		if (sucursalPrincipalSnapshot.empty) {
		  // Si no hay sucursal principal, crear una
		  console.log('⚠️ No se encontró sucursal principal, creando una...');
		  
		  const nuevaSucursal = {
			nombre: 'Sucursal Principal',
			direccion: 'Dirección principal',
			telefono: '',
			tipo: 'principal',
			activa: true,
			fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
		  };
		  
		  const sucursalRef = await db.collection('sucursales').add(nuevaSucursal);
		  var sucursalPrincipalId = sucursalRef.id;
		  
		  console.log('✅ Sucursal principal creada:', sucursalPrincipalId);
		} else {
		  var sucursalPrincipalId = sucursalPrincipalSnapshot.docs[0].id;
		  console.log('✅ Usando sucursal principal existente:', sucursalPrincipalId);
		}
		
		// Estructura para Firebase
		const compraFirebase = {
		  ...nuevaCompra,
		  sucursal_id: sucursalPrincipalId,
		  fecha: nuevaCompra.fecha || new Date().toISOString(),
		  fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
		  fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
		  estado: nuevaCompra.estado || 'pendiente',
		  activo: nuevaCompra.activo !== false
		};
		
		// Crear la compra
		const docRef = await db.collection('compras').add(compraFirebase);
		console.log('✅ Compra creada con ID:', docRef.id);
		
		// Si la compra está completada, actualizar stock
		if (compraFirebase.estado === 'completada' && Array.isArray(compraFirebase.detalles)) {
		  console.log('🔄 Actualizando stock en sucursal principal...');
		  
		  const batch = db.batch();
		  
		  for (const detalle of compraFirebase.detalles) {
			if (detalle.producto_id && detalle.cantidad) {
			  console.log(`  📦 Procesando producto ${detalle.producto_id}, cantidad: ${detalle.cantidad}`);
			  
			  // Buscar stock existente
			  const stockQuery = await db.collection('stock_sucursal')
				.where('producto_id', '==', detalle.producto_id)
				.where('sucursal_id', '==', sucursalPrincipalId)
				.limit(1)
				.get();
			  
			  if (stockQuery.empty) {
				// Crear nuevo registro de stock
				console.log(`  🆕 Creando stock para producto ${detalle.producto_id}`);
				
				const nuevoStockRef = db.collection('stock_sucursal').doc();
				batch.set(nuevoStockRef, {
				  producto_id: detalle.producto_id,
				  sucursal_id: sucursalPrincipalId,
				  cantidad: parseInt(detalle.cantidad),
				  stock_minimo: 5,
				  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
				});
			  } else {
				// Actualizar stock existente
				const stockDoc = stockQuery.docs[0];
				const stockData = stockDoc.data();
				const stockActual = parseInt(stockData.cantidad || 0);
				const nuevoStock = stockActual + parseInt(detalle.cantidad);
				
				console.log(`  🔄 Actualizando stock: ${stockActual} + ${detalle.cantidad} = ${nuevoStock}`);
				
				batch.update(stockDoc.ref, {
				  cantidad: nuevoStock,
				  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
				});
			  }
			  
			  // Crear movimiento de stock
			  const movimientoRef = db.collection('movimientos_stock').doc();
			  batch.set(movimientoRef, {
				sucursal_id: sucursalPrincipalId,
				producto_id: detalle.producto_id,
				tipo: 'entrada',
				cantidad: parseInt(detalle.cantidad),
				motivo: 'Compra a proveedor',
				referencia_tipo: 'compra',
				referencia_id: docRef.id,
				fecha: admin.firestore.FieldValue.serverTimestamp(),
				usuario_id: nuevaCompra.usuario_id || 'sistema'
			  });
			}
		  }
		  
		  // Ejecutar todas las operaciones
		  await batch.commit();
		  console.log('✅ Stock actualizado correctamente');
		}
		
		res.status(201).json({
		  success: true,
		  data: {
			id: docRef.id,
			...compraFirebase
		  },
		  message: 'Compra creada correctamente'
		});
		
	  } catch (error) {
		console.error('❌ Error al crear compra:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al crear compra',
		  error: error.message
		});
	  }
	  
	  return;
	}

	// COMPRAS - PUT actualizar (TAMBIÉN CORREGIR PARA STOCK)
	else if (path.match(/^\/compras\/[^\/]+$/) && req.method === 'PUT') {
	  const compraId = path.split('/compras/')[1];
	  const datosActualizacion = req.body;
	  
	  try {
		// Obtener compra actual
		const compraRef = db.collection('compras').doc(compraId);
		const compraDoc = await compraRef.get();
		
		if (!compraDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Compra no encontrada'
		  });
		  return;
		}
		
		const compraAnterior = compraDoc.data();
		
		// Actualizar compra
		datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
		await compraRef.update(datosActualizacion);
		
		// Si cambió de pendiente a completada, actualizar stock
		if (compraAnterior.estado !== 'completada' && 
			datosActualizacion.estado === 'completada' && 
			Array.isArray(compraAnterior.detalles)) {
		  
		  console.log('🔄 Compra marcada como completada, actualizando stock...');
		  
		  const sucursalId = compraAnterior.sucursal_id;
		  const batch = db.batch();
		  
		  for (const detalle of compraAnterior.detalles) {
			if (detalle.producto_id && detalle.cantidad) {
			  // Buscar stock
			  const stockQuery = await db.collection('stock_sucursal')
				.where('producto_id', '==', detalle.producto_id)
				.where('sucursal_id', '==', sucursalId)
				.limit(1)
				.get();
			  
			  if (stockQuery.empty) {
				// Crear stock
				const nuevoStockRef = db.collection('stock_sucursal').doc();
				batch.set(nuevoStockRef, {
				  producto_id: detalle.producto_id,
				  sucursal_id: sucursalId,
				  cantidad: parseInt(detalle.cantidad),
				  stock_minimo: 5,
				  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
				});
			  } else {
				// Actualizar stock
				const stockDoc = stockQuery.docs[0];
				const stockActual = parseInt(stockDoc.data().cantidad || 0);
				
				batch.update(stockDoc.ref, {
				  cantidad: stockActual + parseInt(detalle.cantidad),
				  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
				});
			  }
			  
			  // Registrar movimiento
			  const movimientoRef = db.collection('movimientos_stock').doc();
			  batch.set(movimientoRef, {
				sucursal_id: sucursalId,
				producto_id: detalle.producto_id,
				tipo: 'entrada',
				cantidad: parseInt(detalle.cantidad),
				motivo: 'Compra recibida',
				referencia_tipo: 'compra',
				referencia_id: compraId,
				fecha: admin.firestore.FieldValue.serverTimestamp(),
				usuario_id: datosActualizacion.usuario_id || 'sistema'
			  });
			}
		  }
		  
		  await batch.commit();
		  console.log('✅ Stock actualizado por recepción de compra');
		}
		
		res.json({
		  success: true,
		  data: {
			id: compraId,
			...datosActualizacion
		  },
		  message: 'Compra actualizada correctamente'
		});
		
	  } catch (error) {
		console.error('Error al actualizar compra:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al actualizar compra',
		  error: error.message
		});
	  }
	  
	  return;
	}
    
    // ==================== VENTAS - SECCIÓN ACTUALIZADA CON SISTEMA DE PAGOS ====================
    
    // VENTAS - GET todas (con enriquecimiento de cliente)
    else if (path === '/ventas' && req.method === 'GET') {
      const ventasSnapshot = await db.collection('ventas').get();
      const ventas = [];
      
      ventasSnapshot.forEach(doc => {
        ventas.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Enriquecer ventas con información de clientes
      const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
      
      console.log(`✅ Ventas encontradas: ${ventasEnriquecidas.length}`);
      
      res.json({
        success: true,
        data: ventasEnriquecidas,
        total: ventasEnriquecidas.length,
        message: 'Ventas obtenidas correctamente'
      });
      return;
    }
    
	// VENTAS - Estadísticas del día (CRÍTICO para Dashboard) - CORREGIDO PARA PAGOS
	else if (path === '/ventas/estadisticas/dia' && req.method === 'GET') {
	  try {
		// Obtener fecha de hoy
		const hoy = new Date();
		const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
		const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
		
		console.log(`📊 Calculando estadísticas del ${inicioHoy.toISOString()} al ${finHoy.toISOString()}`);
		
		const ventasHoySnapshot = await db.collection('ventas')
		  .where('fecha', '>=', inicioHoy.toISOString())
		  .where('fecha', '<', finHoy.toISOString())
		  .get();
		
		let totalVentasHoy = 0;
		let gananciasHoy = 0;
		let productosVendidos = 0;
		
		// 🆕 NUEVAS MÉTRICAS DE PAGOS
		let totalPagadoHoy = 0;
		let saldoPendienteTotal = 0;
		let ventasConSaldoPendiente = 0;
		let ventasPagadas = 0;
		let ventasParciales = 0;
		let ventasPendientes = 0;
		
		const clientesHoy = new Set();
		const ventasPorHora = Array(24).fill(0);
		const metodosPago = {
		  efectivo: 0,
		  tarjeta: 0,
		  transferencia: 0,
		  credito: 0,
		  otro: 0
		};
		
		console.log(`📋 Procesando ${ventasHoySnapshot.size} ventas del día...`);
		
		ventasHoySnapshot.forEach(doc => {
		  const venta = doc.data();
		  
		  // Valores básicos
		  const total = parseFloat(venta.total || 0);
		  const totalPagado = parseFloat(venta.total_pagado || 0);
		  const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
		  const estadoPago = venta.estado_pago || 'pendiente';
		  
		  // Acumular totales
		  totalVentasHoy += total;
		  totalPagadoHoy += totalPagado;
		  saldoPendienteTotal += saldoPendiente;
		  
		  // Contadores por estado de pago
		  if (estadoPago === 'pagado' || totalPagado >= total) {
			ventasPagadas++;
		  } else if (estadoPago === 'parcial' && totalPagado > 0) {
			ventasParciales++;
		  } else {
			ventasPendientes++;
		  }
		  
		  // Ventas con saldo pendiente
		  if (saldoPendiente > 0) {
			ventasConSaldoPendiente++;
		  }
		  
		  // Ganancias (usar ganancia si existe, sino estimar 20% del total)
		  gananciasHoy += (venta.ganancia || total * 0.2 || 0);
		  
		  // Productos vendidos
		  if (venta.detalles && Array.isArray(venta.detalles)) {
			productosVendidos += venta.detalles.reduce((sum, detalle) => sum + (detalle.cantidad || 0), 0);
		  }
		  
		  // Clientes únicos
		  if (venta.cliente_id) {
			clientesHoy.add(venta.cliente_id);
		  }
		  
		  // Ventas por hora
		  if (venta.fecha) {
			const hora = new Date(venta.fecha).getHours();
			if (hora >= 0 && hora < 24) {
			  ventasPorHora[hora]++;
			}
		  }
		  
		  // Métodos de pago - acumular montos pagados por método
		  const metodo = venta.metodo_pago || 'efectivo';
		  if (metodosPago[metodo] !== undefined) {
			metodosPago[metodo] += totalPagado; // Usar monto pagado, no total de venta
		  } else {
			metodosPago.otro += totalPagado;
		  }
		});
		
		// 🆕 CALCULAR ESTADÍSTICAS GLOBALES (excluyendo canceladas/devueltas)
		console.log('📊 Calculando estadísticas globales...');
		
		const todasVentasSnapshot = await db.collection('ventas').get();
		let saldoPendienteTotalGlobal = 0;
		let ventasConSaldoPendienteGlobal = 0;
		
		todasVentasSnapshot.forEach(doc => {
		  const venta = doc.data();
		  const estadoPago = venta.estado_pago || 'pendiente';
		  const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
		  
		  // 🆕 EXCLUIR VENTAS CANCELADAS Y DEVUELTAS DE LA DEUDA PENDIENTE
		  if (estadoPago !== 'cancelado' && estadoPago !== 'devuelto' && saldoPendiente > 0) {
			saldoPendienteTotalGlobal += saldoPendiente;
			ventasConSaldoPendienteGlobal++;
		  }
		});
		
		// Determinar método de pago más usado
		const metodoPagoMasUsado = Object.keys(metodosPago).reduce((a, b) => 
		  metodosPago[a] > metodosPago[b] ? a : b
		);
		
		// Calcular porcentajes
		const porcentajeCobrado = totalVentasHoy > 0 ? (totalPagadoHoy / totalVentasHoy) * 100 : 0;
		
		const estadisticas = {
		  // Métricas básicas
		  ventasHoy: ventasHoySnapshot.size,
		  totalVentasHoy,
		  gananciasHoy,
		  promedioVenta: ventasHoySnapshot.size > 0 ? totalVentasHoy / ventasHoySnapshot.size : 0,
		  productosVendidos,
		  clientesAtendidos: clientesHoy.size,
		  ventasPorHora,
		  metodoPagoMasUsado,
		  
		  // 🆕 MÉTRICAS DE PAGOS DEL DÍA
		  totalPagadoHoy,
		  saldoPendienteTotal: saldoPendienteTotalGlobal, // Total global, no solo del día
		  ventasConSaldoPendiente: ventasConSaldoPendienteGlobal, // Total global
		  porcentajeCobrado,
		  
		  // 🆕 CONTADORES POR ESTADO DE PAGO (del día)
		  ventasPagadas,
		  ventasParciales,
		  ventasPendientes,
		  
		  // 🆕 MONTOS POR MÉTODO DE PAGO
		  metodosPago,
		  efectivo: metodosPago.efectivo,
		  tarjeta: metodosPago.tarjeta,
		  transferencia: metodosPago.transferencia,
		  credito: metodosPago.credito,
		  
		  // Información adicional para debugging
		  debug: {
			fechaConsulta: new Date().toISOString(),
			rangoFechas: {
			  inicio: inicioHoy.toISOString(),
			  fin: finHoy.toISOString()
			},
			totalVentasGlobales: todasVentasSnapshot.size
		  }
		};
		
		console.log('✅ Estadísticas calculadas:', {
		  ventasHoy: estadisticas.ventasHoy,
		  totalVentasHoy: estadisticas.totalVentasHoy,
		  totalPagadoHoy: estadisticas.totalPagadoHoy,
		  saldoPendienteTotal: estadisticas.saldoPendienteTotal,
		  ventasConSaldoPendiente: estadisticas.ventasConSaldoPendiente
		});
		
		res.json({
		  success: true,
		  data: estadisticas,
		  message: 'Estadísticas del día obtenidas correctamente'
		});
		
	  } catch (error) {
		console.error('❌ Error al calcular estadísticas:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al calcular estadísticas del día',
		  error: error.message
		});
	  }
	  
	  return;
	}
    
    // VENTAS - Estadísticas generales
    else if (path === '/ventas/estadisticas' && req.method === 'GET') {
      const { fecha_inicio, fecha_fin, cliente_id } = req.query;
      
      let query = db.collection('ventas');
      
      if (fecha_inicio) {
        query = query.where('fecha', '>=', fecha_inicio);
      }
      if (fecha_fin) {
        query = query.where('fecha', '<=', fecha_fin);
      }
      if (cliente_id) {
        query = query.where('cliente_id', '==', cliente_id);
      }
      
      const ventasSnapshot = await query.get();
      
      let totalVentas = 0;
      let totalFacturado = 0;
      const topProductos = {};
      const topClientes = {};
      
      ventasSnapshot.forEach(doc => {
        const venta = doc.data();
        totalVentas++;
        totalFacturado += venta.total || 0;
        
        if (venta.cliente_id) {
          topClientes[venta.cliente_id] = (topClientes[venta.cliente_id] || 0) + (venta.total || 0);
        }
        
        if (venta.detalles && Array.isArray(venta.detalles)) {
          venta.detalles.forEach(detalle => {
            const productoId = detalle.producto_id;
            if (productoId) {
              topProductos[productoId] = (topProductos[productoId] || 0) + (detalle.cantidad || 0);
            }
          });
        }
      });
      
      const estadisticas = {
        totalVentas,
        totalFacturado,
        promedioVenta: totalVentas > 0 ? totalFacturado / totalVentas : 0,
        topProductos: Object.entries(topProductos).map(([id, cantidad]) => ({ producto_id: id, cantidad })),
        topClientes: Object.entries(topClientes).map(([id, total]) => ({ cliente_id: id, total }))
      };
      
      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas generales obtenidas correctamente'
      });
      return;
    }
    
    // VENTAS - Por cliente
    else if (path.startsWith('/ventas/cliente/') && req.method === 'GET') {
      const clienteId = path.split('/ventas/cliente/')[1];
      
      const ventasSnapshot = await db.collection('ventas')
        .where('cliente_id', '==', clienteId)
        .orderBy('fecha', 'desc')
        .get();
      
      const ventas = [];
      ventasSnapshot.forEach(doc => {
        ventas.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Enriquecer con datos de cliente
      const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
      
      res.json({
        success: true,
        data: ventasEnriquecidas,
        total: ventasEnriquecidas.length,
        message: 'Ventas del cliente obtenidas correctamente'
      });
      return;
    }
    
    // VENTAS - Buscar (ACTUALIZADO PARA SOPORTAR FILTRO POR SUCURSAL)
	else if (path === '/ventas/buscar' && req.method === 'GET') {
	  const { termino, sucursal_id } = req.query; // 🆕 NUEVO: Parámetro opcional de sucursal
	  
	  try {
		console.log(`🔍 Buscando ventas con término: "${termino}"${sucursal_id ? ` en sucursal ${sucursal_id}` : ''}`);
		
		if (!termino) {
		  // 🆕 MODIFICADO: Si no hay término, aplicar filtro de sucursal si existe
		  let query = db.collection('ventas');
		  
		  if (sucursal_id) {
			query = query.where('sucursal_id', '==', sucursal_id);
		  }
		  
		  const ventasSnapshot = await query.orderBy('fecha', 'desc').get();
		  const ventas = [];
		  
		  ventasSnapshot.forEach(doc => {
			ventas.push({
			  id: doc.id,
			  ...doc.data()
			});
		  });
		  
		  const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
		  
		  res.json({
			success: true,
			data: ventasEnriquecidas,
			total: ventasEnriquecidas.length,
			sucursal_id: sucursal_id || null,
			message: sucursal_id ? 'Ventas de sucursal obtenidas' : 'Todas las ventas obtenidas'
		  });
		  return;
		}
		
		// 🆕 BÚSQUEDA CON FILTRO DE SUCURSAL
		let query = db.collection('ventas');
		
		if (sucursal_id) {
		  query = query.where('sucursal_id', '==', sucursal_id);
		}
		
		const ventasSnapshot = await query.get();
		const ventas = [];
		const terminoLower = termino.toLowerCase();
		
		ventasSnapshot.forEach(doc => {
		  const venta = doc.data();
		  // Buscar en campos de la venta
		  if (venta.id?.toLowerCase().includes(terminoLower) ||
			  venta.numero?.toString().toLowerCase().includes(terminoLower) ||
			  venta.metodo_pago?.toLowerCase().includes(terminoLower) ||
			  venta.estado?.toLowerCase().includes(terminoLower) ||
			  venta.cliente_info?.nombre_completo?.toLowerCase().includes(terminoLower)) {
			ventas.push({
			  id: doc.id,
			  ...venta
			});
		  }
		});
		
		const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
		
		console.log(`✅ Búsqueda completada: ${ventasEnriquecidas.length} resultados${sucursal_id ? ` en sucursal ${sucursal_id}` : ''}`);
		
		res.json({
		  success: true,
		  data: ventasEnriquecidas,
		  total: ventasEnriquecidas.length,
		  termino: termino,
		  sucursal_id: sucursal_id || null,
		  message: 'Búsqueda de ventas completada'
		});
	  } catch (error) {
		console.error('❌ Error en búsqueda de ventas:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error en la búsqueda de ventas',
		  error: error.message
		});
	  }
	  return;
	}

	// VENTAS - Obtener ventas con saldo pendiente (con filtro de sucursal)
	else if (path === '/ventas/saldo-pendiente' && req.method === 'GET') {
	  const { sucursal_id } = req.query;
	  
	  try {
		console.log(`💰 Obteniendo ventas con saldo pendiente${sucursal_id ? ` de sucursal ${sucursal_id}` : ''}`);
		
		// Construir query base
		let query = db.collection('ventas')
		  .where('saldo_pendiente', '>', 0);
		
		// Agregar filtro de sucursal si se proporciona
		if (sucursal_id) {
		  query = query.where('sucursal_id', '==', sucursal_id);
		}
		
		// Excluir ventas canceladas y devueltas
		const ventasSnapshot = await query.get();
		const ventas = [];
		
		ventasSnapshot.forEach(doc => {
		  const venta = doc.data();
		  const estadoPago = venta.estado_pago || 'pendiente';
		  
		  // Solo incluir ventas que no estén canceladas o devueltas
		  if (estadoPago !== 'cancelado' && estadoPago !== 'devuelto') {
			ventas.push({
			  id: doc.id,
			  ...venta
			});
		  }
		});
		
		// Enriquecer con información de clientes
		const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
		
		// Ordenar por saldo pendiente descendente
		ventasEnriquecidas.sort((a, b) => (b.saldo_pendiente || 0) - (a.saldo_pendiente || 0));
		
		console.log(`✅ Ventas con saldo pendiente: ${ventasEnriquecidas.length}${sucursal_id ? ` en sucursal ${sucursal_id}` : ''}`);
		
		res.json({
		  success: true,
		  data: ventasEnriquecidas,
		  total: ventasEnriquecidas.length,
		  sucursal_id: sucursal_id || null,
		  total_saldo_pendiente: ventasEnriquecidas.reduce((sum, v) => sum + (v.saldo_pendiente || 0), 0),
		  message: `Ventas con saldo pendiente obtenidas correctamente${sucursal_id ? ' para la sucursal especificada' : ''}`
		});
	  } catch (error) {
		console.error('❌ Error al obtener ventas con saldo pendiente:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener ventas con saldo pendiente',
		  error: error.message
		});
	  }
	  return;
	}
    
    // NUEVO: VENTAS - Registrar pago
    else if (path.match(/^\/ventas\/[^\/]+\/pagos$/) && req.method === 'POST') {
      const ventaId = path.split('/')[2];
      const pago = req.body;
      
      try {
        const resultado = await db.runTransaction(async (transaction) => {
          const ventaRef = db.collection('ventas').doc(ventaId);
          const ventaDoc = await transaction.get(ventaRef);
          
          if (!ventaDoc.exists) {
            throw new Error('Venta no encontrada');
          }
          
          const venta = ventaDoc.data();
          const totalVenta = parseFloat(venta.total);
          const totalPagado = parseFloat(venta.total_pagado || 0);
          const montoPago = parseFloat(pago.monto);
          
          // Validaciones
          if (montoPago <= 0) {
            throw new Error('El monto debe ser mayor a 0');
          }
          
          if (montoPago > (totalVenta - totalPagado)) {
            throw new Error(`El monto excede el saldo pendiente de $${(totalVenta - totalPagado).toFixed(2)}`);
          }
          
          // Calcular nuevos valores
          const nuevoTotalPagado = totalPagado + montoPago;
          const nuevoSaldoPendiente = totalVenta - nuevoTotalPagado;
          
          let nuevoEstadoPago = 'pendiente';
          if (nuevoTotalPagado >= totalVenta) {
            nuevoEstadoPago = 'pagado';
          } else if (nuevoTotalPagado > 0) {
            nuevoEstadoPago = 'parcial';
          }
          
          // Crear registro de pago
          const pagoRef = ventaRef.collection('pagos').doc();
          const pagoData = {
            ...pago,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            created_at: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Actualizar venta
          const ventaUpdate = {
            total_pagado: nuevoTotalPagado,
            saldo_pendiente: nuevoSaldoPendiente,
            estado_pago: nuevoEstadoPago,
            fecha_ultimo_pago: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Ejecutar transacción
          transaction.set(pagoRef, pagoData);
          transaction.update(ventaRef, ventaUpdate);
          
          return {
            pagoId: pagoRef.id,
            ventaActualizada: ventaUpdate
          };
        });
        
        res.json({
          success: true,
          data: resultado,
          message: 'Pago registrado correctamente'
        });
      } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(400).json({
          success: false,
          message: error.message
        });
      }
      return;
    }
    
    // NUEVO: VENTAS - Obtener pagos de una venta
    else if (path.match(/^\/ventas\/[^\/]+\/pagos$/) && req.method === 'GET') {
      const ventaId = path.split('/')[2];
      
      const pagosSnapshot = await db.collection('ventas')
        .doc(ventaId)
        .collection('pagos')
        .orderBy('fecha', 'desc')
        .get();
      
      const pagos = pagosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
      }));
      
      res.json({
        success: true,
        data: pagos,
        total: pagos.length,
        message: 'Pagos obtenidos correctamente'
      });
      return;
    }
    
    // VENTAS - GET por ID (con cliente enriquecido)
	else if (path.startsWith('/ventas/') && path.split('/').length === 3 && req.method === 'GET') {
	  const ventaId = path.split('/ventas/')[1];
	  
	  // Verificar si no es una ruta especial
	  if (['estadisticas', 'buscar', 'rango-fechas', 'cliente'].includes(ventaId)) {
		return;
	  }
	  
	  const ventaDoc = await db.collection('ventas').doc(ventaId).get();
	  
	  if (!ventaDoc.exists) {
		res.status(404).json({
		  success: false,
		  message: 'Venta no encontrada'
		});
		return;
	  }
	  
	  const venta = {
		id: ventaDoc.id,
		...ventaDoc.data()
	  };
	  
	  // Enriquecer venta individual con cliente e información completa de productos
	  try {
		// 1. Enriquecer con datos de cliente
		const ventasEnriquecidas = await enriquecerVentasConClientes([venta]);
		const ventaEnriquecida = ventasEnriquecidas[0];
		
		// 2. Enriquecer con datos completos de productos (si no los tiene ya)
		if (ventaEnriquecida.detalles && Array.isArray(ventaEnriquecida.detalles)) {
		  const detallesConProductos = await Promise.all(ventaEnriquecida.detalles.map(async (detalle) => {
			// Si ya tiene producto_info, usarlo
			if (detalle.producto_info) {
			  return detalle;
			}
			
			// Sino, buscar información del producto
			try {
			  const productoDoc = await db.collection('productos').doc(detalle.producto_id).get();
			  if (productoDoc.exists) {
				const productoData = productoDoc.data();
				return {
				  ...detalle,
				  producto_info: {
					id: productoDoc.id,
					codigo: productoData.codigo || '',
					nombre: productoData.nombre || 'Producto sin nombre',
					descripcion: productoData.descripcion || ''
				  }
				};
			  }
			} catch (error) {
			  console.error(`Error al obtener datos del producto ${detalle.producto_id}:`, error);
			}
			
			return detalle;
		  }));
		  
		  ventaEnriquecida.detalles = detallesConProductos;
		}
		
		res.json({
		  success: true,
		  data: ventaEnriquecida,
		  message: 'Venta obtenida correctamente'
		});
	  } catch (error) {
		console.error('Error al enriquecer venta:', error);
		
		// En caso de error, devolver la venta original
		res.json({
		  success: true,
		  data: venta,
		  message: 'Venta obtenida correctamente (sin enriquecimiento)'
		});
	  }
	  
	  return;
	}

	// VENTAS - POST crear nueva (ACTUALIZADO PARA SUCURSALES)
	else if (path === '/ventas' && req.method === 'POST') {
	  const { venta, detalles } = req.body;
	  
	  // Validación básica
	  if (!venta || !detalles || detalles.length === 0) {
		res.status(400).json({
		  success: false,
		  message: 'La venta debe tener datos principales y al menos un producto'
		});
		return;
	  }
	  
	  // NUEVO: Validar que venga la sucursal
	  if (!venta.sucursal_id) {
		res.status(400).json({
		  success: false,
		  message: 'La sucursal es requerida para registrar la venta'
		});
		return;
	  }
	  
	  try {
		// ... código existente de cliente_info ...
		
		// Estructura optimizada para Firebase
		const ventaFirebase = {
		  ...venta,
		  sucursal_id: venta.sucursal_id, // NUEVO: Agregar sucursal
		  cliente_info: cliente_info || {
			nombre: '',
			apellido: '',
			nombre_completo: venta.cliente_nombre || 'Sin cliente registrado'
		  },
		  // ... resto del código existente ...
		};
		
		// Crear la venta
		const docRef = await db.collection('ventas').add(ventaFirebase);
		
		// ... código existente de pagos ...
		
		// MODIFICADO: Actualizar stock en la sucursal específica
		try {
		  await Promise.all(detalles.map(async (detalle) => {
			if (detalle.producto_id && detalle.cantidad) {
			  // Buscar el stock en la sucursal
			  const stockQuery = await db.collection('stock_sucursal')
				.where('producto_id', '==', detalle.producto_id)
				.where('sucursal_id', '==', venta.sucursal_id)
				.limit(1)
				.get();
			  
			  if (!stockQuery.empty) {
				const stockDoc = stockQuery.docs[0];
				const stockData = stockDoc.data();
				const stockActual = parseInt(stockData.cantidad || 0);
				const cantidadVenta = parseInt(detalle.cantidad);
				const nuevoStock = Math.max(0, stockActual - cantidadVenta);
				
				// Actualizar stock
				await stockDoc.ref.update({
				  cantidad: nuevoStock,
				  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
				});
				
				// Registrar movimiento
				await db.collection('movimientos_stock').add({
				  sucursal_id: venta.sucursal_id,
				  producto_id: detalle.producto_id,
				  tipo: 'salida',
				  cantidad: cantidadVenta,
				  stock_anterior: stockActual,
				  stock_nuevo: nuevoStock,
				  motivo: 'Venta',
				  referencia_tipo: 'venta',
				  referencia_id: docRef.id,
				  fecha: admin.firestore.FieldValue.serverTimestamp(),
				  usuario_id: venta.usuario_id || 'sistema'
				});
			  } else {
				console.warn(`⚠️ Producto ${detalle.producto_id} sin stock en sucursal ${venta.sucursal_id}`);
			  }
			}
		  }));
		} catch (error) {
		  console.error('❌ Error al actualizar stock de sucursal:', error);
		}
		
		res.status(201).json({
		  success: true,
		  data: {
			id: docRef.id,
			...ventaFirebase
		  },
		  message: 'Venta creada correctamente'
		});
	  } catch (error) {
		console.error('Error al crear venta:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al crear venta',
		  error: error.message
		});
	  }
	  
	  return;
	}
	// TRANSFERENCIAS - PUT aprobar o rechazar transferencia
	else if (path.match(/^\/transferencias\/[^\/]+\/estado$/) && req.method === 'PUT') {
	  const transferenciaId = path.split('/')[2];
	  const { estado, motivo_rechazo, usuario_aprueba_id } = req.body;
	  
	  try {
		// Validar estado
		if (!['aprobada', 'rechazada'].includes(estado)) {
		  res.status(400).json({
			success: false,
			message: 'Estado inválido. Debe ser "aprobada" o "rechazada"'
		  });
		  return;
		}
		
		// Obtener transferencia
		const transferenciaDoc = await db.collection('transferencias').doc(transferenciaId).get();
		
		if (!transferenciaDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Transferencia no encontrada'
		  });
		  return;
		}
		
		const transferencia = transferenciaDoc.data();
		
		// Verificar que esté pendiente
		if (transferencia.estado !== 'pendiente') {
		  res.status(400).json({
			success: false,
			message: 'Solo se pueden procesar transferencias pendientes'
		  });
		  return;
		}
		
		// Actualizar estado
		const actualizacion = {
		  estado,
		  usuario_aprueba_id: usuario_aprueba_id || 'sistema',
		  fecha_aprobacion: admin.firestore.FieldValue.serverTimestamp()
		};
		
		if (estado === 'rechazada' && motivo_rechazo) {
		  actualizacion.motivo_rechazo = motivo_rechazo;
		}
		
		await transferenciaDoc.ref.update(actualizacion);
		
		// Si se aprueba, ejecutar la transferencia
		if (estado === 'aprobada') {
		  const batch = db.batch();
		  
		  for (const producto of transferencia.productos) {
			// Reducir stock en origen
			const stockOrigenQuery = await db.collection('stock_sucursal')
			  .where('producto_id', '==', producto.producto_id)
			  .where('sucursal_id', '==', transferencia.sucursal_origen_id)
			  .limit(1)
			  .get();
			
			if (!stockOrigenQuery.empty) {
			  const stockOrigenDoc = stockOrigenQuery.docs[0];
			  const stockOrigenData = stockOrigenDoc.data();
			  const nuevoStockOrigen = Math.max(0, stockOrigenData.cantidad - producto.cantidad);
			  
			  batch.update(stockOrigenDoc.ref, {
				cantidad: nuevoStockOrigen,
				ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
			  });
			  
			  // Registrar movimiento de salida
			  const movimientoSalida = db.collection('movimientos_stock').doc();
			  batch.set(movimientoSalida, {
				sucursal_id: transferencia.sucursal_origen_id,
				producto_id: producto.producto_id,
				tipo: 'salida',
				cantidad: producto.cantidad,
				stock_anterior: stockOrigenData.cantidad,
				stock_nuevo: nuevoStockOrigen,
				motivo: `Transferencia a sucursal`,
				referencia_tipo: 'transferencia',
				referencia_id: transferenciaId,
				fecha: admin.firestore.FieldValue.serverTimestamp(),
				usuario_id: usuario_aprueba_id || 'sistema'
			  });
			}
			
			// Aumentar stock en destino
			const stockDestinoQuery = await db.collection('stock_sucursal')
			  .where('producto_id', '==', producto.producto_id)
			  .where('sucursal_id', '==', transferencia.sucursal_destino_id)
			  .limit(1)
			  .get();
			
			let stockDestinoAnterior = 0;
			let stockDestinoNuevo = producto.cantidad;
			
			if (stockDestinoQuery.empty) {
			  // Crear nuevo registro
			  const nuevoStock = db.collection('stock_sucursal').doc();
			  batch.set(nuevoStock, {
				producto_id: producto.producto_id,
				sucursal_id: transferencia.sucursal_destino_id,
				cantidad: producto.cantidad,
				stock_minimo: 5,
				ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
			  });
			} else {
			  const stockDestinoDoc = stockDestinoQuery.docs[0];
			  const stockDestinoData = stockDestinoDoc.data();
			  stockDestinoAnterior = stockDestinoData.cantidad;
			  stockDestinoNuevo = stockDestinoData.cantidad + producto.cantidad;
			  
			  batch.update(stockDestinoDoc.ref, {
				cantidad: stockDestinoNuevo,
				ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
			  });
			}
			
			// Registrar movimiento de entrada
			const movimientoEntrada = db.collection('movimientos_stock').doc();
			batch.set(movimientoEntrada, {
			  sucursal_id: transferencia.sucursal_destino_id,
			  producto_id: producto.producto_id,
			  tipo: 'entrada',
			  cantidad: producto.cantidad,
			  stock_anterior: stockDestinoAnterior,
			  stock_nuevo: stockDestinoNuevo,
			  motivo: `Transferencia desde sucursal`,
			  referencia_tipo: 'transferencia',
			  referencia_id: transferenciaId,
			  fecha: admin.firestore.FieldValue.serverTimestamp(),
			  usuario_id: usuario_aprueba_id || 'sistema'
			});
		  }
		  
		  await batch.commit();
		}
		
		res.json({
		  success: true,
		  data: {
			id: transferenciaId,
			estado,
			...actualizacion
		  },
		  message: estado === 'aprobada' 
			? 'Transferencia aprobada y ejecutada correctamente'
			: 'Transferencia rechazada'
		});
	  } catch (error) {
		console.error('Error al procesar transferencia:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al procesar transferencia',
		  error: error.message
		});
	  }
	  return;
	}

	// TRANSFERENCIAS - GET transferencia por ID
	else if (path.match(/^\/transferencias\/[^\/]+$/) && req.method === 'GET') {
	  const transferenciaId = path.split('/transferencias/')[1];
	  
	  // Verificar que no sea una ruta especial
	  if (['sucursal'].includes(transferenciaId)) {
		return; // Ya manejado en otra ruta
	  }
	  
	  try {
		const transferenciaDoc = await db.collection('transferencias').doc(transferenciaId).get();
		
		if (!transferenciaDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Transferencia no encontrada'
		  });
		  return;
		}
		
		const transferencia = {
		  id: transferenciaDoc.id,
		  ...transferenciaDoc.data()
		};
		
		// Enriquecer con información de sucursales y productos
		const [sucursalOrigen, sucursalDestino] = await Promise.all([
		  db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
		  db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
		]);
		
		// Enriquecer productos con información completa
		const productosEnriquecidos = await Promise.all(
		  (transferencia.productos || []).map(async (item) => {
			const productoDoc = await db.collection('productos').doc(item.producto_id).get();
			return {
			  ...item,
			  producto: productoDoc.exists ? {
				id: productoDoc.id,
				codigo: productoDoc.data().codigo,
				nombre: productoDoc.data().nombre,
				descripcion: productoDoc.data().descripcion
			  } : null
			};
		  })
		);
		
		const transferenciaEnriquecida = {
		  ...transferencia,
		  sucursal_origen: sucursalOrigen.exists ? {
			id: sucursalOrigen.id,
			nombre: sucursalOrigen.data().nombre,
			tipo: sucursalOrigen.data().tipo
		  } : null,
		  sucursal_destino: sucursalDestino.exists ? {
			id: sucursalDestino.id,
			nombre: sucursalDestino.data().nombre,
			tipo: sucursalDestino.data().tipo
		  } : null,
		  productos: productosEnriquecidos
		};
		
		res.json({
		  success: true,
		  data: transferenciaEnriquecida,
		  message: 'Transferencia obtenida correctamente'
		});
	  } catch (error) {
		console.error('Error al obtener transferencia:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener transferencia',
		  error: error.message
		});
	  }
	  return;
	}

	// TRANSFERENCIAS - GET por sucursal (origen o destino)
	else if (path.match(/^\/transferencias\/sucursal\/[^\/]+$/) && req.method === 'GET') {
	  const sucursalId = path.split('/sucursal/')[1];
	  
	  try {
		// Obtener transferencias donde la sucursal es origen
		const transferenciasOrigenSnapshot = await db.collection('transferencias')
		  .where('sucursal_origen_id', '==', sucursalId)
		  .orderBy('fecha_solicitud', 'desc')
		  .limit(50)
		  .get();
		
		// Obtener transferencias donde la sucursal es destino
		const transferenciasDestinoSnapshot = await db.collection('transferencias')
		  .where('sucursal_destino_id', '==', sucursalId)
		  .orderBy('fecha_solicitud', 'desc')
		  .limit(50)
		  .get();
		
		// Combinar y eliminar duplicados
		const todasTransferencias = new Map();
		
		// Agregar transferencias de origen
		for (const doc of transferenciasOrigenSnapshot.docs) {
		  todasTransferencias.set(doc.id, {
			id: doc.id,
			...doc.data(),
			tipo_relacion: 'origen'
		  });
		}
		
		// Agregar transferencias de destino
		for (const doc of transferenciasDestinoSnapshot.docs) {
		  if (todasTransferencias.has(doc.id)) {
			// Si ya existe, marcar como ambos
			todasTransferencias.get(doc.id).tipo_relacion = 'ambos';
		  } else {
			todasTransferencias.set(doc.id, {
			  id: doc.id,
			  ...doc.data(),
			  tipo_relacion: 'destino'
			});
		  }
		}
		
		// Convertir a array y enriquecer
		const transferencias = [];
		
		for (const [id, transferencia] of todasTransferencias) {
		  // Enriquecer con información de sucursales
		  const [sucursalOrigen, sucursalDestino] = await Promise.all([
			db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
			db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
		  ]);
		  
		  transferencias.push({
			...transferencia,
			sucursal_origen: sucursalOrigen.exists ? {
			  id: sucursalOrigen.id,
			  nombre: sucursalOrigen.data().nombre
			} : null,
			sucursal_destino: sucursalDestino.exists ? {
			  id: sucursalDestino.id,
			  nombre: sucursalDestino.data().nombre
			} : null
		  });
		}
		
		// Ordenar por fecha
		transferencias.sort((a, b) => {
		  const fechaA = new Date(a.fecha_solicitud);
		  const fechaB = new Date(b.fecha_solicitud);
		  return fechaB - fechaA;
		});
		
		res.json({
		  success: true,
		  data: transferencias,
		  total: transferencias.length,
		  message: 'Transferencias de la sucursal obtenidas correctamente'
		});
	  } catch (error) {
		console.error('Error al obtener transferencias de sucursal:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener transferencias de sucursal',
		  error: error.message
		});
	  }
	  return;
	}

	// MODIFICAR el endpoint existente de crear transferencia para usar la estructura correcta
	else if (path === '/stock-sucursal/transferir' && req.method === 'POST') {
	  const { 
		sucursal_origen_id, 
		sucursal_destino_id, 
		productos, // Array de {producto_id, cantidad}
		motivo,
		usuario_id 
	  } = req.body;
	  
	  try {
		// Validaciones
		if (!sucursal_origen_id || !sucursal_destino_id || !Array.isArray(productos) || productos.length === 0) {
		  res.status(400).json({
			success: false,
			message: 'Datos inválidos para la transferencia'
		  });
		  return;
		}
		
		// Verificar que las sucursales existen y son diferentes
		if (sucursal_origen_id === sucursal_destino_id) {
		  res.status(400).json({
			success: false,
			message: 'Las sucursales de origen y destino deben ser diferentes'
		  });
		  return;
		}
		
		const [origenDoc, destinoDoc] = await Promise.all([
		  db.collection('sucursales').doc(sucursal_origen_id).get(),
		  db.collection('sucursales').doc(sucursal_destino_id).get()
		]);
		
		if (!origenDoc.exists || !destinoDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Una o ambas sucursales no existen'
		  });
		  return;
		}
		
		// Verificar stock disponible para todos los productos
		for (const producto of productos) {
		  const stockQuery = await db.collection('stock_sucursal')
			.where('sucursal_id', '==', sucursal_origen_id)
			.where('producto_id', '==', producto.producto_id)
			.limit(1)
			.get();
		  
		  if (stockQuery.empty) {
			res.status(400).json({
			  success: false,
			  message: `Producto ${producto.producto_id} no tiene stock en la sucursal origen`
			});
			return;
		  }
		  
		  const stockDoc = stockQuery.docs[0];
		  const stockDisponible = stockDoc.data().cantidad || 0;
		  
		  if (stockDisponible < producto.cantidad) {
			res.status(400).json({
			  success: false,
			  message: `Stock insuficiente para el producto ${producto.producto_id}. Disponible: ${stockDisponible}, Solicitado: ${producto.cantidad}`
			});
			return;
		  }
		}
		
		// Crear registro de transferencia
		const transferencia = {
		  sucursal_origen_id,
		  sucursal_destino_id,
		  usuario_solicita_id: usuario_id || 'sistema',
		  estado: 'pendiente',
		  motivo: motivo || '',
		  fecha_solicitud: admin.firestore.FieldValue.serverTimestamp(),
		  productos: productos
		};
		
		const transferenciaRef = await db.collection('transferencias').add(transferencia);
		
		res.json({
		  success: true,
		  data: {
			id: transferenciaRef.id,
			...transferencia,
			fecha_solicitud: new Date().toISOString() // Para la respuesta inmediata
		  },
		  message: 'Transferencia creada exitosamente y pendiente de aprobación'
		});
	  } catch (error) {
		console.error('Error al crear transferencia:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al crear transferencia',
		  error: error.message
		});
	  }
	  return;
	}
    
    // VENTAS - Devolución de productos
    else if (path.match(/^\/ventas\/[^\/]+\/devolver-productos$/) && req.method === 'POST') {
      const ventaId = path.split('/')[2];
      const { productos, motivo } = req.body;
      
      // Obtener la venta original
      const ventaDoc = await db.collection('ventas').doc(ventaId).get();
      
      if (!ventaDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
        return;
      }
      
      // Crear registro de devolución
      const devolucion = {
        venta_id: ventaId,
        productos: productos,
        motivo: motivo,
        fecha: new Date().toISOString(),
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('devoluciones').add(devolucion);
      
      // Marcar venta como devuelta (parcial o total)
      await db.collection('ventas').doc(ventaId).update({
        estado: 'devuelta',
        fecha_devolucion: new Date().toISOString(),
        motivo_devolucion: motivo,
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Restaurar stock de productos devueltos
      try {
        await Promise.all(productos.map(async (producto) => {
          if (producto.producto_id && producto.cantidad) {
            const productoRef = db.collection('productos').doc(producto.producto_id);
            const productoDoc = await productoRef.get();
            
            if (productoDoc.exists) {
              const productoData = productoDoc.data();
              const stockActual = parseInt(productoData.stock_actual || 0);
              const cantidadDevuelta = parseInt(producto.cantidad);
              const nuevoStock = stockActual + cantidadDevuelta;
              
              await productoRef.update({
                stock_actual: nuevoStock,
                fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        }));
      } catch (error) {
        console.error('❌ Error al restaurar stock:', error);
      }
      
      res.json({
        success: true,
        data: devolucion,
        message: 'Devolución procesada correctamente'
      });
      return;
    }
    
    // VENTAS - Cambiar estado (CORREGIDO PARA LIMPIAR DEUDAS)
	else if (path.match(/^\/ventas\/[^\/]+\/estado$/) && req.method === 'PUT') {
	  const ventaId = path.split('/')[2];
	  const { estado, motivo } = req.body;
	  
	  try {
		// Obtener la venta actual
		const ventaRef = db.collection('ventas').doc(ventaId);
		const ventaDoc = await ventaRef.get();
		
		if (!ventaDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Venta no encontrada'
		  });
		  return;
		}
		
		const ventaActual = ventaDoc.data();
		const total = parseFloat(ventaActual.total || 0);
		const totalPagadoAnterior = parseFloat(ventaActual.total_pagado || 0);
		
		console.log(`🔄 Cambiando estado de venta ${ventaId} de "${ventaActual.estado}" a "${estado}"`);
		
		// Preparar datos de actualización
		const datosActualizacion = {
		  estado: estado,
		  fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
		};
		
		// Agregar motivo si se proporciona
		if (motivo) {
		  datosActualizacion.motivo_cambio_estado = motivo;
		  
		  if (estado === 'cancelada') {
			datosActualizacion.motivo_cancelacion = motivo;
			datosActualizacion.fecha_cancelacion = new Date().toISOString();
		  } else if (estado === 'devuelta') {
			datosActualizacion.motivo_devolucion = motivo;
			datosActualizacion.fecha_devolucion = new Date().toISOString();
		  }
		}
		
		// 🆕 LIMPIAR DEUDAS PARA VENTAS CANCELADAS O DEVUELTAS
		if (estado === 'cancelada') {
		  console.log(`💸 Limpiando deuda de venta cancelada: $${totalPagadoAnterior} pagado de $${total} total`);
		  
		  datosActualizacion.estado_pago = 'cancelado';
		  datosActualizacion.saldo_pendiente = 0; // ✅ Limpiar deuda
		  // total_pagado se mantiene como estaba (para historial)
		  
		} else if (estado === 'devuelta') {
		  console.log(`💸 Limpiando deuda de venta devuelta: $${totalPagadoAnterior} pagado de $${total} total`);
		  
		  datosActualizacion.estado_pago = 'devuelto';
		  datosActualizacion.saldo_pendiente = 0; // ✅ Limpiar deuda
		  // total_pagado se mantiene como estaba (para historial)
		  
		} else if (estado === 'completada') {
		  // Si se marca como completada, verificar el estado de pago
		  if (totalPagadoAnterior >= total) {
			datosActualizacion.estado_pago = 'pagado';
			datosActualizacion.saldo_pendiente = 0;
		  } else if (totalPagadoAnterior > 0) {
			datosActualizacion.estado_pago = 'parcial';
			datosActualizacion.saldo_pendiente = total - totalPagadoAnterior;
		  } else {
			datosActualizacion.estado_pago = 'pendiente';
			datosActualizacion.saldo_pendiente = total;
		  }
		}
		
		// Ejecutar la actualización
		await ventaRef.update(datosActualizacion);
		
		// 🆕 REGISTRAR CAMBIO EN HISTORIAL DE PAGOS SI SE LIMPIA DEUDA
		if ((estado === 'cancelada' || estado === 'devuelta') && totalPagadoAnterior < total) {
		  const saldoAnterior = total - totalPagadoAnterior;
		  
		  // Crear registro de "pago" de cancelación/devolución
		  const pagoRef = ventaRef.collection('pagos').doc();
		  await pagoRef.set({
			fecha: new Date().toISOString(),
			monto: saldoAnterior,
			metodo_pago: 'cancelacion', // Nuevo método especial
			concepto: estado === 'cancelada' 
			  ? `Deuda cancelada por cancelación de venta: ${motivo || 'Sin motivo especificado'}`
			  : `Deuda cancelada por devolución de venta: ${motivo || 'Sin motivo especificado'}`,
			usuario_id: 'sistema',
			usuario_nombre: 'Sistema',
			referencia: '',
			observaciones: `Venta ${estado}. Saldo pendiente de $${saldoAnterior.toFixed(2)} eliminado automáticamente.`,
			tipo: 'cancelacion_deuda', // Marcador especial
			created_at: admin.firestore.FieldValue.serverTimestamp()
		  });
		  
		  console.log(`📝 Registrado cancelación de deuda: $${saldoAnterior.toFixed(2)}`);
		}
		
		// 🆕 RESTAURAR STOCK DE PRODUCTOS (para canceladas y devueltas)
		if ((estado === 'cancelada' || estado === 'devuelta') && ventaActual.detalles) {
		  console.log('📦 Restaurando stock de productos...');
		  
		  const batch = db.batch();
		  
		  for (const detalle of ventaActual.detalles) {
			if (detalle.producto_id && detalle.cantidad) {
			  const productoRef = db.collection('productos').doc(detalle.producto_id);
			  const productoDoc = await productoRef.get();
			  
			  if (productoDoc.exists) {
				const productoData = productoDoc.data();
				const stockActual = parseInt(productoData.stock_actual || 0);
				const cantidadARestaurar = parseInt(detalle.cantidad);
				const nuevoStock = stockActual + cantidadARestaurar;
				
				batch.update(productoRef, {
				  stock_actual: nuevoStock,
				  fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
				});
				
				console.log(`   📦 ${detalle.producto_info?.nombre || 'Producto'}: ${stockActual} + ${cantidadARestaurar} = ${nuevoStock}`);
			  }
			}
		  }
		  
		  await batch.commit();
		  console.log('✅ Stock restaurado correctamente');
		}
		
		const mensaje = estado === 'cancelada' 
		  ? 'Venta cancelada y deuda eliminada correctamente'
		  : estado === 'devuelta'
			? 'Venta devuelta y deuda eliminada correctamente'
			: 'Estado de venta actualizado correctamente';
		
		res.json({
		  success: true,
		  data: {
			id: ventaId,
			estado_anterior: ventaActual.estado,
			estado_nuevo: estado,
			...datosActualizacion
		  },
		  message: mensaje
		});
		
	  } catch (error) {
		console.error(`❌ Error al cambiar estado de venta ${ventaId}:`, error);
		res.status(500).json({
		  success: false,
		  message: 'Error al cambiar estado de venta',
		  error: error.message
		});
	  }
	  
	  return;
	}
    // ==================== VENTAS POR SUCURSAL - NUEVOS ENDPOINTS ====================

	// VENTAS - GET por sucursal específica
	else if (path.match(/^\/ventas\/sucursal\/[^\/]+$/) && req.method === 'GET') {
	  const sucursalId = path.split('/sucursal/')[1];
	  
	  try {
		console.log(`🏪 Obteniendo ventas de sucursal: ${sucursalId}`);
		
		// Verificar que la sucursal existe
		const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
		if (!sucursalDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Sucursal no encontrada'
		  });
		  return;
		}
		
		// Obtener ventas de la sucursal
		const ventasSnapshot = await db.collection('ventas')
		  .where('sucursal_id', '==', sucursalId)
		  .orderBy('fecha', 'desc')
		  .get();
		
		const ventas = [];
		ventasSnapshot.forEach(doc => {
		  ventas.push({
			id: doc.id,
			...doc.data()
		  });
		});
		
		// Enriquecer ventas con información de clientes
		const ventasEnriquecidas = await enriquecerVentasConClientes(ventas);
		
		console.log(`✅ Ventas de sucursal ${sucursalId}: ${ventasEnriquecidas.length}`);
		
		res.json({
		  success: true,
		  data: ventasEnriquecidas,
		  total: ventasEnriquecidas.length,
		  sucursal_id: sucursalId,
		  message: 'Ventas de sucursal obtenidas correctamente'
		});
	  } catch (error) {
		console.error(`❌ Error al obtener ventas de sucursal ${sucursalId}:`, error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener ventas de sucursal',
		  error: error.message
		});
	  }
	  return;
	}

	// VENTAS - Estadísticas del día (ACTUALIZADO PARA SOPORTAR FILTRO POR SUCURSAL)
	else if (path === '/ventas/estadisticas/dia' && req.method === 'GET') {
	  try {
		const { sucursal_id } = req.query; // 🆕 NUEVO: Parámetro opcional de sucursal
		
		// Obtener fecha de hoy
		const hoy = new Date();
		const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
		const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
		
		console.log(`📊 Calculando estadísticas del ${inicioHoy.toISOString()} al ${finHoy.toISOString()}${sucursal_id ? ` para sucursal ${sucursal_id}` : ' (todas las sucursales)'}`);
		
		// 🆕 CONSTRUIR QUERY CON O SIN FILTRO DE SUCURSAL
		let ventasQuery = db.collection('ventas')
		  .where('fecha', '>=', inicioHoy.toISOString())
		  .where('fecha', '<', finHoy.toISOString());
		
		if (sucursal_id) {
		  ventasQuery = ventasQuery.where('sucursal_id', '==', sucursal_id);
		}
		
		const ventasHoySnapshot = await ventasQuery.get();
		
		let totalVentasHoy = 0;
		let gananciasHoy = 0;
		let productosVendidos = 0;
		let totalPagadoHoy = 0;
		let saldoPendienteTotal = 0;
		let ventasConSaldoPendiente = 0;
		let ventasPagadas = 0;
		let ventasParciales = 0;
		let ventasPendientes = 0;
		
		const clientesHoy = new Set();
		const ventasPorHora = Array(24).fill(0);
		const metodosPago = {
		  efectivo: 0,
		  tarjeta: 0,
		  transferencia: 0,
		  credito: 0,
		  otro: 0
		};
		
		console.log(`📋 Procesando ${ventasHoySnapshot.size} ventas del día...`);
		
		ventasHoySnapshot.forEach(doc => {
		  const venta = doc.data();
		  
		  // Valores básicos
		  const total = parseFloat(venta.total || 0);
		  const totalPagado = parseFloat(venta.total_pagado || 0);
		  const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
		  const estadoPago = venta.estado_pago || 'pendiente';
		  
		  // Acumular totales
		  totalVentasHoy += total;
		  totalPagadoHoy += totalPagado;
		  saldoPendienteTotal += saldoPendiente;
		  
		  // Contadores por estado de pago
		  if (estadoPago === 'pagado' || totalPagado >= total) {
			ventasPagadas++;
		  } else if (estadoPago === 'parcial' && totalPagado > 0) {
			ventasParciales++;
		  } else {
			ventasPendientes++;
		  }
		  
		  // Ventas con saldo pendiente
		  if (saldoPendiente > 0) {
			ventasConSaldoPendiente++;
		  }
		  
		  // Ganancias
		  gananciasHoy += (venta.ganancia || total * 0.2 || 0);
		  
		  // Productos vendidos
		  if (venta.detalles && Array.isArray(venta.detalles)) {
			productosVendidos += venta.detalles.reduce((sum, detalle) => sum + (detalle.cantidad || 0), 0);
		  }
		  
		  // Clientes únicos
		  if (venta.cliente_id) {
			clientesHoy.add(venta.cliente_id);
		  }
		  
		  // Ventas por hora
		  if (venta.fecha) {
			const hora = new Date(venta.fecha).getHours();
			if (hora >= 0 && hora < 24) {
			  ventasPorHora[hora]++;
			}
		  }
		  
		  // Métodos de pago
		  const metodo = venta.metodo_pago || 'efectivo';
		  if (metodosPago[metodo] !== undefined) {
			metodosPago[metodo] += totalPagado;
		  } else {
			metodosPago.otro += totalPagado;
		  }
		});
		
		// 🆕 CALCULAR ESTADÍSTICAS GLOBALES (con o sin filtro de sucursal)
		console.log('📊 Calculando estadísticas globales...');
		
		let todasVentasQuery = db.collection('ventas');
		if (sucursal_id) {
		  todasVentasQuery = todasVentasQuery.where('sucursal_id', '==', sucursal_id);
		}
		
		const todasVentasSnapshot = await todasVentasQuery.get();
		let saldoPendienteTotalGlobal = 0;
		let ventasConSaldoPendienteGlobal = 0;
		
		todasVentasSnapshot.forEach(doc => {
		  const venta = doc.data();
		  const estadoPago = venta.estado_pago || 'pendiente';
		  const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
		  
		  if (estadoPago !== 'cancelado' && estadoPago !== 'devuelto' && saldoPendiente > 0) {
			saldoPendienteTotalGlobal += saldoPendiente;
			ventasConSaldoPendienteGlobal++;
		  }
		});
		
		// Determinar método de pago más usado
		const metodoPagoMasUsado = Object.keys(metodosPago).reduce((a, b) => 
		  metodosPago[a] > metodosPago[b] ? a : b
		);
		
		// Calcular porcentajes
		const porcentajeCobrado = totalVentasHoy > 0 ? (totalPagadoHoy / totalVentasHoy) * 100 : 0;
		
		const estadisticas = {
		  // 🆕 AGREGAR INFORMACIÓN DE SUCURSAL
		  sucursal_id: sucursal_id || null,
		  filtrada_por_sucursal: !!sucursal_id,
		  
		  // Métricas básicas
		  ventasHoy: ventasHoySnapshot.size,
		  totalVentasHoy,
		  gananciasHoy,
		  promedioVenta: ventasHoySnapshot.size > 0 ? totalVentasHoy / ventasHoySnapshot.size : 0,
		  productosVendidos,
		  clientesAtendidos: clientesHoy.size,
		  ventasPorHora,
		  metodoPagoMasUsado,
		  
		  // Métricas de pagos
		  totalPagadoHoy,
		  saldoPendienteTotal: saldoPendienteTotalGlobal,
		  ventasConSaldoPendiente: ventasConSaldoPendienteGlobal,
		  porcentajeCobrado,
		  
		  // Contadores por estado de pago
		  ventasPagadas,
		  ventasParciales,
		  ventasPendientes,
		  
		  // Montos por método de pago
		  metodosPago,
		  efectivo: metodosPago.efectivo,
		  tarjeta: metodosPago.tarjeta,
		  transferencia: metodosPago.transferencia,
		  credito: metodosPago.credito,
		  
		  // Información adicional
		  debug: {
			fechaConsulta: new Date().toISOString(),
			rangoFechas: {
			  inicio: inicioHoy.toISOString(),
			  fin: finHoy.toISOString()
			},
			totalVentasGlobales: todasVentasSnapshot.size,
			filtrada_por_sucursal: !!sucursal_id
		  }
		};
		
		console.log('✅ Estadísticas calculadas:', {
		  sucursal_id: estadisticas.sucursal_id,
		  ventasHoy: estadisticas.ventasHoy,
		  totalVentasHoy: estadisticas.totalVentasHoy,
		  totalPagadoHoy: estadisticas.totalPagadoHoy,
		  saldoPendienteTotal: estadisticas.saldoPendienteTotal
		});
		
		res.json({
		  success: true,
		  data: estadisticas,
		  message: `Estadísticas del día obtenidas correctamente${sucursal_id ? ' para la sucursal especificada' : ''}`
		});
		
	  } catch (error) {
		console.error('❌ Error al calcular estadísticas:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al calcular estadísticas del día',
		  error: error.message
		});
	  }
	  
	  return;
	}

    // ==================== DASHBOARD/REPORTES ====================
    
    // DASHBOARD - Estadísticas generales
    else if (path === '/dashboard' && req.method === 'GET') {
      const [productos, categorias, clientes, compras, proveedores, ventas] = await Promise.all([
        db.collection('productos').get(),
        db.collection('categorias').get(),
        db.collection('clientes').get(),
        db.collection('compras').get(),
        db.collection('proveedores').get(),
        db.collection('ventas').get()
      ]);
      
      const productosActivos = await db.collection('productos')
        .where('activo', '==', true)
        .get();
      
      // Estadísticas de ventas del día
      const hoy = new Date();
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
      
      const ventasHoySnapshot = await db.collection('ventas')
        .where('fecha', '>=', inicioHoy.toISOString())
        .where('fecha', '<', finHoy.toISOString())
        .get();
      
      let ventasHoy = 0;
      let gananciasHoy = 0;
      
      ventasHoySnapshot.forEach(doc => {
        const venta = doc.data();
        ventasHoy += venta.total || 0;
        gananciasHoy += (venta.ganancia || venta.total * 0.2 || 0);
      });
      
      // Productos con stock bajo
      const productosStockBajoSnapshot = await db.collection('productos')
        .where('stock_actual', '<=', 5)
        .get();
      
      // Productos más vendidos (últimos 30 días)
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      
      const ventasRecientesSnapshot = await db.collection('ventas')
        .where('fecha', '>=', hace30Dias.toISOString())
        .get();
      
      const productosVendidos = {};
      
      ventasRecientesSnapshot.forEach(doc => {
        const venta = doc.data();
        if (venta.detalles && Array.isArray(venta.detalles)) {
          venta.detalles.forEach(detalle => {
            const productoId = detalle.producto_id;
            if (productoId) {
              productosVendidos[productoId] = (productosVendidos[productoId] || 0) + parseInt(detalle.cantidad || 0);
            }
          });
        }
      });
      
      // Convertir a array y ordenar
      const topProductos = Object.entries(productosVendidos)
        .map(([id, cantidad]) => ({ id, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      
      // Clientes más frecuentes
      const clientesVentas = {};
      
      ventas.forEach(doc => {
        const venta = doc.data();
        if (venta.cliente_id) {
          clientesVentas[venta.cliente_id] = (clientesVentas[venta.cliente_id] || 0) + 1;
        }
      });
      
      // Convertir a array y ordenar
      const topClientes = Object.entries(clientesVentas)
        .map(([id, cantidad]) => ({ id, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      
      const dashboardData = {
        totalProductos: productos.size,
        productosActivos: productosActivos.size,
        totalCategorias: categorias.size,
        totalClientes: clientes.size,
        totalCompras: compras.size,
        totalProveedores: proveedores.size,
        totalVentas: ventas.size,
        ventasHoy: ventasHoySnapshot.size,
        totalVentasHoy: ventasHoy,
        gananciasHoy: gananciasHoy,
        productosStockBajo: productosStockBajoSnapshot.size,
        productosDestacados: topProductos,
        clientesDestacados: topClientes
      };
      
      console.log(`✅ Dashboard data:`, dashboardData);
      
      res.json({
        success: true,
        data: dashboardData,
        message: 'Datos del dashboard obtenidos correctamente'
      });
      return;
    }
    
    // ==================== BÚSQUEDAS ====================
    
    // Búsqueda global
    else if (path === '/buscar' && req.method === 'GET') {
      const { termino, tipo } = req.query;
      
      if (!termino) {
        res.status(400).json({
          success: false,
          message: 'Se requiere un término de búsqueda'
        });
        return;
      }
      
      const terminoLower = termino.toLowerCase();
      const resultados = {
        productos: [],
        clientes: [],
        proveedores: [],
        categorias: []
      };
      
      // Búsqueda específica por tipo o global
      if (!tipo || tipo === 'productos') {
        const productosSnapshot = await db.collection('productos').get();
        
        productosSnapshot.forEach(doc => {
          const data = doc.data();
          const nombre = (data.nombre || '').toLowerCase();
          const codigo = (data.codigo || '').toLowerCase();
          
          if (nombre.includes(terminoLower) || codigo.includes(terminoLower)) {
            resultados.productos.push({
              id: doc.id,
              ...data,
              tipo: 'producto'
            });
          }
        });
      }
      
      if (!tipo || tipo === 'clientes') {
        const clientesSnapshot = await db.collection('clientes').get();
        
        clientesSnapshot.forEach(doc => {
          const data = doc.data();
          const nombre = (data.nombre || '').toLowerCase();
          const apellido = (data.apellido || '').toLowerCase();
          const email = (data.email || '').toLowerCase();
          
          if (nombre.includes(terminoLower) || 
              apellido.includes(terminoLower) || 
              email.includes(terminoLower) ||
              `${nombre} ${apellido}`.includes(terminoLower)) {
            resultados.clientes.push({
              id: doc.id,
              ...data,
              tipo: 'cliente'
            });
          }
        });
      }
      
      if (!tipo || tipo === 'proveedores') {
        const proveedoresSnapshot = await db.collection('proveedores').get();
        
        proveedoresSnapshot.forEach(doc => {
          const data = doc.data();
          const nombre = (data.nombre || '').toLowerCase();
          
          if (nombre.includes(terminoLower)) {
            resultados.proveedores.push({
              id: doc.id,
              ...data,
              tipo: 'proveedor'
            });
          }
        });
      }
      
      if (!tipo || tipo === 'categorias') {
        const categoriasSnapshot = await db.collection('categorias').get();
        
        categoriasSnapshot.forEach(doc => {
          const data = doc.data();
          const nombre = (data.nombre || '').toLowerCase();
          
          if (nombre.includes(terminoLower)) {
            resultados.categorias.push({
              id: doc.id,
              ...data,
              tipo: 'categoria'
            });
          }
        });
      }
      
      // Contar resultados
      const totalResultados = 
        resultados.productos.length + 
        resultados.clientes.length + 
        resultados.proveedores.length + 
        resultados.categorias.length;
      
      res.json({
        success: true,
        data: resultados,
        total: totalResultados,
        message: `Búsqueda completada: ${totalResultados} resultados encontrados`
      });
      return;
    }
    
    // ==================== RUTA POR DEFECTO ====================
    
    // Ruta por defecto - Info de la API
    else {
      res.json({
        success: true,
        message: 'API de LA FABRICA funcionando correctamente con Firebase',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        endpoints_disponibles: [
          // Productos
          'GET /api/productos - Todos los productos',
          'GET /api/productos/activos - Solo productos activos', 
          'GET /api/productos/buscar?termino=X - Buscar productos',
          'GET /api/productos/stock-bajo - Productos con stock bajo',
          'GET /api/productos/:id - Producto específico',
          'POST /api/productos - Crear producto',
          'PUT /api/productos/:id - Actualizar producto',
          'DELETE /api/productos/:id - Eliminar producto',
          
          // Categorías
          'GET /api/categorias - Todas las categorías',
          'GET /api/categorias/activas - Categorías activas',
          'GET /api/categorias/:id - Categoría específica',
          'POST /api/categorias - Crear categoría',
          'PUT /api/categorias/:id - Actualizar categoría',
          'DELETE /api/categorias/:id - Eliminar categoría',
          
          // Clientes
          'GET /api/clientes - Todos los clientes',
          'GET /api/clientes/activos - Clientes activos',
          'GET /api/clientes/buscar?termino=X - Buscar clientes',
          'GET /api/clientes/:id - Cliente específico',
          'POST /api/clientes - Crear cliente',
          'PUT /api/clientes/:id - Actualizar cliente',
          'DELETE /api/clientes/:id - Eliminar cliente',
          
          // Proveedores
          'GET /api/proveedores - Todos los proveedores',
          'GET /api/proveedores/activos - Proveedores activos',
          'GET /api/proveedores/:id - Proveedor específico',
          'POST /api/proveedores - Crear proveedor',
          'PUT /api/proveedores/:id - Actualizar proveedor',
          'DELETE /api/proveedores/:id - Eliminar proveedor',
          
          // Compras
          'GET /api/compras - Todas las compras',
          'GET /api/compras/:id - Compra específica',
          'POST /api/compras - Crear compra',
          'PUT /api/compras/:id - Actualizar compra',
          
          // Ventas (Optimizadas con Sistema de Pagos)
          'GET /api/ventas - Todas las ventas con info de cliente',
          'GET /api/ventas/:id - Venta específica con info de cliente',
          'POST /api/ventas - Crear venta con sistema de pagos',
          'POST /api/ventas/:id/pagos - Registrar pago (NUEVO)',
          'GET /api/ventas/:id/pagos - Obtener pagos de una venta (NUEVO)',
          'GET /api/ventas/estadisticas/dia - Estadísticas del día con cobros',
          'GET /api/ventas/estadisticas - Estadísticas generales',
          'GET /api/ventas/cliente/:id - Ventas de un cliente',
          'GET /api/ventas/buscar?termino=X - Buscar ventas',
          'GET /api/ventas/rango-fechas - Ventas por rango de fechas',
          'POST /api/ventas/:id/devolver-productos - Procesar devolución',
          'PUT /api/ventas/:id/estado - Cambiar estado de venta',
          
          // Dashboard y Reportes
          'GET /api/dashboard - Estadísticas generales del dashboard',
          
          // Búsqueda global
          'GET /api/buscar?termino=X&tipo=Y - Búsqueda global o por tipo'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ Error en Firebase Function:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});