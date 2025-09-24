import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import transferenciasService from '../../services/transferencias.service';
import productosService, { obtenerProductoParaVenta } from '../../services/productos.service';
import stockSucursalService from '../../services/stock-sucursal.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { FaArrowLeft, FaExchangeAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const TransferenciaDetalle = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [transferencia, setTransferencia] = useState(location.state?.transferencia || null);
  const [loading, setLoading] = useState(!location.state?.transferencia);
  const [productosConNombre, setProductosConNombre] = useState([]);
  const [devolviendo, setDevolviendo] = useState(false);
  const [cantidadesDevolver, setCantidadesDevolver] = useState({});
  const [stockDestino, setStockDestino] = useState({});
  const [devueltos, setDevueltos] = useState({});
  const { currentUser } = useAuth();
  const [showCancelar, setShowCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!transferencia) {
      cargarTransferencia();
    }
    if (transferencia && transferencia.productos) {
      cargarNombresProductos();
    }
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (transferencia && transferencia.devueltos) {
      setDevueltos(transferencia.devueltos);
    }
  }, [transferencia]);

  useEffect(() => {
    if (productosConNombre && productosConNombre.length > 0) {
      // Inicializar cantidades a devolver con el total transferido
      const inicial = {};
      productosConNombre.forEach(prod => {
        inicial[prod.producto_id] = prod.cantidad;
      });
      setCantidadesDevolver(inicial);
    }
  }, [productosConNombre]);

  useEffect(() => {
    if (transferencia && transferencia.productos && transferencia.sucursal_destino) {
      cargarStockDestino();
    }
  }, [transferencia, productosConNombre]);

  const cargarTransferencia = async () => {
    setLoading(true);
    try {
      const data = await transferenciasService.obtenerPorId(id);
      setTransferencia(data);
    } catch (error) {
      setTransferencia(null);
    } finally {
      setLoading(false);
    }
  };

  const cargarNombresProductos = async () => {
    // Buscar nombre real del producto si solo hay id/código
    const sucursalOrigen = transferencia.sucursal_origen?.id || transferencia.sucursal_origen_id;
    const productos = await Promise.all(
      transferencia.productos.map(async (prod) => {
        let nombre = prod.nombre || prod.producto_nombre;
        if (!nombre && prod.producto_id) {
          try {
            const producto = await productosService.obtenerPorId(prod.producto_id);
            nombre = producto?.nombre || prod.producto_id;
          } catch {
            nombre = prod.producto_id;
          }
        } else if (!nombre && prod.codigo) {
          try {
            const producto = await obtenerProductoParaVenta(prod.codigo, sucursalOrigen);
            nombre = producto?.nombre || prod.codigo;
          } catch {
            nombre = prod.codigo;
          }
        }
        // Calcular cantidad pendiente de devolución
        const cantidadDevuelta = devueltos[prod.producto_id] || 0;
        const cantidadPendiente = Math.max(0, prod.cantidad - cantidadDevuelta);
        return { ...prod, nombreMostrado: nombre, cantidad: cantidadPendiente };
      })
    );
    setProductosConNombre(productos);
  };

  const cargarStockDestino = async () => {
    const sucursalDestinoId = transferencia.sucursal_destino?.id || transferencia.sucursal_destino_id;
    const stock = await stockSucursalService.obtenerStockPorSucursal(sucursalDestinoId);
    // Mapear por producto_id para acceso rápido
    const stockMap = {};
    stock.forEach(item => {
      stockMap[item.producto_id] = item.cantidad;
    });
    setStockDestino(stockMap);
  };

  const handleCantidadChange = (productoId, value, max) => {
    let val = Number(value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > max) val = max;
    setCantidadesDevolver(prev => ({ ...prev, [productoId]: val }));
  };

  const devolverSeleccionados = async () => {
    setDevolviendo(true);
    try {
      // Preparar devoluciones reales (solo productos con cantidad pendiente)
      const devoluciones = productosConNombre
        .filter(prod => (cantidadesDevolver[prod.producto_id] || 0) > 0)
        .map(prod => ({
          producto_id: prod.producto_id,
          cantidad: Math.min(cantidadesDevolver[prod.producto_id] || 0, prod.cantidad)
        }));
      if (devoluciones.length === 0) {
        setDevolviendo(false);
        return;
      }
      const resp = await transferenciasService.devolverProductos(transferencia.id, devoluciones);
      // Ajustar stock en frontend como antes
      for (const prod of devoluciones) {
        await stockSucursalService.ajustarStock(
          transferencia.sucursal_origen?.id || transferencia.sucursal_origen_id,
          prod.producto_id,
          prod.cantidad,
          'Devolución de transferencia'
        );
        await stockSucursalService.ajustarStock(
          transferencia.sucursal_destino?.id || transferencia.sucursal_destino_id,
          prod.producto_id,
          -prod.cantidad,
          'Devolución de transferencia'
        );
      }
      toast.success('Devolución realizada correctamente');
      // Usar la transferencia actualizada del backend para refrescar el estado
      setTransferencia({ ...transferencia, ...resp.transferencia });
      setDevueltos(resp.devueltos || {});
      cargarNombresProductos();
    } catch (error) {
      toast.error('Error al devolver los productos');
    } finally {
      setDevolviendo(false);
    }
  };

  const puedeCancelar = transferencia.estado === 'aprobada' && !transferencia.cancelada;

  const cancelarTransferencia = async () => {
    if (!motivoCancelacion.trim()) {
      toast.error('El motivo de la cancelación es obligatorio');
      return;
    }
    setCancelando(true);
    try {
      await transferenciasService.cancelarTransferencia(transferencia.id, motivoCancelacion, currentUser?.id);
      toast.success('Transferencia cancelada y stock devuelto');
      setTransferencia({ ...transferencia, cancelada: true, estado: 'cancelada', motivo_cancelacion: motivoCancelacion });
      setShowCancelar(false);
    } catch (error) {
      toast.error(error.message || 'Error al cancelar la transferencia');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (!transferencia) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">Transferencia no encontrada</p>
        <Button color="secondary" onClick={() => navigate(-1)}>
          <FaArrowLeft className="mr-2" /> Volver
        </Button>
      </div>
    );
  }

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'aprobada': return <FaCheckCircle className="text-green-500 mr-1" />;
      case 'rechazada': return <FaTimesCircle className="text-red-500 mr-1" />;
      default: return <FaExchangeAlt className="text-blue-500 mr-1" />;
    }
  };

  const productosParaDevolver = productosConNombre.filter(p => p.cantidad > 0);
  const devolucionCompleta = productosParaDevolver.length === 0;

  const deshacerTransferencia = async (producto, cantidad) => {
    setDevolviendo(true);
    try {
      // Ajustar stock en sucursal origen (sumar) y destino (restar)
      await stockSucursalService.ajustarStock(
        transferencia.sucursal_origen?.id || transferencia.sucursal_origen_id,
        producto.producto_id,
        cantidad,
        'Devolución de transferencia'
      );
      await stockSucursalService.ajustarStock(
        transferencia.sucursal_destino?.id || transferencia.sucursal_destino_id,
        producto.producto_id,
        -cantidad,
        'Devolución de transferencia'
      );
      toast.success('Devolución realizada correctamente');
      cargarTransferencia();
    } catch (error) {
      toast.error('Error al devolver el producto');
    } finally {
      setDevolviendo(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Button color="secondary" onClick={() => navigate(-1)}>
          <FaArrowLeft className="mr-2" /> Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <FaExchangeAlt className="mr-2" /> Detalle de Transferencia
        </h1>
      </div>
      <Card>
        {puedeCancelar && (
          <div className="my-4 p-3 bg-red-100 text-red-700 rounded text-center font-medium">
            Esta transferencia ya fue aprobada y no puede ser cancelada.
          </div>
        )}
        {transferencia.cancelada && (
          <div className="my-4 p-3 bg-red-100 text-red-700 rounded text-center font-medium">
            Transferencia cancelada y stock devuelto a la sucursal de origen.<br />
            Motivo: {transferencia.motivo_cancelacion}
          </div>
        )}
        {puedeCancelar && devolucionCompleta && (
          <div className="my-4 p-3 bg-green-100 text-green-700 rounded text-center font-medium">
            Todos los productos de esta transferencia ya fueron devueltos a la sucursal de origen.
          </div>
        )}
        {puedeCancelar && (
          <div className="mb-4 flex justify-end">
            <Button color="danger" onClick={() => setShowCancelar(true)}>
              Cancelar transferencia y devolver stock
            </Button>
          </div>
        )}
        {showCancelar && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
              <h2 className="text-lg font-bold mb-2">Cancelar transferencia</h2>
              <p className="mb-2">¿Estás seguro? Esta acción devolverá el stock a la sucursal de origen y marcará la transferencia como cancelada.</p>
              <textarea
                className="w-full border rounded p-2 mb-2"
                rows={3}
                placeholder="Motivo de la cancelación (obligatorio)"
                value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                disabled={cancelando}
              />
              <div className="flex justify-end space-x-2">
                <Button color="secondary" onClick={() => setShowCancelar(false)} disabled={cancelando}>Cancelar</Button>
                <Button color="danger" onClick={cancelarTransferencia} loading={cancelando}>Confirmar cancelación</Button>
              </div>
            </div>
          </div>
        )}
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Producto</th>
              <th className="p-2 text-center">Cantidad transferida</th>
              <th className="p-2 text-center">Stock en destino</th>
              {puedeCancelar && <th className="p-2 text-center">Cantidad a devolver</th>}
            </tr>
          </thead>
          <tbody>
            {productosParaDevolver.map((prod, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{prod.nombreMostrado}</td>
                <td className="p-2 text-center">{prod.cantidad}</td>
                <td className="p-2 text-center">{stockDestino[prod.producto_id] ?? '-'}</td>
                {puedeCancelar && (
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={prod.cantidad}
                      value={cantidadesDevolver[prod.producto_id] || 0}
                      onChange={e => handleCantidadChange(prod.producto_id, e.target.value, prod.cantidad)}
                      className="w-20 border rounded px-2 py-1 text-center"
                      disabled={devolviendo || devolucionCompleta || transferencia.cancelada}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {transferencia.motivo_rechazo && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 font-medium">Motivo de rechazo:</p>
            <p className="text-red-600">{transferencia.motivo_rechazo}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TransferenciaDetalle; 