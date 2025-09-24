/**
 * Componente de tabla reutilizable
 * 
 * Proporciona una tabla con ordenamiento, paginación y estilos predefinidos.
 * 
 * @module components/common/Table
 * @requires react
 */

import React, { useState, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

/**
 * Componente de tabla personalizada
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.columns - Definición de columnas
 * @param {Array} props.data - Datos a mostrar
 * @param {boolean} props.pagination - Si es true, muestra paginación
 * @param {number} props.itemsPerPage - Elementos por página
 * @param {boolean} props.striped - Si es true, aplica colores alternos en filas
 * @param {boolean} props.hoverable - Si es true, resalta filas al pasar el cursor
 * @param {Function} props.onRowClick - Función a ejecutar al hacer clic en una fila
 * @returns {JSX.Element} Componente Table
 */
const Table = ({
  columns = [], // ✅ Valor por defecto
  data = [],    // ✅ Valor por defecto
  pagination = false,
  itemsPerPage = 10,
  striped = true,
  hoverable = true,
  onRowClick
}) => {
  // Estado para ordenamiento
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'none'
  });
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  
  /**
   * Maneja el ordenamiento al hacer clic en una columna ordenable
   * @param {string} key - Identificador de la columna
   */
  const handleSort = (key) => {
    let direction = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = 'none';
      }
    }
    
    setSortConfig({ key, direction });
  };
  
  /**
   * Datos ordenados según la configuración actual
   */
  const sortedData = useMemo(() => {
    // ✅ CORRECCIÓN 1: Validar que data sea un array
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    if (sortConfig.direction === 'none' || !sortConfig.key) {
      return data;
    }
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      // Ordenar según el tipo de dato
      if (typeof aValue === 'string') {
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (sortConfig.direction === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
    });
  }, [data, sortConfig]);
  
  // ✅ CORRECCIÓN 2: Definir startIndex y endIndex
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  /**
   * Datos paginados según la página actual
   */
  const paginatedData = useMemo(() => {
    // ✅ CORRECCIÓN 3: Verificar que sortedData sea un array válido
    if (!Array.isArray(sortedData)) {
      return [];
    }
    
    // Si no hay paginación, devolver todos los datos
    if (!pagination) {
      return sortedData;
    }
    
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex, pagination]);
  
  /**
   * Número total de páginas
   */
  const pageCount = useMemo(() => {
    if (!Array.isArray(sortedData) || sortedData.length === 0) {
      return 0;
    }
    return Math.ceil(sortedData.length / itemsPerPage);
  }, [sortedData, itemsPerPage]);
  
  /**
   * Cambia a una página específica
   * @param {number} page - Número de página
   */
  const goToPage = (page) => {
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page);
    }
  };
  
  /**
   * Renderiza el icono de ordenamiento para una columna
   * @param {string} key - Identificador de la columna
   * @returns {JSX.Element} Icono de ordenamiento
   */
  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="ml-1 text-gray-400" />;
    }
    
    if (sortConfig.direction === 'asc') {
      return <FaSortUp className="ml-1 text-indigo-600" />;
    }
    
    return <FaSortDown className="ml-1 text-indigo-600" />;
  };

  // ✅ CORRECCIÓN 4: Validar columns
  if (!Array.isArray(columns) || columns.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No se han definido columnas para la tabla</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Tabla */}
      <table className="min-w-full divide-y divide-gray-200">
        {/* Cabecera */}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                className={`
                  px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''}
                `}
                onClick={() => {
                  if (column.sortable !== false) {
                    handleSort(column.accessor);
                  }
                }}
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable !== false && renderSortIcon(column.accessor)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Cuerpo */}
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedData.length > 0 ? (
            paginatedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`
                  ${striped && rowIdx % 2 === 1 ? 'bg-gray-50' : ''}
                  ${hoverable ? 'hover:bg-gray-100' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {column.cell ? column.cell(row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                No hay datos disponibles
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Paginación */}
      {pagination && pageCount > 1 && (
        <div className="py-3 px-6 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between items-center">
            {/* Información de páginas */}
            <p className="text-sm text-gray-700">
              Mostrando
              <span className="font-medium mx-1">
                {startIndex + 1}
              </span>
              a
              <span className="font-medium mx-1">
                {Math.min(endIndex, sortedData.length)}
              </span>
              de
              <span className="font-medium mx-1">{sortedData.length}</span>
              resultados
            </p>
            
            {/* Botones de paginación */}
            <div className="flex space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`
                  inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium
                  ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'}
                `}
              >
                Anterior
              </button>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                className={`
                  inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium
                  ${currentPage === pageCount
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'}
                `}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;