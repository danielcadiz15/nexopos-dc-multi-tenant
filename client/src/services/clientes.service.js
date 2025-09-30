// src/services/clientes.service.js - ACTUALIZADO CON CÁLCULO DE SALDOS
import FirebaseService from './firebase.service';

// Datos de respaldo para clientes (por si Firebase falla)
const CLIENTES_RESPALDO = [
  {
    id: '1',
    nombre: 'Cliente',
    apellido: 'General',
    telefono: '',
    email: '',
    direccion: '',
    activo: true,
    fechaCreacion: new Date().toISOString()
  }
];

/**
 * Servicio para gestión de clientes con Firebase
 * 🆕 ACTUALIZADO: Incluye cálculo de saldos en tiempo real
 * Mantiene EXACTAMENTE la misma interfaz que el servicio original
 */
class ClientesService extends FirebaseService {
  constructor() {
    super('/clientes'); // Módulo en Firebase Functions
  }

  /**
   * Obtiene todos los clientes
   * 🆕 ACTUALIZADO: Usa límite alto para obtener todos los clientes y separa por empresa
   * @param {string} orgId - ID de la empresa
   * @returns {Promise<Array>} Lista de clientes
   */
  async obtenerTodos(orgId = null) {
    try {
      console.log('🔄 Obteniendo todos los clientes...', orgId ? `para empresa: ${orgId}` : '');
      
      // Usar límite alto para obtener todos los clientes
      const params = { limit: 2000 };
      if (orgId) {
        params.orgId = orgId;
      }
      
      const payload = await this.get('', params);
      const raw = payload?.data ?? payload;
      // Asegurar que siempre sea un array
      const clientesArray = this.ensureArray(raw);
      
      if (clientesArray.length === 0) {
        console.log('⚠️ No hay clientes, usando datos de respaldo');
        return CLIENTES_RESPALDO;
      }
      
      console.log(`✅ Clientes cargados: ${clientesArray.length}`);
      return clientesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
      console.log('🔄 Usando datos de respaldo');
      return CLIENTES_RESPALDO;
    }
  }

  /**
   * Alias para compatibilidad con código existente
   */
  async obtenerTodas() {
    return this.obtenerTodos();
  }

  /**
   * Obtiene clientes activos
   * @returns {Promise<Array>} Lista de clientes activos
   */
  async obtenerActivos() {
    try {
      console.log('🔄 Obteniendo clientes activos...');
      const payload = await this.get('/activos');
      const raw = payload?.data ?? payload;
      const clientesArray = this.ensureArray(raw);
      
      if (clientesArray.length === 0) {
        // Filtrar los activos de los datos de respaldo
        const activos = CLIENTES_RESPALDO.filter(c => c.activo);
        console.log('⚠️ Usando clientes activos de respaldo');
        return activos;
      }
      
      console.log(`✅ Clientes activos: ${clientesArray.length}`);
      return clientesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener clientes activos:', error);
      return CLIENTES_RESPALDO.filter(c => c.activo);
    }
  }

  /**
   * 🆕 NUEVO: Calcula el saldo actual de un cliente en tiempo real
   * @param {string} clienteId - ID del cliente
   * @returns {Promise<Object>} Información del saldo
   */
  async calcularSaldoCliente(clienteId) {
    try {
      console.log(`🧮 Calculando saldo para cliente: ${clienteId}`);
      
      const payload = await this.get(`/${clienteId}/saldo`);
      const saldoObj = this.ensureObject(payload?.data ?? payload);
      
      if (!saldoObj || Object.keys(saldoObj).length === 0) {
        // Saldo por defecto si no hay datos
        return {
          cliente_id: clienteId,
          saldo_actual: 0,
          total_ventas: 0,
          total_pagado: 0,
          cantidad_ventas: 0
        };
      }
      
      console.log(`✅ Saldo calculado: $${saldoObj.saldo_actual} (${saldoObj.cantidad_ventas} ventas)`);
      return saldoObj;
      
    } catch (error) {
      console.error(`❌ Error al calcular saldo del cliente ${clienteId}:`, error);
      return {
        cliente_id: clienteId,
        saldo_actual: 0,
        total_ventas: 0,
        total_pagado: 0,
        cantidad_ventas: 0
      };
    }
  }

  /**
   * 🆕 NUEVO: Obtiene todos los clientes con sus saldos calculados
   * @returns {Promise<Array>} Lista de clientes con saldos
   */
  async obtenerTodosConSaldos(orgId = null) {
    try {
      console.log('🔄 Obteniendo clientes con saldos calculados...', orgId ? `para empresa: ${orgId}` : '');
      
      const clientes = await this.obtenerTodos(orgId);
      
      // Calcular saldos en paralelo para mejor rendimiento
      const clientesConSaldos = await Promise.all(
        clientes.map(async (cliente) => {
          try {
            const saldoInfo = await this.calcularSaldoCliente(cliente.id);
            return {
              ...cliente,
              saldo_calculado: saldoInfo.saldo_actual,
              info_saldo: saldoInfo
            };
          } catch (error) {
            console.warn(`⚠️ Error calculando saldo para ${cliente.nombre}:`, error);
            return {
              ...cliente,
              saldo_calculado: 0,
              info_saldo: {
                cliente_id: cliente.id,
                saldo_actual: 0,
                total_ventas: 0,
                total_pagado: 0,
                cantidad_ventas: 0
              }
            };
          }
        })
      );
      
      console.log(`✅ ${clientesConSaldos.length} clientes con saldos calculados`);
      return clientesConSaldos;
      
    } catch (error) {
      console.error('❌ Error al obtener clientes con saldos:', error);
      return CLIENTES_RESPALDO.map(cliente => ({
        ...cliente,
        saldo_calculado: 0,
        info_saldo: {
          cliente_id: cliente.id,
          saldo_actual: 0,
          total_ventas: 0,
          total_pagado: 0,
          cantidad_ventas: 0
        }
      }));
    }
  }

  /**
   * 🆕 NUEVO: Importación masiva con saldos iniciales
   * @param {Array} clientes - Array de clientes con saldos
   * @param {string} usuarioId - ID del usuario que realiza la importación
   * @returns {Promise<Object>} Resultado de la importación
   */
  async importarMasivoConSaldos(clientes, usuarioId) {
    try {
      console.log(`📥 Iniciando importación masiva de ${clientes.length} clientes con saldos`);
      
      if (!usuarioId) {
        throw new Error('ID de usuario es requerido para la importación');
      }
      
      const resultado = await this.post('/importar-masivo-con-saldos', {
        clientes,
        usuario_id: usuarioId
      });
      
      console.log('✅ Importación masiva completada:', resultado);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en importación masiva con saldos:', error);
      throw error;
    }
  }

  /**
   * 🆕 NUEVO: Obtener clientes con deuda pendiente
   * @param {Object} filtros - Filtros de búsqueda
   * @param {string} filtros.fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} filtros.fechaFin - Fecha de fin (YYYY-MM-DD)
   * @returns {Promise<Array>} Lista de clientes con deuda
   */
  async obtenerClientesConDeuda(filtros = {}) {
    try {
      console.log('🔄 Obteniendo clientes con deuda...', filtros);
      const params = new URLSearchParams();
      
      // Parámetros básicos
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.limit) params.append('limit', filtros.limit);
      if (filtros.startAfter) params.append('startAfter', filtros.startAfter);
      
      // NUEVO: Forzar búsqueda en todas las sucursales
      params.append('todasLasSucursales', 'true');
      
      // NUEVO: Incluir deudas antiguas
      params.append('incluirDeudasAntiguas', 'true');
      
      const response = await this.get(`/con-deuda?${params.toString()}`);
      
      // Procesar respuesta
      let clientes = [];
      let lastClienteId = null;
      let totalDeuda = 0;
      
      if (Array.isArray(response)) {
        clientes = response;
      } else if (response && Array.isArray(response.data)) {
        clientes = response.data;
        lastClienteId = response.lastClienteId;
        totalDeuda = response.totalDeuda;
      } else if (response && Array.isArray(response.clientes)) {
        clientes = response.clientes;
        totalDeuda = response.totalDeuda;
      } else {
        console.warn('[DEBUG] Estructura inesperada en respuesta de clientes con deuda:', response);
      }
      
      // Agregar información de sucursal a cada deuda
      clientes = clientes.map(cliente => ({
        ...cliente,
        deudas_por_sucursal: cliente.deudas_por_sucursal || [],
        deuda_total: cliente.deudas_por_sucursal?.reduce((total, deuda) => total + deuda.monto, 0) || cliente.saldo_deudor || 0
      }));
      
      console.log(`✅ Clientes con deuda obtenidos: ${clientes.length} (Total: ${totalDeuda})`);
      return { 
        clientes, 
        lastClienteId,
        totalDeuda,
        detalles: {
          cantidad_clientes: clientes.length,
          sucursales_procesadas: true
        }
      };
    } catch (error) {
      console.error('❌ Error al obtener clientes con deuda:', error);
      return { 
        clientes: [], 
        lastClienteId: null,
        totalDeuda: 0,
        detalles: {
          error: true,
          mensaje: error.message
        }
      };
    }
  }

  /**
   * 🆕 NUEVO: Obtener clientes sin compras en un período
   * @param {Object} filtros - Filtros de búsqueda
   * @param {string} filtros.fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} filtros.fechaFin - Fecha de fin (YYYY-MM-DD)
   * @returns {Promise<Array>} Lista de clientes sin compras
   */
  async obtenerClientesSinCompras(filtros = {}) {
    try {
      console.log('🔄 Obteniendo clientes sin compras...', filtros);
      
      if (!filtros.fechaInicio || !filtros.fechaFin) {
        throw new Error('fechaInicio y fechaFin son requeridos');
      }
      
      const params = new URLSearchParams();
      params.append('fechaInicio', filtros.fechaInicio);
      params.append('fechaFin', filtros.fechaFin);
      
      const response = await this.get(`/sin-compras?${params.toString()}`);
      
      if (response && response.data) {
        console.log(`✅ Clientes sin compras obtenidos: ${response.data.length}`);
        return response.data;
      }
      
      console.log('⚠️ No se encontraron clientes sin compras');
      return [];
      
    } catch (error) {
      console.error('❌ Error al obtener clientes sin compras:', error);
      return [];
    }
  }

  /**
   * 🆕 NUEVO: Obtener deudas específicas de un cliente individual
   * @param {string} clienteId - ID del cliente
   * @returns {Promise<Object>} Deudas del cliente con total
   */
  async obtenerDeudasCliente(clienteId) {
    try {
      console.log(`🔄 Obteniendo deudas para cliente ID: ${clienteId}`);
      
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      const response = await this.get(`/${clienteId}/deudas`);
      const deudasObj = this.ensureObject(response);
      
      console.log(`🔍 [DEBUG] Response original:`, response);
      console.log(`🔍 [DEBUG] deudasObj después de ensureObject:`, deudasObj);
      console.log(`🔍 [DEBUG] Object.keys(deudasObj):`, Object.keys(deudasObj));
      console.log(`🔍 [DEBUG] Object.keys(deudasObj).length:`, Object.keys(deudasObj).length);
      
      if (!deudasObj || Object.keys(deudasObj).length === 0) {
        console.log(`✅ Cliente ${clienteId} sin deudas pendientes`);
        return {
          cliente_id: clienteId,
          deudas: [],
          total_deuda: 0,
          cantidad_ventas_pendientes: 0
        };
      }
      
      // Procesar respuesta
      let deudas = [];
      let totalDeuda = 0;
      let saldoTotal = 0;
      
      console.log(`🔍 [DEBUG] Procesando respuesta:`, {
        esArray: Array.isArray(deudasObj),
        tieneDeudas: deudasObj.deudas && Array.isArray(deudasObj.deudas),
        tieneData: deudasObj.data && Array.isArray(deudasObj.data),
        deudasObj_keys: Object.keys(deudasObj)
      });
      
      if (Array.isArray(deudasObj)) {
        deudas = deudasObj;
        totalDeuda = deudas.reduce((sum, deuda) => sum + parseFloat(deuda.saldo_pendiente || 0), 0);
        console.log(`🔍 [DEBUG] Procesando como Array, deudas:`, deudas);
      } else if (deudasObj.deudas && Array.isArray(deudasObj.deudas)) {
        deudas = deudasObj.deudas;
        totalDeuda = deudasObj.total_deuda || deudas.reduce((sum, deuda) => sum + parseFloat(deuda.saldo_pendiente || 0), 0);
        console.log(`🔍 [DEBUG] Procesando como deudas, deudas:`, deudas);
      } else if (deudasObj.data && Array.isArray(deudasObj.data)) {
        deudas = deudasObj.data;
        totalDeuda = deudasObj.total_deuda || deudas.reduce((sum, deuda) => sum + parseFloat(deuda.saldo_pendiente || 0), 0);
        console.log(`🔍 [DEBUG] Procesando como data, deudas:`, deudas);
      }
      
      // 🆕 CORREGIDO: Obtener saldo_total del backend
      saldoTotal = deudasObj.saldo_total || 0;
      
      console.log(`✅ Deudas obtenidas para cliente ${clienteId}: ${deudas.length} ventas, Total: $${totalDeuda}, Saldo Total: $${saldoTotal}`);
      
      return {
        cliente_id: clienteId,
        deudas: deudas,
        total_deuda: totalDeuda,
        cantidad_ventas_pendientes: deudas.length,
        saldo_total: saldoTotal
      };
      
    } catch (error) {
      console.error(`❌ Error al obtener deudas del cliente ${clienteId}:`, error);
      return {
        cliente_id: clienteId,
        deudas: [],
        total_deuda: 0,
        cantidad_ventas_pendientes: 0
      };
    }
  }

  /**
   * Obtiene un cliente por su ID
   * @param {string} id - ID del cliente
   * @returns {Promise<Object>} Datos del cliente
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔄 Obteniendo cliente ID: ${id}`);
      const payload = await this.get(`/${id}`);
      const clienteObj = this.ensureObject(payload?.data ?? payload);
      
      if (!clienteObj || Object.keys(clienteObj).length === 0) {
        // Buscar en datos de respaldo
        const clienteRespaldo = CLIENTES_RESPALDO.find(c => c.id === id);
        if (clienteRespaldo) {
          console.log('⚠️ Usando cliente de respaldo');
          return clienteRespaldo;
        }
        throw new Error(`Cliente ${id} no encontrado`);
      }
      
      console.log(`✅ Cliente obtenido:`, clienteObj);
      return clienteObj;
      
    } catch (error) {
      console.error(`❌ Error al obtener cliente ${id}:`, error);
      
      // Buscar en datos de respaldo antes de lanzar error
      const clienteRespaldo = CLIENTES_RESPALDO.find(c => c.id === id);
      if (clienteRespaldo) {
        console.log('⚠️ Usando cliente de respaldo');
        return clienteRespaldo;
      }
      
      throw error;
    }
  }

  /**
   * Crea un nuevo cliente (SIN campos estáticos de saldo)
   * @param {Object} cliente - Datos del cliente
   * @returns {Promise<Object>} Cliente creado
   */
  async crear(cliente, orgId = null) {
    try {
      console.log('🆕 Creando cliente:', cliente, orgId ? `para empresa: ${orgId}` : '');
      
      // Formatear datos del cliente (SIN campos de saldo estáticos)
      const clienteFormateado = {
        nombre: cliente.nombre?.trim() || '',
        apellido: cliente.apellido?.trim() || '',
        telefono: cliente.telefono?.trim() || '',
        email: cliente.email?.trim() || '',
        direccion: cliente.direccion?.trim() || '',
        dni_cuit: cliente.dni_cuit?.trim() || '',
        categoria: cliente.categoria || '',
        localidad: cliente.localidad || '',
        zona: cliente.zona || '',
        notas: cliente.notas?.trim() || '',
        activo: cliente.activo !== false // Por defecto true
      };
      
      // Agregar orgId si está disponible
      if (orgId) {
        clienteFormateado.orgId = orgId;
      }
      
      // Validación básica
      if (!clienteFormateado.nombre) {
        throw new Error('El nombre del cliente es requerido');
      }
      
      const resultado = await this.post('', clienteFormateado);
      console.log('✅ Cliente creado raw:', resultado);
      
      // CRÍTICO: Asegurar formato consistente para ClienteDialog
      if (resultado && typeof resultado === 'object') {
        // Si el resultado ya tiene ID, devolverlo tal como está
        if (resultado.id) {
          console.log('✅ Cliente con ID directo:', resultado);
          return resultado;
        }
        
        // Si el resultado tiene estructura anidada, extraer los datos
        if (resultado.data && resultado.data.id) {
          console.log('✅ Cliente con data anidada:', resultado.data);
          return resultado.data;
        }
        
        // Si es un objeto válido pero sin ID, agregarlo
        if (Object.keys(resultado).length > 0) {
          const clienteConId = {
            id: Date.now().toString(), // ID temporal si no viene del servidor
            ...resultado
          };
          console.log('✅ Cliente con ID generado:', clienteConId);
          return clienteConId;
        }
      }
      
      // Si llegamos aquí, la respuesta no es válida
      console.error('❌ Formato de respuesta no reconocido:', resultado);
      throw new Error('Respuesta inválida del servidor al crear cliente');
      
    } catch (error) {
      console.error('❌ Error detallado al crear cliente:', error);
      
      // Dar información específica sobre el tipo de error
      if (error.message.includes('HTTP')) {
        throw new Error(`Error del servidor: ${error.message}`);
      } else if (error.message.includes('inválida')) {
        throw new Error(`Formato de respuesta inválido: ${error.message}`);
      } else {
        throw new Error(`Error al crear cliente: ${error.message}`);
      }
    }
  }

  /**
   * Actualiza un cliente existente (SIN campos estáticos de saldo)
   * @param {string} id - ID del cliente
   * @param {Object} cliente - Nuevos datos del cliente
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizar(id, cliente, orgId = null) {
    try {
      console.log(`🔄 Actualizando cliente ${id}:`, cliente, orgId ? `para empresa: ${orgId}` : '');
      
      // Actualización PARCIAL: solo incluir campos provistos en 'cliente'
      const payload = {};
      const setIfDefined = (key, value) => {
        if (value !== undefined) payload[key] = value;
      };
      setIfDefined('nombre', cliente.nombre?.trim());
      setIfDefined('apellido', cliente.apellido?.trim());
      setIfDefined('telefono', cliente.telefono?.trim());
      setIfDefined('email', cliente.email?.trim());
      setIfDefined('direccion', cliente.direccion?.trim());
      setIfDefined('dni_cuit', cliente.dni_cuit?.trim());
      setIfDefined('categoria', cliente.categoria);
      setIfDefined('localidad', cliente.localidad);
      setIfDefined('zona', cliente.zona);
      setIfDefined('notas', cliente.notas?.trim());
      setIfDefined('activo', cliente.activo);
      
      // Agregar orgId si está disponible
      if (orgId) {
        payload.orgId = orgId;
      }

      // Validar solo si se intenta cambiar 'nombre'
      if (Object.prototype.hasOwnProperty.call(payload, 'nombre') && (!payload.nombre || payload.nombre.trim() === '')) {
        throw new Error('El nombre del cliente es requerido');
      }

      if (Object.keys(payload).length === 0) {
        console.warn('⚠️ [CLIENTES SERVICE] Sin campos para actualizar');
        return { success: true, message: 'Sin cambios' };
      }

      const resultado = await this.put(`/${id}`, payload);
      console.log('✅ Cliente actualizado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar cliente ${id}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un cliente
   * @param {string} id - ID del cliente
   * @returns {Promise<Object>} Respuesta de la eliminación
   */
  async eliminar(id, orgId = null) {
    try {
      console.log(`🗑️ Eliminando cliente ${id}`, orgId ? `de empresa: ${orgId}` : '');
      
      const params = {};
      if (orgId) {
        params.orgId = orgId;
      }
      
      const resultado = await this.delete(`/${id}`, params);
      console.log('✅ Cliente eliminado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al eliminar cliente ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca clientes por término
   * 🆕 ACTUALIZADO: Usa límite alto para búsquedas completas
   * @param {string} termino - Término de búsqueda
   * @param {string} startAfter - ID del último cliente para paginación
   * @returns {Promise<Array>} Lista de clientes que coinciden
   */
  async buscar(termino, startAfter = null, orgId = null) {
    try {
      console.log(`🔍 Buscando clientes con término: "${termino}"`, orgId ? `en empresa: ${orgId}` : '');
      
      if (!termino || termino.trim() === '') {
        console.log('⚠️ Término de búsqueda vacío, retornando todos los clientes');
        return await this.obtenerTodos(orgId);
      }
      
      const params = { 
        termino: termino.trim(),
        limit: 2000  // 🆕 Límite alto para búsquedas completas
      };
      
      if (orgId) {
        params.orgId = orgId;
      }
      if (startAfter) params.startAfter = startAfter;
      
      const payload = await this.get('/buscar', params);
      const clientesArray = this.ensureArray(payload?.data ?? payload);
      
      console.log(`✅ Búsqueda completada: ${clientesArray.length} resultados`);
      return clientesArray;
      
    } catch (error) {
      console.error('❌ Error en búsqueda de clientes:', error);
      
      // Fallback: buscar en datos locales si Firebase falla
      try {
        const todosClientes = await this.obtenerTodos();
        const terminoLower = termino.toLowerCase();
        
        const resultados = todosClientes.filter(cliente => 
          cliente.nombre?.toLowerCase().includes(terminoLower) ||
          cliente.apellido?.toLowerCase().includes(terminoLower) ||
          cliente.telefono?.includes(termino) ||
          cliente.email?.toLowerCase().includes(terminoLower) ||
          cliente.direccion?.toLowerCase().includes(terminoLower)
        );
        
        console.log(`✅ Búsqueda local completada: ${resultados.length} resultados`);
        return resultados;
      } catch (fallbackError) {
        console.error('❌ Error en búsqueda local:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Obtiene clientes frecuentes
   * @param {number} limite - Número de clientes a obtener
   * @returns {Promise<Array>} Clientes frecuentes
   */
  async obtenerFrecuentes(limite = 10) {
    try {
      console.log(`📊 Obteniendo clientes frecuentes (límite: ${limite})`);
      
      const payload = await this.get('/frecuentes', { limite });
      const clientesArray = this.ensureArray(payload?.data ?? payload);
      
      console.log(`✅ Clientes frecuentes: ${clientesArray.length}`);
      return clientesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener clientes frecuentes:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de clientes
   * @returns {Promise<Object>} Estadísticas de clientes
   */
  async obtenerEstadisticas() {
    try {
      console.log('📊 Obteniendo estadísticas de clientes...');
      const payload = await this.get('/estadisticas');
      const statsObj = this.ensureObject(payload?.data ?? payload);
      
      if (!statsObj || Object.keys(statsObj).length === 0) {
        // Estadísticas de respaldo
        const estadisticasRespaldo = {
          total: CLIENTES_RESPALDO.length,
          activos: CLIENTES_RESPALDO.filter(c => c.activo).length,
          nuevosEsteMes: 0,
          conCompras: 0
        };
        
        console.log('⚠️ Usando estadísticas de respaldo');
        return estadisticasRespaldo;
      }
      
      console.log('✅ Estadísticas obtenidas:', statsObj);
      return statsObj;
      
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return {
        total: 0,
        activos: 0,
        nuevosEsteMes: 0,
        conCompras: 0
      };
    }
  }

  /**
   * Busca clientes con filtros avanzados
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Array>} Clientes filtrados
   */
  async buscarConFiltros(filtros = {}) {
    try {
      console.log('🔍 Búsqueda de clientes con filtros:', filtros);
      
      const payload = await this.get('/filtros', filtros);
      const clientesArray = this.ensureArray(payload?.data ?? payload);
      
      console.log(`✅ Clientes filtrados: ${clientesArray.length}`);
      return clientesArray;
      
    } catch (error) {
      console.error('❌ Error en búsqueda con filtros:', error);
      
      // Aplicar filtros básicos en datos de respaldo
      let resultado = [...CLIENTES_RESPALDO];
      
      if (filtros.activo !== undefined) {
        resultado = resultado.filter(c => c.activo === filtros.activo);
      }
      if (filtros.conEmail) {
        resultado = resultado.filter(c => c.email && c.email.trim() !== '');
      }
      if (filtros.conTelefono) {
        resultado = resultado.filter(c => c.telefono && c.telefono.trim() !== '');
      }
      
      console.log(`⚠️ Filtros aplicados en respaldo: ${resultado.length} resultados`);
      return resultado;
    }
  }

  /**
   * Obtiene el historial de compras de un cliente
   * @param {string} id - ID del cliente  
   * @returns {Promise<Array>} Historial de compras
   */
  async obtenerHistorialCompras(id) {
    try {
      console.log(`🔄 Obteniendo historial de compras del cliente ${id}`);
      const historial = await this.get(`/${id}/compras`);
      
      const historialArray = this.ensureArray(historial);
      console.log(`📊 Compras obtenidas: ${historialArray.length}`);
      
      return historialArray;
    } catch (error) {
      console.error(`❌ Error al obtener historial del cliente ${id}:`, error);
      return [];
    }
  }
}

export default new ClientesService();
