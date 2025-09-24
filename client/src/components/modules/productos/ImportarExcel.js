// src/components/modules/productos/ImportarExcel.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

// Servicios
import productosService from '../../../services/productos.service';
import sucursalesService from '../../../services/sucursales.service';

// Componentes
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';

// Iconos
import { 
  FaFileExcel, FaUpload, FaTimes, FaCheck, FaExclamationTriangle,
  FaStore, FaBoxes, FaEye, FaCheckCircle
} from 'react-icons/fa';

/**
 * Modal para importar productos desde Excel
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
  const [paso, setPaso] = useState(1); // 1: seleccionar, 2: preview, 3: importar

  // Cargar sucursales disponibles
  useEffect(() => {
    if (isOpen) {
      cargarSucursales();
    }
  }, [isOpen]);

  const cargarSucursales = async () => {
    try {
      const data = await sucursalesService.obtenerActivas();
      setSucursales(data);
      
      // Seleccionar primera sucursal por defecto
      if (data.length > 0) {
        setSucursalSeleccionada(data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
      toast.error('Error al cargar sucursales');
    }
  };

  /**
   * Maneja la selección del archivo Excel
   */
  const handleArchivoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setProcesando(true);
      setArchivo(file);

      // Leer archivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Saltar primera fila (headers) y procesar datos
      const filasDatos = jsonData.slice(1).filter(row => 
        row[0] || row[1] || row[2] || row[3] || row[4] // Al menos un dato
      );

      const productosFormateados = filasDatos.map((row, index) => ({
        fila: index + 2, // +2 porque saltamos header y empezamos en 1
        nombre: String(row[0] || '').trim(),
        precio_costo: parseFloat(row[1]) || 0,
        precio_venta: parseFloat(row[2]) || 0,
        stock_actual: parseInt(row[3]) || 0,
        codigo: String(row[4] || '').trim() || `AUTO_${Date.now()}_${index}`,
        categoria: '', // Sin categoría por defecto
        activo: true
      }));

      setDatosPreview(productosFormateados);
      validarDatos(productosFormateados);
      setPaso(2);

    } catch (error) {
      console.error('Error al procesar archivo:', error);
      toast.error('Error al leer el archivo Excel');
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Valida los datos del Excel
   */
  const validarDatos = async (productos) => {
    try {
      const errors = [];
      let validos = 0;
      let duplicados = 0;
      let preciosInvalidos = 0;
      let existentes = 0;

      // Obtener productos existentes para verificar duplicados
      const productosExistentes = await productosService.obtenerTodos();
      const codigosExistentes = productosExistentes.map(p => p.codigo?.toLowerCase());
      const nombresExistentes = productosExistentes.map(p => p.nombre?.toLowerCase());

      // Validar cada producto
      const codigosEnArchivo = [];
      const nombresEnArchivo = [];

      productos.forEach((producto, index) => {
        const erroresProducto = [];

        // Validar nombre obligatorio
        if (!producto.nombre) {
          erroresProducto.push('Nombre es obligatorio');
        }

        // Validar precios positivos
        if (producto.precio_costo < 0) {
          erroresProducto.push('Precio de costo debe ser positivo');
          preciosInvalidos++;
        }

        if (producto.precio_venta <= 0) {
          erroresProducto.push('Precio de venta debe ser mayor a 0');
          preciosInvalidos++;
        }

        // Validar duplicados en archivo
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

        // Verificar existencia en base de datos
        if (codigosExistentes.includes(producto.codigo.toLowerCase()) ||
            nombresExistentes.includes(producto.nombre.toLowerCase())) {
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

  /**
   * Ejecuta la importación
   */
  const ejecutarImportacion = async () => {
    if (!sucursalSeleccionada) {
      toast.error('Selecciona una sucursal para asignar el stock');
      return;
    }

    try {
      setProcesando(true);
      setPaso(3);

      // Filtrar solo productos válidos (sin errores críticos)
      const productosValidos = datosPreview.filter(producto => {
        const error = validacion.errors.find(e => e.fila === producto.fila);
        return !error || !error.errores.some(err => 
          err.includes('obligatorio') || 
          err.includes('Precio de venta debe ser mayor a 0')
        );
      });

      // Preparar datos para importación
      const datosImportacion = {
        productos: productosValidos,
        sucursal_id: sucursalSeleccionada,
        categoria_defecto: '',
        saltarExistentes: true
      };

      // Llamar al servicio de importación
      const resultado = await productosService.importarMasivo(
	  productosValidos,
	  sucursalSeleccionada, 
	  {
		categoria_defecto: '',
		saltarExistentes: true
	  }
	);

      toast.success(`Importación completada: ${resultado.procesados} productos, ${resultado.saltados} saltados`);
      
      onImportSuccess && onImportSuccess();
      handleClose();

    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al importar productos: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Cierra el modal y limpia estado
   */
  const handleClose = () => {
    setArchivo(null);
    setDatosPreview([]);
    setValidacion({ validos: 0, duplicados: 0, preciosInvalidos: 0, existentes: 0, errors: [] });
    setPaso(1);
    onClose();
  };

  /**
   * Descarga plantilla de ejemplo
   */
  const descargarPlantilla = () => {
    const plantilla = [
      ['Producto', 'Precio de costo', 'Precio de venta', 'Stock actual', 'Código'],
      ['Producto Ejemplo 1', 100, 150, 20, 'PROD001'],
      ['Producto Ejemplo 2', 200, 300, 15, 'PROD002'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
    toast.info('Plantilla descargada');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center">
            <FaFileExcel className="mr-3 text-green-600 text-2xl" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Importar Productos desde Excel</h2>
              <p className="text-sm text-gray-600">
                Paso {paso} de 3: {
                  paso === 1 ? 'Seleccionar archivo' :
                  paso === 2 ? 'Validar datos' : 'Importando...'
                }
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* PASO 1: Seleccionar archivo */}
          {paso === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Selecciona tu archivo Excel
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Formato: .xlsx con columnas: Producto, Precio costo, Precio venta, Stock, Código
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
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {procesando ? <Spinner size="sm" className="mr-2" /> : <FaUpload className="mr-2" />}
                    {procesando ? 'Procesando...' : 'Seleccionar Archivo'}
                  </label>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  color="secondary"
                  size="sm"
                  onClick={descargarPlantilla}
                  icon={<FaFileExcel />}
                >
                  Descargar Plantilla de Ejemplo
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: Preview y validación */}
          {paso === 2 && (
            <div className="space-y-6">
              {/* Selector de sucursal */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaStore className="inline mr-2" />
                  Sucursal para asignar stock:
                </label>
                <select
                  value={sucursalSeleccionada}
                  onChange={(e) => setSucursalSeleccionada(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Seleccionar sucursal...</option>
                  {sucursales.map(sucursal => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumen de validación */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <FaCheckCircle className="mx-auto text-2xl text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-700">{validacion.validos}</div>
                  <div className="text-sm text-green-600">Válidos</div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <FaExclamationTriangle className="mx-auto text-2xl text-yellow-600 mb-2" />
                  <div className="text-2xl font-bold text-yellow-700">{validacion.existentes}</div>
                  <div className="text-sm text-yellow-600">Existentes</div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <FaTimes className="mx-auto text-2xl text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-700">{validacion.duplicados}</div>
                  <div className="text-sm text-red-600">Duplicados</div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <FaExclamationTriangle className="mx-auto text-2xl text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-700">{validacion.preciosInvalidos}</div>
                  <div className="text-sm text-orange-600">Precios inválidos</div>
                </div>
              </div>

              {/* Preview de datos */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  <FaEye className="inline mr-2" />
                  Preview ({datosPreview.length} productos)
                </h3>
                
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Precio Costo</th>
                        <th className="px-3 py-2 text-left">Precio Venta</th>
                        <th className="px-3 py-2 text-left">Stock</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosPreview.slice(0, 10).map((producto, index) => {
                        const error = validacion.errors.find(e => e.fila === producto.fila);
                        return (
                          <tr key={index} className={error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2">{producto.fila}</td>
                            <td className="px-3 py-2">{producto.nombre}</td>
                            <td className="px-3 py-2">{producto.codigo}</td>
                            <td className="px-3 py-2">${producto.precio_costo}</td>
                            <td className="px-3 py-2">${producto.precio_venta}</td>
                            <td className="px-3 py-2">{producto.stock_actual}</td>
                            <td className="px-3 py-2">
                              {error ? (
                                <span className="text-red-600 text-xs">❌ Con errores</span>
                              ) : (
                                <span className="text-green-600 text-xs">✅ Válido</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {datosPreview.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Mostrando primeras 10 filas de {datosPreview.length} total
                  </p>
                )}
              </div>

              {/* Lista de errores */}
              {validacion.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Errores encontrados:</h4>
                  <div className="max-h-32 overflow-y-auto bg-red-50 rounded p-3">
                    {validacion.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-1">
                        <strong>Fila {error.fila}:</strong> {error.errores.join(', ')}
                      </div>
                    ))}
                    {validacion.errors.length > 5 && (
                      <div className="text-xs text-red-600">
                        ... y {validacion.errors.length - 5} errores más
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Importando */}
          {paso === 3 && (
            <div className="text-center py-12">
              <Spinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700">Importando productos...</h3>
              <p className="text-gray-500">Por favor espera mientras procesamos los datos</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            color="secondary"
            onClick={handleClose}
            disabled={procesando}
          >
            Cancelar
          </Button>
          
          {paso === 2 && (
            <>
              <Button
                color="secondary"
                onClick={() => setPaso(1)}
                disabled={procesando}
              >
                ← Volver
              </Button>
              
              <Button
                color="primary"
                onClick={ejecutarImportacion}
                disabled={procesando || validacion.validos === 0 || !sucursalSeleccionada}
                loading={procesando}
                icon={<FaBoxes />}
              >
                Importar {validacion.validos} Productos
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportarExcel;