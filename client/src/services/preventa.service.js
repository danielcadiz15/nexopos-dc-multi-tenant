// src/services/preventa.service.js - Servicio para flujo de Pre-venta / Levantar Pedidos
import FirebaseService from './firebase.service';
import clientesService from './clientes.service';

class PreVentaService extends FirebaseService {
  constructor() {
    super('/pre-venta');
  }

  // Cache local de zonas (fallback si el backend devuelve healthcheck)
  getLocalZonas() {
    try {
      const raw = localStorage.getItem('preventa_zonas');
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  saveLocalZonas(zonas) {
    try {
      localStorage.setItem('preventa_zonas', JSON.stringify(Array.isArray(zonas) ? zonas : []));
    } catch (e) {}
  }

  upsertLocalZona(zona) {
    if (!zona) return;
    const zonas = this.getLocalZonas();
    const idx = zonas.findIndex(z => (z.id && zona.id ? z.id === zona.id : (z.nombre || '').toLowerCase() === (zona.nombre || '').toLowerCase()));
    if (idx >= 0) {
      zonas[idx] = { ...zonas[idx], ...zona };
    } else {
      zonas.push(zona);
    }
    this.saveLocalZonas(zonas);
  }

  removeLocalZona(zonaId) {
    const zonas = this.getLocalZonas().filter(z => z.id !== zonaId);
    this.saveLocalZonas(zonas);
  }

  // Catálogos básicos
  async obtenerZonas() {
    try {
      const zonas = await this.get('/zonas');
      const arr = this.ensureArray(zonas?.data ?? zonas?.zonas ?? zonas);
      // Merge con cache local
      const locales = this.getLocalZonas();
      const porNombre = (z) => (z?.nombre || '').toLowerCase();
      const merge = [...arr];
      for (const z of locales) {
        if (!merge.some(m => (m.id && z.id ? m.id === z.id : porNombre(m) === porNombre(z)))) {
          merge.push(z);
        }
      }
      if (merge.length > 0) return merge;
      // Fallback 1: rutas alternativas conocidas
      try {
        const alt = await this.get('/catalogos/zonas');
        const altArr = this.ensureArray(alt?.data ?? alt?.zonas ?? alt);
        if (altArr.length > 0) return altArr;
      } catch (_) {}
      try {
        const alt2 = await this.get('/listar-zonas');
        const alt2Arr = this.ensureArray(alt2?.data ?? alt2?.zonas ?? alt2);
        if (alt2Arr.length > 0) return alt2Arr;
      } catch (_) {}
      // Fallback 2: derivar zonas desde clientes (campo 'zona')
      try {
        const clientes = await clientesService.obtenerTodos();
        const set = new Map();
        for (const c of (Array.isArray(clientes) ? clientes : [])) {
          const nombre = (c?.zona || '').trim();
          if (!nombre) continue;
          const key = nombre.toLowerCase();
          if (!set.has(key)) set.set(key, { id: `zona-${key.replace(/[^a-z0-9]+/g,'-')}`, nombre });
        }
        const derivadas = Array.from(set.values());
        if (derivadas.length > 0) return derivadas;
      } catch (_) {}
      return [];
    } catch (error) {
      console.error('❌ Error al obtener zonas:', error);
      const locales = this.getLocalZonas();
      if (locales.length > 0) return locales;
      // Último intento: derivar de clientes
      try {
        const clientes = await clientesService.obtenerTodos();
        const set = new Map();
        for (const c of (Array.isArray(clientes) ? clientes : [])) {
          const nombre = (c?.zona || '').trim();
          if (!nombre) continue;
          const key = nombre.toLowerCase();
          if (!set.has(key)) set.set(key, { id: `zona-${key.replace(/[^a-z0-9]+/g,'-')}`, nombre });
        }
        return Array.from(set.values());
      } catch (_) {
        return [];
      }
    }
  }

  async crearZona({ nombre, descripcion = '' }) {
    try {
      const payload = { nombre, descripcion };
      const resp = await this.post('/zonas', payload);
      // Intentar devolver objeto zona usable aunque el backend devuelva healthcheck
      const zona = this.ensureObject(resp?.data ?? resp);
      const zonaFinal = {
        id: zona.id || zona.zona_id || `loc-${Date.now()}`,
        nombre: zona.nombre || nombre,
        descripcion: zona.descripcion || descripcion
      };
      this.upsertLocalZona(zonaFinal);
      return zonaFinal;
    } catch (error) {
      console.error('❌ Error al crear zona:', error);
      throw error;
    }
  }

  async actualizarZona(zonaId, data) {
    try {
      if (!zonaId) throw new Error('zonaId requerido');
      const res = await this.put(`/zonas/${zonaId}`, data);
      this.upsertLocalZona({ id: zonaId, ...data });
      return res;
    } catch (error) {
      console.error('❌ Error al actualizar zona:', error);
      throw error;
    }
  }

  async eliminarZona(zonaId) {
    try {
      if (!zonaId) throw new Error('zonaId requerido');
      const res = await this.delete(`/zonas/${zonaId}`);
      this.removeLocalZona(zonaId);
      return res;
    } catch (error) {
      console.error('❌ Error al eliminar zona:', error);
      throw error;
    }
  }

  async obtenerLocalidadesPorZona(zonaId) {
    try {
      if (!zonaId) return [];
      const localidades = await this.get(`/zonas/${zonaId}/localidades`);
      return Array.isArray(localidades) ? localidades : [];
    } catch (error) {
      console.error('❌ Error al obtener localidades por zona:', error);
      return [];
    }
  }

  async obtenerClientesPorZona(zonaId, localidadId = null) {
    try {
      const params = {};
      if (zonaId) params.zona_id = zonaId;
      if (localidadId) params.localidad_id = localidadId;
      const clientes = await this.get('/clientes-por-zona', params);
      const arr = Array.isArray(clientes) ? clientes : [];
      if (arr.length > 0) return arr;
      // Fallback: derivar por campo cliente.zona (y localidad si aplica)
      console.warn('⚠️ [PREVENTA] Sin resultados del backend. Usando fallback por cliente.zona');
      // Obtener nombre de la zona desde catálogo
      let zonaNombre = '';
      try {
        const zonas = await this.obtenerZonas();
        const z = (Array.isArray(zonas) ? zonas : []).find(zo => (zo?.id === zonaId) || ((zo?.nombre || '').toLowerCase() === String(zonaId).toLowerCase()));
        zonaNombre = (z?.nombre || '').trim();
      } catch (_) {}
      // Si no se pudo resolver, intentar usar el propio zonaId como nombre
      if (!zonaNombre) zonaNombre = String(zonaId || '').trim();
      if (!zonaNombre) return [];
      const todos = await clientesService.obtenerTodos();
      const zonaLower = zonaNombre.toLowerCase();
      const filtradosPorZona = (Array.isArray(todos) ? todos : []).filter(c => (c?.zona || '').toLowerCase() === zonaLower);
      if (localidadId) {
        const locLower = String(localidadId).toLowerCase();
        return filtradosPorZona.filter(c => (c?.localidad || '').toLowerCase() === locLower);
      }
      return filtradosPorZona;
    } catch (error) {
      console.error('❌ Error al obtener clientes por zona:', error);
      return [];
    }
  }

  // Asignación persistente clientes-zona
  async obtenerAsignacionZona(zonaId, localidadId = null) {
    try {
      if (!zonaId) return [];
      const params = {};
      if (localidadId) params.localidad_id = localidadId;
      const resp = await this.get(`/zonas/${zonaId}/asignacion`, params);
      const lista = this.ensureArray(resp);
      // Acepta tanto array de ids como de objetos {cliente_id}
      return lista.map(x => (typeof x === 'string' ? x : (x?.cliente_id || x?.id))).filter(Boolean);
    } catch (error) {
      console.warn('⚠️ No se pudo obtener asignación de zona (usando vacío):', error);
      return [];
    }
  }

  async guardarAsignacionZona(zonaId, { localidad_id = null, clients_ids = [] }) {
    try {
      if (!zonaId) throw new Error('zonaId requerido');
      const payload = { localidad_id, clients_ids };
      const resp = await this.post(`/zonas/${zonaId}/asignacion`, payload);
      return resp?.success !== false;
    } catch (error) {
      console.error('❌ Error al guardar asignación de zona:', error);
      return false;
    }
  }

  // Sesiones de pre-venta
  async crearSesion({ zona_id, localidad_id = null, usuario_id = null, notas = '', clients_ids = [] }) {
    try {
      const payload = { zona_id, localidad_id, usuario_id, notas, clients_ids };
      const sesion = await this.post('/sessions', payload);
      return sesion;
    } catch (error) {
      console.error('❌ Error al crear sesión de pre-venta:', error);
      throw error;
    }
  }

  async obtenerSesion(sesionId) {
    try {
      return await this.get(`/sessions/${sesionId}`);
    } catch (error) {
      console.error('❌ Error al obtener sesión de pre-venta:', error);
      throw error;
    }
  }

  async actualizarEstadoContacto(sesionId, clienteId, { estado_contacto, notas = '' }) {
    try {
      const payload = { estado_contacto, notas };
      return await this.post(`/sessions/${sesionId}/clientes/${clienteId}/contacto`, payload);
    } catch (error) {
      console.error('❌ Error al actualizar estado de contacto:', error);
      throw error;
    }
  }

  // Pedidos (borrador)
  async crearOActualizarPedido({ sesion_id, cliente_id, sucursal_id, items = [], notas = '' }) {
    try {
      const payload = { sesion_id, cliente_id, sucursal_id, items, notas };
      const res = await this.post('/pedidos', payload);
      // Guardar pedido en cache local para vista rápida si la API devuelve healthcheck
      try {
        const pedido = {
          id: res?.id || `local-${Date.now()}`,
          sesion_id,
          cliente_id,
          sucursal_id,
          items,
          notas,
          created_at: new Date().toISOString()
        };
        this.savePedidoLocal(pedido);
      } catch (_) {}
      return res;
    } catch (error) {
      console.error('❌ Error al crear/actualizar pedido de pre-venta:', error);
      throw error;
    }
  }

  async confirmarPedido(pedidoId) {
    try {
      return await this.post(`/pedidos/${pedidoId}/confirmar`, {});
    } catch (error) {
      console.error('❌ Error al confirmar pedido de pre-venta:', error);
      throw error;
    }
  }

  async obtenerResumenSesion(sesionId) {
    try {
      const resp = await this.get(`/sessions/${sesionId}/resumen`);
      // Si el backend no devuelve un resumen válido, usar cache local
      const arr = Array.isArray(resp?.pedidos) ? resp.pedidos : (Array.isArray(resp) ? resp : []);
      if (arr.length > 0) return { pedidos: arr };
      return { pedidos: this.getPedidosLocales(sesionId) };
    } catch (error) {
      console.error('❌ Error al obtener resumen de sesión:', error);
      return { pedidos: this.getPedidosLocales(sesionId) };
    }
  }

  // Cache local mínima de pedidos
  savePedidoLocal(pedido) {
    try {
      const key = 'preventa_pedidos_local';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.unshift(pedido);
      localStorage.setItem(key, JSON.stringify(arr.slice(0, 200)));
    } catch (_) {}
  }
  getPedidosLocales(sesionId) {
    try {
      const key = 'preventa_pedidos_local';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      return arr.filter(p => !sesionId || p.sesion_id === sesionId);
    } catch (_) { return []; }
  }
}

export default new PreVentaService();


