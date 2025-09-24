import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { FaTrash, FaEye, FaCalendarAlt, FaUserAlt, FaBuilding } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import ventasService from '../../services/ventas.service';
import { toast } from 'react-toastify';

const VentasEliminadas = () => {
  const [ventasEliminadas, setVentasEliminadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    cargarVentasEliminadas();
  }, []);

  const cargarVentasEliminadas = async () => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando carga de ventas eliminadas...');
      const data = await ventasService.obtenerVentasEliminadas();
      console.log('📦 Datos recibidos:', data);
      console.log('📊 Tipo de datos:', typeof data);
      console.log('📊 Es array:', Array.isArray(data));
      console.log('📊 Longitud:', data?.length);
      setVentasEliminadas(data);
      console.log('✅ Estado actualizado con ventas eliminadas');
    } catch (error) {
      console.error('❌ Error al cargar ventas eliminadas:', error);
      toast.error('Error al cargar ventas eliminadas');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    
    // Manejar timestamps de Firestore
    let fechaObj;
    if (fecha && typeof fecha === 'object' && fecha.toDate) {
      // Es un timestamp de Firestore
      fechaObj = fecha.toDate();
    } else if (fecha) {
      // Es una fecha normal
      fechaObj = new Date(fecha);
    } else {
      return 'N/A';
    }
    
    return fechaObj.toLocaleDateString('es-AR') + ' ' + fechaObj.toLocaleTimeString('es-AR');
  };

  const formatearTotal = (total) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(total || 0);
  };

  if (!currentUser || (currentUser.rol !== 'Administrador' && currentUser.rol !== 'admin' && currentUser.email !== 'danielcadiz15@gmail.com')) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Acceso Denegado</h2>
            <p className="text-gray-600">No tienes permisos para ver las ventas eliminadas.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ventas Eliminadas</h1>
        <p className="text-gray-600">Registro de ventas que han sido eliminadas del sistema</p>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando ventas eliminadas...</p>
          </div>
        ) : ventasEliminadas.length === 0 ? (
          <div className="text-center py-8">
            <FaTrash className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No hay ventas eliminadas</h3>
            <p className="text-gray-600">No se han eliminado ventas en el sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eliminada por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Eliminación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventasEliminadas.map((ventaEliminada) => (
                  <tr key={ventaEliminada.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaTrash className="text-red-500 mr-2" />
                        <span className="font-medium text-gray-900">
                          {ventaEliminada.numero_venta || ventaEliminada.numero || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaCalendarAlt className="text-gray-400 mr-2" />
                        <span className="text-gray-900">
                          {formatearFecha(ventaEliminada.fecha)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaUserAlt className="text-gray-400 mr-2" />
                        <span className="text-gray-900">
                          {ventaEliminada.cliente_info?.nombre_completo || ventaEliminada.cliente_nombre || 'Cliente General'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {formatearTotal(ventaEliminada.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">
                        {ventaEliminada.eliminado_por || ventaEliminada.usuario_eliminacion || 'Sistema'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaCalendarAlt className="text-gray-400 mr-2" />
                        <span className="text-gray-900">
                          {formatearFecha(ventaEliminada.fecha_eliminacion)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">
                        {ventaEliminada.motivo_eliminacion || ventaEliminada.motivo || 'Sin motivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VentasEliminadas; 