/**
 * Componente para importación masiva de clientes desde Excel
 * 🆕 NUEVO: Permite importar clientes con saldos iniciales
 */
import * as XLSX from 'xlsx';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaFileImport, FaDownload, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

// Servicios
import clientesService from '../../services/clientes.service';
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

const ImportacionExcel = ({ isOpen, onClose, onImportar }) => {
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [datosLeidos, setDatosLeidos] = useState([]);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [paso, setPaso] = useState(1); // 1: Seleccionar archivo, 2: Preview, 3: Resultados
  const [resultadoImportacion, setResultadoImportacion] = useState(null);
  const { currentUser } = useAuth();

  /**
   * Maneja la selección del archivo Excel
   */
  const handleArchivoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const extensionesValidas = ['.xlsx', '.xls'];
    const extension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
    
    if (!extensionesValidas.includes(extension)) {
      toast.error('Solo se permiten archivos Excel (.xlsx, .xls)');
      return;
    }

    setArchivo(file);
    setProcesando(true);

    try {
      // Leer archivo usando FileReader
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {         
		const data = new Uint8Array(event.target.result);
		const workbook = XLSX.read(data, { type: 'array' });
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

		// Mapear tus columnas reales
		const clientesEjemplo = jsonData.slice(1).map((row, index) => ({
		  fila: index + 2,
		  nombre: row[0] || '',
		  apellido: '',
		  dni_cuit: row[1] || '',
		  telefono: row[2] || '',
		  direccion: row[3] || '',
		  email: row[4] || '',
		  saldo: parseFloat(row[5]) || 0
		}));

          // Validar datos
          const errores = validarDatos(clientesEjemplo);
          
          setDatosLeidos(clientesEjemplo);
          setErroresValidacion(errores);
          setPaso(2);
          
        } catch (error) {
          console.error('Error al procesar archivo:', error);
          toast.error('Error al leer el archivo Excel');
        } finally {
          setProcesando(false);
        }
      };

      reader.onerror = () => {
        toast.error('Error al leer el archivo');
        setProcesando(false);
      };

      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      console.error('Error al leer archivo:', error);
      toast.error('Error al procesar el archivo');
      setProcesando(false);
    }
  };

  /**
   * Valida los datos leídos del Excel
   */
  const validarDatos = (datos) => {
    const errores = [];

    datos.forEach((cliente, index) => {
      const erroresFila = [];

      // Validaciones obligatorias
      if (!cliente.nombre || cliente.nombre.trim() === '') {
        erroresFila.push('Nombre es obligatorio');
      }

      // Validaciones de formato
      if (cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) {
        erroresFila.push('Formato de email inválido');
      }

      if (cliente.telefono && !/^\d{10,15}$/.test(cliente.telefono.replace(/\D/g, ''))) {
        erroresFila.push('Teléfono debe tener entre 10 y 15 dígitos');
      }

      if (cliente.saldo && isNaN(parseFloat(cliente.saldo))) {
        erroresFila.push('Saldo debe ser un número válido');
      }

      if (erroresFila.length > 0) {
        errores.push({
          fila: cliente.fila || index + 2,
          errores: erroresFila,
          cliente: `${cliente.nombre} ${cliente.apellido}`.trim()
        });
      }
    });

    return errores;
  };

  /**
   * Procesa la importación de clientes
   */
	const procesarImportacion = async () => {
	  if (!archivo || !currentUser?.id) {
		toast.error('Selecciona un archivo y asegúrate de estar logueado');
		return;
	  }

	  try {
		setProcesando(true);
		
		// 1. VERIFICAR ARCHIVO
		console.log('🔍 DEBUG: Archivo seleccionado:', archivo.name, 'Tamaño:', archivo.size);
		
		// Leer archivo Excel
		const data = await archivo.arrayBuffer();
		console.log('🔍 DEBUG: Datos leídos, tamaño:', data.byteLength);
		
		const workbook = XLSX.read(data, { type: 'array' });
		console.log('🔍 DEBUG: Workbook creado, hojas:', workbook.SheetNames);
		
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
		
		// 2. VERIFICAR DATOS DEL EXCEL
		console.log('🔍 DEBUG: Total filas en Excel:', jsonData.length);
		console.log('🔍 DEBUG: Primera fila (headers):', jsonData[0]);
		console.log('🔍 DEBUG: Segunda fila (primer cliente):', jsonData[1]);
		console.log('🔍 DEBUG: Tercera fila (segundo cliente):', jsonData[2]);
		console.log('🔍 DEBUG: Últimas 3 filas:', jsonData.slice(-3));

		// Mapear datos del Excel
		const clientesFormateados = jsonData.slice(1).map((row, index) => {
		  const cliente = {
			nombre: row[0] || '',
			apellido: '',
			dni_cuit: row[1] || '',
			telefono: row[2] || '',
			direccion: row[3] || '',
			email: row[4] || '',
			saldo: parseFloat(row[5]) || 0,
			categoria: 'CONDINEA'
		  };
		  
		  // Debug de los primeros 3 clientes
		  if (index < 3) {
			console.log(`🔍 DEBUG: Cliente ${index + 1} mapeado:`, cliente);
		  }
		  
		  return cliente;
		});

		// 3. VERIFICAR MAPEO FINAL
		console.log('🔍 DEBUG: Total clientes formateados:', clientesFormateados.length);
		console.log('🔍 DEBUG: Primer cliente final:', clientesFormateados[0]);
		console.log('🔍 DEBUG: Último cliente final:', clientesFormateados[clientesFormateados.length - 1]);
		
		// Filtrar clientes con nombre válido
		const clientesValidos = clientesFormateados.filter(cliente => 
		  cliente.nombre && cliente.nombre.trim() !== ''
		);
		
		console.log('🔍 DEBUG: Clientes válidos (con nombre):', clientesValidos.length);
		
		if (clientesValidos.length === 0) {
		  toast.error('No se encontraron clientes válidos en el archivo Excel');
		  return;
		}

		// 4. VERIFICAR ENVÍO AL BACKEND
		console.log('🔍 DEBUG: Enviando al backend...');
		console.log('🔍 DEBUG: Usuario actual:', currentUser.id);
		console.log('🔍 DEBUG: Primeros 3 clientes a enviar:', clientesValidos.slice(0, 3));
		
		const resultado = await clientesService.importarMasivoConSaldos(
		  clientesValidos,
		  currentUser.id
		);

		// 5. VERIFICAR RESPUESTA DEL BACKEND
		console.log('🔍 DEBUG: Respuesta completa del backend:', resultado);
		console.log('🔍 DEBUG: Clientes exitosos:', resultado.exitosos);
		console.log('🔍 DEBUG: Saldos creados:', resultado.saldosCreados);
		console.log('🔍 DEBUG: Duplicados:', resultado.duplicados);
		console.log('🔍 DEBUG: Errores:', resultado.errores);

		// Verificar si la respuesta es exitosa
		if (resultado.success !== false && resultado.exitosos > 0) {
		  toast.success(
			`Importación completada: ${resultado.exitosos} clientes creados, ${resultado.saldosCreados} saldos iniciales`
		  );
		  
		  console.log('✅ DEBUG: Importación exitosa, cerrando diálogo...');
		  onImportar(); // Recargar lista de clientes
		  onClose();   // Cerrar diálogo
		} else {
		  console.error('❌ DEBUG: Importación falló:', resultado);
		  toast.error(`Error en importación: ${resultado.message || 'Error desconocido'}`);
		}
		
	  } catch (error) {
		console.error('❌ DEBUG: Error completo en importación:', error);
		console.error('❌ DEBUG: Stack trace:', error.stack);
		console.error('❌ DEBUG: Respuesta del servidor:', error.response?.data);
		
		let mensajeError = 'Error al importar clientes';
		
		if (error.response?.data?.message) {
		  mensajeError = error.response.data.message;
		} else if (error.message) {
		  mensajeError = error.message;
		}
		
		toast.error(mensajeError);
		
	  } finally {
		setProcesando(false);
		console.log('🔍 DEBUG: Proceso de importación finalizado');
	  }
	};

  /**
   * Descarga plantilla de Excel
   */
  const descargarPlantilla = () => {
    // Crear CSV como plantilla (más simple que Excel)
    const headers = 'Nombre,Apellido,DNI/CUIT,Telefono,Direccion,Correo Electrónico,Importe de ventas adeudado\n';
    const ejemplos = [
      'Juan Carlos,Pérez González,20345678901,3764123456,"Av. Corrientes 123, Posadas",juan.perez@email.com,25000',
      'María Elena,González López,27876543210,3764789012,"San Martín 456, Garupá",maria.gonzalez@email.com,15500',
      'Carlos Alberto,Rodríguez,20123456789,3764555777,"Belgrano 789, Candelaria",carlos.rodriguez@email.com,8750'
    ].join('\n');

    const contenido = headers + ejemplos;
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_clientes.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  /**
   * Resetea el componente para nueva importación
   */
  const nuevaImportacion = () => {
    setArchivo(null);
    setDatosLeidos([]);
    setErroresValidacion([]);
    setResultadoImportacion(null);
    setPaso(1);
  };

  /**
   * Cierra el diálogo y notifica cambios
   */
  const cerrarYActualizar = () => {
    if (resultadoImportacion && resultadoImportacion.exitosos > 0) {
      onImportar(); // Recargar lista de clientes
    }
    onClose();
    // Reset para próxima vez
    setTimeout(nuevaImportacion, 300);
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor || 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b">
          <h3 className="text-xl font-medium">Importar Clientes con Saldos</h3>
          <p className="text-sm text-gray-600 mt-1">
            Paso {paso} de 3: {
              paso === 1 ? 'Seleccionar archivo' : 
              paso === 2 ? 'Validar datos' : 
              'Resultados'
            }
          </p>
        </div>

        <div className="p-6">
          {/* PASO 1: Seleccionar archivo */}
          {paso === 1 && (
            <div className="space-y-6">
              {/* Plantilla */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Formato requerido</h4>
                <p className="text-blue-700 text-sm mb-3">
                  El archivo Excel debe contener las siguientes columnas:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>• Nombre (obligatorio)</div>
                  <div>• Apellido</div>
                  <div>• DNI/CUIT</div>
                  <div>• Telefono</div>
                  <div>• Direccion</div>
                  <div>• Correo Electrónico</div>
                  <div>• Importe de ventas adeudado</div>
                </div>
                
                <Button
                  color="info"
                  size="sm"
                  onClick={descargarPlantilla}
                  icon={<FaDownload />}
                  className="mt-3"
                >
                  Descargar Plantilla
                </Button>
              </div>

              {/* Selección de archivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar archivo Excel
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleArchivoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {procesando && (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                  <span className="ml-2 text-gray-600">Procesando archivo...</span>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: Preview y validación */}
          {paso === 2 && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {datosLeidos.length - erroresValidacion.length}
                  </p>
                  <p className="text-sm text-green-700">Clientes válidos</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {erroresValidacion.length}
                  </p>
                  <p className="text-sm text-red-700">Con errores</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatearMoneda(
                      datosLeidos
                        .filter(c => !erroresValidacion.find(e => e.fila === c.fila))
                        .reduce((sum, c) => sum + parseFloat(c.saldo || 0), 0)
                    )}
                  </p>
                  <p className="text-sm text-blue-700">Total saldos</p>
                </div>
              </div>

              {/* Errores de validación */}
              {erroresValidacion.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    Errores encontrados
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {erroresValidacion.map((error, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-red-700">
                          Fila {error.fila} ({error.cliente}):
                        </span>
                        <ul className="ml-4 list-disc text-red-600">
                          {error.errores.map((err, errIdx) => (
                            <li key={errIdx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview de datos válidos */}
              <div>
                <h4 className="font-medium mb-2">Preview de clientes a importar:</h4>
                <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Teléfono</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosLeidos
                        .filter(cliente => !erroresValidacion.find(e => e.fila === cliente.fila))
                        .slice(0, 10)
                        .map((cliente, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">
                            {cliente.nombre} {cliente.apellido}
                          </td>
                          <td className="px-3 py-2">{cliente.telefono}</td>
                          <td className="px-3 py-2">{cliente.email || '-'}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {cliente.saldo > 0 ? (
                              <span className="text-red-600">
                                {formatearMoneda(cliente.saldo)}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {datosLeidos.length > 10 && (
                    <div className="p-2 text-center text-gray-500 text-sm bg-gray-50">
                      ... y {datosLeidos.length - 10} clientes más
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Resultados */}
          {paso === 3 && resultadoImportacion && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheck className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Importación Completada!
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {resultadoImportacion.exitosos}
                  </p>
                  <p className="text-sm text-green-700">Clientes creados</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {resultadoImportacion.saldosCreados}
                  </p>
                  <p className="text-sm text-blue-700">Saldos iniciales</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {resultadoImportacion.duplicados}
                  </p>
                  <p className="text-sm text-yellow-700">Duplicados</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {resultadoImportacion.errores}
                  </p>
                  <p className="text-sm text-red-700">Errores</p>
                </div>
              </div>

              {resultadoImportacion.message && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{resultadoImportacion.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div>
            {paso === 2 && (
              <Button
                color="secondary"
                onClick={() => setPaso(1)}
                disabled={procesando}
              >
                Volver
              </Button>
            )}
            {paso === 3 && (
              <Button
                color="info"
                onClick={nuevaImportacion}
              >
                Nueva Importación
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              color="secondary"
              onClick={cerrarYActualizar}
              disabled={procesando}
            >
              {paso === 3 ? 'Cerrar' : 'Cancelar'}
            </Button>
            
            {paso === 2 && (
              <Button
                color="primary"
                onClick={procesarImportacion}
                disabled={procesando || datosLeidos.length === erroresValidacion.length}
                loading={procesando}
                icon={<FaFileImport />}
              >
                {procesando ? 'Importando...' : `Importar ${datosLeidos.length - erroresValidacion.length} Clientes`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportacionExcel;