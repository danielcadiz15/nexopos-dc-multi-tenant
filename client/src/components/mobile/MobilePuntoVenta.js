import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaSearch, FaPlus, FaMinus, FaTrash, FaCreditCard, FaStore } from 'react-icons/fa';
import productosService from '../../services/productos.service';
import clientesService from '../../services/clientes.service';
import ventasService from '../../services/ventas.service';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

const getSucursalId = (sucursal) => (
  sucursal?.id ||
  sucursal?._id ||
  sucursal?.sucursal_id ||
  ''
);

const getClienteId = (cliente) => (
  cliente?.id ||
  cliente?._id ||
  cliente?.cliente_id ||
  null
);

const getClienteNombreCompleto = (cliente) => {
  const nombre = String(cliente?.nombre || '').trim();
  const apellido = String(cliente?.apellido || '').trim();
  const nombreCompleto = `${nombre} ${apellido}`.trim();
  return nombreCompleto || 'Cliente General';
};

const CLIENTE_GENERAL = { id: null, nombre: 'Cliente', apellido: 'General' };

const MobilePuntoVenta = () => {
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles, orgId } = useAuth();
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(CLIENTE_GENERAL);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 360,
    height: typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 740
  }));

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

  useEffect(() => {
    const termino = busquedaCliente.trim();
    if (termino.length < 2) {
      setClientesEncontrados([]);
      setLoadingClientes(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoadingClientes(true);
        const clientes = await clientesService.buscar(termino, null, orgId || null);
        if (!cancelled) {
          setClientesEncontrados(Array.isArray(clientes) ? clientes.slice(0, 8) : []);
          setMostrarClientes(true);
        }
      } catch (error) {
        console.error('❌ [MOBILE PV] Error al buscar clientes:', error);
        if (!cancelled) {
          setClientesEncontrados([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingClientes(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [busquedaCliente, orgId]);

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

  const seleccionarCliente = (cliente) => {
    const clienteId = getClienteId(cliente);
    if (!clienteId) {
      setClienteSeleccionado(CLIENTE_GENERAL);
      setBusquedaCliente('');
      setClientesEncontrados([]);
      setMostrarClientes(false);
      return;
    }
    setClienteSeleccionado({
      ...cliente,
      id: clienteId
    });
    setBusquedaCliente(getClienteNombreCompleto(cliente));
    setClientesEncontrados([]);
    setMostrarClientes(false);
  };

  const total = useMemo(
    () => carrito.reduce((acum, item) => acum + item.precio * item.cantidad, 0),
    [carrito]
  );

  const recibidoNumerico = useMemo(
    () => parseFloat(String(efectivoRecibido).replace(',', '.')) || 0,
    [efectivoRecibido]
  );
  const cambio = useMemo(() => Math.max(0, recibidoNumerico - total), [recibidoNumerico, total]);
  const faltante = useMemo(() => Math.max(0, total - recibidoNumerico), [recibidoNumerico, total]);
  const pagoCompleto = useMemo(() => total > 0 && recibidoNumerico >= total, [total, recibidoNumerico]);
  const isShortScreen = viewport.height < 740;
  const workspaceHeight = useMemo(
    () => Math.max(540, viewport.height - 120),
    [viewport.height]
  );
  const productSectionBasis = isShortScreen ? '38%' : '44%';
  const cartSectionBasis = isShortScreen ? '62%' : '56%';

  useEffect(() => {
    const actualizarViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight
      });
    };

    actualizarViewport();
    window.addEventListener('resize', actualizarViewport);
    window.addEventListener('orientationchange', actualizarViewport);
    window.visualViewport?.addEventListener('resize', actualizarViewport);

    return () => {
      window.removeEventListener('resize', actualizarViewport);
      window.removeEventListener('orientationchange', actualizarViewport);
      window.visualViewport?.removeEventListener('resize', actualizarViewport);
    };
  }, []);

  const finalizarVenta = async () => {
    if (!sucursalIdActiva) {
      toast.warning('Selecciona una sucursal antes de cobrar');
      return;
    }
    if (carrito.length === 0) {
      toast.warning('No hay productos en el carrito');
      return;
    }
    if (recibidoNumerico <= 0) {
      toast.warning('Ingresa el monto recibido del cliente');
      return;
    }
    if (recibidoNumerico < total) {
      toast.warning(`Faltan ${formatCurrency(faltante)} para completar el pago`);
      return;
    }

    const clienteId = getClienteId(clienteSeleccionado);
    const clienteNombre = clienteId
      ? getClienteNombreCompleto(clienteSeleccionado)
      : 'Cliente General';

    try {
      setProcesandoVenta(true);
      const venta = {
        sucursal_id: sucursalIdActiva,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        usuario_id: currentUser?.id || null,
        metodo_pago: 'efectivo',
        subtotal: total,
        descuento: 0,
        total,
        estado: 'completada',
        monto_pagado: total,
        total_pagado: total,
        saldo_pendiente: 0,
        estado_pago: 'pagado',
        efectivo_recibido: recibidoNumerico,
        cambio
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
      toast.success(`Venta registrada. Cambio: ${formatCurrency(cambio)}`);
      setCarrito([]);
      setBusqueda('');
      setBusquedaCliente('');
      setClienteSeleccionado(CLIENTE_GENERAL);
      setEfectivoRecibido('');
      cargarProductos('');
    } catch (error) {
      console.error('❌ [MOBILE PV] Error al registrar venta:', error);
      toast.error(error?.message || 'No se pudo registrar la venta');
    } finally {
      setProcesandoVenta(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 overflow-hidden"
      style={{ height: `${workspaceHeight}px` }}
    >
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow">
        <h1 className="text-2xl font-bold">Caja Rápida</h1>
        <div className="mt-2 flex items-center text-sm opacity-90">
          <FaStore className="mr-2" />
          {sucursalIdActiva ? `Sucursal: ${sucursalNombre}` : 'Sin sucursal seleccionada'}
        </div>
        <div className="mt-2 relative">
          <input
            type="text"
            placeholder="Buscar productos por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-4 pl-11 rounded-lg text-gray-800 text-base"
            disabled={!sucursalIdActiva}
          />
          <FaSearch className="absolute left-4 top-5 text-gray-400" />
        </div>
      </div>

      {!sucursalIdActiva && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
          Debes seleccionar una sucursal para vender.
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div
          className="bg-white rounded-lg shadow p-4 flex flex-col min-h-0"
          style={{ flexBasis: productSectionBasis }}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            Productos {loadingProductos ? '(cargando...)' : `(${productos.length})`}
          </h2>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-3">
              {productos.map((producto) => {
                const stock = parseFloat(producto.stock_actual ?? 0) || 0;
                return (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => agregarAlCarrito(producto)}
                    className={`text-left bg-white p-4 rounded-xl shadow border-2 min-h-[120px] ${
                      stock <= 0 ? 'border-red-200 opacity-70' : 'border-gray-200'
                    }`}
                  >
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{producto.nombre}</h3>
                    <p className="text-green-600 font-bold text-xl mt-1">{formatCurrency(producto.precio_venta || 0)}</p>
                    <p className={`text-base mt-1 ${stock <= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      Stock: {stock}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="bg-gray-100 rounded-lg shadow p-4 flex flex-col min-h-0"
          style={{ flexBasis: cartSectionBasis }}
        >
          <h2 className="text-xl font-bold mb-4">Carrito ({carrito.length})</h2>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {carrito.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-xl mb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{item.nombre}</h3>
                    <p className="text-green-600 font-bold text-lg">{formatCurrency(item.precio)}</p>
                  </div>
                  <button
                    onClick={() => removerDelCarrito(item.id)}
                    className="text-red-500 ml-2 text-xl p-1"
                    type="button"
                  >
                    <FaTrash />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                      className="bg-gray-200 px-3 py-2 rounded text-lg"
                      type="button"
                    >
                      <FaMinus className="text-sm" />
                    </button>
                    <span className="w-10 text-center text-lg font-semibold">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                      className="bg-gray-200 px-3 py-2 rounded text-lg"
                      type="button"
                    >
                      <FaPlus className="text-sm" />
                    </button>
                  </div>
                  <span className="font-bold text-lg">{formatCurrency(item.precio * item.cantidad)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-3 shrink-0">
            <div className="bg-white p-3 rounded-xl space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-base font-medium text-gray-700">Cliente</label>
                <button
                  type="button"
                  onClick={() => seleccionarCliente(null)}
                  className="text-sm text-blue-600 font-medium"
                >
                  Cliente general
                </button>
              </div>

              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                onFocus={() => setMostrarClientes(true)}
                onBlur={() => setTimeout(() => setMostrarClientes(false), 150)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 text-base"
                placeholder="Buscar cliente por nombre o teléfono"
              />

              <p className="text-sm text-gray-600">
                Seleccionado: <span className="font-semibold">{getClienteNombreCompleto(clienteSeleccionado)}</span>
              </p>

              {mostrarClientes && (loadingClientes || clientesEncontrados.length > 0) && (
                <div className="border border-gray-200 rounded-md max-h-36 overflow-y-auto bg-white">
                  {loadingClientes ? (
                    <p className="p-3 text-sm text-gray-500">Buscando clientes...</p>
                  ) : (
                    clientesEncontrados.map((cliente, index) => (
                      <button
                        key={getClienteId(cliente) || `${cliente.nombre || 'cliente'}-${index}`}
                        type="button"
                        onMouseDown={() => seleccionarCliente(cliente)}
                        className="w-full text-left p-3 border-b last:border-b-0 text-base hover:bg-gray-50"
                      >
                        {getClienteNombreCompleto(cliente)}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl mb-3">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl space-y-2">
              <label className="text-base font-medium text-gray-700 block">Recibido del cliente</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={efectivoRecibido}
                onChange={(e) => setEfectivoRecibido(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 text-lg"
                placeholder="0.00"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEfectivoRecibido(total.toFixed(2))}
                  className="px-2 py-3 text-base rounded bg-gray-100 text-gray-700 font-medium"
                >
                  Exacto
                </button>
                <button
                  type="button"
                  onClick={() => setEfectivoRecibido(Math.ceil(total / 100) * 100 + '')}
                  className="px-2 py-3 text-base rounded bg-gray-100 text-gray-700 font-medium"
                >
                  Redondear
                </button>
              </div>
              <div className="text-base">
                {pagoCompleto ? (
                  <p className="text-green-700 font-bold">Cambio: {formatCurrency(cambio)}</p>
                ) : (
                  <p className="text-red-600 font-bold">Falta: {formatCurrency(faltante)}</p>
                )}
              </div>
            </div>

            <button
              onClick={finalizarVenta}
              disabled={carrito.length === 0 || !sucursalIdActiva || procesandoVenta || !pagoCompleto}
              className="w-full bg-green-500 text-white p-4 rounded-xl text-lg font-bold disabled:bg-gray-300 min-h-[52px]"
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