// Crear archivo: src/components/modules/ventas/DevolucionParcialDialog.js

import React, { useState, useEffect } from 'react';
import { FaTimes, FaUndo, FaMinus, FaPlus } from 'react-icons/fa';
import Button from '../../common/Button';
import { toast } from 'react-toastify';

const DevolucionParcialDialog = ({ isOpen, onClose, venta, onDevolucion }) => {
  const [productosDevolucion, setProductosDevolucion] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (venta && venta.detalles) {
      // Inicializar productos con cantidad 0
      setProductosDevolucion(
        venta.detalles.map(detalle => ({
          id: detalle.id,
          producto_id: detalle.producto_id,
          nombre: detalle.producto_info?.nombre || detalle.nombre || 'Sin nombre',
          precio_unitario: detalle.precio_unitario,
          cantidad_original: detalle.cantidad,
          cantidad_devolver: 0,
          subtotal: 0
        }))
      );
    }
  }, [venta]);

  const handleCantidadChange = (index, nuevaCantidad) => {
    const cantidad = Math.max(0, Math.min(nuevaCantidad, productosDevolucion[index].cantidad_original));
    
    const nuevosProductos = [...productosDevolucion];
    nuevosProductos[index].cantidad_devolver = cantidad;
    nuevosProductos[index].subtotal = cantidad * nuevosProductos[index].precio_unitario;
    
    setProductosDevolucion(nuevosProductos);
  };

  const getTotalDevolucion = () => {
    return productosDevolucion.reduce((total, prod) => total + prod.subtotal, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const productosADevolver = productosDevolucion.filter(p => p.cantidad_devolver > 0);
    
    if (productosADevolver.length === 0) {
      toast.warning('Debe seleccionar al menos un producto para devolver');
      return;
    }

    if (!motivo.trim()) {
      toast.warning('Por favor ingrese el motivo de la devolución');
      return;
    }

    setProcesando(true);
    
    try {
      await onDevolucion(productosADevolver, motivo);
      onClose();
      toast.success('Devolución parcial procesada correctamente');
    } catch (error) {
      console.error('Error al procesar devolución:', error);
      toast.error('Error al procesar la devolución');
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <FaUndo className="mr-2" />
              Devolución Parcial - Venta {venta?.numero}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Lista de productos */}
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-gray-700">Seleccione productos a devolver:</h3>
              
              {productosDevolucion.map((producto, index) => (
                <div key={producto.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-sm text-gray-600">
                        Precio unitario: ${producto.precio_unitario.toFixed(2)} | 
                        Cantidad vendida: {producto.cantidad_original}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleCantidadChange(index, producto.cantidad_devolver - 1)}
                          className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          disabled={producto.cantidad_devolver === 0}
                        >
                          <FaMinus size={12} />
                        </button>
                        
                        <input
                          type="number"
                          value={producto.cantidad_devolver}
                          onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 0)}
                          className="w-16 text-center border rounded px-2 py-1"
                          min="0"
                          max={producto.cantidad_original}
                        />
                        
                        <button
                          type="button"
                          onClick={() => handleCantidadChange(index, producto.cantidad_devolver + 1)}
                          className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          disabled={producto.cantidad_devolver >= producto.cantidad_original}
                        >
                          <FaPlus size={12} />
                        </button>
                      </div>
                      
                      <div className="text-right min-w-[100px]">
                        <p className="font-medium">
                          ${producto.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Motivo de devolución */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la devolución *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Ingrese el motivo de la devolución..."
                required
              />
            </div>

            {/* Total a devolver */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total a devolver:</span>
                <span className="text-red-600">${getTotalDevolucion().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                color="secondary"
                onClick={onClose}
                disabled={procesando}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                color="warning"
                icon={<FaUndo />}
                loading={procesando}
                disabled={procesando || getTotalDevolucion() === 0}
              >
                Procesar Devolución
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevolucionParcialDialog;