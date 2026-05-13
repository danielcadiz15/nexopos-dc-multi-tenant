// src/components/modules/productos/ImportarExcel.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

import productosService from '../../../services/productos.service';
import sucursalesService from '../../../services/sucursales.service';

import Button from '../../common/Button';
import Spinner from '../../common/Spinner';

import {
  FaFileExcel,
  FaUpload,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaStore,
  FaBoxes,
  FaEye,
  FaCheckCircle,
  FaArrowLeft,
  FaCloudUploadAlt,
  FaMagic
} from 'react-icons/fa';

const STEPS = [
  { id: 1, label: 'Archivo', hint: 'Subí tu Excel' },
  { id: 2, label: 'Revisión', hint: 'Sucursal y datos' },
  { id: 3, label: 'Listo', hint: 'Importando' }
];

/**
 * Wizard moderno para importar productos desde Excel (.xlsx / .xls).
 */
const ImportarExcel = ({ isOpen, onClose, onImportSuccess }) => {
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [datosPreview, setDatosPreview] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [validacion, setValidacion] = useState({
    validos: 0,
    duplicados: 0,
    preciosInvalidos: 0,
    existentes: 0,
    errors: []
  });
  const [paso, setPaso] = useState(1);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarSucursales();
    }
  }, [isOpen]);

  const cargarSucursales = async () => {
    try {
      const data = await sucursalesService.obtenerActivas();
      setSucursales(data);
      if (data.length > 0) {
        setSucursalSeleccionada(data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
      toast.error('Error al cargar sucursales');
    }
  };

  const validarDatos = async (productos) => {
    try {
      const errors = [];
      let validos = 0;
      let duplicados = 0;
      let preciosInvalidos = 0;
      let existentes = 0;

      const productosExistentes = await productosService.obtenerTodos();
      const codigosExistentes = productosExistentes.map((p) => p.codigo?.toLowerCase());
      const nombresExistentes = productosExistentes.map((p) => p.nombre?.toLowerCase());

      const codigosEnArchivo = [];
      const nombresEnArchivo = [];

      productos.forEach((producto) => {
        const erroresProducto = [];

        if (!producto.nombre) {
          erroresProducto.push('Nombre es obligatorio');
        }

        if (producto.precio_costo < 0) {
          erroresProducto.push('Precio de costo debe ser positivo');
          preciosInvalidos++;
        }

        if (producto.precio_venta <= 0) {
          erroresProducto.push('Precio de venta debe ser mayor a 0');
          preciosInvalidos++;
        }

        if (codigosEnArchivo.includes(producto.codigo.toLowerCase())) {
          erroresProducto.push('Código duplicado en archivo');
          duplicados++;
        } else {
          codigosEnArchivo.push(producto.codigo.toLowerCase());
        }

        if (nombresEnArchivo.includes(producto.nombre.toLowerCase())) {
          erroresProducto.push('Nombre duplicado en archivo');
          duplicados++;
        } else {
          nombresEnArchivo.push(producto.nombre.toLowerCase());
        }

        if (
          codigosExistentes.includes(producto.codigo.toLowerCase()) ||
          nombresExistentes.includes(producto.nombre.toLowerCase())
        ) {
          erroresProducto.push('Producto ya existe (se saltará)');
          existentes++;
        }

        if (erroresProducto.length === 0) {
          validos++;
        } else {
          errors.push({
            fila: producto.fila,
            producto: producto.nombre || 'Sin nombre',
            errores: erroresProducto
          });
        }
      });

      setValidacion({
        validos,
        duplicados,
        preciosInvalidos,
        existentes,
        errors
      });
    } catch (error) {
      console.error('Error en validación:', error);
      toast.error('Error al validar datos');
    }
  };

  const procesarArchivo = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      toast.error('Usá un archivo Excel (.xlsx o .xls)');
      return;
    }

    try {
      setProcesando(true);
      setArchivo(file);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const filasDatos = jsonData.slice(1).filter((row) => row[0] || row[1] || row[2] || row[3] || row[4]);

      const productosFormateados = filasDatos.map((row, index) => ({
        fila: index + 2,
        nombre: String(row[0] || '').trim(),
        precio_costo: parseFloat(row[1]) || 0,
        precio_venta: parseFloat(row[2]) || 0,
        stock_actual: parseInt(row[3], 10) || 0,
        codigo: String(row[4] || '').trim() || `AUTO_${Date.now()}_${index}`,
        categoria: '',
        activo: true
      }));

      setDatosPreview(productosFormateados);
      await validarDatos(productosFormateados);
      setPaso(2);
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      toast.error('No pudimos leer el archivo. ¿Está bien formateado?');
    } finally {
      setProcesando(false);
    }
  };

  const handleArchivoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await procesarArchivo(file);
  };

  const ejecutarImportacion = async () => {
    if (!sucursalSeleccionada) {
      toast.error('Elegí una sucursal para el stock');
      return;
    }

    try {
      setProcesando(true);
      setPaso(3);

      const productosValidos = datosPreview.filter((producto) => {
        const error = validacion.errors.find((e) => e.fila === producto.fila);
        return (
          !error ||
          !error.errores.some(
            (err) => err.includes('obligatorio') || err.includes('Precio de venta debe ser mayor a 0')
          )
        );
      });

      const resultado = await productosService.importarMasivo(productosValidos, sucursalSeleccionada, {
        categoria_defecto: '',
        saltarExistentes: true
      });

      toast.success(`Listo: ${resultado.procesados} productos cargados. ${resultado.saltados} omitidos.`);
      onImportSuccess && onImportSuccess();
      handleClose();
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al importar: ' + (error.message || 'intentá de nuevo'));
      setPaso(2);
    } finally {
      setProcesando(false);
    }
  };

  const handleClose = () => {
    setArchivo(null);
    setDatosPreview([]);
    setValidacion({ validos: 0, duplicados: 0, preciosInvalidos: 0, existentes: 0, errors: [] });
    setPaso(1);
    setDragActive(false);
    onClose();
  };

  const descargarPlantilla = () => {
    const plantilla = [
      ['Producto', 'Precio de costo', 'Precio de venta', 'Stock actual', 'Código'],
      ['Producto Ejemplo 1', 100, 150, 20, 'PROD001'],
      ['Producto Ejemplo 2', 200, 300, 15, 'PROD002']
    ];

    const ws = XLSX.utils.aoa_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
    toast.info('Plantilla descargada');
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) procesarArchivo(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  if (!isOpen) return null;

  const progressPct = paso === 1 ? 12 : paso === 2 ? 50 : 100;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md animate-[wizFade_0.22s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-wizard-title"
    >
      <style>{`
        @keyframes wizFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wizPop { from { opacity: 0; transform: translateY(10px) scale(0.99); } to { opacity: 1; transform: none; } }
        @keyframes pulseBar { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
      `}</style>

      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80 animate-[wizPop_0.32s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Barra de progreso superior */}
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 px-6 pb-8 pt-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <FaMagic className="text-xl text-white/95" aria-hidden />
              </div>
              <div>
                <h2 id="import-wizard-title" className="text-xl font-bold tracking-tight sm:text-2xl">
                  Cargá tus productos
                </h2>
                <p className="mt-0.5 max-w-md text-sm text-white/85">
                  Tres pasos cortos: archivo, revisión e importación. Podés usar nuestra plantilla si querés.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={procesando && paso === 3}
              className="shrink-0 rounded-lg p-2 text-white/90 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Cerrar"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          {/* Stepper */}
          <div className="relative mt-6 flex items-center justify-between gap-2 sm:gap-4">
            {STEPS.map((s, i) => {
              const active = paso === s.id;
              const done = paso > s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <div
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition sm:h-11 sm:w-11',
                        done
                          ? 'bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-900/20'
                          : active
                            ? 'bg-white text-indigo-700 shadow-lg ring-2 ring-white/60'
                            : 'bg-white/15 text-white/70 ring-1 ring-white/25'
                      ].join(' ')}
                    >
                      {done ? <FaCheck className="text-sm" /> : s.id}
                    </div>
                    <p className={`mt-2 text-xs font-semibold sm:text-sm ${active || done ? 'text-white' : 'text-white/55'}`}>
                      {s.label}
                    </p>
                    <p className="hidden text-[11px] text-white/65 sm:block">{s.hint}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mx-0 mb-8 hidden h-0.5 w-6 shrink-0 rounded-full bg-white/25 sm:block md:w-10" aria-hidden />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-5 py-5 sm:px-6 sm:py-6">
          {paso === 1 && (
            <div className="space-y-5 animate-[wizPop_0.25s_ease-out]">
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={[
                  'relative rounded-2xl border-2 border-dashed px-4 py-10 text-center transition sm:py-12',
                  dragActive
                    ? 'border-indigo-400 bg-indigo-50/90 shadow-inner'
                    : 'border-slate-200 bg-white shadow-sm hover:border-indigo-300 hover:bg-slate-50/50'
                ].join(' ')}
              >
                <FaCloudUploadAlt className="mx-auto mb-3 text-4xl text-indigo-400 sm:text-5xl" aria-hidden />
                <h3 className="text-lg font-semibold text-slate-800">Arrastrá el Excel acá</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  O elegí el archivo desde tu equipo. Columnas: nombre, costo, venta, stock y código (la primera fila es el encabezado).
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleArchivoChange}
                  className="hidden"
                  id="excel-upload"
                  disabled={procesando}
                />
                <label
                  htmlFor="excel-upload"
                  className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {procesando ? (
                    <>
                      <Spinner size="sm" color="white" />
                      Leyendo…
                    </>
                  ) : (
                    <>
                      <FaUpload />
                      Elegir archivo
                    </>
                  )}
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { t: 'Plantilla lista', d: 'Descargá el Excel de ejemplo y completalo con tus datos.' },
                  { t: 'Sin apuros', d: 'Podés volver atrás y corregir el archivo antes de importar.' },
                  { t: 'Duplicados', d: 'Los que ya existen se saltan solos para no pisar nada.' }
                ].map((card) => (
                  <div
                    key={card.t}
                    className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/80"
                  >
                    <p className="text-sm font-semibold text-slate-800">{card.t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{card.d}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button color="secondary" size="sm" onClick={descargarPlantilla} icon={<FaFileExcel />}>
                  Descargar plantilla
                </Button>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-5 animate-[wizPop_0.25s_ease-out]">
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm ring-1 ring-indigo-100/60 sm:p-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FaStore className="text-indigo-500" />
                  ¿En qué sucursal cargamos el stock?
                </label>
                <p className="mt-1 text-xs text-slate-500">Si tenés una sola, ya viene seleccionada.</p>
                <select
                  value={sucursalSeleccionada}
                  onChange={(e) => setSucursalSeleccionada(e.target.value)}
                  className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Elegí sucursal…</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: 'validos', label: 'A importar', val: validacion.validos, icon: FaCheckCircle, bg: 'from-emerald-500 to-teal-600' },
                  { k: 'existentes', label: 'Ya en sistema', val: validacion.existentes, icon: FaExclamationTriangle, bg: 'from-amber-400 to-orange-500' },
                  { k: 'duplicados', label: 'Duplicados', val: validacion.duplicados, icon: FaTimes, bg: 'from-rose-400 to-red-500' },
                  { k: 'precios', label: 'Precios raros', val: validacion.preciosInvalidos, icon: FaExclamationTriangle, bg: 'from-slate-500 to-slate-700' }
                ].map((b) => (
                  <div
                    key={b.k}
                    className={`overflow-hidden rounded-2xl bg-gradient-to-br ${b.bg} p-4 text-white shadow-md`}
                  >
                    <b.icon className="mb-2 text-lg opacity-90" />
                    <div className="text-2xl font-bold tabular-nums">{b.val}</div>
                    <div className="text-xs font-medium text-white/90">{b.label}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <FaEye className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Vista previa · {datosPreview.length} filas{archivo?.name ? ` · ${archivo.name}` : ''}
                  </h3>
                </div>
                <div className="max-h-56 overflow-auto">
                  <table className="min-w-full text-left text-xs sm:text-sm">
                    <thead className="sticky top-0 z-[1] bg-slate-100/95 backdrop-blur">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-600">Fila</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Producto</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Código</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Costo</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Venta</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Stock</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {datosPreview.slice(0, 12).map((producto, index) => {
                        const error = validacion.errors.find((e) => e.fila === producto.fila);
                        return (
                          <tr key={index} className={error ? 'bg-rose-50/60' : 'hover:bg-slate-50/80'}>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-500">{producto.fila}</td>
                            <td className="max-w-[140px] truncate px-3 py-2 font-medium text-slate-800 sm:max-w-[200px]">
                              {producto.nombre}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{producto.codigo}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">${producto.precio_costo}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">${producto.precio_venta}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{producto.stock_actual}</td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {error ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                                  Revisar
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {datosPreview.length > 12 && (
                  <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs text-slate-500">
                    Mostrando 12 de {datosPreview.length} filas
                  </p>
                )}
              </div>

              {validacion.errors.length > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                    <FaExclamationTriangle />
                    Algunas filas necesitan atención
                  </h4>
                  <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto text-xs text-rose-800">
                    {validacion.errors.slice(0, 8).map((error, index) => (
                      <li key={index}>
                        <span className="font-semibold">Fila {error.fila}:</span> {error.errores.join(' · ')}
                      </li>
                    ))}
                  </ul>
                  {validacion.errors.length > 8 && (
                    <p className="mt-2 text-xs text-rose-700/80">…y {validacion.errors.length - 8} más</p>
                  )}
                </div>
              )}
            </div>
          )}

          {paso === 3 && (
            <div className="flex flex-col items-center justify-center py-14 text-center animate-[wizPop_0.25s_ease-out]">
              <div className="relative mb-6">
                <div
                  className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"
                  style={{ animationDuration: '0.85s' }}
                />
                <div className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
                  <FaBoxes className="text-indigo-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Importando tus productos</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">Esto suele tardar solo unos segundos. No cierres esta ventana.</p>
              <div
                className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200"
                style={{ animation: 'pulseBar 1.4s ease-in-out infinite' }}
              >
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <Button color="secondary" onClick={handleClose} disabled={procesando && paso === 3}>
            {paso === 1 ? 'Cerrar' : 'Cancelar'}
          </Button>

          {paso === 2 && (
            <>
              <Button color="secondary" onClick={() => setPaso(1)} disabled={procesando} icon={<FaArrowLeft />}>
                Archivo
              </Button>
              <Button
                color="primary"
                onClick={ejecutarImportacion}
                disabled={procesando || validacion.validos === 0 || !sucursalSeleccionada}
                loading={procesando}
                icon={<FaBoxes />}
              >
                Importar {validacion.validos} productos
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportarExcel;
