// src/components/modules/ventas/IniciarRepartoModal.js
import React, { useEffect, useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import repartoService from '../../../services/reparto.service';
import ventasService from '../../../services/ventas.service';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const IniciarRepartoModal = ({ isOpen, onClose, sucursalId, sucursalesDisponibles = [], onStart }) => {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [cargando, setCargando] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [orden, setOrden] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [notas, setNotas] = useState('');
  const [fechaReparto, setFechaReparto] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!isOpen) return;
    setVentas([]);
    setOrden([]);
    setSeleccionados([]);
  }, [isOpen]);

  const cargarVentas = async () => {
    try {
      setCargando(true);
      let resp = await repartoService.obtenerVentasParaReparto({ sucursal_id: sucursalId, fecha: `${fecha}:${fechaHasta}`, estado: 'pendiente_entrega' });
      let lista = Array.isArray(resp) ? resp : (Array.isArray(resp?.ventas) ? resp.ventas : []);
      // Fallback: consultar ventasService por rango si no hay datos
      if (!lista || lista.length === 0) {
        try {
          const desde = fecha;
          const hasta = fechaHasta;
          let arr = await ventasService.obtenerPorSucursal(sucursalId, 500);
          if (!Array.isArray(arr) || arr.length === 0) {
            arr = await ventasService.obtenerTodas({ limit: 500 });
          }
          arr = Array.isArray(arr) ? arr : [];
          lista = arr.filter(v => {
            const f = new Date(v.fecha || v.created_at || Date.now()).toISOString().slice(0,10);
            return f >= desde && f <= hasta;
          });
        } catch (e) {
          console.warn('Fallback ventasService por rango falló:', e);
        }
      }
      setVentas(lista);
      const ids = lista.map(v => v.id);
      setOrden(ids);
      setSeleccionados(ids); // por defecto, todas seleccionadas
    } catch (e) {
      console.error('Error al cargar ventas para reparto:', e);
      setVentas([]);
      setOrden([]);
    } finally {
      setCargando(false);
    }
  };

  const mover = (index, dir) => {
    const nuevo = [...orden];
    const target = index + dir;
    if (target < 0 || target >= nuevo.length) return;
    const tmp = nuevo[index];
    nuevo[index] = nuevo[target];
    nuevo[target] = tmp;
    setOrden(nuevo);
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const allSelected = ventas.length > 0 && seleccionados.length === ventas.length;
  const toggleSeleccionTodos = () => {
    if (allSelected) setSeleccionados([]); else setSeleccionados(ventas.map(v => v.id));
  };

  const iniciar = async () => {
    try {
      setCargando(true);
      const ordenSeleccionado = orden.filter(id => seleccionados.includes(id));
      const sesion = await repartoService.crearSesion({ sucursal_id: sucursalId, ventas_ids: ordenSeleccionado, orden: ordenSeleccionado, notas, fecha_reparto: fechaReparto });
      // Preparar objeto robusto para el wizard (evitar healthcheck)
      const sesionParaWizard = {
        id: sesion?.id || sesion?.session_id || Date.now().toString(),
        sucursal_id: sucursalId,
        ventas: ventas.filter(v => seleccionados.includes(v.id)),
        orden: [...ordenSeleccionado],
        fecha_reparto: fechaReparto,
        notas
      };
      try { localStorage.setItem('reparto_sesion_last', JSON.stringify(sesionParaWizard)); } catch (_) {}
      onStart?.(sesionParaWizard);
      onClose?.();
    } catch (e) {
      console.error('Error creando sesión de reparto:', e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Iniciar Reparto" size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input type="date" className="mt-1 w-full border rounded p-2" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hasta</label>
            <input type="date" className="mt-1 w-full border rounded p-2" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sucursal</label>
            <input className="mt-1 w-full border rounded p-2 bg-gray-50" value={(sucursalesDisponibles.find(s => s.id === sucursalId)?.nombre) || sucursalId || ''} readOnly />
          </div>
          <div className="flex items-end">
            <Button color="secondary" onClick={cargarVentas} loading={cargando} className="w-full">Cargar Ventas</Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
          <textarea className="mt-1 w-full border rounded p-2" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha de reparto</label>
            <input type="date" className="mt-1 w-full border rounded p-2" value={fechaReparto} onChange={e => setFechaReparto(e.target.value)} />
          </div>
        </div>

        <div className="border rounded p-2 max-h-64 overflow-auto">
          {ventas.length === 0 ? (
            <div className="text-sm text-gray-500">Sin ventas para la fecha seleccionada</div>
          ) : (
            <>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <div>
                <input type="checkbox" checked={allSelected} onChange={toggleSeleccionTodos} className="mr-2" />
                {seleccionados.length} seleccionadas de {ventas.length}
              </div>
            </div>
            {orden.map((id, idx) => {
              const v = ventas.find(x => x.id === id) || {};
              return (
                <div key={id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                  <div className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={seleccionados.includes(id)} onChange={() => toggleSeleccion(id)} />
                    <div className="font-medium text-gray-800">{v.numero || id} - {v.cliente_info?.nombre_completo || 'Cliente'}</div>
                    <div className="text-gray-600">Total: ${parseFloat(v.total || 0).toLocaleString()} {v.saldo_pendiente > 0 ? `| Debe: $${parseFloat(v.saldo_pendiente).toLocaleString()}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="xs" color="gray" onClick={() => mover(idx, -1)}><FaArrowUp /></Button>
                    <Button size="xs" color="gray" onClick={() => mover(idx, 1)}><FaArrowDown /></Button>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button color="gray" onClick={onClose}>Cancelar</Button>
          <Button color="primary" onClick={iniciar} disabled={seleccionados.length === 0} loading={cargando}>Iniciar Reparto</Button>
        </div>
      </div>
    </Modal>
  );
};

export default IniciarRepartoModal;


