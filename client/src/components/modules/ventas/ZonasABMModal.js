// src/components/modules/ventas/ZonasABMModal.js
import React, { useEffect, useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import preventaService from '../../../services/preventa.service';
import clientesService from '../../../services/clientes.service';

const ZonasABMModal = ({ isOpen, onClose }) => {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevaZona, setNuevaZona] = useState('');
  const [editando, setEditando] = useState({}); // { [id]: nombre }
  const [zonaSeleccionadaId, setZonaSeleccionadaId] = useState('');
  const [zonaSeleccionadaNombre, setZonaSeleccionadaNombre] = useState('');
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const z = await preventaService.obtenerZonas();
      setZonas(Array.isArray(z) ? z : []);
    } catch (e) {
      console.error('Error cargando zonas:', e);
      setZonas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    cargar();
    // Reset selección al abrir
    setZonaSeleccionadaId('');
    setZonaSeleccionadaNombre('');
    setClientes([]);
    setSeleccionados([]);
    setFiltro('');
  }, [isOpen]);

  const crear = async () => {
    if (!nuevaZona.trim()) return;
    try {
      setLoading(true);
      const creada = await preventaService.crearZona({ nombre: nuevaZona.trim() });
      const nombre = creada?.nombre || nuevaZona.trim();
      setNuevaZona('');
      // Recargar desde backend y seleccionar
      const lista = await preventaService.obtenerZonas();
      setZonas(Array.isArray(lista) ? lista : []);
      let nuevaId = creada?.id;
      if (!nuevaId && Array.isArray(lista)) {
        const encontrada = lista.find(z => (z.nombre || '').toLowerCase() === nombre.toLowerCase());
        if (encontrada) nuevaId = encontrada.id;
      }
      if (nuevaId) {
        await seleccionarZona(nuevaId, nombre);
      } else {
        // Fallback: permitir asignar clientes aunque no tengamos ID aún
        console.warn('No se obtuvo ID de zona del backend. Habilitando asignación en modo local.');
        setZonaSeleccionadaId('temp');
        setZonaSeleccionadaNombre(nombre);
        await cargarClientes();
        setSeleccionados([]);
      }
    } catch (e) {
      console.error('Error creando zona:', e);
    } finally {
      setLoading(false);
    }
  };

  const guardarNombre = async (id) => {
    const nombre = (editando[id] ?? '').trim();
    if (!id || !nombre) return;
    try {
      setLoading(true);
      await preventaService.actualizarZona(id, { nombre });
      setEditando(prev => ({ ...prev, [id]: undefined }));
      await cargar();
      if (zonaSeleccionadaId === id) setZonaSeleccionadaNombre(nombre);
    } catch (e) {
      console.error('Error actualizando zona:', e);
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar esta zona?')) return;
    try {
      setLoading(true);
      await preventaService.eliminarZona(id);
      await cargar();
      if (zonaSeleccionadaId === id) {
        setZonaSeleccionadaId('');
        setZonaSeleccionadaNombre('');
        setClientes([]);
        setSeleccionados([]);
      }
    } catch (e) {
      console.error('Error eliminando zona:', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      setCargandoClientes(true);
      const lista = await clientesService.obtenerTodos();
      setClientes(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error('Error cargando clientes:', e);
      setClientes([]);
    } finally {
      setCargandoClientes(false);
    }
  };

  const seleccionarZona = async (id, nombre) => {
    setZonaSeleccionadaId(id);
    setZonaSeleccionadaNombre(nombre || (zonas.find(z => z.id === id)?.nombre) || '');
    // Cargar clientes siempre para tener lista actualizada
    await cargarClientes();
    // Preselección persistida
    const pre = await preventaService.obtenerAsignacionZona(id, null);
    setSeleccionados(Array.isArray(pre) ? pre : []);
  };

  const toggleCliente = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const guardarAsignacion = async () => {
    if (!zonaSeleccionadaId) return;
    try {
      setLoading(true);
      const ok = await preventaService.guardarAsignacionZona(zonaSeleccionadaId, { localidad_id: null, clients_ids: seleccionados });
      if (!ok) throw new Error('No se pudo guardar la asignación');
    } catch (e) {
      console.error('Error guardando asignación de zona:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Administrar Zonas">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded p-2"
            placeholder="Nombre de zona"
            value={nuevaZona}
            onChange={e => setNuevaZona(e.target.value)}
          />
          <Button color="primary" onClick={crear} loading={loading} disabled={!nuevaZona.trim()}>Crear</Button>
        </div>

        <div className="border rounded max-h-64 overflow-auto">
          {loading ? (
            <div className="p-3 text-sm text-gray-600">Cargando...</div>
          ) : zonas.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Sin zonas</div>
          ) : (
            zonas.map(z => (
              <div key={z.id} className={`flex items-center gap-2 p-2 border-b last:border-b-0 ${zonaSeleccionadaId === z.id ? 'bg-sky-50' : ''}`}>
                <input type="radio" name="zona-sel" checked={zonaSeleccionadaId === z.id} onChange={() => seleccionarZona(z.id, z.nombre)} />
                <input
                  className="flex-1 border rounded p-2"
                  value={editando[z.id] ?? z.nombre ?? ''}
                  onChange={e => setEditando(prev => ({ ...prev, [z.id]: e.target.value }))}
                />
                <Button size="sm" color="primary" onClick={() => guardarNombre(z.id)} disabled={!((editando[z.id] ?? z.nombre ?? '').trim())}>Guardar</Button>
                <Button size="sm" color="danger" onClick={() => eliminar(z.id)}>Eliminar</Button>
              </div>
            ))
          )}
        </div>

        {/* Asignación de clientes a la zona seleccionada */}
        {zonaSeleccionadaId && (
          <div className="mt-3 border rounded p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-800">Asignar clientes a: {zonaSeleccionadaNombre}</div>
              <div className="flex items-center gap-2">
                <input
                  className="border rounded p-1 text-sm"
                  placeholder="Buscar cliente..."
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                />
                <Button size="sm" color="secondary" onClick={cargarClientes} loading={cargandoClientes}>Recargar</Button>
              </div>
            </div>
            <div className="max-h-56 overflow-auto border rounded">
              {cargandoClientes ? (
                <div className="p-2 text-sm text-gray-600">Cargando clientes...</div>
              ) : clientes.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">Sin clientes</div>
              ) : (
                clientes
                  .filter(c => {
                    const term = filtro.trim().toLowerCase();
                    if (!term) return true;
                    const nombre = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
                    return nombre.includes(term) || (c.telefono || '').includes(term);
                  })
                  .map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm p-2 border-b last:border-b-0">
                      <input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleCliente(c.id)} />
                      <span>{`${c.nombre || ''} ${c.apellido || ''}`.trim()} {c.telefono ? `- ${c.telefono}` : ''}</span>
                    </label>
                  ))
              )}
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" color="primary" onClick={guardarAsignacion} loading={loading}>Guardar asignación</Button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button color="gray" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ZonasABMModal;


