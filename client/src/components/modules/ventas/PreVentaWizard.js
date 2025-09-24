// src/components/modules/ventas/PreVentaWizard.js
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import preventaService from '../../../services/preventa.service';
import productosService from '../../../services/productos.service';
import { toast } from 'react-toastify';

const PreVentaWizard = ({ isOpen, onClose, sesion, sucursalId }) => {
  const [clientes, setClientes] = useState([]);
  const [index, setIndex] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [items, setItems] = useState([]);
  const [estadoContacto, setEstadoContacto] = useState('no_contactado');
  const [nota, setNota] = useState('');
  const clienteActual = clientes[index] || null;

  useEffect(() => {
    if (!isOpen || !sesion) return;
    (async () => {
      const lista = await preventaService.obtenerClientesPorZona(sesion.zona_id, sesion.localidad_id);
      // Si vienen ids preseleccionados desde la pantalla anterior, priorizar esos clientes
      let final = Array.isArray(lista) ? lista : [];
      const idsPreseleccion = Array.isArray(sesion.clients_ids) ? sesion.clients_ids.filter(Boolean) : [];
      if (idsPreseleccion.length > 0) {
        const setIds = new Set(idsPreseleccion);
        const filtrados = final.filter(c => setIds.has(c.id));
        // Si el backend/fallback no devolvió todos, completar con clientes locales
        if (filtrados.length < idsPreseleccion.length) {
          try {
            const todos = await (await import('../../../services/clientes.service')).default.obtenerTodos();
            const byId = new Map(todos.map(c => [c.id, c]));
            for (const id of idsPreseleccion) {
              if (!filtrados.some(c => c.id === id) && byId.has(id)) filtrados.push(byId.get(id));
            }
        	final = filtrados;
          } catch (_) {
            final = filtrados; // usar lo que tengamos
          }
      	} else {
        final = filtrados;
      	}
      }
      setClientes(final || []);
      setIndex(0);
      setItems([]);
      setBusqueda('');
      setResultados([]);
    })();
  }, [isOpen, sesion]);

  useEffect(() => {
    let activo = true;
    if (!busqueda || busqueda.trim().length < 1) {
      setResultados([]);
      return () => {};
    }
    setLoadingBusqueda(true);
    const handle = setTimeout(async () => {
      try {
        const prods = await productosService.buscar(busqueda, sucursalId);
        if (!activo) return;
        const term = busqueda.toLowerCase();
        const rank = (p) => {
          const nombre = (p.nombre || '').toLowerCase();
          const codigo = String(p.codigo || '').toLowerCase();
          if (codigo === term || nombre === term) return 0;
          if (codigo.startsWith(term) || nombre.startsWith(term)) return 1;
          if (codigo.includes(term) || nombre.includes(term)) return 2;
          return 3;
        };
        const ordenados = [...(Array.isArray(prods) ? prods : [])]
          .sort((a, b) => rank(a) - rank(b) || (a.nombre || '').localeCompare(b.nombre || ''));
        setResultados(ordenados);
      } finally {
        if (activo) setLoadingBusqueda(false);
      }
    }, 250);
    return () => { activo = false; clearTimeout(handle); };
  }, [busqueda, sucursalId]);

  const total = useMemo(() => items.reduce((sum, it) => sum + (it.precio_venta || 0) * (it.cantidad || 0), 0), [items]);

  const verificarStock = async (productoId, cantidadDeseada) => {
    try {
      const stock = await productosService.consultarStockEnSucursal(productoId, sucursalId);
      const disponible = parseInt(stock?.cantidad || stock?.stock || stock?.stock_actual || 0);
      return disponible >= cantidadDeseada;
    } catch (_) { return true; }
  };

  const agregarItem = async (prod) => {
    const existente = items.find(i => i.producto_id === prod.id);
    const nuevaCantidad = (existente?.cantidad || 0) + 1;
    const ok = await verificarStock(prod.id, nuevaCantidad);
    if (!ok) {
      toast.warning('Stock insuficiente en esta sucursal');
      return;
    }
    if (existente) {
      setItems(items.map(i => i.producto_id === prod.id ? { ...i, cantidad: nuevaCantidad } : i));
    } else {
      setItems([...items, { producto_id: prod.id, nombre: prod.nombre, precio_venta: prod.precio_venta || prod.precio || 0, cantidad: 1 }]);
    }
  };

  const validarStockTodos = async () => {
    const insuficientes = [];
    for (const it of items) {
      try {
        const stock = await productosService.consultarStockEnSucursal(it.producto_id, sucursalId);
        const disponible = parseInt(stock?.cantidad || stock?.stock || stock?.stock_actual || 0);
        if (disponible < (it.cantidad || 0)) {
          insuficientes.push({ id: it.producto_id, nombre: it.nombre, requerido: it.cantidad, disponible });
        }
      } catch (_) {}
    }
    return insuficientes;
  };

  const guardarBorrador = async () => {
    if (!clienteActual) return false;
    // Validación final de stock de todos los items
    const insuf = await validarStockTodos();
    if (insuf.length > 0) {
      toast.error(`Stock insuficiente en ${insuf.length} producto(s). Ajusta cantidades.`);
      console.table(insuf);
      return false;
    }
    await preventaService.crearOActualizarPedido({
      sesion_id: sesion.id || sesion.session_id || sesion, // compatibilidad
      cliente_id: clienteActual.id,
      sucursal_id: sucursalId,
      items,
      notas: nota
    });
    return true;
  };

  const marcarEstado = async (estado) => {
    if (!clienteActual) return;
    setEstadoContacto(estado);
    try {
      await preventaService.actualizarEstadoContacto(sesion.id || sesion, clienteActual.id, { estado_contacto: estado, notas: nota });
    } catch (e) {
      console.error('Error guardando estado de contacto:', e);
    }
  };

  const siguiente = async () => {
    const ok = await guardarBorrador();
    if (!ok) return;
    setIndex(i => Math.min(i + 1, Math.max(0, clientes.length - 1)));
    setItems([]);
    setBusqueda('');
    setResultados([]);
    setNota('');
  };

  const anterior = () => {
    setIndex(i => Math.max(i - 1, 0));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pre-venta - ${sesion?.zona_nombre || ''}`} size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cliente actual */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600">{index + 1} / {clientes.length} clientes</div>
          {clienteActual ? (
            <div className="p-3 border rounded">
              <div className="font-semibold text-gray-800">{clienteActual.nombre} {clienteActual.apellido}</div>
              <div className="text-sm text-gray-600">Tel: {clienteActual.telefono || 'N/A'}</div>
              <div className="text-sm text-gray-600">Localidad: {clienteActual.localidad?.nombre || clienteActual.localidad_nombre || '-'}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => window.open(`tel:${clienteActual.telefono || ''}`)} disabled={!clienteActual.telefono}>Llamar</Button>
                <Button size="sm" color="green" onClick={() => window.open(`https://wa.me/${(clienteActual.telefono || '').replace(/[^\d]/g,'')}?text=${encodeURIComponent('Hola! ¿Desea realizar un pedido?')}`)} disabled={!clienteActual.telefono}>WhatsApp</Button>
              </div>
            </div>
          ) : (
            <div className="p-3 text-gray-500">Sin cliente</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Estado de contacto</label>
            <select className="mt-1 w-full border rounded p-2" value={estadoContacto} onChange={e => setEstadoContacto(e.target.value)}>
              <option value="no_contactado">No contactado</option>
              <option value="llamado">Llamado</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sin_respuesta">Sin respuesta</option>
              <option value="no_compra">No compra</option>
              <option value="compra">Compra</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea className="mt-1 w-full border rounded p-2" rows={3} value={nota} onChange={e => setNota(e.target.value)} />
          </div>
        </div>

        {/* Pedido rápido */}
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Buscar producto</label>
            <input className="mt-1 w-full border rounded p-2" placeholder="Código o nombre" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          {resultados.length > 0 && (
            <div className="max-h-40 overflow-auto border rounded">
              {resultados.slice(0, 20).map(p => (
                <div key={p.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50">
                  <div className="text-sm">{p.codigo} - {p.nombre}</div>
                  <Button size="xs" onClick={() => agregarItem(p)}>Agregar</Button>
                </div>
              ))}
            </div>
          )}
          {loadingBusqueda && (
            <div className="text-xs text-gray-500">Buscando…</div>
          )}
          {!loadingBusqueda && busqueda && resultados.length === 0 && (
            <div className="text-xs text-gray-500">Sin resultados</div>
          )}

          <div className="border rounded p-2">
            <div className="font-medium mb-2">Items</div>
            {items.length === 0 ? (
              <div className="text-sm text-gray-500">Sin items</div>
            ) : (
              <div className="space-y-1">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <div className="flex-1 text-sm">{it.nombre}</div>
                    <input type="number" min={1} className="w-16 border rounded p-1 text-sm" value={it.cantidad} onChange={async e => {
                      const val = parseInt(e.target.value || '0', 10);
                      if (val < 1) return;
                      const ok = await verificarStock(it.producto_id, val);
                      if (!ok) { toast.warning('Stock insuficiente en esta sucursal'); return; }
                      setItems(items.map((x,i) => i===idx ? { ...x, cantidad: val } : x));
                    }} />
                    <div className="w-20 text-right text-sm">${(it.precio_venta || 0).toLocaleString()}</div>
                    <Button size="xs" color="gray" onClick={() => setItems(items.filter((_,i) => i!==idx))}>Quitar</Button>
                  </div>
                ))}
                <div className="pt-2 text-right font-semibold">Total: ${total.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <div className="flex gap-2">
          <Button color="gray" onClick={anterior} disabled={index === 0}>Anterior</Button>
          <Button onClick={async () => { const ok = await guardarBorrador(); if (ok) await marcarEstado(estadoContacto); }}>Guardar</Button>
        </div>
        <div className="flex gap-2">
          <Button color="green" onClick={siguiente} disabled={index >= clientes.length - 1}>Siguiente</Button>
          <Button color="gray" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PreVentaWizard;



