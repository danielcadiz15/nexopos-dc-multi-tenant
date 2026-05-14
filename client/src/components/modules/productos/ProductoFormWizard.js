import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaMagic, FaSpinner } from 'react-icons/fa';
import Button from '../../common/Button';

const STEPS = [
  { id: 1, label: 'Nombre', hint: 'Identificación' },
  { id: 2, label: 'Precios', hint: 'Costo y venta' },
  { id: 3, label: 'Detalles', hint: 'Categoría y más' },
  { id: 4, label: 'Confirmar', hint: 'Guardar' }
];

const fieldClass =
  'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

/**
 * Asistente de pasos para crear un producto (solo alta): incluye precio de costo, venta y margen manual / por %.
 */
export default function ProductoFormWizard({
  wizardStep,
  avanzarWizard,
  retrocederWizard,
  formData,
  producto,
  handleChange,
  categorias = [],
  proveedores,
  modoCalculo,
  setModoCalculo,
  margenGanancia,
  handlePrecioChange,
  handleMargenChange,
  sugerencia,
  pricingSuggestionConfig,
  onPricingSuggestionConfigChange,
  onAplicarPrecioSugerido,
  canUsePricingSuggestion = false,
  guardarProducto,
  submitting,
  navigate,
  onCodigoBlur,
  barcodeLookupLoading = false
}) {
  const pct = wizardStep <= 4 ? Math.round((wizardStep / 4) * 100) : 100;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/90">
      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 px-5 pb-8 pt-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <FaMagic className="text-lg" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nuevo producto</h1>
              <p className="mt-0.5 text-sm text-white/85">Paso a paso. Siempre podés volver atrás.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/productos')}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/25 transition hover:bg-white/20"
          >
            <FaArrowLeft />
            Salir
          </button>
        </div>

        <div className="relative mt-6 flex justify-between gap-1 sm:gap-2">
          {STEPS.map((s, i) => {
            const active = wizardStep === s.id;
            const done = wizardStep > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <div
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm',
                      done
                        ? 'bg-emerald-400 text-emerald-950 shadow-md'
                        : active
                          ? 'bg-white text-indigo-700 shadow-lg ring-2 ring-white/50'
                          : 'bg-white/15 text-white/65 ring-1 ring-white/20'
                    ].join(' ')}
                  >
                    {done ? <FaCheck className="text-xs" /> : s.id}
                  </div>
                  <p
                    className={`mt-1.5 truncate text-[11px] font-semibold sm:text-xs ${active || done ? 'text-white' : 'text-white/50'}`}
                  >
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mb-6 hidden w-2 shrink-0 rounded-full bg-white/20 sm:block md:w-6" aria-hidden />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="min-h-[280px] bg-slate-50/90 px-5 py-6 sm:px-8 sm:py-8">
        {wizardStep === 1 && (
          <div className="mx-auto max-w-md space-y-5 animate-[wizIn_0.25s_ease-out]">
            <style>{`@keyframes wizIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none;} }`}</style>
            <div>
              <label className="text-sm font-semibold text-slate-800">Nombre del producto *</label>
              <input
                type="text"
                name="nombre"
                value={producto.nombre}
                onChange={handleChange}
                className={fieldClass}
                placeholder="Ej: Yerba mate 500 g"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">Código (opcional)</label>
              <input
                type="text"
                name="codigo"
                value={producto.codigo}
                onChange={handleChange}
                onBlur={typeof onCodigoBlur === 'function' ? onCodigoBlur : undefined}
                className={fieldClass}
                placeholder="Si lo dejás vacío, lo generamos nosotros"
                autoComplete="off"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Con 8–14 dígitos: buscamos en Firebase, catálogo comunitario NexoPOS, caché, Open Food Facts y UPCitemdb. Si hay
                datos, se puede crear el producto al salir del campo; los precios los cargás en el paso siguiente o en la ficha
                completa.
              </p>
              {barcodeLookupLoading && (
                <p className="mt-1 text-xs font-medium text-indigo-600">Buscando código…</p>
              )}
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="mx-auto max-w-lg space-y-4 animate-[wizIn_0.25s_ease-out]">
            <style>{`@keyframes wizIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none;} }`}</style>
            {canUsePricingSuggestion && (
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-indigo-900">Precio sugerido inteligente</p>
                <p className="mt-1 text-xs text-indigo-800">
                  Distribuye gastos mensuales por unidad y aplica margen objetivo sobre costo total.
                </p>
              </div>
            )}
            <p className="text-sm text-slate-600">
              Costo y venta. Podés igualar margen manualmente o establecer el % sobre el costo.
            </p>
            <div>
              <label className="text-sm font-semibold text-slate-800">Precio de costo *</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                <input
                  type="number"
                  name="precio_costo"
                  value={producto.precio_costo}
                  onChange={handlePrecioChange}
                  className={`${fieldClass} pl-8`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800">Modo de cálculo</span>
              <div className="mt-2 flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="modoCalculoWiz"
                    checked={modoCalculo === 'manual'}
                    onChange={() => setModoCalculo('manual')}
                    className="text-indigo-600"
                  />
                  Manual
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="modoCalculoWiz"
                    checked={modoCalculo === 'porcentaje'}
                    onChange={() => setModoCalculo('porcentaje')}
                    className="text-indigo-600"
                  />
                  Por margen %
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">Precio de venta *</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                <input
                  type="number"
                  name="precio_venta"
                  value={producto.precio_venta}
                  onChange={handlePrecioChange}
                  readOnly={modoCalculo === 'porcentaje'}
                  className={`${fieldClass} pl-8 ${modoCalculo === 'porcentaje' ? 'bg-slate-100' : ''}`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              {canUsePricingSuggestion && sugerencia?.canSuggest && (
                <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                  <p>
                    Sugerido: <strong>${sugerencia.suggestedPrice.toFixed(2)}</strong>
                    {' · '}Costo total unitario: ${sugerencia.costoTotalUnitario.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={onAplicarPrecioSugerido}
                    className="mt-2 rounded-md border border-indigo-300 bg-white px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Usar sugerido
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">Margen de ganancia (%)</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  value={margenGanancia}
                  onChange={handleMargenChange}
                  readOnly={modoCalculo === 'manual'}
                  className={`${fieldClass} pr-10 ${modoCalculo === 'manual' ? 'bg-slate-100' : ''}`}
                  step="0.01"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Las tres listas de precio se igualan al precio de venta hasta que las edites en{' '}
              <Link to="/productos/precios" className="font-medium text-indigo-600 hover:underline">
                Gestión de precios
              </Link>
              .
            </p>
            {canUsePricingSuggestion && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-700">Sugerencia por gastos mensuales</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    Alquiler
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricingSuggestionConfig?.alquilerMensual ?? ''}
                      onChange={(e) => onPricingSuggestionConfigChange('alquilerMensual', e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Móvil
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricingSuggestionConfig?.movilMensual ?? ''}
                      onChange={(e) => onPricingSuggestionConfigChange('movilMensual', e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Combustible
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricingSuggestionConfig?.combustibleMensual ?? ''}
                      onChange={(e) => onPricingSuggestionConfigChange('combustibleMensual', e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Otros
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricingSuggestionConfig?.otrosGastosMensuales ?? ''}
                      onChange={(e) => onPricingSuggestionConfigChange('otrosGastosMensuales', e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Unidades/mes
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={pricingSuggestionConfig?.unidadesMensualesEstimadas ?? ''}
                      onChange={(e) =>
                        onPricingSuggestionConfigChange('unidadesMensualesEstimadas', e.target.value)
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Margen objetivo (%)
                    <input
                      type="number"
                      min="0"
                      max="99"
                      step="0.1"
                      value={pricingSuggestionConfig?.margenObjetivoPct ?? ''}
                      onChange={(e) => onPricingSuggestionConfigChange('margenObjetivoPct', e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Gastos mensuales: ${sugerencia?.gastosMensuales?.toFixed?.(2) || '0.00'} · gasto por unidad: $
                  {sugerencia?.gastoPorUnidad?.toFixed?.(2) || '0.00'}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Fórmula: <strong>Precio sugerido = (Costo + Gastos/Unidades) / (1 - Margen%)</strong>
                </p>
                {sugerencia?.warnings?.margenAjustado && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    Margen ajustado automáticamente al rango 0-95%.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {wizardStep === 3 && (
          <div className="mx-auto max-w-lg space-y-4 animate-[wizIn_0.25s_ease-out]">
            <style>{`@keyframes wizIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none;} }`}</style>
            <p className="text-sm text-slate-600">Opcional: podés completarlo después en la ficha del producto.</p>
            <div>
              <label className="text-sm font-semibold text-slate-800">Descripción</label>
              <textarea
                name="descripcion"
                value={producto.descripcion}
                onChange={handleChange}
                rows={3}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">Categoría</label>
              <select name="categoria_id" value={producto.categoria_id} onChange={handleChange} className={fieldClass}>
                <option value="">Seleccionar categoría</option>
                {(categorias || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">Creá nuevas desde Productos → Categorías.</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">Proveedor</label>
              <select name="proveedor_id" value={producto.proveedor_id} onChange={handleChange} className={fieldClass}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">Stock mínimo</label>
              <input
                type="number"
                name="stock_minimo"
                value={producto.stock_minimo}
                onChange={handleChange}
                className={fieldClass}
                min="0"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <input
                type="checkbox"
                name="activo"
                checked={producto.activo}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-800">Producto activo</span>
            </label>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="mx-auto max-w-md animate-[wizIn_0.25s_ease-out]">
            <style>{`@keyframes wizIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none;} }`}</style>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumen</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Nombre</dt>
                  <dd className="text-right font-medium text-slate-900">{formData.nombre || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Código</dt>
                  <dd className="font-mono text-xs font-medium text-slate-800 text-right">{formData.codigo || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Costo / venta</dt>
                  <dd className="text-right text-slate-700">
                    ${parseFloat(formData.precio_costo) || 0} / ${parseFloat(formData.precio_venta) || 0}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Listas</dt>
                  <dd className="text-right text-slate-700">Inician igual al precio de venta</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Activo</dt>
                  <dd className="font-medium text-slate-900">{formData.activo ? 'Sí' : 'No'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
        {wizardStep > 1 && (
          <Button color="secondary" type="button" onClick={retrocederWizard} disabled={submitting} icon={<FaArrowLeft />}>
            Atrás
          </Button>
        )}
        {wizardStep < 4 && (
          <Button color="primary" type="button" onClick={avanzarWizard} disabled={submitting}>
            Continuar
          </Button>
        )}
        {wizardStep === 4 && (
          <Button
            color="primary"
            type="button"
            onClick={() => guardarProducto()}
            disabled={submitting}
            icon={submitting ? <FaSpinner className="animate-spin" /> : <FaCheck />}
          >
            {submitting ? 'Guardando…' : 'Guardar producto'}
          </Button>
        )}
      </div>
    </div>
  );
}
