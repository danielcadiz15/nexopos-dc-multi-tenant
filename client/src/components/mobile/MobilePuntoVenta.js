import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaSearch, FaPlus, FaMinus, FaTrash, FaCreditCard, FaStore } from 'react-icons/fa';
import productosService from '../../services/productos.service';
import ventasService from '../../services/ventas.service';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

const getSucursalId = (sucursal) => (
  sucursal?.id ||
  sucursal?._id ||
  sucursal?.sucursal_id ||
  ''
);

const MobilePuntoVenta = () => {
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles } = useAuth();
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  const sucursalIdActiva = useMemo(
    () => getSucursalId(sucursalSeleccionada),
    [sucursalSeleccionada]
  );

  const sucursalNombre = useMemo(
    () => sucursalesDisponibles.find((s) => getSucursalId(s) === sucursalIdActiva)?.nombre || 'Sucursal',
    [sucursalesDisponibles, sucursalIdActiva]
  );

  const cargarProductos = useCallback(async (termino = '') => {
    if (!sucursalIdActiva) return;
    try {
      setLoadingProductos(true);
      const lista = await productosService.buscarConStockPorSucursal(termino, sucursalIdActiva);
      setProductos(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error('❌ [MOBILE PV] Error al cargar productos:', error);
      toast.error('No se pudieron cargar productos');
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, [sucursalIdActiva]);

  useEffect(() => {
    if (!sucursalIdActiva) {
      setProductos([]);
      return;
    }
    cargarProductos('');
  }, [sucursalIdActiva, cargarProductos]);

  useEffect(() => {
    const termino = busqueda.trim();
    const timer = setTimeout(() => {
      if (!sucursalIdActiva) return;
      if (termino.length >= 2) {
        cargarProductos(termino);
      } else {
        cargarProductos('');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [busqueda, sucursalIdActiva, cargarProductos]);

  const agregarAlCarrito = (producto) => {
    const stockDisponible = parseFloat(producto.stock_actual ?? producto.stock_sucursal ?? 0) || 0;
    if (stockDisponible <= 0) {
      toast.warning(`Sin stock de ${producto.nombre}`);
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        if (existente.cantidad >= stockDisponible) {
          toast.warning(`Stock máximo alcanzado para ${producto.nombre}`);
          return prev;
        }
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: producto.id,
          codigo: producto.codigo || '',
          nombre: producto.nombre || 'Producto',
          precio: parseFloat(producto.precio_venta || 0),
          cantidad: 1,
          stockDisponible,
        }
      ];
    });
  };

  const removerDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      removerDelCarrito(id);
      return;
    }
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cantidadFinal = Math.min(nuevaCantidad, item.stockDisponible || nuevaCantidad);
        return { ...item, cantidad: cantidadFinal };
      })
    );
  };

  const total = useMemo(
    () => carrito.reduce((acum, item) => acum + item.precio * item.cantidad, 0),
    [carrito]
  );

  const finalizarVenta = async () => {
    if (!sucursalIdActiva) {
      toast.warning('Selecciona una sucursal antes de cobrar');
      return;
    }
    if (carrito.length === 0) {
      toast.warning('No hay productos en el carrito');
      return;
    }

    try {
      setProcesandoVenta(true);
      const venta = {
        sucursal_id: sucursalIdActiva,
        cliente_id: null,
        cliente_nombre: 'Cliente General',
        usuario_id: currentUser?.id || null,
        metodo_pago: 'efectivo',
        subtotal: total,
        descuento: 0,
        total,
        estado: 'completada',
        monto_pagado: total,
        total_pagado: total,
        saldo_pendiente: 0,
        estado_pago: 'pagado'
      };

      const detalles = carrito.map((item) => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        precio_total: item.precio * item.cantidad,
        producto_info: {
          id: item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          precio: item.precio
        }
      }));

      await ventasService.crear(venta, detalles, sucursalIdActiva);
      toast.success('Venta registrada correctamente');
      setCarrito([]);
      setBusqueda('');
      cargarProductos('');
    } catch (error) {
      console.error('❌ [MOBILE PV] Error al registrar venta:', error);
      toast.error(error?.message || 'No se pudo registrar la venta');
    } finally {
      setProcesandoVenta(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow">
        <h1 className="text-xl font-bold">Punto de Venta</h1>
        <div className="mt-2 flex items-center text-xs opacity-90">
          <FaStore className="mr-2" />
          {sucursalIdActiva ? `Sucursal: ${sucursalNombre}` : 'Sin sucursal seleccionada'}
        </div>
        <div className="mt-2 relative">
          <input
            type="text"
            placeholder="Buscar productos por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-3 pl-10 rounded-lg text-gray-800"
            disabled={!sucursalIdActiva}
          />
          <FaSearch className="absolute left-3 top-4 text-gray-400" />
        </div>
      </div>

      {!sucursalIdActiva && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
          Debes seleccionar una sucursal para vender.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Productos {loadingProductos ? '(cargando...)' : `(${productos.length})`}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto pr-1">
            {productos.map((producto) => {
              const stock = parseFloat(producto.stock_actual ?? 0) || 0;
              return (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => agregarAlCarrito(producto)}
                  className={`text-left bg-white p-3 rounded-lg shadow border-2 ${
                    stock <= 0 ? 'border-red-200 opacity-70' : 'border-gray-200'
                  }`}
                >
                  <h3 className="font-semibold text-sm line-clamp-2">{producto.nombre}</h3>
                  <p className="text-green-600 font-bold text-sm">{formatCurrency(producto.precio_venta || 0)}</p>
                  <p className={`text-xs ${stock <= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    Stock: {stock}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-4">Carrito ({carrito.length})</h2>

          <div className="flex-1 overflow-y-auto max-h-[35vh] pr-1">
            {carrito.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-lg mb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{item.nombre}</h3>
                    <p className="text-green-600 font-bold">{formatCurrency(item.precio)}</p>
                  </div>
                  <button
                    onClick={() => removerDelCarrito(item.id)}
                    className="text-red-500 ml-2"
                    type="button"
                  >
                    <FaTrash />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                      className="bg-gray-200 p-1 rounded"
                      type="button"
                    >
                      <FaMinus className="text-xs" />
                    </button>
                    <span className="w-8 text-center">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                      className="bg-gray-200 p-1 rounded"
                      type="button"
                    >
                      <FaPlus className="text-xs" />
                    </button>
                  </div>
                  <span className="font-bold">{formatCurrency(item.precio * item.cantidad)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="bg-white p-3 rounded-lg mb-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={finalizarVenta}
              disabled={carrito.length === 0 || !sucursalIdActiva || procesandoVenta}
              className="w-full bg-green-500 text-white p-3 rounded-lg font-semibold disabled:bg-gray-300 min-h-[44px]"
              type="button"
            >
              <FaCreditCard className="inline mr-2" />
              {procesandoVenta ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePuntoVenta;