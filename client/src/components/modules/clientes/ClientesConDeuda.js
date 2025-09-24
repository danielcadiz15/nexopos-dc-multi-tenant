import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import clientesService from '../../../services/clientes.service';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import { FaExclamationTriangle, FaCalendarAlt, FaDollarSign, FaUser } from 'react-icons/fa';

const ClientesConDeuda = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    cargarClientesConDeuda();
  }, [filtros]);

  const cargarClientesConDeuda = async () => {
    try {
      setLoading(true);
      const data = await clientesService.obtenerClientesConDeuda(filtros);
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes con deuda:', error);
      toast.error('Error al cargar clientes con deuda');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const formatMoney = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return '$' + amount.toLocaleString('es-AR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-AR');
  };

  const totalDeuda = clientes.reduce((sum, cliente) => sum + (cliente.deuda_total || 0), 0);

  return (
    <Card title="⚠️ Clientes con Deuda" icon={<FaExclamationTriangle />}>
      {/* Filtros */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaCalendarAlt className="inline mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaCalendarAlt className="inline mr-1" />
              Fecha Fin
            </label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-600 mr-2" />
            <span className="font-medium text-red-800">
              {clientes.length} clientes con deuda
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-red-600">
              {formatMoney(totalDeuda)}
            </div>
            <div className="text-sm text-red-600">Total deuda</div>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Spinner size="md" />
          <span className="ml-2 text-gray-600">Cargando clientes con deuda...</span>
        </div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-8">
          <FaExclamationTriangle className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            No hay clientes con deuda
          </h3>
          <p className="text-gray-500">
            En el período seleccionado no se encontraron clientes con deuda pendiente
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {clientes.map((cliente, index) => (
            <div key={cliente.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <FaUser className="text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-800">
                      {`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Cliente General'}
                    </h3>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Teléfono: {cliente.telefono || 'N/A'}</div>
                    <div>Email: {cliente.email || 'N/A'}</div>
                    <div>Ventas con deuda: {cliente.ventas_con_deuda || 0}</div>
                    {cliente.ultima_compra && (
                      <div>Última compra: {formatDate(cliente.ultima_compra)}</div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-red-600">
                    {formatMoney(cliente.deuda_total)}
                  </div>
                  <div className="text-xs text-gray-500">
                    #{index + 1}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ClientesConDeuda; 