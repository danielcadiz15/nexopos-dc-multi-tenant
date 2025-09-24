// src/components/modules/ventas/RepartoWizardMovil.js
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import repartoService from '../../../services/reparto.service';
import ventasService from '../../../services/ventas.service';
import RegistrarPagoDialog from './RegistrarPagoDialog';

// UI móvil para avanzar por cada entrega: ver datos, marcar entregada, registrar pago
const RepartoWizardMovil = ({ isOpen, onClose, sesion, sucursalId }) => {
  const [ventas, setVentas] = useState([]);
  const [orden, setOrden] = useState([]);
  const [idx, setIdx] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [pagoOpen, setPagoOpen] = useState(false);
  const actualId = orden[idx];
  const ventaActual = useMemo(() => ventas.find(v => v.id === actualId) || {}, [ventas, actualId]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setCargando(true);
      try {
        let listaVentas = [];
        let ids = [];
        if (sesion?.ventas && sesion?.orden) {
          listaVentas = sesion.ventas;
          ids = sesion.orden;
        } else if (sesion?.id) {
          const detalle = await repartoService.obtenerSesion(sesion.id);
          listaVentas = Array.isArray(detalle?.ventas) ? detalle.ventas : (Array.isArray(detalle) ? detalle : []);
          ids = Array.isArray(detalle?.orden) ? detalle.orden : (listaVentas.map(v => v.id));
        } else {
          // Fallback: intentar recuperar de localStorage
          try {
            const raw = localStorage.getItem('reparto_sesion_last');
            const loc = JSON.parse(raw || '{}');
            listaVentas = Array.isArray(loc?.ventas) ? loc.ventas : [];
            ids = Array.isArray(loc?.orden) ? loc.orden : [];
          } catch (_) {}
        }
        setVentas(Array.isArray(listaVentas) ? listaVentas : []);
        setOrden(Array.isArray(ids) ? ids : []);
        setIdx(0);
      } catch (e) {
        console.error('Error cargando sesión de reparto:', e);
        setVentas([]);
        setOrden([]);
      } finally {
        setCargando(false);
      }
    })();
  }, [isOpen, sesion]);

  const entregar = async () => {
    try {
      setCargando(true);
      const pago = montoPago ? { monto: parseFloat(montoPago), metodo_pago: 'efectivo', concepto: 'Pago en entrega' } : null;
      await repartoService.marcarEntregada({ sesion_id: sesion.id || sesion, venta_id: ventaActual.id, pago });
      // Refrescar venta
      const v = await ventasService.obtenerPorId(ventaActual.id);
      setVentas(prev => prev.map(x => x.id === v.id ? v : x));
      // Avanzar
      setMontoPago('');
      setIdx(i => Math.min(i + 1, Math.max(orden.length - 1, 0)));
    } catch (e) {
      console.error('Error al marcar entrega:', e);
    } finally {
      setCargando(false);
    }
  };

  const abrirPago = () => setPagoOpen(true);
  const registrarPagoYEntregar = async (pagoData) => {
    // Ejecuta mismo flujo ya existente: registrar pago en ventas y marcar entregada
    await ventasService.registrarPago(ventaActual.id, pagoData);
    setMontoPago(String(pagoData.monto || ''));
    await entregar();
  };

  const anterior = () => setIdx(i => Math.max(0, i - 1));
  const siguiente = () => setIdx(i => Math.min(orden.length - 1, i + 1));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reparto - Modo Móvil" size="lg">
      {cargando ? (
        <div className="py-6 text-center">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {!ventaActual?.id ? (
            <div className="text-center py-10 text-gray-600">No hay más entregas pendientes</div>
          ) : (
            <>
              <div className="text-sm text-gray-600">Entrega {idx + 1} / {orden.length}</div>
              <div className="p-3 border rounded">
                <div className="font-semibold text-gray-800">{ventaActual.numero || ventaActual.id}</div>
                <div className="text-sm text-gray-700">Cliente: {ventaActual.cliente_info?.nombre_completo || 'Cliente'}</div>
                <div className="text-sm text-gray-700">Total: ${parseFloat(ventaActual.total || 0).toLocaleString()}</div>
                <div className="text-sm text-gray-700">Debe: ${parseFloat(ventaActual.saldo_pendiente || 0).toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button color="gray" onClick={anterior} disabled={idx === 0}>Anterior</Button>
                <Button onClick={siguiente} disabled={idx >= orden.length - 1}>Siguiente</Button>
              </div>

              <div className="p-3 border rounded">
                <div className="font-medium text-gray-800 mb-2">Pago en entrega (opcional)</div>
                <input type="number" className="w-full border rounded p-2" placeholder="Monto a cobrar" value={montoPago} onChange={e => setMontoPago(e.target.value)} />
                <div className="flex justify-end mt-2">
                  <Button color="gray" onClick={abrirPago}>Elegir método…</Button>
                  <Button color="green" onClick={entregar} loading={cargando}>Entregar y Guardar</Button>
                </div>
              </div>
              <RegistrarPagoDialog
                isOpen={pagoOpen}
                onClose={() => setPagoOpen(false)}
                venta={{
                  id: ventaActual.id,
                  numero: ventaActual.numero || ventaActual.id,
                  cliente_info: ventaActual.cliente_info,
                  total: ventaActual.total,
                  saldo_pendiente: ventaActual.saldo_pendiente
                }}
                onPagoRegistrado={registrarPagoYEntregar}
              />
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default RepartoWizardMovil;



