import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaBarcode,
  FaCheck,
  FaCreditCard,
  FaMobileAlt,
  FaMinus,
  FaMoneyBillWave,
  FaPlus,
  FaPrint,
  FaSearch,
  FaSignOutAlt,
  FaStore,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaUser
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import clientesService from '../../services/clientes.service';
import configuracionService from '../../services/configuracion.service';
import productosService from '../../services/productos.service';
import ventasService from '../../services/ventas.service';
import useViewport from '../../hooks/useViewport';
import { printHtmlDocument } from '../../utils/print.utils';

const formatMoneda = (value) => `$${(parseFloat(value || 0)).toFixed(2)}`;
const OFFLINE_SALES_KEY = 'mobile_pos_offline_sales_v1';
const BALANZA_PREFIX_MIN = 20;
const BALANZA_PREFIX_MAX = 29;

const obtenerPrecioVenta = (producto) => {
  const precioLista =
    producto?.listas_precios?.interior ||
    producto?.precio_venta ||
    producto?.precio ||
    producto?.precio_unitario ||
    0;

  return parseFloat(precioLista) || 0;
};

const obtenerStockSucursal = (producto) => (
  parseFloat(
    producto?.stock_sucursal ??
    producto?.stock_actual ??
    producto?.cantidad ??
    producto?.stock ??
    0
  ) || 0
);

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const CONSUMIDOR_FINAL = {
  id: null,
  nombre: 'Consumidor final',
  apellido: '',
  nombre_completo: 'Consumidor final'
};

const nombreCliente = (cliente) => (
  cliente?.nombre_completo ||
  `${cliente?.nombre || ''} ${cliente?.apellido || ''}`.trim() ||
  'Consumidor final'
);

const formatearFecha = (value) => {
  if (!value) return 'Sin fecha';
  const fecha = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return fecha.toLocaleDateString('es-AR');
};

/**
 * Formato usado para etiquetas de balanza (EAN13 de peso variable):
 * PP + CCCCC + WWWWW + D
 * - PP: prefijo 20..29
 * - CCCCC: código interno del producto (5 dígitos)
 * - WWWWW: peso en gramos (5 dígitos)
 * - D: check digit EAN13
 */
const parseBalanzaBarcode = (rawCode) => {
  const code = String(rawCode || '').replace(/\D/g, '');
  if (code.length !== 13) return null;

  const prefix = parseInt(code.slice(0, 2), 10);
  if (Number.isNaN(prefix) || prefix < BALANZA_PREFIX_MIN || prefix > BALANZA_PREFIX_MAX) return null;

  const productCode = code.slice(2, 7);
  const grams = parseInt(code.slice(7, 12), 10);
  if (Number.isNaN(grams)) return null;

  const weightKg = grams / 1000;
  return {
    productCode,
    grams,
    weightKg,
    barcode: code
  };
};

const MobilePuntoVenta = () => {
  const {
    currentUser,
    logout,
    sucursalSeleccionada,
    sucursalesDisponibles
  } = useAuth();
  const navigate = useNavigate();

  const searchInputRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [sucursalVenta, setSucursalVenta] = useState('');
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState(null);
  const [configTicket, setConfigTicket] = useState(null);
  const [ticketPendiente, setTicketPendiente] = useState(null);
  const [mostrarCarritoCompleto, setMostrarCarritoCompleto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(CONSUMIDOR_FINAL);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [deudaCliente, setDeudaCliente] = useState(null);
  const [mostrarDeudaCliente, setMostrarDeudaCliente] = useState(false);
  const [comprobanteDeuda, setComprobanteDeuda] = useState(null);
  const [montoPagoDeuda, setMontoPagoDeuda] = useState('');
  const [medioPagoDeuda, setMedioPagoDeuda] = useState('efectivo');
  const [pagandoDeuda, setPagandoDeuda] = useState(false);
  const [actualizandoApp, setActualizandoApp] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const viewport = useViewport();
  /**
   * Pico de altura interior: al abrir el teclado `innerHeight` baja y si usamos eso para el layout,
   * se desmonta el árbol (p. ej. landscape → portrait) y el input pierde foco / el teclado se cierra.
   */
  const peakInnerHeightRef = useRef(
    typeof window !== 'undefined' ? window.innerHeight : 700
  );
  peakInnerHeightRef.current = Math.max(peakInnerHeightRef.current, viewport.height);

  const [, setLayoutEpoch] = useState(0);
  useEffect(() => {
    const onOrientationChange = () => {
      peakInnerHeightRef.current = window.innerHeight;
      setLayoutEpoch((n) => n + 1);
      window.setTimeout(() => {
        peakInnerHeightRef.current = Math.max(
          peakInnerHeightRef.current,
          window.innerHeight
        );
        setLayoutEpoch((n) => n + 1);
      }, 320);
    };
    window.addEventListener('orientationchange', onOrientationChange);
    return () => window.removeEventListener('orientationchange', onOrientationChange);
  }, []);

  /** Tablet apaisada: más ancho que alto, pantalla suficientemente grande (evita móvil en landscape). */
  const landscapeTablet =
    viewport.width > viewport.height &&
    viewport.width >= 900 &&
    peakInnerHeightRef.current >= 520;

  const compact =
    viewport.width < 390 || (!landscapeTablet && viewport.height < 760);

  const cajaModulos = configTicket?.caja_modulos || {};
  const cajaClientesHabilitado = cajaModulos.clientes !== false;
  const cajaAlertaDeudasHabilitada = cajaModulos.alerta_deudas !== false;
  const cajaPagoDeudasHabilitado = cajaModulos.pago_deudas !== false;
  const cajaVerComprobanteHabilitado = cajaModulos.ver_comprobante_deuda !== false;

  const cerrarSesion = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('[MOBILE POS] Error al cerrar sesión:', error);
      toast.error('No se pudo cerrar la sesión');
    }
  };

  const readOfflineQueue = useCallback(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_SALES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const writeOfflineQueue = useCallback((items) => {
    const normalized = Array.isArray(items) ? items : [];
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(normalized));
    setPendingSalesCount(normalized.length);
  }, []);

  const enqueueOfflineSale = useCallback((payload) => {
    const queue = readOfflineQueue();
    queue.push({
      ...payload,
      offlineSaleId: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString()
    });
    writeOfflineQueue(queue);
  }, [readOfflineQueue, writeOfflineQueue]);

  const syncOfflineSales = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = readOfflineQueue();
    if (!queue.length) return;

    let remaining = [...queue];
    let synced = 0;

    for (const item of queue) {
      try {
        await ventasService.crear(item.venta, item.detalles, item.sucursalVenta);
        remaining = remaining.filter((r) => r.offlineSaleId !== item.offlineSaleId);
        synced += 1;
      } catch (error) {
        console.warn('[MOBILE POS] No se pudo sincronizar pendiente:', item.offlineSaleId, error?.message);
      }
    }

    writeOfflineQueue(remaining);
    if (synced > 0) toast.success(`Se sincronizaron ${synced} venta(s) pendiente(s).`);
  }, [readOfflineQueue, writeOfflineQueue]);

  const cargarConfigTicket = useCallback(async () => {
    try {
      const config = await configuracionService.obtener();
      setConfigTicket(config);
      return config;
    } catch (error) {
      console.warn('[MOBILE POS] No se pudo cargar configuración de ticket:', error.message);
      const configPorDefecto = configuracionService.obtenerConfiguracionPorDefecto();
      setConfigTicket(configPorDefecto);
      return configPorDefecto;
    }
  }, []);

  const actualizarAppCaja = async () => {
    try {
      setActualizandoApp(true);
      await cargarConfigTicket();
      setResultados([]);
      setClientesEncontrados([]);

      if (clienteSeleccionado?.id && cajaAlertaDeudasHabilitada) {
        const deudaActualizada = await clientesService.obtenerDeudasCliente(clienteSeleccionado.id);
        setDeudaCliente(deudaActualizada);
      }

      toast.success('Caja actualizada');
    } catch (error) {
      console.error('[MOBILE POS] Error al actualizar caja:', error);
      toast.error('No se pudo actualizar la caja');
    } finally {
      setActualizandoApp(false);
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    const sucursalReal = sucursalesDisponibles?.find((sucursal) => (
      sucursal?.id && sucursal.id !== 'sucursal-principal'
    ));
    const sucursalInicial =
      sucursalReal?.id ||
      (sucursalSeleccionada?.id !== 'sucursal-principal' ? sucursalSeleccionada?.id : '') ||
      sucursalesDisponibles?.[0]?.id ||
      '';
    const sucursalActualExiste = sucursalesDisponibles?.some((sucursal) => sucursal.id === sucursalVenta);

    if (
      sucursalInicial &&
      (!sucursalVenta || sucursalVenta === 'sucursal-principal' || (sucursalesDisponibles?.length > 0 && !sucursalActualExiste))
    ) {
      setSucursalVenta(sucursalInicial);
      setResultados([]);
    }
  }, [sucursalSeleccionada, sucursalVenta, sucursalesDisponibles]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setPendingSalesCount(readOfflineQueue().length);
  }, [readOfflineQueue]);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncOfflineSales]);

  useEffect(() => {
    if (isOnline) syncOfflineSales();
  }, [isOnline, syncOfflineSales]);

  useEffect(() => {
    cargarConfigTicket();
  }, [cargarConfigTicket]);

  useEffect(() => {
    if (!sucursalVenta || busqueda.trim().length < 3) {
      setResultados([]);
      return undefined;
    }

    const timer = setTimeout(() => {
      buscarProductos(busqueda);
    }, 250);

    return () => clearTimeout(timer);
    // buscarProductos depende de sucursalVenta y se invoca con debounce desde este efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, sucursalVenta]);

  useEffect(() => {
    if (!mostrarClientes) return undefined;

    const timer = setTimeout(async () => {
      try {
        setLoadingClientes(true);
        const termino = busquedaCliente.trim();
        const clientes = termino
          ? await clientesService.buscar(termino)
          : await clientesService.obtenerActivos();
        setClientesEncontrados((Array.isArray(clientes) ? clientes : []).slice(0, 20));
      } catch (error) {
        console.error('[MOBILE POS] Error buscando clientes:', error);
        toast.error('No se pudieron buscar clientes');
      } finally {
        setLoadingClientes(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [busquedaCliente, mostrarClientes]);

  const total = useMemo(() => (
    carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  ), [carrito]);

  const deudaTotalCliente = parseFloat(deudaCliente?.total_deuda || 0) || 0;
  const deudasCliente = Array.isArray(deudaCliente?.deudas) ? deudaCliente.deudas : [];

  const montoRecibidoNum = parseFloat(montoRecibido || 0) || 0;
  const vuelto = metodoPago === 'efectivo'
    ? Math.max(0, montoRecibidoNum - total)
    : 0;

  const imprimirTicket = (ticket) => {
    if (!ticket) return;

    const config = configTicket || {};
    const empresa = config.nombre_fantasia || config.razon_social || 'NexoPOS DC';
    const fecha = new Date(ticket.fecha || new Date());
    const detallesHtml = (ticket.detalles || []).map((detalle) => `
      <tr>
        <td colspan="3" class="producto">${escapeHtml(detalle.nombre)}</td>
      </tr>
      <tr>
        <td>${detalle.cantidad} x ${formatMoneda(detalle.precio_unitario)}</td>
        <td></td>
        <td class="right">${formatMoneda(detalle.precio_total)}</td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; color: #000; }
            body {
              margin: 0;
              padding: 5mm;
              width: 80mm;
              font-family: Consolas, "Courier New", monospace;
              font-size: 13px;
              font-weight: 700;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .empresa { font-size: 18px; font-weight: 900; text-transform: uppercase; }
            .muted { font-size: 11px; font-weight: 600; }
            hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; vertical-align: top; }
            .producto { padding-top: 6px; font-weight: 900; }
            .total { font-size: 18px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="empresa">${escapeHtml(empresa)}</div>
            ${config.cuit ? `<div class="muted">CUIT: ${escapeHtml(config.cuit)}</div>` : ''}
            ${config.direccion_calle ? `<div class="muted">${escapeHtml(config.direccion_calle)}</div>` : ''}
            ${config.telefono_principal ? `<div class="muted">Tel: ${escapeHtml(config.telefono_principal)}</div>` : ''}
          </div>
          <hr />
          <div>Ticket: ${escapeHtml(ticket.numero || ticket.id || 's/n')}</div>
          <div>Fecha: ${fecha.toLocaleDateString('es-AR')} ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>Cajero: ${escapeHtml(currentUser?.email || 'Cajero')}</div>
          <hr />
          <table>${detallesHtml}</table>
          <hr />
          <table>
            <tr><td>Subtotal</td><td class="right">${formatMoneda(ticket.subtotal)}</td></tr>
            <tr><td class="total">TOTAL</td><td class="right total">${formatMoneda(ticket.total)}</td></tr>
            <tr><td>Pago</td><td class="right">${escapeHtml(ticket.metodo_pago)}</td></tr>
            <tr><td>Recibido</td><td class="right">${formatMoneda(ticket.monto_recibido)}</td></tr>
            <tr><td>Vuelto</td><td class="right">${formatMoneda(ticket.vuelto)}</td></tr>
          </table>
          <hr />
          <div class="center">GRACIAS POR SU COMPRA</div>
        </body>
      </html>
    `;

    try {
      printHtmlDocument({ title: 'Ticket', bodyHtml: html });
    } catch (error) {
      console.error('[MOBILE POS] Error imprimiendo ticket:', error);
      toast.error('No se pudo abrir la impresión del ticket');
    }
  };

  const buscarProductos = async (termino) => {
    const texto = termino.trim();
    if (!texto || !sucursalVenta) return;

    try {
      setLoadingBusqueda(true);
      const productos = await productosService.buscarConStockPorSucursal(texto, sucursalVenta);
      setResultados(Array.isArray(productos) ? productos : []);
    } catch (error) {
      console.error('[MOBILE POS] Error al buscar productos:', error);
      toast.error('No se pudieron buscar productos');
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const seleccionarConsumidorFinal = () => {
    setClienteSeleccionado(CONSUMIDOR_FINAL);
    setDeudaCliente(null);
    setMostrarDeudaCliente(false);
    setMostrarClientes(false);
    setBusquedaCliente('');
    setClientesEncontrados([]);
  };

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarClientes(false);
    setBusquedaCliente('');
    setClientesEncontrados([]);

    if (!cliente?.id || !cajaAlertaDeudasHabilitada) {
      setDeudaCliente(null);
      return;
    }

    try {
      const deuda = await clientesService.obtenerDeudasCliente(cliente.id);
      const totalDeuda = parseFloat(deuda?.total_deuda || 0) || 0;
      setDeudaCliente(deuda);
      if (totalDeuda > 0) {
        setMostrarDeudaCliente(true);
      }
    } catch (error) {
      console.warn('[MOBILE POS] No se pudo consultar deuda del cliente:', error.message);
      setDeudaCliente(null);
    }
  };

  const pagarComprobanteDeuda = async () => {
    if (!comprobanteDeuda?.id_venta || comprobanteDeuda.id_venta === 'saldo_total') {
      toast.error('Este saldo no tiene un comprobante pagable asociado');
      return;
    }

    const monto = parseFloat(montoPagoDeuda || 0);
    if (!monto || monto <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }

    try {
      setPagandoDeuda(true);
      await ventasService.registrarPago(comprobanteDeuda.id_venta, {
        monto,
        medio_pago: medioPagoDeuda,
        concepto: `Pago desde caja del comprobante ${comprobanteDeuda.numero_venta || comprobanteDeuda.id_venta}`
      });
      toast.success('Pago registrado correctamente');
      setComprobanteDeuda(null);
      setMontoPagoDeuda('');
      if (clienteSeleccionado?.id) {
        const deudaActualizada = await clientesService.obtenerDeudasCliente(clienteSeleccionado.id);
        setDeudaCliente(deudaActualizada);
        if ((parseFloat(deudaActualizada?.total_deuda || 0) || 0) <= 0) {
          setMostrarDeudaCliente(false);
        }
      }
    } catch (error) {
      console.error('[MOBILE POS] Error pagando deuda:', error);
      toast.error(error?.message || 'No se pudo registrar el pago');
    } finally {
      setPagandoDeuda(false);
    }
  };

  const buscarPorCodigoExacto = async () => {
    const codigo = busqueda.trim();
    if (!codigo || !sucursalVenta) return;

    try {
      setLoadingBusqueda(true);
      const balanzaData = parseBalanzaBarcode(codigo);
      const codigoBusqueda = balanzaData?.productCode || codigo;
      const producto = await productosService.obtenerPorCodigoConStock(codigoBusqueda, sucursalVenta);
      if (!producto || !producto.id) {
        toast.warning('Producto no encontrado');
        return;
      }

      if (balanzaData) {
        if (balanzaData.weightKg <= 0) {
          toast.warning('Etiqueta de balanza inválida: peso no reconocido');
          return;
        }
        agregarProducto(producto, {
          forceNewLine: true,
          cantidad: balanzaData.weightKg,
          codigoBalanza: balanzaData.barcode
        });
        toast.success(`Etiqueta balanza: ${balanzaData.weightKg.toFixed(3)} kg de ${producto.nombre}`);
      } else {
        agregarProducto(producto);
      }
    } catch (error) {
      console.error('[MOBILE POS] Error al buscar por código:', error);
      toast.error('Error al leer el código');
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const agregarProducto = (producto, options = {}) => {
    const forceNewLine = options.forceNewLine === true;
    const cantidadInicial = Number.isFinite(options.cantidad) ? options.cantidad : 1;
    const stockDisponible = obtenerStockSucursal(producto);
    const precio = obtenerPrecioVenta(producto);

    if (stockDisponible <= 0) {
      const continuarSinStock = window.confirm(
        `El stock de "${producto.nombre}" está agotado.\n\n¿Querés facturar de todas maneras?`
      );
      if (!continuarSinStock) return;
    }

    setCarrito((items) => {
      const existente = items.find((item) => item.producto_id === producto.id);
      if (existente && !forceNewLine) {
        if (existente.cantidad >= existente.stock_disponible && existente.stock_disponible > 0) {
          const continuarSinStock = window.confirm(
            `Se agotó el stock de "${existente.nombre}".\n\n¿Querés facturar igual y continuar con stock negativo?`
          );
          if (!continuarSinStock) return items;
        }

        return items.map((item) => (
          item.id === existente.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        ));
      }

      return [
        ...items,
        {
          id: forceNewLine ? `${producto.id}__${Date.now()}` : producto.id,
          producto_id: producto.id,
          codigo: producto.codigo || producto.codigo_barras || '',
          nombre: producto.nombre || 'Producto sin nombre',
          precio,
          cantidad: cantidadInicial,
          stock_disponible: stockDisponible,
          codigo_balanza: options.codigoBalanza || null
        }
      ];
    });

    setBusqueda('');
    setResultados([]);
    setUltimaVenta(null);
    searchInputRef.current?.focus();
  };

  const actualizarCantidad = (id, cantidad) => {
    setCarrito((items) => items.flatMap((item) => {
      if (item.id !== id) return [item];
      if (cantidad <= 0) return [];

      return [{
        ...item,
        cantidad
      }];
    }));
  };

  const limpiarVenta = () => {
    setCarrito([]);
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setResultados([]);
    setBusqueda('');
    setMostrarCarritoCompleto(false);
    setClienteSeleccionado(CONSUMIDOR_FINAL);
    setDeudaCliente(null);
    setMostrarDeudaCliente(false);
    setComprobanteDeuda(null);
    searchInputRef.current?.focus();
  };

  const finalizarVenta = async () => {
    if (!sucursalVenta) {
      toast.error('Seleccioná una sucursal para vender');
      return;
    }

    if (carrito.length === 0) {
      toast.error('Agregá al menos un producto');
      return;
    }

    if (metodoPago === 'efectivo' && montoRecibidoNum < total) {
      toast.warning('El efectivo recibido no alcanza para cubrir el total');
      return;
    }

    const lineasConStockAgotado = carrito.filter(
      (item) => item.stock_disponible > 0 && Number(item.cantidad) > Number(item.stock_disponible)
    );
    if (lineasConStockAgotado.length > 0) {
      const confirmar = window.confirm(
        `Hay productos con stock agotado:\n- ${lineasConStockAgotado.map((i) => i.nombre).join('\n- ')}\n\n¿Querés facturar de todas maneras?`
      );
      if (!confirmar) return;
    }

    const totalPagado = metodoPago === 'efectivo' ? total : total;
    const venta = {
        sucursal_id: sucursalVenta,
        cliente_id: clienteSeleccionado?.id || null,
        cliente_nombre: clienteSeleccionado?.id ? nombreCliente(clienteSeleccionado) : 'Cliente General',
        cliente_info: clienteSeleccionado?.id
          ? {
              id: clienteSeleccionado.id,
              nombre: clienteSeleccionado.nombre || '',
              apellido: clienteSeleccionado.apellido || '',
              nombre_completo: nombreCliente(clienteSeleccionado)
            }
          : {
              nombre: '',
              apellido: '',
              nombre_completo: 'Cliente General'
            },
        usuario_id: currentUser?.id || null,
        metodo_pago: metodoPago,
        subtotal: total,
        descuento: 0,
        total,
        estado: 'completada',
        lista_precio_aplicada: 'interior',
        monto_pagado: totalPagado,
        total_pagado: totalPagado,
        monto_recibido: metodoPago === 'efectivo' ? montoRecibidoNum : total,
        vuelto,
        saldo_pendiente: 0,
        estado_pago: 'pagado'
      };

    const detalles = carrito.map((item) => ({
        producto_id: item.producto_id || item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        precio_lista: item.precio,
        lista_aplicada: 'interior',
        precio_total: item.precio * item.cantidad,
        codigo_balanza: item.codigo_balanza || null,
        producto_info: {
          id: item.producto_id || item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          precio: item.precio
        }
      }));

    try {
      setProcesandoVenta(true);
      const respuesta = await ventasService.crear(venta, detalles, sucursalVenta);
      const ventaCreada = respuesta?.data?.data || respuesta?.data || respuesta || {};
      const ticket = {
        ...venta,
        id: ventaCreada.id,
        numero: ventaCreada.numero || ventaCreada.id,
        fecha: new Date().toISOString(),
        detalles: carrito.map((item) => ({
          nombre: item.nombre,
          codigo: item.codigo,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          precio_total: item.precio * item.cantidad
        }))
      };
      setUltimaVenta({
        id: ticket.id,
        total,
        vuelto,
        metodoPago
      });
      toast.success('Venta registrada correctamente');
      if (configTicket?.imprimir_ticket_automaticamente) {
        imprimirTicket(ticket);
      } else {
        setTicketPendiente(ticket);
      }
      limpiarVenta();
    } catch (error) {
      console.error('[MOBILE POS] Error al finalizar venta:', error);
      const msg = String(error?.message || '').toLowerCase();
      const networkError = !navigator.onLine || msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('conexion');
      if (networkError) {
        const offlineTs = Date.now();
        const offlineTicket = {
          ...venta,
          id: `PEND-${offlineTs}`,
          numero: `PEND-${offlineTs}`,
          fecha: new Date().toISOString(),
          detalles: carrito.map((item) => ({
            nombre: item.nombre,
            codigo: item.codigo,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            precio_total: item.precio * item.cantidad
          }))
        };
        enqueueOfflineSale({ venta, detalles, sucursalVenta });
        setUltimaVenta({ id: offlineTicket.id, total, vuelto, metodoPago });
        if (configTicket?.imprimir_ticket_automaticamente) imprimirTicket(offlineTicket);
        else setTicketPendiente(offlineTicket);
        limpiarVenta();
        toast.warning('Sin conexión: venta guardada como pendiente. Se sincronizará automáticamente al reconectar.');
      } else {
        toast.error(error?.message || 'No se pudo registrar la venta');
      }
    } finally {
      setProcesandoVenta(false);
    }
  };

  const botonesMontoRapido = useMemo(() => {
    const redondeado = Math.ceil(total / 100) * 100;
    return [total, redondeado, redondeado + 500, redondeado + 1000]
      .filter((valor, index, arr) => valor > 0 && arr.indexOf(valor) === index);
  }, [total]);

  const busquedaLista = busqueda.trim().length >= 3;
  const mostrarResultados =
    loadingBusqueda || resultados.length > 0 || (busquedaLista && sucursalVenta);

  const gridResultadosClass = landscapeTablet
    ? 'grid grid-cols-2 gap-2 sm:gap-3'
    : 'grid grid-cols-1 gap-2 sm:gap-3';

  const resultadosSolo = (
    <>
      {mostrarResultados && (
        <div className={gridResultadosClass}>
          {loadingBusqueda && (
            <div className="rounded-xl bg-white p-4 text-center font-semibold text-gray-500 shadow">
              Buscando productos...
            </div>
          )}

          {!loadingBusqueda && resultados.length === 0 && busquedaLista && (
            <div className="rounded-xl bg-white p-4 text-center font-semibold text-gray-500 shadow">
              No se encontraron productos con stock para "{busqueda.trim()}".
            </div>
          )}

          {resultados.map((producto) => (
            <button
              key={producto.id}
              type="button"
              onClick={() => agregarProducto(producto)}
              className={`rounded-2xl bg-white text-left shadow active:scale-[0.99] ${landscapeTablet ? 'p-3' : 'p-4'}`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <div className={`font-black text-gray-900 ${landscapeTablet ? 'text-base leading-snug' : 'text-lg'}`}>{producto.nombre}</div>
                  <div className="text-sm text-gray-500">Código: {producto.codigo || 'Sin código'}</div>
                  <div className={`mt-1 text-sm font-semibold ${obtenerStockSucursal(producto) > 0 ? 'text-green-700' : 'text-red-600'}`}>
                    Stock: {obtenerStockSucursal(producto)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`font-black text-blue-700 ${landscapeTablet ? 'text-lg' : 'text-xl'}`}>
                    {formatMoneda(obtenerPrecioVenta(producto))}
                  </div>
                  <div className="mt-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                    Agregar
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  const carritoMaxClass = landscapeTablet
    ? ''
    : `sm:max-h-[min(260px,40vh)] ${compact ? 'max-h-[30vh]' : 'max-h-[260px]'}`;

  const lineasCarrito = carrito.map((item) => (
    <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => setMostrarCarritoCompleto(true)}
        className="min-w-0 text-left"
      >
        <div className="truncate text-sm font-black leading-tight text-gray-900">
          {item.nombre}
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {item.cantidad} x {formatMoneda(item.precio)}
        </div>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-700"
          aria-label={`Restar ${item.nombre}`}
        >
          <FaMinus />
        </button>
        <div className="min-w-[28px] text-center text-base font-black text-gray-900">
          {item.cantidad}
        </div>
        <button
          type="button"
          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
          disabled={false}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-700 disabled:opacity-40"
          aria-label={`Sumar ${item.nombre}`}
        >
          <FaPlus />
        </button>
        <div className="min-w-[74px] text-right text-sm font-black text-gray-900">
          {formatMoneda(item.precio * item.cantidad)}
        </div>
      </div>
    </div>
  ));

  const pieTotalCarrito =
    carrito.length > 0 ? (
      <div className="flex justify-between rounded-b-xl bg-gray-900 px-3 py-2 text-white">
        <span className="text-sm font-black">Total carrito</span>
        <span className="text-lg font-black">{formatMoneda(total)}</span>
      </div>
    ) : null;

  /** Tablet apaisada: solo líneas con scroll; el pie va fuera del scroll */
  const tarjetaCarritoLandscape = (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-2 shadow sm:p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div>
          <h2 className={`font-black text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>Carrito</h2>
          <p className="text-xs font-semibold text-gray-500">
            {carrito.reduce((sum, item) => sum + item.cantidad, 0)} unidades · {carrito.length} productos
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarCarritoCompleto(true)}
          disabled={carrito.length === 0}
          className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-40"
        >
          Ver carrito
        </button>
      </div>

      {carrito.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-50 p-4 text-center text-sm font-semibold text-gray-500">
          Escaneá o buscá un producto para comenzar.
        </div>
      ) : (
        <>
          <div className="scrollbar-thin divide-y divide-gray-100 min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-xl border border-gray-100">
            {lineasCarrito}
          </div>
          <div className="mt-2 shrink-0">{pieTotalCarrito}</div>
        </>
      )}
    </div>
  );

  const panelCobroResumen = (
    <>
      <div className={`rounded-2xl bg-white shadow ${compact ? 'p-2' : landscapeTablet ? 'p-3' : 'p-4'}`}>
        <div className={`grid grid-cols-3 ${compact ? 'gap-2' : 'gap-3'}`}>
          <button
            type="button"
            onClick={() => setMetodoPago('efectivo')}
            className={`rounded-2xl font-black ${compact ? 'min-h-12 py-2 text-xs' : landscapeTablet ? 'min-h-12 py-2 text-sm' : 'min-h-[64px] text-lg'} ${
              metodoPago === 'efectivo'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <FaMoneyBillWave className="mx-auto mb-1" />
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => {
              setMetodoPago('tarjeta');
              setMontoRecibido(total ? String(total) : '');
            }}
            className={`rounded-2xl font-black ${compact ? 'min-h-12 py-2 text-xs' : landscapeTablet ? 'min-h-12 py-2 text-sm' : 'min-h-[64px] text-lg'} ${
              metodoPago === 'tarjeta'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <FaCreditCard className="mx-auto mb-1" />
            Tarjeta
          </button>
          <button
            type="button"
            onClick={() => {
              setMetodoPago('MercadoPago');
              setMontoRecibido(total ? String(total) : '');
            }}
            className={`rounded-2xl font-black ${compact ? 'min-h-12 py-2 text-[10px]' : landscapeTablet ? 'min-h-12 py-2 text-xs' : 'min-h-[64px] text-base'} ${
              metodoPago === 'MercadoPago'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <FaMobileAlt className="mx-auto mb-1" />
            Billetera
          </button>
        </div>

        {metodoPago === 'efectivo' && (
          <div className={landscapeTablet ? 'mt-3' : 'mt-4'}>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Dinero recibido
            </label>
            <input
              type="number"
              value={montoRecibido}
              onChange={(event) => setMontoRecibido(event.target.value)}
              placeholder="0.00"
              className={`w-full rounded-2xl border-2 border-gray-200 px-4 font-black focus:border-green-500 focus:outline-none ${landscapeTablet ? 'py-3 text-xl' : 'py-4 text-3xl'}`}
              inputMode="decimal"
              disabled={carrito.length === 0 || procesandoVenta}
            />

            <div className={`grid grid-cols-2 gap-2 ${landscapeTablet ? 'mt-2' : 'mt-3'}`}>
              {botonesMontoRapido.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setMontoRecibido(String(valor))}
                  className={`rounded-xl bg-gray-100 px-3 font-black text-gray-800 ${landscapeTablet ? 'py-2 text-base' : 'py-3 text-lg'}`}
                >
                  {formatMoneda(valor)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`rounded-2xl bg-gray-900 text-white ${landscapeTablet ? 'mt-3 p-3' : 'mt-4 p-4'}`}>
          <div className={`flex justify-between ${landscapeTablet ? 'text-base' : 'text-lg'}`}>
            <span>Total</span>
            <span className="font-black">{formatMoneda(total)}</span>
          </div>
          <div className={`flex justify-between ${landscapeTablet ? 'mt-1.5 text-base' : 'mt-2 text-lg'}`}>
            <span>Recibido</span>
            <span className="font-black">
              {formatMoneda(metodoPago === 'efectivo' ? montoRecibidoNum : total)}
            </span>
          </div>
          <div className={`flex justify-between border-t border-gray-700 ${landscapeTablet ? 'mt-2 pt-2 text-xl' : 'mt-3 pt-3 text-2xl'}`}>
            <span>Vuelto</span>
            <span className="font-black text-green-300">{formatMoneda(vuelto)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={finalizarVenta}
          disabled={carrito.length === 0 || procesandoVenta || !sucursalVenta}
          className={`flex w-full items-center justify-center rounded-2xl bg-green-600 font-black text-white shadow-lg disabled:bg-gray-300 ${landscapeTablet ? 'mt-3 min-h-[56px] text-lg' : 'mt-4 min-h-[72px] text-2xl'}`}
        >
          <FaCheck className="mr-3" />
          {procesandoVenta ? 'Cobrando...' : 'Cobrar'}
        </button>

        <button
          type="button"
          onClick={limpiarVenta}
          disabled={carrito.length === 0 || procesandoVenta}
          className={`w-full rounded-2xl bg-gray-100 font-black text-gray-700 disabled:opacity-40 ${landscapeTablet ? 'mt-2 min-h-[44px] text-sm' : 'mt-3 min-h-[52px] text-base'}`}
        >
          Limpiar venta
        </button>
      </div>

      {ultimaVenta && (
        <div className={`rounded-2xl border border-green-200 bg-green-50 text-green-900 ${landscapeTablet ? 'p-3' : 'p-4'}`}>
          <div className="text-lg font-black">Venta registrada</div>
          <div className="text-sm">
            ID: {ultimaVenta.id || 'sin ID'} · Total {formatMoneda(ultimaVenta.total)} · Vuelto {formatMoneda(ultimaVenta.vuelto)}
          </div>
        </div>
      )}
    </>
  );

  const tarjetaCarritoPortrait = (
    <div className="rounded-2xl bg-white p-2 shadow sm:p-3">
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <div>
          <h2 className={`font-black text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>Carrito</h2>
          <p className="text-xs font-semibold text-gray-500">
            {carrito.reduce((sum, item) => sum + item.cantidad, 0)} unidades · {carrito.length} productos
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarCarritoCompleto(true)}
          disabled={carrito.length === 0}
          className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-40"
        >
          Ver carrito
        </button>
      </div>

      {carrito.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-5 text-center text-sm font-semibold text-gray-500">
          Escaneá o buscá un producto para comenzar.
        </div>
      ) : (
        <div className={`divide-y divide-gray-100 rounded-xl border border-gray-100 ${carritoMaxClass} overflow-y-auto`}>
          {lineasCarrito}
          <div className="sticky bottom-0 flex justify-between bg-gray-900 px-3 py-2 text-white">
            <span className="text-sm font-black">Total carrito</span>
            <span className="text-lg font-black">{formatMoneda(total)}</span>
          </div>
        </div>
      )}
    </div>
  );

  const carritoCobroUltima = (
    <>
      {tarjetaCarritoPortrait}
      {panelCobroResumen}
    </>
  );

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col gap-1.5 overflow-hidden sm:gap-2">
        <div
          className={`shrink-0 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg ${compact ? 'p-2' : 'p-4'}`}
        >
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className={`font-black leading-tight ${compact ? 'text-lg' : 'text-2xl'}`}>Mostrador</h1>
            <p className={`text-blue-100 ${compact ? 'text-xs' : 'text-sm'}`}>Venta rápida por código o nombre</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div className="text-right">
              <div className={`text-blue-100 ${compact ? 'text-[10px]' : 'text-xs'}`}>Total</div>
              <div className={`font-black ${compact ? 'text-xl' : 'text-3xl'}`}>{formatMoneda(total)}</div>
            </div>
            <button
              type="button"
              onClick={actualizarAppCaja}
              disabled={actualizandoApp}
              className={`flex items-center gap-1.5 rounded-xl bg-white/15 font-black text-white ring-1 ring-white/20 disabled:opacity-60 sm:gap-2 sm:px-3 ${compact ? 'min-h-9 px-2 text-xs' : 'min-h-[46px] px-3 text-sm'}`}
              title="Actualizar configuración y datos de caja"
            >
              <FaSyncAlt className={actualizandoApp ? 'animate-spin' : ''} />
              {actualizandoApp ? (compact ? '…' : 'Actualizando') : compact ? '' : 'Actualizar'}
            </button>
            <button
              type="button"
              onClick={cerrarSesion}
              className={`flex items-center gap-2 rounded-xl bg-white/15 font-black text-white ring-1 ring-white/20 sm:px-3 ${compact ? 'min-h-9 px-2 text-xs' : 'min-h-[46px] px-3 text-sm'}`}
              title="Cerrar sesión o cambiar usuario"
            >
              <FaSignOutAlt />
              {!compact && 'Salir'}
            </button>
          </div>
        </div>
      </div>

      <div className={`shrink-0 rounded-xl border p-2 text-sm font-semibold shadow-sm ${isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        {isOnline
          ? `En linea${pendingSalesCount > 0 ? ` · Pendientes por sincronizar: ${pendingSalesCount}` : ' · Sin pendientes'}`
          : `Sin conexion · Ventas pendientes: ${pendingSalesCount}. Podes seguir facturando y se sincroniza al volver internet.`}
      </div>

      {sucursalesDisponibles?.length > 1 && (
        <div className="shrink-0 rounded-xl bg-white p-2 shadow sm:p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <FaStore className="text-blue-600" />
            Sucursal
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {sucursalesDisponibles.map((sucursal) => (
              <button
                key={sucursal.id}
                onClick={() => setSucursalVenta(sucursal.id)}
                className={`px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap ${
                  sucursalVenta === sucursal.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {sucursal.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {cajaClientesHabilitado && (
        <div className="shrink-0 rounded-xl bg-white p-2 shadow sm:p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FaUser className="text-blue-600" />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase text-gray-500">Cliente</div>
                <div className="truncate text-base font-black text-gray-900">
                  {nombreCliente(clienteSeleccionado)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarClientes(true)}
              className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700"
            >
              Cambiar
            </button>
          </div>

          {deudaTotalCliente > 0 && cajaAlertaDeudasHabilitada && (
            <button
              type="button"
              onClick={() => setMostrarDeudaCliente(true)}
              className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-900"
            >
              Este cliente registra deuda por {formatMoneda(deudaTotalCliente)}.
              {deudasCliente[0] && (
                <span className="block font-normal">
                  Comprobante {deudasCliente[0].numero_venta || deudasCliente[0].id_venta} · {formatearFecha(deudasCliente[0].fecha)}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      <div className="shrink-0 rounded-2xl bg-white p-2 shadow sm:p-3">
        <div className="relative">
          <FaSearch className={`absolute left-3 text-gray-400 sm:left-4 ${compact ? 'top-3' : 'top-4'}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                buscarPorCodigoExacto();
              }
            }}
            placeholder="Escanear código (incluye balanza) o escribir al menos 3 letras..."
            className={`w-full rounded-2xl border-2 border-gray-200 pl-10 pr-3 font-semibold focus:border-blue-500 focus:outline-none sm:pl-12 sm:pr-4 ${compact ? 'py-2.5 text-base' : 'py-4 text-xl'}`}
            inputMode="search"
            disabled={!sucursalVenta || procesandoVenta}
          />
        </div>

        <button
          type="button"
          onClick={buscarPorCodigoExacto}
          disabled={!busqueda.trim() || !sucursalVenta || procesandoVenta}
          className={`mt-2 flex w-full items-center justify-center rounded-2xl bg-blue-600 font-black text-white disabled:bg-gray-300 sm:mt-3 sm:min-h-[52px] sm:text-lg ${compact ? 'min-h-10 text-sm' : 'min-h-[52px] text-lg'}`}
        >
          <FaBarcode className="mr-2" />
          Agregar por código
        </button>
        <p className="mt-2 text-xs text-gray-500">
          Carnicería/balanza: soporta etiquetas EAN13 de peso variable (prefijos 20 a 29).
        </p>
      </div>

      {landscapeTablet ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
          <section
            aria-label="Resultados de búsqueda"
            className={`scrollbar-thin min-h-0 overflow-y-auto overscroll-y-contain pr-0.5 ${mostrarResultados ? 'flex-1' : 'hidden'}`}
          >
            {resultadosSolo}
          </section>

          <div className={`flex min-h-0 flex-1 flex-row items-stretch gap-2 overflow-hidden ${mostrarResultados ? 'border-t border-gray-200 pt-2' : ''} sm:gap-3`}>
            <section
              aria-label="Productos del carrito"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pr-2"
            >
              {tarjetaCarritoLandscape}
            </section>
            <section
              aria-label="Medios de pago y cobro"
              className="flex min-h-0 w-[clamp(17rem,min(360px,35vw),24rem)] min-w-[15rem] max-w-[40vw] shrink-0 flex-col overflow-hidden border-l border-gray-200 pl-3"
            >
              {panelCobroResumen}
            </section>
          </div>
        </div>
      ) : (
        <div className="scrollbar-thin flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pr-0.5">
          {resultadosSolo}
          {carritoCobroUltima}
        </div>
      )}

      </div>

      {mostrarClientes && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-4 text-white shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black">Seleccionar cliente</div>
                <div className="text-sm font-semibold text-blue-100">
                  Predeterminado: Consumidor final
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarClientes(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <button
              type="button"
              onClick={seleccionarConsumidorFinal}
              className="w-full rounded-2xl bg-white p-4 text-left shadow"
            >
              <div className="text-lg font-black text-gray-900">Consumidor final</div>
              <div className="text-sm font-semibold text-gray-500">Venta sin cliente asociado</div>
            </button>

            <input
              type="text"
              value={busquedaCliente}
              onChange={(event) => setBusquedaCliente(event.target.value)}
              placeholder="Buscar por nombre, teléfono, email o DNI/CUIT"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-4 text-base font-semibold focus:border-blue-500 focus:outline-none"
              autoFocus
            />

            {loadingClientes ? (
              <div className="rounded-xl bg-white p-4 text-center font-semibold text-gray-500 shadow">
                Buscando clientes...
              </div>
            ) : (
              <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto">
                {clientesEncontrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full rounded-2xl bg-white p-4 text-left shadow active:scale-[0.99]"
                  >
                    <div className="text-lg font-black text-gray-900">{nombreCliente(cliente)}</div>
                    <div className="text-sm font-semibold text-gray-500">
                      {cliente.telefono || cliente.email || cliente.dni_cuit || 'Sin datos de contacto'}
                    </div>
                    {Array.isArray(cliente.deudas) && cliente.deudas.length > 0 && (
                      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                        Tiene comprobantes pendientes
                      </div>
                    )}
                  </button>
                ))}
                {!loadingClientes && clientesEncontrados.length === 0 && (
                  <div className="rounded-xl bg-white p-4 text-center font-semibold text-gray-500 shadow">
                    No se encontraron clientes.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarDeudaCliente && deudaTotalCliente > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-gray-900">Cliente con deuda</div>
                <div className="text-sm font-semibold text-gray-500">{nombreCliente(clienteSeleccionado)}</div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarDeudaCliente(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-900">
              <div className="text-sm font-semibold">Deuda total</div>
              <div className="text-3xl font-black">{formatMoneda(deudaTotalCliente)}</div>
            </div>

            <div className="mt-4 space-y-2">
              {deudasCliente.map((deuda) => (
                <div key={deuda.id_venta} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-gray-900">
                        Comprobante {deuda.numero_venta || deuda.id_venta}
                      </div>
                      <div className="text-xs font-semibold text-gray-500">
                        {formatearFecha(deuda.fecha)} · {deuda.dias_atraso || 0} días
                      </div>
                    </div>
                    <div className="text-right text-lg font-black text-amber-700">
                      {formatMoneda(deuda.saldo_pendiente)}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {cajaVerComprobanteHabilitado && (
                      <button
                        type="button"
                        onClick={() => setComprobanteDeuda(deuda)}
                        className="rounded-xl bg-white px-3 py-2 text-sm font-black text-gray-700"
                      >
                        Ver
                      </button>
                    )}
                    {cajaPagoDeudasHabilitado && deuda.id_venta !== 'saldo_total' && (
                      <button
                        type="button"
                        onClick={() => {
                          setComprobanteDeuda(deuda);
                          setMontoPagoDeuda(String(deuda.saldo_pendiente || ''));
                        }}
                        className="rounded-xl bg-green-600 px-3 py-2 text-sm font-black text-white"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {comprobanteDeuda && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-blue-900">
                      Comprobante {comprobanteDeuda.numero_venta || comprobanteDeuda.id_venta}
                    </div>
                    <div className="text-xs font-semibold text-blue-700">
                      Fecha {formatearFecha(comprobanteDeuda.fecha)} · Total {formatMoneda(comprobanteDeuda.total_venta)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComprobanteDeuda(null)}
                    className="text-blue-700"
                  >
                    <FaTimes />
                  </button>
                </div>

                {cajaPagoDeudasHabilitado && comprobanteDeuda.id_venta !== 'saldo_total' && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="number"
                      value={montoPagoDeuda}
                      onChange={(event) => setMontoPagoDeuda(event.target.value)}
                      className="w-full rounded-xl border border-blue-200 px-3 py-3 text-lg font-black focus:outline-none"
                      inputMode="decimal"
                    />
                    <select
                      value={medioPagoDeuda}
                      onChange={(event) => setMedioPagoDeuda(event.target.value)}
                      className="w-full rounded-xl border border-blue-200 px-3 py-3 font-bold focus:outline-none"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="MercadoPago">Billetera</option>
                    </select>
                    <button
                      type="button"
                      onClick={pagarComprobanteDeuda}
                      disabled={pagandoDeuda}
                      className="min-h-[50px] w-full rounded-xl bg-green-600 text-base font-black text-white disabled:bg-gray-300"
                    >
                      {pagandoDeuda ? 'Registrando pago...' : 'Registrar pago'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMostrarDeudaCliente(false)}
              className="mt-4 min-h-[52px] w-full rounded-2xl bg-gray-100 text-base font-black text-gray-700"
            >
              Ignorar y facturar nueva venta
            </button>
          </div>
        </div>
      )}

      {mostrarCarritoCompleto && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-4 text-white shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-black">Carrito</div>
                <div className="text-sm font-semibold text-blue-100">
                  Editá cantidades o quitá productos
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-100">Total</div>
                <div className="text-3xl font-black">{formatMoneda(total)}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {carrito.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center font-semibold text-gray-500 shadow">
                El carrito está vacío.
              </div>
            ) : (
              <div className="space-y-2">
                {carrito.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-gray-900">{item.nombre}</div>
                        <div className="text-xs font-semibold text-gray-500">
                          {item.codigo || 'Sin código'} · {formatMoneda(item.precio)} c/u · Stock {item.stock_disponible}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => actualizarCantidad(item.id, 0)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        <FaTrash />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700"
                        >
                          <FaMinus />
                        </button>
                        <div className="min-w-[54px] text-center text-2xl font-black text-gray-900">
                          {item.cantidad}
                        </div>
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                          disabled={false}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 disabled:opacity-40"
                        >
                          <FaPlus />
                        </button>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        {formatMoneda(item.precio * item.cantidad)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-gray-900 px-4 py-3 text-white">
              <span className="text-lg font-black">Total</span>
              <span className="text-3xl font-black">{formatMoneda(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMostrarCarritoCompleto(false)}
                className="min-h-[58px] rounded-2xl bg-gray-100 text-lg font-black text-gray-700"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => setMostrarCarritoCompleto(false)}
                disabled={carrito.length === 0}
                className="min-h-[58px] rounded-2xl bg-green-600 text-lg font-black text-white disabled:bg-gray-300"
              >
                Finalizar venta
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketPendiente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-2 flex items-center gap-3 text-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <FaPrint />
              </div>
              <div>
                <div className="text-xl font-black">¿Imprimir ticket?</div>
                <div className="text-sm font-semibold text-gray-500">
                  Venta total {formatMoneda(ticketPendiente.total)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Podés imprimir el comprobante ahora o continuar sin imprimir.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTicketPendiente(null)}
                className="min-h-[52px] rounded-2xl bg-gray-100 text-base font-black text-gray-700"
              >
                No imprimir
              </button>
              <button
                type="button"
                onClick={() => {
                  imprimirTicket(ticketPendiente);
                  setTicketPendiente(null);
                }}
                className="min-h-[52px] rounded-2xl bg-blue-600 text-base font-black text-white"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobilePuntoVenta;