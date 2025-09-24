import React, { useState } from 'react';
import { toast } from 'react-toastify';
import ventasService from '../../services/ventas.service';

import Button from './Button';
import Spinner from './Spinner';

import { FaBroom, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

const LimpiezaVentas = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState('');

  const opcionesLimpieza = [
    {
      id: 'ventas_duplicadas',
      titulo: 'Eliminar Ventas Duplicadas',
      descripcion: 'Encuentra y elimina ventas que tengan el mismo número o datos idénticos',
      icono: FaTrash,
      color: 'red'
    },
    {
      id: 'ventas_vacias',
      titulo: 'Eliminar Ventas Vacías',
      descripcion: 'Elimina ventas que no tengan productos o tengan total 0',
      icono: FaBroom,
      color: 'orange'
    },
    {
      id: 'ventas_antiguas',
      titulo: 'Limpiar Ventas Antiguas',
      descripcion: 'Elimina ventas canceladas o devueltas de más de 30 días',
      icono: FaBroom,
      color: 'yellow'
    }
  ];

  const handleLimpieza = async () => {
    if (!opcionSeleccionada) {
      toast.warning('Selecciona una opción de limpieza');
      return;
    }

    setLoading(true);
    try {
      let resultado;
      
      switch (opcionSeleccionada) {
        case 'ventas_duplicadas':
          resultado = await ventasService.limpiarVentasDuplicadas();
          break;
        case 'ventas_vacias':
          resultado = await ventasService.limpiarVentasVacias();
          break;
        case 'ventas_antiguas':
          resultado = await ventasService.limpiarVentasAntiguas();
          break;
        default:
          throw new Error('Opción de limpieza no válida');
      }

      toast.success(`Limpieza completada: ${resultado.eliminadas} ventas eliminadas`);
      onClose();
      
    } catch (error) {
      console.error('Error en limpieza:', error);
      toast.error('Error al realizar la limpieza: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            <FaBroom className="inline mr-2" />
            Limpieza de Ventas
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Selecciona una opción de limpieza para optimizar la base de datos de ventas.
          </p>

          <div className="space-y-3">
            {opcionesLimpieza.map((opcion) => {
              const Icono = opcion.icono;
              return (
                <div
                  key={opcion.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    opcionSeleccionada === opcion.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setOpcionSeleccionada(opcion.id)}
                >
                  <div className="flex items-center">
                    <Icono className={`text-${opcion.color}-500 mr-3`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {opcion.titulo}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {opcion.descripcion}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-500 mr-2" />
            <span className="text-sm text-yellow-800">
              <strong>Advertencia:</strong> Estas acciones no se pueden deshacer.
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleLimpieza}
            disabled={!opcionSeleccionada || loading}
            loading={loading}
          >
            {loading ? 'Limpiando...' : 'Ejecutar Limpieza'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LimpiezaVentas; 