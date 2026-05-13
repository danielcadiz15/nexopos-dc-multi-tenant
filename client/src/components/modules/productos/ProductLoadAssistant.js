import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTimes,
  FaMagic,
  FaFileExcel,
  FaEdit,
  FaArrowRight,
  FaLayerGroup
} from 'react-icons/fa';

/**
 * Modal de entrada: elegir cómo cargar productos (asistente uno a uno, Excel o formulario clásico).
 */
export default function ProductLoadAssistant({ isOpen, onClose, onOpenImport }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-assistant-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/90">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 px-6 pb-8 pt-6 text-white">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <FaLayerGroup className="text-xl" aria-hidden />
              </div>
              <div>
                <h2 id="product-assistant-title" className="text-xl font-bold tracking-tight">
                  Asistente para cargar productos
                </h2>
                <p className="mt-1 text-sm text-white/85">
                  Elegí la forma que te resulte más cómoda. Siempre podés cambiar después.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-white/90 transition hover:bg-white/10"
              aria-label="Cerrar"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        <div className="space-y-3 bg-slate-50/90 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => go('/productos/nuevo?modo=asistente')}
            className="group flex w-full items-start gap-4 rounded-2xl border border-transparent bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:border-indigo-200 hover:shadow-md hover:ring-indigo-100"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <FaMagic className="text-lg" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                Cargar uno a uno, paso a paso
                <FaArrowRight className="text-xs text-indigo-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </span>
              <span className="mt-1 block text-sm leading-snug text-slate-600">
                Ideal para empezar: nombre, precios y detalles en pantallas cortas, sin abrumar.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenImport();
            }}
            className="group flex w-full items-start gap-4 rounded-2xl border border-transparent bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:border-emerald-200 hover:shadow-md hover:ring-emerald-100"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <FaFileExcel className="text-lg" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                Importar desde Excel
                <FaArrowRight className="text-xs text-emerald-600 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </span>
              <span className="mt-1 block text-sm leading-snug text-slate-600">
                Si ya tenés una lista en planilla, el mismo asistente visual que revisa filas y sucursal.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => go('/productos/nuevo')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FaEdit className="text-slate-500" aria-hidden />
            Formulario completo (vista clásica)
          </button>
        </div>
      </div>
    </div>
  );
}
