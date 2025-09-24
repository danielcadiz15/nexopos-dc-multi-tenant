// src/components/modules/usuarios/AsignarSucursales.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Servicios
import usuariosService from '../../../services/usuarios.service';
import sucursalesService from '../../../services/sucursales.service';

// Componentes
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';

// Iconos
import { FaStore, FaSave, FaTimes } from 'react-icons/fa';

/**
 * Modal para asignar sucursales a un usuario
 */
const AsignarSucursales = ({ isOpen, onClose, usuario, onSuccess }) => {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalesSeleccionadas, setSucursalesSeleccionadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Cargar sucursales disponibles
  useEffect(() => {
    if (isOpen && usuario) {
      cargarDatos();
    }
  }, [isOpen, usuario]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las sucursales
      const todasSucursales = await sucursalesService.obtenerActivas();
      setSucursales(todasSucursales);
      
      // Cargar sucursales del usuario
      const sucursalesUsuario = await usuariosService.obtenerSucursales(usuario.id);
      setSucursalesSeleccionadas(sucursalesUsuario.map(s => s.id));
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSucursal = (sucursalId) => {
    setSucursalesSeleccionadas(prev => {
      if (prev.includes(sucursalId)) {
        return prev.filter(id => id !== sucursalId);
      } else {
        return [...prev, sucursalId];
      }
    });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    
    try {
      await usuariosService.asignarSucursales(usuario.id, sucursalesSeleccionadas);
      
      toast.success('Sucursales asignadas correctamente');
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al asignar sucursales:', error);
      toast.error('Error al asignar sucursales');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Asignar Sucursales
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FaTimes />
          </button>
        </div>

        {usuario && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-700">Usuario:</p>
            <p className="text-sm text-gray-900">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-xs text-gray-500">{usuario.email}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {sucursales.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No hay sucursales disponibles
              </p>
            ) : (
              <div className="space-y-2">
                {sucursales.map(sucursal => (
                  <label
                    key={sucursal.id}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={sucursalesSeleccionadas.includes(sucursal.id)}
                      onChange={() => handleToggleSucursal(sucursal.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <FaStore className="mr-2 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {sucursal.nombre}
                        </span>
                      </div>
                      {sucursal.direccion && (
                        <p className="text-xs text-gray-500 ml-6">
                          {sucursal.direccion}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            color="secondary"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </Button>
          
          <Button
            color="primary"
            onClick={handleGuardar}
            loading={guardando}
            icon={<FaSave />}
            disabled={loading}
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AsignarSucursales;