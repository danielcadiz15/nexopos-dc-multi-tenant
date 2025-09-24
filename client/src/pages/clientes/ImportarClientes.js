import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaUpload, FaCheck, FaTimes, FaDownload } from 'react-icons/fa';

// Servicios
import clientesService from '../../services/clientes.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

const ImportarClientes = () => {
  const navigate = useNavigate();
  
  // Estados
  const [archivo, setArchivo] = useState(null);
  const [datos, setDatos] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [mapeoColumnas, setMapeoColumnas] = useState({});
  const [procesando, setProcesando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [errores, setErrores] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  
  // Columnas disponibles en el sistema
  const columnasCliente = [
    { campo: 'nombre', label: 'Nombre', requerido: true },
    { campo: 'apellido', label: 'Apellido', requerido: false },
    { campo: 'telefono', label: 'Teléfono', requerido: false },
    { campo: 'email', label: 'Email', requerido: false },
    { campo: 'direccion', label: 'Dirección', requerido: false },
    { campo: 'notas', label: 'Notas', requerido: false }
  ];
  
  /**
   * Maneja el drop del archivo
   */
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      procesarArchivo(files[0]);
    }
  };
  
  /**
   * Maneja la selección del archivo
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      procesarArchivo(file);
    }
  };
  
  /**
   * Procesa el archivo Excel
   */
  const procesarArchivo = (file) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }
    
    setArchivo(file);
    setProcesando(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast.error('El archivo está vacío o no tiene datos suficientes');
          setProcesando(false);
          return;
        }
        
        // Primera fila son los encabezados
        const headers = jsonData[0];
        setColumnas(headers);
        
        // Resto son los datos
        const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell));
        setDatos(dataRows);
        
        // Auto-mapear columnas si es posible
        autoMapearColumnas(headers);
        
        setVistaPrevia(true);
        setProcesando(false);
        
        toast.success(`Archivo cargado: ${dataRows.length} registros encontrados`);
        
      } catch (error) {
        console.error('Error al procesar archivo:', error);
        toast.error('Error al procesar el archivo Excel');
        setProcesando(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  /**
   * Intenta mapear automáticamente las columnas
   */
  const autoMapearColumnas = (headers) => {
    const mapeo = {};
    
    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim();
      
      // Mapeo automático basado en nombres comunes
      if (headerLower.includes('nombre') && !headerLower.includes('apellido')) {
        mapeo.nombre = index;
      } else if (headerLower.includes('apellido')) {
        mapeo.apellido = index;
      } else if (headerLower.includes('tel') || headerLower.includes('phone')) {
        mapeo.telefono = index;
      } else if (headerLower.includes('mail') || headerLower.includes('correo')) {
        mapeo.email = index;
      } else if (headerLower.includes('direcc') || headerLower.includes('domicilio')) {
        mapeo.direccion = index;
      } else if (headerLower.includes('nota') || headerLower.includes('observ')) {
        mapeo.notas = index;
      }
    });
    
    setMapeoColumnas(mapeo);
  };
  
  /**
   * Actualiza el mapeo de una columna
   */
  const actualizarMapeo = (campo, indiceColumna) => {
    setMapeoColumnas({
      ...mapeoColumnas,
      [campo]: indiceColumna === '' ? undefined : parseInt(indiceColumna)
    });
  };
  
  /**
   * Valida los datos antes de importar
   */
  const validarDatos = () => {
    const erroresEncontrados = [];
    const clientesValidos = [];
    
    datos.forEach((fila, index) => {
      const cliente = {};
      let tieneError = false;
      
      // Validar campos requeridos
      if (!mapeoColumnas.nombre && mapeoColumnas.nombre !== 0) {
        if (index === 0) {
          erroresEncontrados.push('La columna "Nombre" es requerida');
        }
        tieneError = true;
      } else {
        const nombre = fila[mapeoColumnas.nombre];
        if (!nombre || nombre.toString().trim() === '') {
          erroresEncontrados.push(`Fila ${index + 2}: Nombre vacío`);
          tieneError = true;
        } else {
          cliente.nombre = nombre.toString().trim();
        }
      }
      
      // Mapear otros campos
      if (mapeoColumnas.apellido !== undefined) {
        cliente.apellido = (fila[mapeoColumnas.apellido] || '').toString().trim();
      }
      
      if (mapeoColumnas.telefono !== undefined) {
        cliente.telefono = (fila[mapeoColumnas.telefono] || '').toString().trim();
      }
      
      if (mapeoColumnas.email !== undefined) {
        const email = (fila[mapeoColumnas.email] || '').toString().trim();
        if (email && !validarEmail(email)) {
          erroresEncontrados.push(`Fila ${index + 2}: Email inválido (${email})`);
          tieneError = true;
        } else {
          cliente.email = email;
        }
      }
      
      if (mapeoColumnas.direccion !== undefined) {
        cliente.direccion = (fila[mapeoColumnas.direccion] || '').toString().trim();
      }
      
      if (mapeoColumnas.notas !== undefined) {
        cliente.notas = (fila[mapeoColumnas.notas] || '').toString().trim();
      }
      
      if (!tieneError) {
        clientesValidos.push(cliente);
      }
    });
    
    setErrores(erroresEncontrados);
    return clientesValidos;
  };
  
  /**
   * Valida formato de email
   */
  const validarEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  /**
   * Importa los clientes
   */
  const importarClientes = async () => {
    const clientesValidos = validarDatos();
    
    if (errores.length > 0) {
      toast.error(`Se encontraron ${errores.length} errores. Revisa los datos.`);
      return;
    }
    
    if (clientesValidos.length === 0) {
      toast.error('No hay clientes válidos para importar');
      return;
    }
    
    setProcesando(true);
    
    try {
      const resultado = await clientesService.importarMasivo(clientesValidos);
      
      setEstadisticas({
        total: clientesValidos.length,
        exitosos: resultado.exitosos || clientesValidos.length,
        errores: resultado.errores || 0,
        duplicados: resultado.duplicados || 0
      });
      
      toast.success(`Importación completada: ${resultado.exitosos || clientesValidos.length} clientes importados`);
      
      setTimeout(() => {
        navigate('/clientes');
      }, 2000);
      
    } catch (error) {
      console.error('Error al importar:', error);
      toast.error('Error al importar los clientes');
    } finally {
      setProcesando(false);
    }
  };
  
  /**
   * Descarga plantilla de ejemplo
   */
  const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Dirección', 'Notas'],
      ['Juan', 'Pérez', '123456789', 'juan@email.com', 'Calle 123', 'Cliente frecuente'],
      ['María', 'González', '987654321', 'maria@email.com', 'Av. Principal 456', '']
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    
    XLSX.writeFile(wb, 'plantilla_clientes.xlsx');
    toast.info('Plantilla descargada');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Importar Clientes</h1>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={descargarPlantilla}
            icon={<FaDownload />}
          >
            Descargar Plantilla
          </Button>
          
          <Button
            color="white"
            onClick={() => navigate('/clientes')}
          >
            Cancelar
          </Button>
        </div>
      </div>
      
      {/* Zona de carga */}
      {!vistaPrevia && (
        <Card>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <FaFileExcel className="mx-auto text-6xl text-gray-400 mb-4" />
            
            <p className="text-lg text-gray-700 mb-2">
              Arrastra y suelta tu archivo Excel aquí
            </p>
            
            <p className="text-sm text-gray-500 mb-4">
              o
            </p>
            
            <label className="inline-block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button color="primary" as="span">
                Seleccionar Archivo
              </Button>
            </label>
            
            <p className="text-xs text-gray-500 mt-4">
              Formatos soportados: .xlsx, .xls
            </p>
          </div>
        </Card>
      )}
      
      {/* Vista previa y mapeo */}
      {vistaPrevia && (
        <>
          {/* Información del archivo */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaFileExcel className="text-green-600 text-2xl mr-3" />
                <div>
                  <p className="font-medium">{archivo.name}</p>
                  <p className="text-sm text-gray-500">
                    {datos.length} registros encontrados
                  </p>
                </div>
              </div>
              
              <Button
                color="secondary"
                size="sm"
                onClick={() => {
                  setVistaPrevia(false);
                  setDatos([]);
                  setColumnas([]);
                  setMapeoColumnas({});
                  setArchivo(null);
                }}
              >
                Cambiar archivo
              </Button>
            </div>
          </Card>
          
          {/* Mapeo de columnas */}
          <Card title="Mapeo de Columnas" icon={<FaCheck />}>
            <p className="text-sm text-gray-600 mb-4">
              Asocia las columnas del Excel con los campos del sistema
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {columnasCliente.map(({ campo, label, requerido }) => (
                <div key={campo}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {requerido && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={mapeoColumnas[campo] ?? ''}
                    onChange={(e) => actualizarMapeo(campo, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">-- No mapear --</option>
                    {columnas.map((col, index) => (
                      <option key={index} value={index}>
                        {col} (Columna {String.fromCharCode(65 + index)})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Vista previa de datos */}
          <Card title="Vista Previa" icon={<FaCheck />}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Fila
                    </th>
                    {columnasCliente.map(({ campo, label }) => 
                      mapeoColumnas[campo] !== undefined && (
                        <th key={campo} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {datos.slice(0, 5).map((fila, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {index + 2}
                      </td>
                      {columnasCliente.map(({ campo }) => 
                        mapeoColumnas[campo] !== undefined && (
                          <td key={campo} className="px-4 py-2 text-sm text-gray-900">
                            {fila[mapeoColumnas[campo]] || '-'}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {datos.length > 5 && (
              <p className="text-sm text-gray-500 text-center mt-2">
                Mostrando 5 de {datos.length} registros
              </p>
            )}
          </Card>
          
          {/* Errores */}
          {errores.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <div className="flex items-start">
                <FaTimes className="text-red-600 mt-1 mr-2" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800 mb-2">
                    Errores encontrados ({errores.length})
                  </h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errores.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {errores.length > 5 && (
                      <li>... y {errores.length - 5} errores más</li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          )}
          
          {/* Estadísticas */}
          {estadisticas && (
            <Card className="border-green-200 bg-green-50">
              <div className="flex items-start">
                <FaCheck className="text-green-600 mt-1 mr-2" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-800 mb-2">
                    Importación completada
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">
                        {estadisticas.exitosos}
                      </span>
                      <span className="text-green-700"> importados</span>
                    </div>
                    {estadisticas.duplicados > 0 && (
                      <div>
                        <span className="text-yellow-600 font-medium">
                          {estadisticas.duplicados}
                        </span>
                        <span className="text-yellow-700"> duplicados</span>
                      </div>
                    )}
                    {estadisticas.errores > 0 && (
                      <div>
                        <span className="text-red-600 font-medium">
                          {estadisticas.errores}
                        </span>
                        <span className="text-red-700"> errores</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {/* Botones de acción */}
          <div className="flex justify-end space-x-2">
            <Button
              color="white"
              onClick={() => navigate('/clientes')}
            >
              Cancelar
            </Button>
            
            <Button
              color="primary"
              onClick={importarClientes}
              loading={procesando}
              disabled={procesando || !mapeoColumnas.nombre}
              icon={<FaUpload />}
            >
              Importar {datos.length} Clientes
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ImportarClientes;