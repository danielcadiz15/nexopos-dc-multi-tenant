/**
 * Alta mínima de producto desde el flujo de compra (sin salir de la pantalla).
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes, FaBoxOpen } from 'react-icons/fa';
import Button from '../common/Button';

export default function CompraProductoRapidoModal({
  open,
  onClose,
  onCreated,
  proveedorId,
  nombreInicial = '',
  precioCostoInicial = ''
}) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre((nombreInicial || '').trim());
    const sug = precioCostoInicial !== '' && precioCostoInicial != null
      ? String(precioCostoInicial)
      : '';
    setPrecioCosto(sug);
    const pv = sug ? (parseFloat(sug) * 1.25).toFixed(2) : '';
    setPrecioVenta(pv);
    setCodigoBarras('');
    setCategoriaId('');
    setCodigo(`NP-${Date.now().toString(36).toUpperCase()}`);
  }, [open, nombreInicial, precioCostoInicial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return;
      try {
        const mod = await import('../../services/categorias.service');
        const list = await mod.default.obtenerTodos().catch(() => mod.default.obtenerTodas?.() || []);
        if (!cancelled) setCategorias(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCategorias([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handlePrecioCostoChange = (v) => {
    setPrecioCosto(v);
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= 0) {
      setPrecioVenta((n * 1.25).toFixed(2));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compra-alta-rapida-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-indigo-500/10 ring-1 ring-black/5"
      >
        <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <FaBoxOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 id="compra-alta-rapida-title" className="text-lg font-semibold tracking-tight">
                  Producto nuevo
                </h2>
                <p className="text-sm text-white/85">
                  Lo cargamos en el catálogo y lo sumamos a esta compra.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/90 transition hover:bg-white/15"
              aria-label="Cerrar"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nombre *</label>
            <input
              className="nexo-field w-full"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Yerba mate 500 g"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Código interno</label>
              <input
                className="nexo-field w-full font-mono text-sm"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Código de barras</label>
              <input
                className="nexo-field w-full font-mono text-sm"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Categoría</label>
            <select
              className="nexo-field w-full"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre || c.id}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Precio costo *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="nexo-field w-full text-center"
                value={precioCosto}
                onChange={(e) => handlePrecioCostoChange(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Precio venta *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="nexo-field w-full text-center"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            El precio de venta se sugiere con un 25 % sobre el costo; podés ajustarlo. Después podés{' '}
            <Link
              to="/productos"
              className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
              onClick={onClose}
            >
              completar la ficha
            </Link>{' '}
            desde Productos.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <Button type="button" color="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            color="primary"
            loading={guardando}
            onClick={async () => {
              if (!proveedorId) return;
              const n = (nombre || '').trim();
              const pc = parseFloat(precioCosto);
              const pv = parseFloat(precioVenta);
              if (!n) return;
              if (Number.isNaN(pc) || pc <= 0) return;
              if (Number.isNaN(pv) || pv <= 0) return;
              setGuardando(true);
              try {
                await onCreated({
                  nombre: n,
                  codigo: (codigo || '').trim(),
                  codigo_barras: (codigoBarras || '').trim(),
                  categoria_id: categoriaId || '',
                  proveedor_id: proveedorId,
                  precio_costo: pc,
                  precio_venta: pv,
                  stock_minimo: 5,
                  activo: true
                });
              } catch {
                /* toast en el padre */
              } finally {
                setGuardando(false);
              }
            }}
          >
            Crear y usar en la compra
          </Button>
        </div>
      </div>
    </div>
  );
}
