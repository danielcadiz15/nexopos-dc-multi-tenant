/**
 * Componente de tarjeta de producto
 * 
 * Muestra información básica de un producto en formato de tarjeta.
 * 
 * @module components/modules/productos/ProductoCard
 * @requires react, react-router-dom, react-icons
 * @related_files ../../pages/productos/Productos.js
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBoxOpen, FaEdit, FaEye, FaShoppingCart, 
  FaDollarSign, FaTag, FaIndustry 
} from 'react-icons/fa';

/**
 * Componente para mostrar un producto en formato de tarjeta
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.producto - Datos del producto
 * @param {Function} props.onAddToCart - Función para agregar al carrito (opcional)
 * @returns {JSX.Element} Componente ProductoCard
 */
const ProductoCard = ({ producto, onAddToCart }) => {
  if (!producto) return null;
  
  /**
   * Determina la clase de color para el indicador de stock
   * @returns {string} Clases CSS para el indicador
   */
  const getStockClass = () => {
    if (!producto.stock_actual && producto.stock_actual !== 0) return 'bg-gray-100 text-gray-600';
    
    if (producto.stock_actual <= 0) {
      return 'bg-red-100 text-red-600';
    } else if (producto.stock_actual <= 5) {
      return 'bg-yellow-100 text-yellow-600';
    } else {
      return 'bg-green-100 text-green-600';
    }
  };
  
  /**
   * Maneja clic para agregar al carrito
   * @param {Event} e - Evento de clic
   */
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onAddToCart && producto.stock_actual > 0) {
      onAddToCart(producto);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 transition-shadow hover:shadow-md overflow-hidden">
      {/* Imagen o placeholder */}
      <div className="h-40 bg-gray-50 flex items-center justify-center relative">
        {producto.imagen ? (
          <img 
            src={producto.imagen} 
            alt={producto.nombre} 
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <FaBoxOpen size={36} />
            <span className="text-sm mt-2">Sin imagen</span>
          </div>
        )}
        
        {/* Indicador de stock */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStockClass()}`}>
          Stock: {producto.stock_actual ?? 'N/A'}
        </div>
      </div>
      
      {/* Información del producto */}
      <div className="p-4">
        <h3 className="font-medium text-gray-800 mb-1 truncate" title={producto.nombre}>
          {producto.nombre}
        </h3>
        
        <div className="text-sm text-gray-500 mb-2 truncate" title={producto.codigo}>
          Código: {producto.codigo || 'N/A'}
        </div>
        
        {/* Categoría y proveedor */}
        <div className="flex flex-wrap gap-1 mb-3">
          {producto.categoria && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700">
              <FaTag className="mr-1" />
              {producto.categoria}
            </span>
          )}
          
          {producto.proveedor && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
              <FaIndustry className="mr-1" />
              {producto.proveedor}
            </span>
          )}
        </div>
        
        {/* Precios */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-lg font-bold text-gray-800">
              ${parseFloat(producto.precio_venta).toFixed(2)}
            </div>
            
            {producto.precio_costo && (
              <div className="text-xs text-gray-500">
                Costo: ${parseFloat(producto.precio_costo).toFixed(2)}
              </div>
            )}
          </div>
          
          {/* Margen (si tiene precio de costo) */}
          {producto.precio_costo && producto.precio_venta && (
            <div className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-medium">
              <FaDollarSign className="inline mr-1" />
              {Math.round(((producto.precio_venta - producto.precio_costo) / producto.precio_venta) * 100)}%
            </div>
          )}
        </div>
        
        {/* Acciones */}
        <div className="flex justify-between mt-4">
          <Link 
            to={`/productos/${producto.id}`}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <FaEye className="mr-1" />
            Detalles
          </Link>
          
          <div className="flex space-x-2">
            {onAddToCart && (
              <button
                onClick={handleAddToCart}
                disabled={!producto.stock_actual || producto.stock_actual <= 0}
                className={`text-sm p-1 rounded hover:bg-gray-100 ${
                  !producto.stock_actual || producto.stock_actual <= 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-green-600 hover:text-green-800'
                }`}
                title={
                  !producto.stock_actual || producto.stock_actual <= 0
                    ? 'Sin stock disponible'
                    : 'Agregar al carrito'
                }
              >
                <FaShoppingCart />
              </button>
            )}
            
            <Link
              to={`/productos/editar/${producto.id}`}
              className="text-sm p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-gray-100"
              title="Editar producto"
            >
              <FaEdit />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductoCard;