// src/components/modules/ventas/RegistrarPagoDialog.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaTimes, FaMoneyBillWave, FaCreditCard, 
  FaUniversity, FaMobileAlt, FaSave 
} from 'react-icons/fa';

// Componentes
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';


const RegistrarPagoDialog = ({ isOpen, onClose, venta, onPagoRegistrado }) => {
  const [formData, setFormData] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    concepto: 'Pago de venta',
    nota: ''
  });
  
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && venta) {
      // Sugerir saldo como monto
      if (venta.saldo_pendiente > 0) {
        setFormData(prev => ({ ...prev, monto: venta.saldo_pendiente.toString() }));
      }
      // Preseleccionar último método usado (si existe)
      try {
        const last = localStorage.getItem('ultimo_metodo_pago');
        if (last) setFormData(prev => ({ ...prev, metodo_pago: last }));
      } catch (_) {}
    }
  }, [isOpen, venta]);

  const validarFormulario = () => {
    setError('');

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return false;
    }

    const montoFloat = parseFloat(formData.monto);
    const saldoPendiente = venta.saldo_pendiente || venta.total;

    if (montoFloat > saldoPendiente) {
      setError(`El monto no puede ser mayor al saldo pendiente (${formatMoneda(saldoPendiente)})`);
      return false;
    }

    // Validar que se ingrese referencia cuando el método de pago es transferencia
    if (formData.metodo_pago === 'transferencia' && !formData.referencia.trim()) {
      setError('El número de referencia es obligatorio para pagos por transferencia');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    setProcesando(true);
    
    try {
      const pagoData = {
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        referencia: formData.referencia,
        concepto: formData.concepto,
        nota: formData.nota
      };

      await onPagoRegistrado(pagoData);
      try { localStorage.setItem('ultimo_metodo_pago', formData.metodo_pago); } catch (_) {}
      
      // Limpiar formulario
      setFormData({
        monto: '',
        metodo_pago: 'efectivo',
        referencia: '',
        concepto: 'Pago de venta',
        nota: ''
      });
      
      // Cerrar modal después de registrar el pago
      onClose();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      setError(error.message || 'Error al registrar el pago');
    } finally {
      setProcesando(false);
    }
  };

  const formatMoneda = (valor) => {
    return `$${parseFloat(valor).toFixed(2)}`;
  };

  const calcularMontosRapidos = () => {
    const saldo = venta.saldo_pendiente || venta.total;
    return [
      { label: '25%', valor: saldo * 0.25 },
      { label: '50%', valor: saldo * 0.50 },
      { label: '75%', valor: saldo * 0.75 },
      { label: '100%', valor: saldo }
    ];
  };



  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Registrar Pago
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={procesando}
          >
            <FaTimes />
          </button>
        </div>

        {venta && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Venta:</span>
                <span className="font-medium ml-1">{venta.numero}</span>
              </div>
              <div>
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium ml-1">
                  {venta.cliente_info?.nombre_completo || 'Sin cliente'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="font-medium ml-1">{formatMoneda(venta.total)}</span>
              </div>
              <div>
                <span className="text-gray-600">Saldo:</span>
                <span className="font-medium ml-1 text-red-600">
                  {formatMoneda(venta.saldo_pendiente || venta.total)}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto del pago
            </label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              enterKeyHint="done"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              disabled={procesando}
            />
            
            {/* Botones de monto rápido */}
            <div className="flex gap-2 mt-2">
              {calcularMontosRapidos().map(({ label, valor }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFormData({ ...formData, monto: valor.toFixed(2) })}
                  className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={procesando}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              value={formData.metodo_pago}
              onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={procesando}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia {formData.metodo_pago === 'transferencia' ? '*' : '(opcional)'}
            </label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formData.metodo_pago === 'transferencia' && !formData.referencia.trim() 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder={formData.metodo_pago === 'transferencia' 
                ? "Número de transferencia (obligatorio)" 
                : "Número de operación, cheque, etc."
              }
              disabled={procesando}
            />
            {formData.metodo_pago === 'transferencia' && (
              <p className="text-xs text-gray-500 mt-1">
                * Campo obligatorio para pagos por transferencia
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={procesando}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas del pago (opcional)
            </label>
            <textarea
              value={formData.nota}
              onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Cheque #12345, transferencia pendiente de confirmación..."
              disabled={procesando}
            />
          </div>

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
              color="primary"
              loading={procesando}
              icon={<FaSave />}
            >
              Registrar Pago
            </Button>
          </div>
        </form>
      </div>
    </div>

    </>
  );
};

export default RegistrarPagoDialog;