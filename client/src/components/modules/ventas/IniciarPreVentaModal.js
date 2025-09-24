// src/components/modules/ventas/IniciarPreVentaModal.js
import React, { useEffect, useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import preventaService from '../../../services/preventa.service';
import clientesService from '../../../services/clientes.service';
import ZonasABMModal from './ZonasABMModal';
import AsistentePanel from './AsistentePanel';
import { FEATURES } from '../../../config/featureFlags';

const IniciarPreVentaModal = ({ isOpen, onClose, onStart }) => {
  const [zonas, setZonas] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [zonaId, setZonaId] = useState('');
  const [localidadId, setLocalidadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notas, setNotas] = useState('');
  const [clientesZona, setClientesZona] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [zonasModalOpen, setZonasModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const z = await preventaService.obtenerZonas();
      setZonas(z);
    })();
  }, [isOpen]);

  // Escuchar cambios de zonas desde otros modales/pestañas (localStorage)
  useEffect(() => {
    const onStorage = async (e) => {
      if (e.key === 'preventa_zonas') {
        const z = await preventaService.obtenerZonas();
        setZonas(z);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    (async () => {
      if (!zonaId) {
        setLocalidades([]);
        setLocalidadId('');
        setClientesZona([]);
        setSeleccionados([]);
        return;
      }
      const locs = await preventaService.obtenerLocalidadesPorZona(zonaId);
      setLocalidades(locs);
      // Cargar clientes de la zona + preselección persistida
      const [clientes, preseleccion] = await Promise.all([
        preventaService.obtenerClientesPorZona(zonaId, localidadId),
        preventaService.obtenerAsignacionZona(zonaId, localidadId)
      ]);
      setClientesZona(Array.isArray(clientes) ? clientes : []);
      setSeleccionados(Array.isArray(preseleccion) ? preseleccion : []);
    })();
  }, [zonaId]);

  useEffect(() => {
    (async () => {
      if (!zonaId) return;
      const [clientes, preseleccion] = await Promise.all([
        preventaService.obtenerClientesPorZona(zonaId, localidadId),
        preventaService.obtenerAsignacionZona(zonaId, localidadId)
      ]);
      setClientesZona(Array.isArray(clientes) ? clientes : []);
      setSeleccionados(Array.isArray(preseleccion) ? preseleccion : []);
    })();
  }, [localidadId]);

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const iniciar = async () => {
    if (!zonaId) return;
    try {
      setLoading(true);
      const sesion = await preventaService.crearSesion({ zona_id: zonaId, localidad_id: localidadId || null, notas, clients_ids: seleccionados });
      // Fijar datos mínimos para el wizard aunque el backend devuelva un healthcheck
      const zonaObj = (Array.isArray(zonas) ? zonas : []).find(z => z.id === zonaId);
      const sesionParaWizard = {
        id: sesion?.id || sesion?.session_id || Date.now().toString(),
        zona_id: zonaId,
        zona_nombre: zonaObj?.nombre || '',
        localidad_id: localidadId || null,
        clients_ids: Array.isArray(seleccionados) ? [...seleccionados] : []
      };
      onStart?.(sesionParaWizard);
      onClose?.();
    } catch (e) {
      console.error('Error iniciando pre-venta:', e);
    } finally {
      setLoading(false);
    }
  };

  const guardarAsignacion = async () => {
    if (!zonaId) return;
    try {
      setGuardando(true);
      const ok = await preventaService.guardarAsignacionZona(zonaId, { localidad_id: localidadId || null, clients_ids: seleccionados });
      if (!ok) throw new Error('No se pudo guardar la asignación');
    } catch (e) {
      console.error('Error guardando asignación:', e);
    } finally {
      setGuardando(false);
    }
  };

  const logInteraccion = async (data) => {
    // Local: solo console.log. Más adelante podemos integrar Firestore.
    try {
      console.log('[AsistenteVentas] Interacción registrada (local):', data);
    } catch (e) {
      // noop
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Iniciar Pre-venta">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Zona</label>
          <div className="flex gap-2">
            <select className="mt-1 w-full border rounded p-2" value={zonaId} onChange={e => setZonaId(e.target.value)}>
              <option value="">Seleccione una zona</option>
              {zonas.map(z => (
                <option key={z.id} value={z.id}>{z.nombre}</option>
              ))}
            </select>
            <Button color="secondary" onClick={() => setZonasModalOpen(true)}>Zonas</Button>
            <Button color="gray" onClick={async () => setZonas(await preventaService.obtenerZonas())}>Actualizar</Button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Localidad (opcional)</label>
          <select className="mt-1 w-full border rounded p-2" value={localidadId} onChange={e => setLocalidadId(e.target.value)} disabled={!zonaId}>
            <option value="">Todas</option>
            {localidades.map(l => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>
        <div className="max-h-48 overflow-auto border rounded p-2">
          <div className="text-sm font-medium text-gray-700 mb-2">Clientes de la zona</div>
          {clientesZona.length === 0 ? (
            <div className="text-sm text-gray-500">Sin clientes para esta selección</div>
          ) : (
            clientesZona.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-sm py-1">
                <input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleSeleccion(c.id)} />
                <span>{`${c.nombre || ''} ${c.apellido || ''}`.trim()} {c.telefono ? `- ${c.telefono}` : ''}</span>
              </label>
            ))
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
          <textarea className="mt-1 w-full border rounded p-2" rows={3} value={notas} onChange={e => setNotas(e.target.value)} />
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <Button color="secondary" onClick={guardarAsignacion} loading={guardando} disabled={!zonaId}>
            Guardar asignación
          </Button>
          <Button color="gray" onClick={onClose}>Cancelar</Button>
          <Button color="primary" onClick={iniciar} loading={loading} disabled={!zonaId || loading}>Iniciar</Button>
        </div>
        {FEATURES?.ASISTENTE_VENTAS_ENABLED && (
          <div className="pt-2">
            <AsistentePanel
              cliente={clientesZona.find(c => seleccionados.includes(c.id)) || {}}
              productosCatalogo={[]}
              onLogInteraccion={logInteraccion}
            />
          </div>
        )}
        <ZonasABMModal isOpen={zonasModalOpen} onClose={() => { setZonasModalOpen(false); preventaService.obtenerZonas().then(setZonas); }} />
      </div>
    </Modal>
  );
};

export default IniciarPreVentaModal;


