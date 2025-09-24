/**
 * Componente para cancelar ventas
 * 
 * Permite cancelar una venta con confirmación y registro del motivo
 * 
 * @module components/modules/ventas/CancelarVentaDialog
 * @requires react, react-toastify, ../../common/*
 */

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

// Componentes
import Button from '../../common/Button';
import Modal from '../../common/Modal';
import TextArea from '../../common/TextArea';

// Servicios
import ventasService from '../../../services/ventas.service';

const CancelarVentaDialog = ({ 
  isOpen, 
  onClose, 
  venta, 
  onVentaCancelada 
}) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancelar = async () => {
    if (!motivo.trim()) {
      toast.error('Debes especificar un motivo para cancelar la venta');
      return;
    }

    try {
      setLoading(true);
      
      // Cancelar la venta
      await ventasService.cancelarVenta(venta.id, {
        motivo: motivo.trim(),
        fechaCancelacion: new Date().toISOString(),
        canceladoPor: 'usuario_actual' // Se obtendrá del contexto
      });

      toast.success('Venta cancelada correctamente');
      onVentaCancelada(venta.id);
      handleClose();
      
    } catch (error) {
      console.error('Error al cancelar venta:', error);
      toast.error(error.response?.data?.message || 'Error al cancelar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMotivo('');
    setLoading(false);
    onClose();
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar Venta"
      size="md"
    >
      <div className="space-y-4">
        {/* Información de la venta */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">
            Información de la Venta
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Venta #:</span> {venta?.numero}
            </div>
            <div>
              <span className="font-medium">Cliente:</span> {venta?.cliente?.nombre}
            </div>
            <div>
              <span className="font-medium">Total:</span> {formatearMoneda(venta?.total)}
            </div>
            <div>
              <span className="font-medium">Fecha:</span> {new Date(venta?.fecha).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Advertencia */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-600 mr-2" />
            <span className="font-medium text-yellow-800">
              Advertencia
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Esta acción cancelará la venta y revertirá el stock de los productos vendidos. 
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Motivo de cancelación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de cancelación *
          </label>
          <TextArea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Especifica el motivo de la cancelación..."
            rows={3}
            required
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            <FaTimes className="mr-2" />
            Cancelar
          </Button>
          
          <Button
            variant="danger"
            onClick={handleCancelar}
            loading={loading}
            disabled={!motivo.trim()}
          >
            <FaCheck className="mr-2" />
            Confirmar Cancelación
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelarVentaDialog; 