/**
 * Gestión de sucursales: alta, edición, activación y baja (según permisos).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaStore,
  FaPlus,
  FaEdit,
  FaTrash,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUser,
  FaStar,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

import sucursalesService from '../../services/sucursales.service';
import { useAuth } from '../../contexts/AuthContext';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const emptyForm = () => ({
  nombre: '',
  direccion: '',
  telefono: '',
  email: '',
  responsable: '',
  observaciones: '',
  activa: true,
  tipo: 'secundaria'
});

function esPrincipal(s) {
  return s?.tipo === 'principal' || s?.es_principal === true;
}

export default function Sucursales() {
  const { hasPermission } = useAuth();
  const puedeVer = hasPermission('sucursales', 'ver');
  const puedeCrear = hasPermission('sucursales', 'crear');
  const puedeEditar = hasPermission('sucursales', 'editar');
  const puedeEliminar = hasPermission('sucursales', 'eliminar');

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const [eliminarId, setEliminarId] = useState(null);
  const [eliminarNombre, setEliminarNombre] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sucursalesService.obtenerTodas();
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a, b) => {
        if (esPrincipal(a) && !esPrincipal(b)) return -1;
        if (!esPrincipal(a) && esPrincipal(b)) return 1;
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
      });
      setLista(arr);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las sucursales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const abrirEditar = (s) => {
    setEditing(s);
    setForm({
      nombre: s.nombre || '',
      direccion: s.direccion || '',
      telefono: s.telefono || '',
      email: s.email || '',
      responsable: s.responsable || '',
      observaciones: s.observaciones || '',
      activa: s.activa !== false,
      tipo: esPrincipal(s) ? 'principal' : s.tipo || 'secundaria'
    });
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const nombre = String(form.nombre || '').trim();
    if (!nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      setGuardando(true);
      const payload = {
        nombre,
        direccion: String(form.direccion || '').trim(),
        telefono: String(form.telefono || '').trim(),
        email: String(form.email || '').trim(),
        responsable: String(form.responsable || '').trim(),
        observaciones: String(form.observaciones || '').trim(),
        activa: form.activa !== false
      };
      if (editing) {
        if (!esPrincipal(editing)) {
          payload.tipo = form.tipo === 'principal' ? 'secundaria' : form.tipo || 'secundaria';
        } else {
          payload.activa = true;
        }
        await sucursalesService.actualizar(editing.id, payload);
        toast.success('Sucursal actualizada');
      } else {
        payload.tipo = 'secundaria';
        await sucursalesService.crear(payload);
        toast.success('Sucursal creada');
      }
      cerrarModal();
      cargar();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminarId) return;
    try {
      await sucursalesService.eliminar(eliminarId);
      toast.success('Sucursal eliminada');
      setEliminarId(null);
      setEliminarNombre('');
      cargar();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo eliminar (¿stock o sucursal principal?)';
      toast.error(msg);
    }
  };

  const columns = [
    {
      header: 'Sucursal',
      accessor: 'nombre',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <FaStore className="text-indigo-500 shrink-0" />
          <div>
            <div className="font-medium text-gray-900">{row.nombre}</div>
            {esPrincipal(row) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                <FaStar className="h-3 w-3" /> Principal
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Ubicación / contacto',
      accessor: 'contacto',
      cell: (row) => (
        <div className="text-sm text-gray-700 space-y-0.5">
          {row.direccion ? (
            <div className="flex items-start gap-1.5">
              <FaMapMarkerAlt className="mt-0.5 shrink-0 text-gray-400" />
              <span>{row.direccion}</span>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
          {row.telefono ? (
            <div className="flex items-center gap-1.5 text-gray-600">
              <FaPhone className="shrink-0 text-gray-400" />
              {row.telefono}
            </div>
          ) : null}
          {row.email ? (
            <div className="flex items-center gap-1.5 text-gray-600">
              <FaEnvelope className="shrink-0 text-gray-400" />
              {row.email}
            </div>
          ) : null}
        </div>
      )
    },
    {
      header: 'Responsable',
      accessor: 'responsable',
      cell: (row) =>
        row.responsable ? (
          <span className="flex items-center gap-1.5 text-sm">
            <FaUser className="text-gray-400" />
            {row.responsable}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )
    },
    {
      header: 'Estado',
      accessor: 'activa',
      cell: (row) =>
        row.activa !== false ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
            <FaCheckCircle /> Activa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
            <FaTimesCircle /> Inactiva
          </span>
        )
    },
    {
      header: 'Acciones',
      accessor: 'acciones',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <button
              type="button"
              title="Editar"
              className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
              onClick={() => abrirEditar(row)}
            >
              <FaEdit />
            </button>
          )}
          {puedeEliminar && !esPrincipal(row) && (
            <button
              type="button"
              title="Eliminar"
              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
              onClick={() => {
                setEliminarId(row.id);
                setEliminarNombre(row.nombre || '');
              }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      )
    }
  ];

  if (!puedeVer) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        No tenés permiso para ver sucursales. Pedí acceso al administrador.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaStore className="text-indigo-600" />
            Sucursales
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Administrá los locales donde opera tu empresa. La sucursal principal no se puede eliminar. Solo podés borrar
            sucursales sin stock positivo.
          </p>
        </div>
        {puedeCrear && (
          <Button color="primary" icon={<FaPlus />} onClick={abrirNuevo}>
            Nueva sucursal
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : lista.length === 0 ? (
          <p className="text-center text-gray-600 py-10">
            No hay sucursales cargadas. {puedeCrear ? 'Creá la primera con el botón de arriba.' : ''}
          </p>
        ) : (
          <Table columns={columns} data={lista} />
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div
            className="absolute inset-0"
            role="presentation"
            onClick={guardando ? undefined : cerrarModal}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? 'Editar sucursal' : 'Nueva sucursal'}
              </h2>
            </div>
            <form onSubmit={handleGuardar} className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  className="nexo-field"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  className="nexo-field"
                  value={form.direccion}
                  onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    className="nexo-field"
                    value={form.telefono}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="nexo-field"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                <input
                  className="nexo-field"
                  value={form.responsable}
                  onChange={(e) => setForm((p) => ({ ...p, responsable: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  className="nexo-field"
                  rows={2}
                  value={form.observaciones}
                  onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                />
              </div>
              {!editing || !esPrincipal(editing) ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    className="nexo-field"
                    value={form.tipo}
                    onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                  >
                    <option value="secundaria">Secundaria / depósito</option>
                    <option value="movil">Móvil</option>
                  </select>
                </div>
              ) : null}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))}
                  disabled={!!editing && esPrincipal(editing)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-800">Sucursal activa</span>
              </label>
              {editing && esPrincipal(editing) && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  La sucursal principal permanece siempre activa en el sistema.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!eliminarId}
        title="Eliminar sucursal"
        message={
          <>
            ¿Eliminar <strong>{eliminarNombre}</strong>? No debe tener stock ni ser la sucursal principal.
          </>
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmColor="danger"
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setEliminarId(null);
          setEliminarNombre('');
        }}
      />
    </div>
  );
}
