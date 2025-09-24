// src/components/modules/productos/ListasPreciosModal.js
import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import listasPreciosService from '../../../services/listas-precios.service';
import { formatCurrency } from '../../../utils/format';
import { useAuth } from '../../../contexts/AuthContext';

const ListasPreciosModal = ({ isOpen, onClose, producto, onUpdate }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  
  // Iconos SVG inline
  const SaveIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
    </svg>
  );

  const HistoryIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  );

  const DollarIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
    </svg>
  );

  const PercentIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 5a3 3 0 015.777-1.153 3.003 3.003 0 016.32 1.874L17 7h1a1 1 0 010 2h-1v1a1 1 0 01-1 1v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a1 1 0 01-1-1V9H2a1 1 0 110-2h1l-.103-1.279A3 3 0 015 5zM6 10v8h8v-8H6zm1-3h6V5a1 1 0 00-1-1H8a1 1 0 00-1 1v2z" clipRule="evenodd" />
    </svg>
  );
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    precio_costo: 0,
    listas_precios: {
      mayorista: 0,
      interior: 0,
      posadas: 0
    },
    motivo: ''
  });
  
  // Márgenes calculados
  const [margenes, setMargenes] = useState({
    mayorista: 0,
    interior: 0,
    posadas: 0
  });
  
  // Cargar datos del producto cuando se abre el modal
  useEffect(() => {
    if (producto && isOpen) {
      setFormData({
        precio_costo: producto.precio_costo || 0,
        listas_precios: {
          mayorista: producto.listas_precios?.mayorista || producto.precio_venta || 0,
          interior: producto.listas_precios?.interior || producto.precio_venta || 0,
          posadas: producto.listas_precios?.posadas || producto.precio_venta || 0
        },
        motivo: ''
      });
      
      calcularMargenes();
    }
  }, [producto, isOpen]);
  
  // Calcular márgenes cuando cambian los precios
  useEffect(() => {
    calcularMargenes();
  }, [formData.precio_costo, formData.listas_precios]);
  
  const calcularMargenes = () => {
    const costo = parseFloat(formData.precio_costo) || 0;
    
    if (costo > 0) {
      setMargenes({
        mayorista: ((formData.listas_precios.mayorista - costo) / costo * 100).toFixed(2),
        interior: ((formData.listas_precios.interior - costo) / costo * 100).toFixed(2),
        posadas: ((formData.listas_precios.posadas - costo) / costo * 100).toFixed(2)
      });
    } else {
      setMargenes({ mayorista: 0, interior: 0, posadas: 0 });
    }
  };
  
  const handleCostoChange = (value) => {
    const costo = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      precio_costo: costo
    }));
  };
  
  const handlePrecioChange = (lista, value) => {
    const precio = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      listas_precios: {
        ...prev.listas_precios,
        [lista]: precio
      }
    }));
  };
  
  const handleMargenChange = (lista, margen) => {
    const costo = parseFloat(formData.precio_costo) || 0;
    const margenFloat = parseFloat(margen) || 0;
    const nuevoPrecio = costo * (1 + margenFloat / 100);
    
    setFormData(prev => ({
      ...prev,
      listas_precios: {
        ...prev.listas_precios,
        [lista]: parseFloat(nuevoPrecio.toFixed(2))
      }
    }));
  };
  
  const aplicarMargenATodas = (margen) => {
    const costo = parseFloat(formData.precio_costo) || 0;
    const margenFloat = parseFloat(margen) || 0;
    
    if (costo > 0) {
      const margenMayorista = margenFloat - 5; // 5% menos para mayorista
      const margenInterior = margenFloat + 5;   // 5% más para interior
      const margenPosadas = margenFloat;        // Margen base para Posadas
      
      setFormData(prev => ({
        ...prev,
        listas_precios: {
          mayorista: parseFloat((costo * (1 + margenMayorista / 100)).toFixed(2)),
          interior: parseFloat((costo * (1 + margenInterior / 100)).toFixed(2)),
          posadas: parseFloat((costo * (1 + margenPosadas / 100)).toFixed(2))
        }
      }));
    }
  };
  
  const cargarHistorial = async () => {
    if (!producto?.id) return;
    
    try {
      setLoading(true);
      const data = await listasPreciosService.obtenerHistorial(producto.id);
      setHistorial(data);
      setMostrarHistorial(true);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      alert('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.motivo.trim()) {
      alert('Por favor indica el motivo del cambio');
      return;
    }
    
    // Validar que los precios sean mayores al costo
    const costo = parseFloat(formData.precio_costo) || 0;
    const hayPrecioMenorACosto = Object.values(formData.listas_precios).some(
      precio => parseFloat(precio) < costo
    );
    
    if (hayPrecioMenorACosto) {
      alert('Los precios de venta no pueden ser menores al costo');
      return;
    }
    
    try {
      setLoading(true);
      
      // Preparar datos para enviar
      const datosActualizacion = {
        precio_costo: parseFloat(formData.precio_costo),
        listas_precios: {
          mayorista: parseFloat(formData.listas_precios.mayorista),
          interior: parseFloat(formData.listas_precios.interior),
          posadas: parseFloat(formData.listas_precios.posadas)
        },
        motivo: formData.motivo,
        usuario_id: currentUser?.uid
      };
      
      console.log('Enviando actualización:', datosActualizacion);
      
      await listasPreciosService.actualizarPrecios(producto.id, datosActualizacion);
      
      alert('Precios actualizados correctamente');
      
      // Actualizar el producto en la vista principal con los datos exactos
      if (onUpdate) {
        const productoActualizado = {
          ...producto,
          precio_costo: datosActualizacion.precio_costo,
          listas_precios: datosActualizacion.listas_precios,
          precio_venta: datosActualizacion.listas_precios.posadas
        };
        
        console.log('Producto actualizado:', productoActualizado);
        onUpdate(productoActualizado);
      }
      
      onClose();
    } catch (error) {
      console.error('Error al actualizar precios:', error);
      alert('Error al actualizar precios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (!producto) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Precios - ${producto.nombre}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Precio de Costo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Precio de Costo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarIcon className="text-gray-400" />
            </div>
            <input
              type="number"
              value={formData.precio_costo}
              onChange={(e) => handleCostoChange(e.target.value)}
              className="pl-10 w-full border rounded-md px-3 py-2"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
        
        {/* Botones de margen rápido */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aplicar Margen Rápido
          </label>
          <div className="flex gap-2">
            {[30, 40, 50, 60, 70].map(margen => (
              <Button
                key={margen}
                type="button"
                size="sm"
                color="secondary"
                onClick={() => aplicarMargenATodas(margen)}
              >
                {margen}%
              </Button>
            ))}
          </div>
        </div>
        
        {/* Listas de Precios */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Listas de Precios</h3>
          
          {['mayorista', 'interior', 'posadas'].map(lista => (
            <div key={lista} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium capitalize">{lista}</label>
                <span className="text-sm text-gray-600">
                  Margen: {margenes[lista]}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarIcon className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.listas_precios[lista]}
                    onChange={(e) => handlePrecioChange(lista, e.target.value)}
                    className="pl-10 w-full border rounded-md px-3 py-2"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PercentIcon className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={margenes[lista]}
                    onChange={(e) => handleMargenChange(lista, e.target.value)}
                    className="pl-10 w-full border rounded-md px-3 py-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Motivo del cambio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo del cambio
          </label>
          <textarea
            value={formData.motivo}
            onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
            className="w-full border rounded-md px-3 py-2"
            rows="2"
            placeholder="Ej: Ajuste por inflación, actualización de costos..."
            required
          />
        </div>
        
        {/* Historial */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={cargarHistorial}
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
          >
            <HistoryIcon className="mr-1" />
            Ver historial de cambios
          </button>
        </div>
        
        {mostrarHistorial && (
          <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
            <h4 className="font-medium mb-2">Historial de Cambios</h4>
            {historial.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay cambios registrados</p>
            ) : (
              <div className="space-y-2">
                {historial.slice(0, 5).map((cambio, index) => (
                  <div key={index} className="text-sm border-b pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {new Date(cambio.fecha).toLocaleDateString()}
                      </span>
                      <span className="font-medium">
                        Costo: {formatCurrency(cambio.cambios?.precio_costo?.nuevo || 0)}
                      </span>
                    </div>
                    <p className="text-gray-500">{cambio.motivo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            color="primary"
            icon={loading ? <Spinner size="sm" /> : <SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ListasPreciosModal;