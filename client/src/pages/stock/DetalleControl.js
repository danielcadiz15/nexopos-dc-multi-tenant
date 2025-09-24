/**
 * Página de detalle de control de inventario
 * 
 * Muestra el detalle completo de un control específico
 * con opción de imprimir el reporte.
 * 
 * @module pages/stock/DetalleControl
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';


// Servicios
import controlStockService from '../../services/control-stock.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';

// Iconos
import { 
  FaArrowLeft, FaPrint, FaFileExport, FaClipboardCheck,
  FaCalendarAlt, FaUser, FaStore, FaCheckCircle,
  FaClock, FaExclamationTriangle
} from 'react-icons/fa';

const DetalleControl = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  
  // Estados
  const [control, setControl] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  
  // Datos pasados desde la navegación
  const controlData = location.state?.control;
  const reporteData = location.state?.reporte;
  
  // Configuración de impresión
  const handlePrint = () => {
    // Validar que haya datos para imprimir
    if (!detalles || detalles.length === 0) {
      toast.warning('No hay datos para imprimir. Asegúrate de tener detalles del control.');
      return;
    }

    const ventanaImpresion = window.open('', '_blank');
    
    const estilos = `
      @page { 
        size: A4; 
        margin: 15mm;
      }
      @media print {
        .no-print { display: none !important; }
        body { margin: 0; padding: 0; }
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        margin: 0;
        padding: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .encabezado {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
      }
      .titulo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .subtitulo {
        font-size: 16px;
        color: #666;
        margin-bottom: 5px;
      }
      .fecha {
        font-size: 14px;
        color: #888;
      }
      .estadisticas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      .estadistica {
        border: 1px solid #ddd;
        padding: 15px;
        background-color: #f9f9f9;
      }
      .estadistica h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #333;
      }
      .estadistica p {
        margin: 5px 0;
        font-size: 14px;
      }
      .diferencia-positiva { color: #28a745; }
      .diferencia-negativa { color: #dc3545; }
    `;
    
    const html = `
      <html>
        <head>
          <title>Detalle Control - ${control?.fecha_inicio?.split('T')[0]}</title>
          <meta charset="utf-8">
          <style>${estilos}</style>
        </head>
        <body>
          <div class="encabezado">
            <div class="titulo">Detalle de Control de Inventario</div>
            <div class="subtitulo">Control #${control?.id || 'N/A'}</div>
            <div class="fecha">Fecha: ${control?.fecha_inicio?.split('T')[0] || 'N/A'}</div>
            <div class="fecha">Sucursal: ${control?.sucursal?.nombre || 'N/A'}</div>
          </div>
          
          <div class="estadisticas">
            <div class="estadistica">
              <h3>Resumen del Control</h3>
              <p>Total de productos: ${detalles.length}</p>
              <p>Productos contados: ${detalles.filter(d => d.contado).length}</p>
              <p>Diferencias encontradas: ${detalles.filter(d => d.diferencia !== 0 && d.diferencia !== null).length}</p>
            </div>
            <div class="estadistica">
              <h3>Información del Control</h3>
              <p>Tipo: ${control?.tipo || 'N/A'}</p>
              <p>Estado: ${control?.estado || 'N/A'}</p>
              <p>Usuario: ${control?.usuario?.nombre || 'N/A'}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock Sistema</th>
                <th>Stock Físico</th>
                <th>Diferencia</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${detalles.map(item => `
                <tr>
                  <td>${item.producto?.codigo || 'N/A'}</td>
                  <td>${item.producto?.nombre || 'N/A'}</td>
                  <td style="text-align: center;">${item.stock_sistema || 0}</td>
                  <td style="text-align: center;">${item.contado ? (item.stock_fisico || 0) : '-'}</td>
                  <td style="text-align: center;">
                    ${item.contado && item.diferencia !== null ? 
                      `<span class="${item.diferencia > 0 ? 'diferencia-positiva' : item.diferencia < 0 ? 'diferencia-negativa' : ''}">${item.diferencia > 0 ? '+' : ''}${item.diferencia}</span>` 
                      : '-'}
                  </td>
                  <td>${item.observaciones || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            <p>Total de productos: ${detalles.length}</p>
            <p>Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `;
    
    ventanaImpresion.document.write(html);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
      toast.success('Reporte de detalle enviado a la impresora');
    }, 500);
  };
  
  useEffect(() => {
    cargarDatos();
  }, [id]);
  
  /**
   * Carga los datos del control
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      if (controlData && reporteData) {
        // Usar datos pasados desde navegación
        setControl(controlData);
        setDetalles(reporteData.detalles || []);
      } else {
        // Cargar desde el servicio
        const reporte = await controlStockService.generarReporte(id);
        setControl(reporte.control);
        setDetalles(reporte.detalles || []);
      }
      
    } catch (error) {
      console.error('Error al cargar control:', error);
      toast.error('Error al cargar los datos del control');
      navigate('/stock/control/historial');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Exportar a Excel
   */
  const exportarExcel = async () => {
    try {
      setExportando(true);
      const blob = await controlStockService.exportarExcel(id);
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `control_inventario_${control.fecha_inicio.split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Control exportado correctamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar el control');
    } finally {
      setExportando(false);
    }
  };
  
  /**
   * Calcula estadísticas del control
   */
  const calcularEstadisticas = () => {
    const totalProductos = detalles.length;
    const productosContados = detalles.filter(d => d.contado).length;
    const diferenciasEncontradas = detalles.filter(d => d.diferencia !== 0 && d.diferencia !== null).length;
    
    const valorDiferencia = detalles.reduce((total, d) => {
      if (d.diferencia && d.producto?.precio_costo) {
        return total + (d.diferencia * d.producto.precio_costo);
      }
      return total;
    }, 0);
    
    return {
      totalProductos,
      productosContados,
      diferenciasEncontradas,
      valorDiferencia
    };
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!control) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Control no encontrado</p>
        <Button
          color="primary"
          onClick={() => navigate('/stock/control/historial')}
          className="mt-4"
        >
          Volver al Historial
        </Button>
      </div>
    );
  }
  
  const estadisticas = calcularEstadisticas();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Detalle de Control de Inventario
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Control del {new Date(control.fecha_inicio).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/stock/control/historial')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <Button
            color="secondary"
            onClick={handlePrint}
            icon={<FaPrint />}
          >
            Imprimir
          </Button>
          
          <Button
            color="primary"
            onClick={exportarExcel}
            loading={exportando}
            icon={<FaFileExport />}
          >
            Exportar Excel
          </Button>
        </div>
      </div>
      
      {/* Información general del control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <Card title="Información del Control" icon={<FaClipboardCheck />}>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha Inicio:</span>
              <span className="font-medium">
                {new Date(control.fecha_inicio).toLocaleString()}
              </span>
            </div>
            
            {control.fecha_fin && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha Fin:</span>
                <span className="font-medium">
                  {new Date(control.fecha_fin).toLocaleString()}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium">
                {control.tipo === 'completo' ? 'Inventario Completo' : 'Inventario Parcial'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Usuario:</span>
              <span className="font-medium">
                {control.usuario_nombre || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Sucursal:</span>
              <span className="font-medium">
                {control.sucursal_nombre || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Estado:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                control.estado === 'finalizado'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {control.estado === 'finalizado' && <FaCheckCircle className="mr-1" />}
                {control.estado === 'en_proceso' && <FaClock className="mr-1" />}
                {control.estado === 'finalizado' ? 'Finalizado' : 'En Proceso'}
              </span>
            </div>
          </div>
        </Card>
        
        <Card title="Resumen del Control" icon={<FaExclamationTriangle />}>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Productos:</span>
              <span className="font-medium">{estadisticas.totalProductos}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Productos Contados:</span>
              <span className="font-medium text-green-600">
                {estadisticas.productosContados}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Diferencias Encontradas:</span>
              <span className="font-medium text-red-600">
                {estadisticas.diferenciasEncontradas}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Valor de Diferencias:</span>
              <span className="font-medium text-purple-600">
                ${estadisticas.valorDiferencia.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Ajustes Aplicados:</span>
              <span className="font-medium">
                {control.ajustes_aplicados ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Observaciones */}
      {(control.observaciones || control.observaciones_finales) && (
        <Card title="Observaciones" className="no-print">
          {control.observaciones && (
            <div className="mb-3">
              <h4 className="font-medium text-gray-700 mb-1">Observaciones Iniciales:</h4>
              <p className="text-gray-600">{control.observaciones}</p>
            </div>
          )}
          
          {control.observaciones_finales && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Observaciones Finales:</h4>
              <p className="text-gray-600">{control.observaciones_finales}</p>
            </div>
          )}
        </Card>
      )}
      
      {/* Detalle de productos */}
      <Card title="Detalle de Productos Contados">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Stock Sistema
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Stock Físico
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Diferencia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detalles.map(item => (
                <tr key={item.producto_id}>
                  <td className="px-4 py-3 text-sm">
                    {item.producto?.codigo}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.producto?.nombre}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {item.stock_sistema}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {item.contado ? item.stock_fisico : '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {item.contado && item.diferencia !== null ? (
                      <span className={`font-medium ${
                        item.diferencia > 0 
                          ? 'text-green-600' 
                          : item.diferencia < 0 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                      }`}>
                        {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.observaciones || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Componente de impresión (oculto) */}
      <div style={{ display: 'none' }}>
        <div className="p-8 bg-white">
          {/* Encabezado */}
          <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
            <h1 className="text-2xl font-bold">Control de Inventario - Detalle</h1>
            <p className="text-lg mt-2">{control.sucursal_nombre}</p>
            <p className="text-sm text-gray-600">
              Fecha: {new Date(control.fecha_inicio).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Realizado por: {control.usuario_nombre}
            </p>
          </div>
          
          {/* Resumen */}
          <div className="mb-6 border p-3">
            <h3 className="font-semibold mb-2">Resumen del Control</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total de productos: {estadisticas.totalProductos}</div>
              <div>Productos contados: {estadisticas.productosContados}</div>
              <div>Diferencias encontradas: {estadisticas.diferenciasEncontradas}</div>
              <div>Valor de diferencia: ${estadisticas.valorDiferencia.toFixed(2)}</div>
            </div>
          </div>
          
          {/* Tabla de detalles */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left text-xs">Código</th>
                <th className="border p-2 text-left text-xs">Producto</th>
                <th className="border p-2 text-center text-xs">Sistema</th>
                <th className="border p-2 text-center text-xs">Físico</th>
                <th className="border p-2 text-center text-xs">Dif.</th>
                <th className="border p-2 text-left text-xs">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {detalles
                .filter(item => item.contado && item.diferencia !== 0)
                .map((item, index) => (
                  <tr key={item.producto_id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="border p-1 text-xs">{item.producto?.codigo}</td>
                    <td className="border p-1 text-xs">{item.producto?.nombre}</td>
                    <td className="border p-1 text-center text-xs">{item.stock_sistema}</td>
                    <td className="border p-1 text-center text-xs">{item.stock_fisico}</td>
                    <td className="border p-1 text-center text-xs">
                      <span className={item.diferencia > 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                      </span>
                    </td>
                    <td className="border p-1 text-xs">{item.observaciones || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          
          {/* Firmas */}
          <div className="mt-16 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm">Firma del Responsable</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm">Firma del Supervisor</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleControl;