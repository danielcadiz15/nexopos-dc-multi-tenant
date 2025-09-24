// src/components/modules/ventas/TicketReciboPago.js
import React, { forwardRef, useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import configuracionService from '../../../services/configuracion.service';

const TicketReciboPago = forwardRef(({ 
  isOpen, 
  onClose, 
  pagoData, 
  venta, 
  cliente,
  modo = 'pago' // 'pago' para pago recién registrado, 'venta_pagada' para venta ya pagada
}, ref) => {
  const [configuracionEmpresa, setConfiguracionEmpresa] = useState({
    nombre: 'NexoPOS DC',
    direccion: 'Corrientes, Argentina',
    telefono: '',
    email: '',
    cuit: ''
  });

  useEffect(() => {
    const cargarConfiguracionEmpresa = async () => {
      try {
        console.log('🏢 Cargando configuración de empresa para ticket...');
        const config = await configuracionService.obtener();
        console.log('✅ Configuración de empresa cargada:', config);
        
        // Formatear para el ticket
        setConfiguracionEmpresa({
          nombre: config.razon_social || config.nombre_fantasia || 'NexoPOS DC',
          direccion: `${config.direccion_calle || ''}, ${config.direccion_localidad || ''}, ${config.direccion_provincia || ''}`,
          telefono: config.telefono_principal || '',
          email: config.email || '',
          cuit: config.cuit || ''
        });
      } catch (error) {
        console.error('❌ Error al cargar configuración de empresa:', error);
        // Mantener configuración por defecto
      }
    };

    if (isOpen) {
      cargarConfiguracionEmpresa();
    }
  }, [isOpen]);

  console.log('🎫 TicketReciboPago renderizando, isOpen:', isOpen, 'pagoData:', pagoData);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Recibo de Pago
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FaTimes />
          </button>
        </div>

        {/* Controles */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Imprimir
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>

        {/* Ticket/Recibo MEJORADO */}
        <div 
          ref={ref}
          className="bg-white border border-gray-300 p-4 max-w-sm mx-auto"
          style={{ 
            width: '80mm',
            fontFamily: 'Consolas, Courier New, monospace',
            fontSize: '16px',
            lineHeight: '1.5',
            fontWeight: '800'
          }}
        >
          {/* Header MEJORADO */}
          <div className="text-center mb-6" style={{ marginBottom: '24px' }}>
            <h2 className="font-bold text-xl" style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
              {configuracionEmpresa.nombre}
            </h2>
            <p className="text-sm" style={{ fontSize: '14px', marginBottom: '4px' }}>
              {configuracionEmpresa.direccion}
            </p>
            {configuracionEmpresa.telefono && (
              <p className="text-sm" style={{ fontSize: '14px', marginBottom: '4px' }}>
                Tel: {configuracionEmpresa.telefono}
              </p>
            )}
            {configuracionEmpresa.cuit && (
              <p className="text-sm" style={{ fontSize: '14px', marginBottom: '4px' }}>
                CUIT: {configuracionEmpresa.cuit}
              </p>
            )}
          </div>

          {/* Título MEJORADO */}
          <div className="text-center mb-6 border-b border-gray-300 pb-3" style={{ marginBottom: '24px', paddingBottom: '12px' }}>
            <h3 className="font-bold text-xl" style={{ fontSize: '18px', fontWeight: '900', marginBottom: '8px' }}>
              {modo === 'pago' ? 'RECIBO DE PAGO' : 'COMPROBANTE DE PAGO'}
            </h3>
            <p className="text-sm" style={{ fontSize: '14px', fontWeight: '800' }}>
              {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Datos del cliente MEJORADO */}
          <div className="mb-6" style={{ marginBottom: '24px' }}>
            <div className="flex justify-between text-sm" style={{ fontSize: '15px', fontWeight: '800', marginBottom: '6px' }}>
              <span className="font-medium">Cliente:</span>
              <span style={{ fontWeight: '900' }}>{cliente?.nombre_completo || 'Sin cliente'}</span>
            </div>
          </div>

          {/* Datos de la venta MEJORADO */}
          <div className="mb-6" style={{ marginBottom: '24px' }}>
            <div className="flex justify-between text-sm" style={{ fontSize: '15px', fontWeight: '800', marginBottom: '6px' }}>
              <span className="font-medium">Comprobante:</span>
              <span style={{ fontWeight: '900' }}>#{venta?.numero || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ fontSize: '15px', fontWeight: '800', marginBottom: '6px' }}>
              <span className="font-medium">Fecha Venta:</span>
              <span style={{ fontWeight: '900' }}>{new Date(venta?.fecha).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Detalles de productos MEJORADO */}
          {venta?.detalles && venta.detalles.length > 0 && (
            <div className="mb-6 border-t border-gray-300 pt-3" style={{ marginBottom: '24px', paddingTop: '12px' }}>
              <div className="text-sm font-medium mb-3" style={{ fontSize: '16px', fontWeight: '900', marginBottom: '12px' }}>Productos:</div>
              {venta.detalles.map((item, index) => {
                const cantidadTotal = item.cantidadTotal || item.cantidad;
                const unidadesGratis = item.unidadesGratis || 0;
                const cantidadOriginal = item.cantidadOriginal || item.cantidad;
                const precioUnitario = item.precio_unitario || item.precio;
                const subtotalSinDescuento = precioUnitario * cantidadTotal;
                const descuentoUnidadesGratis = precioUnitario * unidadesGratis;
                // CORREGIDO: El precio final debe ser el subtotal sin descuento (lo que realmente paga)
                const precioFinal = item.precio_total || (precioUnitario * cantidadOriginal);
                
                return (
                  <div key={index} className="mb-3 text-sm" style={{ marginBottom: '12px', fontSize: '14px' }}>
                    <div className="flex justify-between mb-1" style={{ marginBottom: '4px' }}>
                      <span className="font-medium" style={{ fontWeight: '800' }}>{item.producto_info?.nombre || item.nombre_producto || item.producto || 'Producto'}</span>
                      <span style={{ fontWeight: '900' }}>${precioUnitario?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 mb-1" style={{ marginBottom: '4px', fontSize: '13px' }}>
                      <span>Cantidad: {cantidadTotal}{unidadesGratis > 0 ? ` (${cantidadOriginal}+${unidadesGratis} gratis)` : ''}</span>
                      <span>Subtotal: ${(precioUnitario * cantidadTotal)?.toFixed(2)}</span>
                    </div>
                    {unidadesGratis > 0 && (
                      <div className="flex justify-between text-green-600 mb-1" style={{ marginBottom: '4px', fontSize: '13px' }}>
                        <span>Descuento promoción:</span>
                        <span>-${descuentoUnidadesGratis?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold" style={{ fontWeight: '900', fontSize: '15px' }}>
                      <span>Total:</span>
                      <span>${(precioUnitario * cantidadOriginal)?.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              
              {/* Resumen de totales */}
              {venta?.detalles?.some(item => (item.unidadesGratis || 0) > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="text-xs space-y-1">
                    {(() => {
                      const subtotalTotal = venta.detalles.reduce((total, item) => {
                        const cantidadTotal = item.cantidadTotal || item.cantidad;
                        const precioUnitario = item.precio_unitario || item.precio;
                        return total + (precioUnitario * cantidadTotal);
                      }, 0);
                      
                      const descuentoTotal = venta.detalles.reduce((total, item) => {
                        const unidadesGratis = item.unidadesGratis || 0;
                        const precioUnitario = item.precio_unitario || item.precio;
                        return total + (precioUnitario * unidadesGratis);
                      }, 0);
                      
                      // CORREGIDO: El total a pagar debe ser la suma de lo que realmente paga el cliente
                      const totalAPagar = venta.detalles.reduce((total, item) => {
                        const cantidadOriginal = item.cantidadOriginal || item.cantidad;
                        const precioUnitario = item.precio_unitario || item.precio;
                        return total + (precioUnitario * cantidadOriginal);
                      }, 0);
                      
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="font-medium">Subtotal (todas las unidades):</span>
                            <span className="font-medium">${subtotalTotal?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Descuento promociones:</span>
                            <span>-${descuentoTotal?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t pt-1">
                            <span>Total a pagar:</span>
                            <span>${totalAPagar?.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detalles del pago */}
          <div className="mb-4 border-t border-gray-300 pt-2">
            {modo === 'pago' && pagoData ? (
              <>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Importe Recibido:</span>
                  <span className="font-bold">${pagoData?.monto?.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Forma de Pago:</span>
                  <span>{pagoData?.metodo_pago === 'efectivo' ? 'Efectivo' : pagoData?.metodo_pago === 'MercadoPago' ? 'MercadoPago' : pagoData?.metodo_pago === 'MercadoPago' ? 'MercadoPago' : pagoData?.metodo_pago}</span>
                </div>

                {pagoData?.referencia || pagoData?.referencia_mercadopago || pagoData?.referencia || pagoData?.referencia_mercadopago_mercadopago && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Referencia:</span>
                    <span>{pagoData.referencia}</span>
                  </div>
                )}

                {pagoData?.concepto && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Concepto:</span>
                    <span>{pagoData.concepto}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Total Pagado:</span>
                  <span className="font-bold">${venta?.total_pagado?.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Estado de Pago:</span>
                  <span className="font-bold text-green-600">COMPLETADO</span>
                </div>
              </>
            )}
          </div>

          {/* Saldo pendiente */}
          {venta?.saldo_pendiente > 0 && (
            <div className="mb-4 border-t border-gray-300 pt-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Saldo Pendiente:</span>
                <span className="font-bold text-red-600">
                  ${venta.saldo_pendiente?.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Total de la venta */}
          <div className="mb-4 border-t border-gray-300 pt-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Total Venta:</span>
              <span className="font-bold">${venta?.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Total Pagado:</span>
              <span className="font-bold">${venta?.total_pagado?.toFixed(2)}</span>
            </div>
          </div>

          {/* Notas del pago */}
          {pagoData?.nota && (
            <div className="mb-4 border-t border-gray-300 pt-2">
              <div className="text-sm">
                <span className="font-medium">Notas:</span>
                <p className="text-xs text-gray-600 mt-1">{pagoData.nota}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-gray-300 pt-2">
            <p className="text-xs text-gray-600">
              Gracias por su pago
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

TicketReciboPago.displayName = 'TicketReciboPago';

export default TicketReciboPago; 
