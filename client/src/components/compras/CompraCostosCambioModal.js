/**
 * Post-recepción: variaciones de precio de costo vs último registrado en ficha.
 */

import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowUp, FaArrowDown, FaTags } from 'react-icons/fa';
import Button from '../common/Button';

export default function CompraCostosCambioModal({
  open,
  onClose,
  cambios = [],
  onApply,
  applying = false
}) {
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (!open || !cambios.length) return;
    setSelected(new Set(cambios.map((c) => c.producto_id)));
  }, [open, cambios]);

  if (!open || !cambios.length) return null;

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (on) => {
    setSelected(on ? new Set(cambios.map((c) => c.producto_id)) : new Set());
  };

  const fmt = (n) =>
    typeof n === 'number'
      ? `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-violet-500/10 ring-1 ring-black/5">
        <div className="relative shrink-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <FaTags className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Costos que cambiaron</h2>
                <p className="text-sm text-white/85">
                  Comparado con el precio de costo actual en cada producto. Marcá cuáles querés actualizar.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-medium text-indigo-600 hover:bg-indigo-50"
              onClick={() => toggleAll(true)}
            >
              Marcar todos
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100"
              onClick={() => toggleAll(false)}
            >
              Desmarcar todos
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Antes</th>
                  <th className="px-3 py-2 text-right">Esta compra</th>
                  <th className="px-3 py-2 text-center">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cambios.map((c) => (
                  <tr key={c.producto_id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.producto_id)}
                        onChange={() => toggle(c.producto_id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                    </td>
                    <td className="max-w-[200px] px-3 py-2">
                      <div className="truncate font-medium text-slate-900">{c.nombre || '—'}</div>
                      <div className="truncate font-mono text-xs text-slate-500">{c.codigo}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {fmt(c.precio_costo_anterior)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                      {fmt(c.precio_compra_unitario)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.direccion === 'subio' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                          <FaArrowUp className="h-3 w-3" />
                          {c.variacion_pct != null ? `+${c.variacion_pct.toFixed(1)} %` : 'Sube'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          <FaArrowDown className="h-3 w-3" />
                          {c.variacion_pct != null ? `${c.variacion_pct.toFixed(1)} %` : 'Baja'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
          <Button type="button" color="secondary" onClick={onClose}>
            Ahora no
          </Button>
          <Button
            type="button"
            color="primary"
            loading={applying}
            disabled={selected.size === 0}
            onClick={() => onApply(Array.from(selected))}
          >
            Actualizar fichas ({selected.size})
          </Button>
        </div>
      </div>
    </div>
  );
}
