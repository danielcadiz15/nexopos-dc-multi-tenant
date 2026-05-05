// src/services/usuarios.service.js - VERSIÓN CORREGIDA
import FirebaseService from './firebase.service';

// Roles predefinidos del sistema
const ROLES_SISTEMA = [
  {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema',
    permisos: {
      productos: { ver: true, crear: true, editar: true, eliminar: true },
      compras: { ver: true, crear: true, editar: true, eliminar: true },
      ventas: { ver: true, crear: true, editar: true, eliminar: true },
      stock: { ver: true, crear: true, editar: true, eliminar: true },
      reportes: { ver: true, crear: true, editar: true, eliminar: true },
      promociones: { ver: true, crear: true, editar: true, eliminar: true },
      usuarios: { ver: true, crear: true, editar: true, eliminar: true },
      sucursales: { ver: true, crear: true, editar: true, eliminar: true }
    }
  },
  {
    id: 'cajero',
    nombre: 'Cajero',
    descripcion: 'Acceso al punto de venta y caja básica',
    permisos: {
      productos: { ver: true, crear: false, editar: false, eliminar: false },
      compras: { ver: false, crear: false, editar: false, eliminar: false },
      ventas: { ver: true, crear: true, editar: false, eliminar: false },
      stock: { ver: true, crear: false, editar: false, eliminar: false },
      reportes: { ver: false, crear: false, editar: false, eliminar: false },
      promociones: { ver: false, crear: false, editar: false, eliminar: false },
      usuarios: { ver: false, crear: false, editar: false, eliminar: false },
      sucursales: { ver: false, crear: false, editar: false, eliminar: false },
      clientes: { ver: true, crear: true, editar: false, eliminar: false },
      caja: { ver: true, crear: true, editar: false, eliminar: false }
    }
  },
  {
    id: 'empleado',
    nombre: 'Empleado',
    descripcion: 'Acceso a ventas y productos',
    permisos: {
      productos: { ver: true, crear: false, editar: false, eliminar: false },
      compras: { ver: false, crear: false, editar: false, eliminar: false },
      ventas: { ver: true, crear: true, editar: false, eliminar: false },
      stock: { ver: true, crear: false, editar: false, eliminar: false },
      reportes: { ver: false, crear: false, editar: false, eliminar: false },
      promociones: { ver: true, crear: false, editar: false, eliminar: false },
      usuarios: { ver: false, crear: false, editar: false, eliminar: false },
      sucursales: { ver: false, crear: false, editar: false, eliminar: false }
    }
  },
  {
    id: 'gerente',
    nombre: 'Gerente',
    descripcion: 'Acceso a reportes y gestión',
    permisos: {
      productos: { ver: true, crear: true, editar: true, eliminar: false },
      compras: { ver: true, crear: true, editar: true, eliminar: false },
      ventas: { ver: true, crear: true, editar: true, eliminar: false },
      stock: { ver: true, crear: true, editar: true, eliminar: false },
      reportes: { ver: true, crear: true, editar: true, eliminar: false },
      promociones: { ver: true, crear: true, editar: true, eliminar: false },
      usuarios: { ver: true, crear: false, editar: false, eliminar: false },
      sucursales: { ver: true, crear: false, editar: false, eliminar: false }
    }
  }
];

/**
 * Servicio para gestión de usuarios con Firebase - VERSIÓN CORREGIDA
 */
class UsuariosService extends FirebaseService {
  constructor() {
    // FIX: Usar la ruta correcta que coincida con el backend
    super('/usuarios');  // Cambiado de vuelta a '/usuarios' porque Firebase Functions ya maneja /api
  }

  /**
   * Obtiene todos los usuarios - CORREGIDO
   * @returns {Promise<Array>} Lista de usuarios
   */
  async obtenerTodos() {
    try {
      console.log('📋 [USUARIOS] Obteniendo todos los usuarios...');
      
      const response = await this.get('');
      console.log('📋 [USUARIOS] Respuesta raw:', response);
      
      // FIX: Usar ensureArray para manejar cualquier formato de respuesta
      const usuarios = this.ensureArray(response);
      
      console.log(`✅ [USUARIOS] ${usuarios.length} usuarios obtenidos`);
      console.log('📋 [USUARIOS] Usuarios encontrados:', usuarios);
      
      return usuarios;
      
    } catch (error) {
      console.error('❌ [USUARIOS] Error al obtener usuarios:', error);
      
      // En caso de error, retornar array vacío para no romper la UI
      return [];
    }
  }

  /**
   * Obtiene un usuario por su ID - CORREGIDO
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Datos del usuario
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔍 [USUARIOS] Obteniendo usuario ID: ${id}`);
      
      const response = await this.get(`/${id}`);
      console.log('🔍 [USUARIOS] Respuesta:', response);
      
      if (!response || Object.keys(response).length === 0) {
        throw new Error(`Usuario ${id} no encontrado`);
      }
      
      console.log('✅ [USUARIOS] Usuario obtenido');
      return response;
      
    } catch (error) {
      console.error(`❌ [USUARIOS] Error al obtener usuario ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca usuarios por término - CORREGIDO
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Array>} Usuarios que coinciden
   */
  async buscar(termino) {
    try {
      console.log(`🔍 [USUARIOS] Buscando usuarios con término: "${termino}"`);
      
      if (!termino || termino.trim().length < 2) {
        console.log('🔍 [USUARIOS] Término muy corto, obteniendo todos los usuarios');
        return await this.obtenerTodos();
      }
      
      const response = await this.get('/buscar', { termino: termino.trim() });
      console.log('🔍 [USUARIOS] Respuesta búsqueda:', response);
      
      // FIX: Usar ensureArray para manejar cualquier formato
      const usuarios = this.ensureArray(response);
      
      console.log(`✅ [USUARIOS] ${usuarios.length} usuarios encontrados`);
      
      return usuarios;
      
    } catch (error) {
      console.error('❌ [USUARIOS] Error al buscar usuarios:', error);
      return [];
    }
  }

  /**
   * Crea un nuevo usuario - CORREGIDO
   * @param {Object} usuario - Datos del usuario
   * @returns {Promise<Object>} Usuario creado
   */
  async crear(usuario) {
    try {
      console.log('🆕 [USUARIOS] Creando usuario:', {
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol_id || usuario.rol
      });
      
      // Validaciones básicas
      if (!usuario.email?.trim()) {
        throw new Error('El email es requerido');
      }
      
      if (!usuario.password || usuario.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      
      if (!usuario.nombre?.trim()) {
        throw new Error('El nombre es requerido');
      }
      
      // Preparar datos según formato esperado por el backend
      const datosUsuario = {
        email: usuario.email.trim(),
        password: usuario.password,
        nombre: usuario.nombre.trim(),
        apellido: usuario.apellido?.trim() || '',
        rol: usuario.rol_id || usuario.rol || 'Empleado',  // Texto, no ID
        rol_id: usuario.rol_id || usuario.rol || '2',      // ID numérico/string
        sucursales: usuario.sucursales || [],
        activo: usuario.activo !== false,
        permisos: this.obtenerPermisosPorRol(usuario.rol_id || usuario.rol || 'empleado')
      };
      
      console.log('📤 [USUARIOS] Enviando datos:', {
        ...datosUsuario,
        password: '[OCULTA]'
      });
      
      const resultado = await this.post('', datosUsuario);
      console.log('✅ [USUARIOS] Usuario creado exitosamente');
      
      return resultado;
      
    } catch (error) {
      console.error('❌ [USUARIOS] Error al crear usuario:', error);
      
      // Mejorar mensajes de error específicos
      let mensajeError = 'Error al crear usuario';
      
      if (error.message.includes('already-exists') || 
          error.message.includes('already exists') ||
          error.message.includes('Email y nombre son requeridos')) {
        mensajeError = 'El email ya está registrado en el sistema';
      } else if (error.message.includes('permission-denied')) {
        mensajeError = 'No tienes permisos para crear usuarios';
      } else if (error.message.includes('invalid-email')) {
        mensajeError = 'El formato del email es inválido';
      } else if (error.message.includes('weak-password')) {
        mensajeError = 'La contraseña es muy débil (mínimo 6 caracteres)';
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      throw new Error(mensajeError);
    }
  }

  /**
   * Actualiza un usuario existente - CORREGIDO
   * @param {string} id - ID del usuario
   * @param {Object} usuario - Nuevos datos
   * @returns {Promise<Object>} Respuesta
   */
  async actualizar(id, usuario) {
    try {
      console.log(`🔄 [USUARIOS] Actualizando usuario ${id}`);
      
      // Preparar datos para actualización
      const datosActualizar = { ...usuario };
      
      // Asegurar formato correcto de rol
      if (datosActualizar.rol_id || datosActualizar.rol) {
        datosActualizar.rol = datosActualizar.rol_id || datosActualizar.rol;
        datosActualizar.rol_id = datosActualizar.rol_id || datosActualizar.rol;
        datosActualizar.permisos = this.obtenerPermisosPorRol(datosActualizar.rol);
      }
      
      // No enviar password vacío
      if (!datosActualizar.password?.trim()) {
        delete datosActualizar.password;
      }
      
      const resultado = await this.put(`/${id}`, datosActualizar);
      console.log('✅ [USUARIOS] Usuario actualizado exitosamente');
      
      return resultado;
      
    } catch (error) {
      console.error(`❌ [USUARIOS] Error al actualizar usuario ${id}:`, error);
      throw new Error(error.message || 'Error al actualizar usuario');
    }
  }

  /**
   * Cambia el estado activo/inactivo de un usuario - CORREGIDO
   * @param {string} id - ID del usuario
   * @param {boolean} activo - Nuevo estado
   * @returns {Promise<Object>} Respuesta
   */
  async cambiarEstado(id, activo) {
    try {
      console.log(`🔄 [USUARIOS] Cambiando estado del usuario ${id} a:`, activo);
      
      // FIX: Usar endpoint correcto del backend
      const resultado = await this.patch(`/${id}/estado`, { activo });
      
      console.log('✅ [USUARIOS] Estado cambiado exitosamente');
      return resultado;
      
    } catch (error) {
      console.error(`❌ [USUARIOS] Error al cambiar estado:`, error);
      throw error;
    }
  }

  /**
   * Cambia la contraseña de un usuario - CORREGIDO
   * @param {string} id - ID del usuario
   * @param {Object} passwords - Contraseñas nueva y actual
   * @returns {Promise<Object>} Respuesta
   */
  async cambiarPassword(id, passwords) {
    try {
      console.log(`🔐 [USUARIOS] Cambiando contraseña del usuario ${id}`);
      
      if (!passwords.nueva_password || passwords.nueva_password.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      }
      
      // FIX: Usar endpoint y formato correctos
      const resultado = await this.patch(`/${id}/password`, {
        nuevaPassword: passwords.nueva_password
      });
      
      console.log('✅ [USUARIOS] Contraseña cambiada exitosamente');
      return resultado;
      
    } catch (error) {
      console.error(`❌ [USUARIOS] Error al cambiar contraseña:`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los roles disponibles - CORREGIDO
   * @returns {Promise<Array>} Lista de roles
   */
  async obtenerRoles() {
    try {
      console.log('🎭 [USUARIOS] Obteniendo roles del sistema...');
      
      try {
        // Intentar obtener del servidor primero
        const response = await this.get('/roles');
        const roles = Array.isArray(response) ? response : [];
        
        if (roles.length > 0) {
          console.log(`✅ [USUARIOS] ${roles.length} roles obtenidos del servidor`);
          return roles;
        }
      } catch (error) {
        console.log('⚠️ [USUARIOS] Servidor no disponible, usando roles predefinidos');
      }
      
      // Fallback a roles predefinidos
      console.log(`✅ [USUARIOS] Usando ${ROLES_SISTEMA.length} roles predefinidos`);
      return ROLES_SISTEMA;
      
    } catch (error) {
      console.error('❌ [USUARIOS] Error al obtener roles:', error);
      return ROLES_SISTEMA;
    }
  }

  /**
   * Obtiene permisos por rol
   * @param {string} rolId - ID del rol
   * @returns {Object} Permisos del rol
   */
  obtenerPermisosPorRol(rolId) {
    const rol = ROLES_SISTEMA.find(r => r.id === rolId);
    return rol ? rol.permisos : ROLES_SISTEMA[1].permisos; // Empleado por defecto
  }

  /**
   * Asigna sucursales a un usuario
   * @param {string} id - ID del usuario
   * @param {Array} sucursales - IDs de sucursales
   * @returns {Promise<Object>} Respuesta
   */
  async asignarSucursales(id, sucursales) {
    try {
      console.log(`🏢 [USUARIOS] Asignando sucursales al usuario ${id}:`, sucursales);
      
      const resultado = await this.put(`/${id}`, { sucursales });
      console.log('✅ [USUARIOS] Sucursales asignadas exitosamente');
      
      return resultado;
      
    } catch (error) {
      console.error(`❌ [USUARIOS] Error al asignar sucursales:`, error);
      throw error;
    }
  }

  /**
   * Obtiene las sucursales asignadas a un usuario
   * @param {string} id - ID del usuario
   * @returns {Promise<Array>} Lista de sucursales
   */
  async obtenerSucursales(id) {
    try {
      console.log(`🔍 [USUARIOS] Obteniendo sucursales del usuario ${id}`);
      
      const response = await this.get(`/${id}/sucursales`);
      const sucursales = Array.isArray(response) ? response : [];
      
      console.log(`✅ [USUARIOS] ${sucursales.length} sucursales obtenidas`);
      return sucursales;
      
    } catch (error) {
      console.error(`❌ [USUARIOS] Error al obtener sucursales:`, error);
      return [];
    }
  }

  /**
   * Método PATCH para actualizaciones parciales - MEJORADO
   * @param {string} endpoint - Endpoint
   * @param {Object} data - Datos a enviar
   * @returns {Promise} Respuesta
   */
  async patch(endpoint = '', data = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const url = this.buildURL(endpoint);

      console.log(`🔥 [USUARIOS] Firebase PATCH: ${url}`, data);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [USUARIOS] PATCH Error HTTP: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log(`✅ [USUARIOS] PATCH Response:`, responseData);
      
      return this.handleFirebaseResponse(responseData);
    } catch (error) {
      console.error(`❌ [USUARIOS] PATCH Error (${endpoint}):`, error);
      throw error;
    }
  }
}

// Crear instancia del servicio
const usuariosService = new UsuariosService();

// Exportar instancia
export default usuariosService;