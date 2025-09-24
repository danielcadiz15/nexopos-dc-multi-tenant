/**
 * Componente de tarjeta de producto
 * 
 * Muestra la información principal de un producto en formato de tarjeta.
 * Utilizado en listados y en la página de detalle del producto.
 * 
 * @module components/modules/productos/ProductoCard
 * @requires react, react-router-dom
 * @related_files ../../pages/productos/DetalleProducto.js
 */

import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

// Iconos
import { 
  FaBox, FaTags, FaBoxes, FaTruck, FaWarehouse,
  FaEye, FaEdit, FaTrash 
} from 'react-icons/fa';

// Imagen de placeholder si no hay imagen
import imagenDefault from '../../../assets/images/producto-default.png';

/**
 * Componente de tarjeta de producto
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.producto - Datos del producto
 * @param {boolean} props.mostrarAcciones - Mostrar botones de acción
 * @param {Function} props.onEditar - Función para editar producto
 * @param {Function} props.onEliminar - Función para eliminar producto
 * @returns {JSX.Element} Componente ProductoCard
 */
const ProductoCard = ({ 
  producto, 
  mostrarAcciones = true,
  onEditar,
  onEliminar 
}) => {
  // Si no hay producto
  if (!producto) {
    return null;
  }
  
  /**
   * Formatea un valor numérico a 2 decimales
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearNumero = (valor) => {
    return parseFloat(valor).toFixed(2);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="md:flex">
        {/* Imagen del producto */}
        <div className="md:flex-shrink-0 bg-gray-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
          {producto.imagen ? (
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="h-48 w-full md:w-64 object-cover"
            />
          ) : (
            <div className="h-48 w-full md:w-64 flex items-center justify-center bg-gray-100">
              <FaBox className="text-6xl text-gray-300" />
            </div>
          )}
        </div>
        
        {/* Información principal */}
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{producto.nombre}</h2>
              <p className="text-sm text-gray-500">Código: {producto.codigo}</p>
            </div>
            
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  producto.stock?.cantidad <= producto.stock?.stock_minimo 
                    ? 'bg-red-100 text-red-600'
                    :producto.stock?.cantidad <= producto.stock?.stock_minimo
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-green-100 text-green-600'
                }`}>
                  Stock: {producto.stock?.cantidad || 0}
                </span>
                
                {producto.activo === false && (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                    Inactivo
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Descripción */}
          {producto.descripcion && (
            <p className="mt-2 text-gray-600 line-clamp-2">
              {producto.descripcion}
            </p>
          )}
          
          {/* Información adicional */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <FaTags className="text-gray-500 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Precios</div>
                <div className="font-medium">
                  Costo: ${formatearNumero(producto.precio_costo)} | 
                  Venta: ${formatearNumero(producto.precio_venta)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <FaBoxes className="text-gray-500 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Categoría</div>
                <div>{producto.categoria || 'Sin categoría'}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <FaTruck className="text-gray-500 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Proveedor</div>
                <div>{producto.proveedor || 'Sin proveedor'}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <FaWarehouse className="text-gray-500 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Stock Mínimo / Ubicación</div>
                <div>{producto.stock_minimo} / {producto.ubicacion || 'No especificada'}</div>
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          {mostrarAcciones && (
            <div className="mt-4 flex justify-end space-x-2">
              <Link
                to={`/productos/${producto.id}`}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center"
              >
                <FaEye className="mr-1" />
                Ver
              </Link>
              
              {onEditar && (
                <button
                  onClick={() => onEditar(producto.id)}
                  className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 flex items-center"
                >
                  <FaEdit className="mr-1" />
                  Editar
                </button>
              )}
              
              {onEliminar && (
                <button
                  onClick={() => onEliminar(producto.id)}
                  className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center"
                >
                  <FaTrash className="mr-1" />
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Validación de propiedades
ProductoCard.propTypes = {
  producto: PropTypes.object.isRequired,
  mostrarAcciones: PropTypes.bool,
  onEditar: PropTypes.func,
  onEliminar: PropTypes.func
};

export default ProductoCard;