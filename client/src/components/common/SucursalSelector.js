// src/components/common/SucursalSelector.js
import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaStore } from 'react-icons/fa';

/**
 * Componente selector de sucursal
 */
const SucursalSelector = () => {
  const {
    sucursalSeleccionada,
    sucursalesDisponibles,
    cambiarSucursal,
    loadingSucursales
  } = useAuth();

  useEffect(() => {
    if (loadingSucursales) {
      return;
    }

    if (!sucursalesDisponibles || sucursalesDisponibles.length === 0) {
      return;
    }

    const currentId = sucursalSeleccionada?.id || null;
    const storedId = typeof window !== 'undefined'
      ? window.localStorage?.getItem?.('sucursalSeleccionada')
      : null;
    const firstSucursal = sucursalesDisponibles[0];

    const shouldSelectFirst = !currentId && !storedId;
    const selectedNotInList = currentId && !sucursalesDisponibles.some((sucursal) => sucursal.id === currentId);

    if (shouldSelectFirst || selectedNotInList) {
      console.log('[SUCURSAL SELECTOR] Seleccionando sucursal por defecto:', firstSucursal);
      cambiarSucursal(firstSucursal.id);
    }
  }, [loadingSucursales, sucursalesDisponibles, sucursalSeleccionada, cambiarSucursal]);

  // DEBUG: Siempre mostrar el selector para diagnosticar problemas
  console.log('🏪 [SUCURSAL SELECTOR] Estado:', {
    loadingSucursales,
    sucursalesDisponibles: sucursalesDisponibles.length,
    sucursalSeleccionada: sucursalSeleccionada?.id || 'ninguna'
  });

  return (
    <div className="flex items-center">
      <FaStore className="mr-2 text-gray-500" />
      <select
        value={sucursalSeleccionada?.id || ''}
        onChange={(e) => cambiarSucursal(e.target.value)}
        className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loadingSucursales}
      >
        <option value="">
          {loadingSucursales ? 'Cargando sucursales...' : 
           sucursalesDisponibles.length === 0 ? 'Sin sucursales disponibles' :
           'Seleccionar sucursal...'}
        </option>
        {sucursalesDisponibles.map(sucursal => (
          <option key={sucursal.id} value={sucursal.id}>
            {sucursal.nombre}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SucursalSelector;