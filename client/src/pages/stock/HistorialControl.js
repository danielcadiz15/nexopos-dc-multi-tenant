/**
 * Página de historial de controles de inventario
 * 
 * Muestra el historial de todos los controles realizados
 * con opciones de filtrado y exportación.
 * 
 * @module pages/stock/HistorialControl
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FaHistory, FaEye, FaFileExport, FaFilter,
  FaArrowLeft, FaCalendarAlt, FaCheckCircle,
  FaClock, FaStore
} from 'react-icons/fa';

const HistorialControl = () => {
  const navigate = useNavigate();
  const { sucursalSeleccionada, sucursalesDisponibles } = useAuth();
  
  // Estados
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes'); // 'semana', 'mes', 'año', 'todos'
  const [estadisticas, setEstadisticas] = useState(null);
  
  useEffect(() => {
    cargarHistorial();
  }, [filtroSucursal, filtroEstado, filtroPeriodo]);
  
  /**
   * Carga el historial de controles
   */
  const cargarHistorial = async () => {
    try {
      setLoading(true);
      
      // Determinar fecha inicio según periodo
      let fechaInicio = null;
      const hoy = new Date();
      
      switch (filtroPeriodo) {
        case 'semana':
          fechaInicio = new Date(hoy.setDate(hoy.getDate() - 7));
          break;
        case 'mes':
          fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 1));
          break;
        case 'año':
          fechaInicio = new Date(hoy.setFullYear(hoy.getFullYear() - 1));
          break;
      }
      
      const filtros = {
        ...(filtroEstado && { estado: filtroEstado }),
        ...(fechaInicio && { fecha_desde: fechaInicio.toISOString() })
      };
      
      const sucursalId = filtroSucursal || sucursalSeleccionada?.id;
      
      if (sucursalId) {
        const data = await controlStockService.obtenerHistorial(sucursalId, filtros);
        setControles(data);
        
        // Obtener estadísticas
        const stats = await controlStockService.obtenerEstadisticas(sucursalId, filtros);
        setEstadisticas(stats);
      }
      
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Ver detalle de un control
   */
  const verDetalle = async (control) => {
    try {
      const reporte = await controlStockService.generarReporte(control.id);
      // Navegar a página de detalle o mostrar modal
      navigate(`/stock/control/${control.id}`, { 
        state: { control, reporte } 
      });
    } catch (error) {
      console.error('Error al ver detalle:', error);
      toast.error('Error al cargar el detalle');
    }
  };
  
  /**
   * Exportar control a Excel
   */
  const exportarControl = async (control) => {
    try {
      const blob = await controlStockService.exportarExcel(control.id);
      
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
    }
  };
  
  /**
   * Columnas de la tabla
   */
  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha_inicio',
      cell: (row) => (
        <div>
          <div className="font-medium">
            {new Date(row.fecha_inicio).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(row.fecha_inicio).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.tipo === 'completo' 
            ? 'bg-blue-100 text-blue-800'
            : 'bg-purple-100 text-purple-800'
        }`}>
          {row.tipo === 'completo' ? 'Inventario Completo' : 'Inventario Parcial'}
        </span>
      )
    },
    {
      header: 'Usuario',
      accessor: 'usuario_nombre',
      cell: (row) => row.usuario_nombre || 'N/A'
    },
    {
      header: 'Productos',
      accessor: 'total_productos',
      cell: (row) => (
        <div className="text-center">
          <div className="font-medium">{row.total_productos || 0}</div>
          <div className="text-xs text-gray-500">
            {row.productos_contados || 0} contados
          </div>
        </div>
      )
    },
    {
      header: 'Diferencias',
      accessor: 'diferencias',
      cell: (row) => (
        <div className="text-center">
          <span className={`font-medium ${
            row.diferencias_encontradas > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {row.diferencias_encontradas || 0}
          </span>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.estado === 'finalizado'
            ? 'bg-green-100 text-green-800'
            : row.estado === 'en_proceso'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
          {row.estado === 'finalizado' && <FaCheckCircle className="mr-1" />}
          {row.estado === 'en_proceso' && <FaClock className="mr-1" />}
          {row.estado === 'finalizado' ? 'Finalizado' : 'En Proceso'}
        </span>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => verDetalle(row)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalle"
          >
            <FaEye />
          </button>
          
          {row.estado === 'finalizado' && (
            <button
              onClick={() => exportarControl(row)}
              className="text-green-600 hover:text-green-800"
              title="Exportar Excel"
            >
              <FaFileExport />
            </button>
          )}
        </div>
      )
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Historial de Controles de Inventario
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Registro de todos los controles realizados
          </p>
        </div>
        
        <Button
          color="secondary"
          onClick={() => navigate('/stock/control')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="text-center">
              <h3 className="text-blue-800 font-medium text-sm">
                Controles Realizados
              </h3>
              <p className="text-2xl font-bold text-blue-900">
                {estadisticas.controles_realizados || 0}
              </p>
            </div>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <div className="text-center">
              <h3 className="text-green-800 font-medium text-sm">
                Productos Contados
              </h3>
              <p className="text-2xl font-bold text-green-900">
                {estadisticas.productos_contados || 0}
              </p>
            </div>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="text-center">
              <h3 className="text-yellow-800 font-medium text-sm">
                Ajustes Aplicados
              </h3>
              <p className="text-2xl font-bold text-yellow-900">
                {estadisticas.ajustes_aplicados || 0}
              </p>
            </div>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <div className="text-center">
              <h3 className="text-purple-800 font-medium text-sm">
                Valor de Ajustes
              </h3>
              <p className="text-2xl font-bold text-purple-900">
                ${(estadisticas.valor_ajustes || 0).toFixed(2)}
              </p>
            </div>
          </Card>
        </div>
      )}
      
      {/* Filtros */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <span className="font-medium">Filtros:</span>
          </div>
          
          {sucursalesDisponibles.length > 1 && (
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Sucursal actual</option>
              {sucursalesDisponibles.map(suc => (
                <option key={suc.id} value={suc.id}>{suc.nombre}</option>
              ))}
            </select>
          )}
          
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="finalizado">Finalizados</option>
            <option value="en_proceso">En proceso</option>
          </select>
          
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
            <option value="año">Último año</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </Card>
      
      {/* Tabla de controles */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {controles.length === 0 ? (
              <div className="text-center py-10">
                <FaHistory className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay controles registrados
                </h3>
                <p className="text-gray-500">
                  {filtroEstado || filtroPeriodo !== 'todos'
                    ? 'No se encontraron controles con los filtros seleccionados'
                    : 'Aún no se han realizado controles de inventario'}
                </p>
                
                <div className="mt-4">
                  <Button
                    color="primary"
                    onClick={() => navigate('/stock/control')}
                  >
                    Realizar Control
                  </Button>
                </div>
              </div>
            ) : (
              <Table
                columns={columns}
                data={controles}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default HistorialControl;