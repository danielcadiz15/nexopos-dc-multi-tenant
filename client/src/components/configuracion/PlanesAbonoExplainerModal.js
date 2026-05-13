import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaCheck,
  FaLayerGroup,
  FaBolt,
  FaGem,
  FaStore,
  FaInfoCircle
} from 'react-icons/fa';
import {
  MODULE_KEYS,
  MODULE_LABELS_ES,
  getModulePresetForPlan,
  PLAN_DEEP_COPY_ES,
  PLAN_IDS,
  countEnabledModules,
  planLabel
} from '../../utils/planDetails';

const tierStyle = {
  basic: {
    pill: 'from-sky-500 to-cyan-600',
    ring: 'ring-sky-400/40',
    dot: 'bg-sky-500',
    icon: FaStore
  },
  intermediate: {
    pill: 'from-violet-600 to-indigo-700',
    ring: 'ring-violet-400/40',
    dot: 'bg-violet-600',
    icon: FaBolt
  },
  premium: {
    pill: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-400/50',
    dot: 'bg-amber-500',
    icon: FaGem
  }
};

/**
 * Modal instructivo: comparativa de abonos Básica / Intermedia / Premium con módulos y ventajas.
 */
export default function PlanesAbonoExplainerModal({ open, onClose, initialPlan = 'intermediate' }) {
  const [tab, setTab] = useState(initialPlan);

  useEffect(() => {
    if (open) setTab(initialPlan);
  }, [open, initialPlan]);

  if (!open) return null;

  const preset = getModulePresetForPlan(tab);
  const copy = PLAN_DEEP_COPY_ES[tab];
  const enabledCount = countEnabledModules(preset);
  const styles = tierStyle[tab];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planes-abono-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="relative flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div
          className={`relative shrink-0 bg-gradient-to-br px-5 pb-8 pt-6 text-white sm:px-8 sm:pb-10 sm:pt-8 ${styles.pill}`}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/30">
                <FaLayerGroup className="text-xl" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Tipos de abono</p>
                <h2 id="planes-abono-title" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Elegí con criterio
                </h2>
                <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
                  Cada plan activa un conjunto de módulos en tu empresa. Acá ves qué entra en cada uno y para qué sirve.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2.5 text-white ring-1 ring-white/25 transition hover:bg-white/20"
              aria-label="Cerrar"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="relative mt-6 flex gap-2 overflow-x-auto pb-1 sm:mt-8">
            {PLAN_IDS.map((id) => {
              const active = tab === id;
              const Icon = tierStyle[id].icon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    'flex min-w-[8.5rem] shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition',
                    active
                      ? 'bg-white text-indigo-900 shadow-lg'
                      : 'bg-white/15 text-white/90 ring-1 ring-white/20 hover:bg-white/25'
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  <span className="leading-tight">{planLabel(id)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
          <div className={`rounded-2xl border border-slate-100 bg-slate-50/80 p-4 ring-1 ${styles.ring} sm:p-5`}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${styles.dot}`}
                aria-hidden
              />
              <h3 className="text-lg font-bold text-slate-900">{planLabel(tab)}</h3>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {enabledCount} módulos activos
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-indigo-700">{copy.tagline}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.pitch}</p>

            <ul className="mt-4 space-y-2.5">
              {copy.advantages.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <FaCheck className="h-3 w-3" />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-sm text-indigo-950">
              <FaInfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>{copy.highlight}</span>
            </div>
          </div>

          <h4 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-500">
            Módulos según este plan
          </h4>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODULE_KEYS.map((key) => {
              const on = !!preset[key];
              return (
                <div
                  key={key}
                  className={[
                    'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition',
                    on
                      ? 'border-emerald-200 bg-emerald-50/50 text-slate-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                      on ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                    ].join(' ')}
                  >
                    {on ? <FaCheck className="h-3.5 w-3.5" /> : <FaTimes className="h-3.5 w-3.5" />}
                  </span>
                  <span className={on ? 'font-medium' : ''}>{MODULE_LABELS_ES[key] || key}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-slate-800">Kit inicial:</strong> las empresas nuevas pagan dos cuotas fijas de{' '}
            <strong>$250.000</strong> y reciben <strong>todos los módulos</strong> durante esa etapa. Desde el tercer pago,
            el sistema cobra y aplica el plan elegido: Básica, Intermedia o Premium.
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 sm:w-auto sm:min-w-[140px]"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
