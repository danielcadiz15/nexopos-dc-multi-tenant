// src/components/common/SucursalSelector.js
import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaStore } from 'react-icons/fa';

const getSucursalId = (sucursal) => {
  const rawId = sucursal?.id || sucursal?._id || sucursal?.sucursal_id || '';
  return rawId ? String(rawId) : '';
};

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

    const currentId = getSucursalId(sucursalSeleccionada) || null;
    const storedId = typeof window !== 'undefined'
      ? window.localStorage?.getItem?.('sucursalSeleccionada')
      : null;
    const firstSucursal = sucursalesDisponibles[0];

    const shouldSelectFirst = !currentId && !storedId;
    const selectedNotInList = currentId && !sucursalesDisponibles.some((sucursal) => getSucursalId(sucursal) === currentId);

    if (shouldSelectFirst || selectedNotInList) {
      console.log('[SUCURSAL SELECTOR] Seleccionando sucursal por defecto:', firstSucursal);
      cambiarSucursal(getSucursalId(firstSucursal));
    }
  }, [loadingSucursales, sucursalesDisponibles, sucursalSeleccionada, cambiarSucursal]);

  // DEBUG: Siempre mostrar el selector para diagnosticar problemas
  console.log('🏪 [SUCURSAL SELECTOR] Estado:', {
    loadingSucursales,
    sucursalesDisponibles: sucursalesDisponibles.length,
    sucursalSeleccionada: getSucursalId(sucursalSeleccionada) || 'ninguna'
  });

  return (
    <div className="flex items-center">
      <FaStore className="mr-2 text-gray-500" />
      <select
        value={getSucursalId(sucursalSeleccionada)}
        onChange={(e) => cambiarSucursal(e.target.value)}
        className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loadingSucursales}
      >
        <option value="">
          {loadingSucursales ? 'Cargando sucursales...' : 
           sucursalesDisponibles.length === 0 ? 'Sin sucursales disponibles' :
           'Seleccionar sucursal...'}
        </option>
        {sucursalesDisponibles.map((sucursal) => {
          const sucursalId = getSucursalId(sucursal);
          return (
          <option key={sucursalId} value={sucursalId}>
            {sucursal.nombre}
          </option>
          );
        })}
      </select>
    </div>
  );
};

export default SucursalSelector;