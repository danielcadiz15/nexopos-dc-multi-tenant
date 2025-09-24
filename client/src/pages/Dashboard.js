// src/pages/Dashboard.js - VERSIÓN CON RESTRICCIÓN DE GANANCIAS
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import productosService from '../services/productos.service';
import reportesService from '../services/reportes.service';
import clientesService from '../services/clientes.service';
import ventasService from '../services/ventas.service';
import RegistrarPagoDialog from '../components/modules/ventas/RegistrarPagoDialog';
import TicketReciboPago from '../components/modules/ventas/TicketReciboPago';

// Contexto de autenticación
import { useAuth } from '../contexts/AuthContext';

// Componentes
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import ClientesConDeuda from '../components/modules/clientes/ClientesConDeuda';
import ClientesSinCompras from '../components/modules/clientes/ClientesSinCompras';
import Modal from '../components/common/Modal';
import JardinTareas from '../components/modules/dashboard/JardinTareas';
import MuroInnovacion from '../components/modules/dashboard/MuroInnovacion';
import IniciarPreVentaModal from '../components/modules/ventas/IniciarPreVentaModal';
import ZonasABMModal from '../components/modules/ventas/ZonasABMModal';
import PreVentaWizard from '../components/modules/ventas/PreVentaWizard';
import IniciarRepartoModal from '../components/modules/ventas/IniciarRepartoModal';
import RepartoWizardMovil from '../components/modules/ventas/RepartoWizardMovil';
import preventaService from '../services/preventa.service';

// Iconos
import { 
  FaShoppingCart, FaBoxOpen, FaExclamationTriangle, 
  FaChartLine, FaDollarSign, FaChartLine as FaTrendingUp, FaPlus,
  FaUser, FaStar, FaFileInvoiceDollar, FaCalendarAlt,
  FaStore, FaArrowUp, FaArrowDown, FaPercent, FaLock, FaTruck
} from 'react-icons/fa';

/**
 * Dashboard principal con restricción de ganancias
 */
const Dashboard = () => {
  const { currentUser, sucursalSeleccionada, hasPermission } = useAuth();
  
  // ✅ NUEVO: Verificar si el usuario es administrador
  const esAdministrador = () => {
    // Verificar por múltiples criterios
    if (!currentUser) return false;
    
    // Verificar por rol (diferentes formas en que puede estar almacenado)
    if (currentUser.rol === 'Administrador' || currentUser.rol === 'admin') return true;
    if (currentUser.role === 'Administrador' || currentUser.role === 'admin') return true;
    
    // Verificar por ID de rol si existe
    if (currentUser.rolId === 'admin' || currentUser.rol_id === 'admin') return true;
    
    // Verificar por flag isAdmin
    if (currentUser.isAdmin === true) return true;
    
    // Verificar por permisos específicos (si tiene permisos de usuarios, probablemente es admin)
    if (hasPermission && hasPermission('usuarios', 'editar')) return true;
    
    return false;
  };

  const puedeVerGanancias = esAdministrador();
  
  // Estados con inicializaciones seguras
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [productosDestacados, setProductosDestacados] = useState([]);
  const [clientesDestacados, setClientesDestacados] = useState([]);
  const [stats, setStats] = useState({
    totalProductos: 0,
    ventasHoy: 0,
    cantidadVentasHoy: 0,
    gananciasHoy: 0,
    stockBajo: 0,
    ticketPromedio: 0,
    margenPromedio: 0
  });
  
  // Estado para comparativos
  const [comparativos, setComparativos] = useState({
    ventasAyer: 0,
    gananciasAyer: 0,
    ventasSemanaAnterior: 0
  });

  // Estado para clientes con deuda > 20 días
  const [clientesDeuda, setClientesDeuda] = useState([]);
  const [loadingDeuda, setLoadingDeuda] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mensajeWA, setMensajeWA] = useState('');
  const [clienteWA, setClienteWA] = useState(null);

  // Estado para el modal de pago
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  
  // Estados para ticket de pago
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [pagoRegistrado, setPagoRegistrado] = useState(null);

  // Estado para selección múltiple de deudas
  const [deudasSeleccionadas, setDeudasSeleccionadas] = useState([]);
  const [modalConfirmarPagos, setModalConfirmarPagos] = useState(false);
  const [procesandoPagos, setProcesandoPagos] = useState(false);
  // Pre-venta
  // (ya declarados más arriba si existen, mantener una sola declaración)
  // Reparto
  const [modalRepartoOpen, setModalRepartoOpen] = useState(false);
  const [repartoSesion, setRepartoSesion] = useState(null);
  const [repartoWizardOpen, setRepartoWizardOpen] = useState(false);
  // Pre-venta
  const [modalPreventaOpen, setModalPreventaOpen] = useState(false);
  const [preventaSesion, setPreventaSesion] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [zonasModalOpen, setZonasModalOpen] = useState(false);
  const [resumenPreventa, setResumenPreventa] = useState([]);
  const [confirmandoId, setConfirmandoId] = useState(null);

  // Estado para paginación de clientes con deuda
  const [lastClienteId, setLastClienteId] = useState(null);
  const [hayMasClientes, setHayMasClientes] = useState(false);

  /**
   * Carga datos con manejo robusto de errores
   */
  useEffect(() => {
    cargarDatos();
  }, [sucursalSeleccionada]);

  /**
   * Función principal de carga de datos
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando datos del dashboard...');
      console.log('👤 Usuario:', currentUser?.email, '- Es admin:', puedeVerGanancias);
      
      // Determinar sucursal para reportes
      const sucursalId = sucursalSeleccionada?.id || null;
      
      // Cargar datos en paralelo de forma segura
      const [
        dashboardData,
        productosData,
        stockBajoData
      ] = await Promise.allSettled([
        reportesService.obtenerDatosDashboard(sucursalId),
        productosService.obtenerTodos(),
        productosService.obtenerStockBajo()
      ]);

      // Procesar datos de dashboard
      let datosReales = {
        ventasHoy: 0,
        cantidadVentasHoy: 0,
        gananciasHoy: 0,
        productosDestacados: [],
        clientesDestacados: []
      };

      if (dashboardData.status === 'fulfilled' && dashboardData.value) {
        datosReales = dashboardData.value;
        console.log('✅ Datos dashboard obtenidos:', datosReales);
      } else {
        console.warn('⚠️ Error en datos dashboard:', dashboardData.reason);
      }

      // Procesar productos de forma segura
      let productosArray = [];
      if (productosData.status === 'fulfilled' && productosData.value) {
        productosArray = Array.isArray(productosData.value) ? productosData.value : [];
      } else {
        console.warn('⚠️ Error en productos:', productosData.reason);
      }

      // Procesar stock bajo de forma segura
      let stockBajoArray = [];
      if (stockBajoData.status === 'fulfilled' && stockBajoData.value) {
        stockBajoArray = Array.isArray(stockBajoData.value) ? stockBajoData.value : [];
      } else {
        console.warn('⚠️ Error en stock bajo:', stockBajoData.reason);
      }

      // Asegurar que los datos destacados sean arrays
      const productosDestacadosSeguro = Array.isArray(datosReales.productosDestacados) 
        ? datosReales.productosDestacados 
        : [];
      
      const clientesDestacadosSeguro = Array.isArray(datosReales.clientesDestacados)
        ? datosReales.clientesDestacados
        : [];

      // Calcular ticket promedio real
      const ticketPromedio = datosReales.cantidadVentasHoy > 0 
        ? datosReales.ventasHoy / datosReales.cantidadVentasHoy 
        : 0;

      // Calcular margen promedio real (solo si es admin)
      const margenPromedio = puedeVerGanancias && datosReales.ventasHoy > 0 
        ? (datosReales.gananciasHoy / datosReales.ventasHoy) * 100 
        : 0;

      // Actualizar estados con datos reales
      setProductos(productosArray);
      setProductosDestacados(productosDestacadosSeguro);
      setClientesDestacados(clientesDestacadosSeguro);
      
      setStats({
        totalProductos: productosArray.length,
        ventasHoy: datosReales.ventasHoy || 0,
        cantidadVentasHoy: datosReales.cantidadVentasHoy || 0,
        // ✅ IMPORTANTE: Solo mostrar ganancias si es admin
        gananciasHoy: puedeVerGanancias ? (datosReales.gananciasHoy || 0) : 0,
        stockBajo: stockBajoArray.length,
        ticketPromedio: ticketPromedio,
        margenPromedio: puedeVerGanancias ? margenPromedio : 0
      });

      // Cargar datos comparativos (solo si es admin)
      if (puedeVerGanancias) {
        await cargarComparativos(sucursalId);
      }
      
      console.log('✅ Dashboard cargado exitosamente');

    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      toast.error('Error al cargar datos del dashboard');
      
      // Valores por defecto en caso de error
      setStats({
        totalProductos: 0,
        ventasHoy: 0,
        cantidadVentasHoy: 0,
        gananciasHoy: 0,
        stockBajo: 0,
        ticketPromedio: 0,
        margenPromedio: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar resumen de pedidos de pre-venta (vista rápida)
  useEffect(() => {
    (async () => {
      try {
        if (!preventaSesion?.id && !preventaSesion?.zona_id) return;
        const { pedidos } = await preventaService.obtenerResumenSesion(preventaSesion.id || preventaSesion.zona_id);
        setResumenPreventa(Array.isArray(pedidos) ? pedidos : []);
      } catch (e) {
        setResumenPreventa([]);
      }
    })();
  }, [preventaSesion, wizardOpen]);

  const confirmarPreventaPedido = async (p) => {
    try {
      if (!sucursalSeleccionada?.id) {
        toast.error('Selecciona una sucursal para confirmar');
        return;
      }
      if (!p?.items || p.items.length === 0) {
        toast.error('El pedido no tiene items');
        return;
      }
      setConfirmandoId(p.id || 'tmp');
      // Validar stock por item
      const insuf = [];
      for (const it of p.items) {
        try {
          const stock = await productosService.consultarStockEnSucursal(it.producto_id, sucursalSeleccionada.id);
          const disponible = parseInt(stock?.cantidad || stock?.stock || stock?.stock_actual || 0);
          if (disponible < (it.cantidad || 0)) {
            insuf.push({ nombre: it.nombre, requerido: it.cantidad, disponible });
          }
        } catch (_) {}
      }
      if (insuf.length > 0) {
        toast.error(`Stock insuficiente en ${insuf.length} producto(s)`);
        console.table(insuf);
        return;
      }
      // Construir venta y detalles
      const detalles = p.items.map(it => ({ producto_id: it.producto_id, cantidad: it.cantidad, sucursal_id: sucursalSeleccionada.id }));
      const total = p.items.reduce((acc, it) => acc + (parseFloat(it.precio_venta || it.precio || 0) || 0) * (parseFloat(it.cantidad || 0) || 0), 0);
      const venta = {
        cliente_id: p.cliente_id || p.cliente?.id || null,
        total,
        notas: p.notas || '',
        metodo_pago: 'pendiente',
        estado: 'pendiente'
      };
      await ventasService.crear(venta, detalles, sucursalSeleccionada.id);
      // Marcar en preventa como confirmado (best effort)
      try { if (p.id) await preventaService.confirmarPedido(p.id); } catch (_) {}
      toast.success('Pre-venta confirmada como venta');
      // Quitar de la lista local
      setResumenPreventa(prev => prev.filter(x => (x.id || x) !== (p.id || p)));
    } catch (e) {
      toast.error('Error al confirmar la pre-venta');
      console.error('Confirmar pre-venta error:', e);
    } finally {
      setConfirmandoId(null);
    }
  };

  /**
   * Cargar datos comparativos para mostrar tendencias
   */
  const cargarComparativos = async (sucursalId) => {
    try {
      const hoy = new Date();
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);

      const semanaAnterior = new Date(hoy);
      semanaAnterior.setDate(semanaAnterior.getDate() - 7);

      // Obtener datos de ayer
      const datosAyer = await reportesService.obtenerReporteVentas({
        fechaInicio: ayer.toISOString().split('T')[0],
        fechaFin: ayer.toISOString().split('T')[0],
        sucursal_id: sucursalId
      });

      // Obtener datos de la semana anterior
      const datosSemanaAnterior = await reportesService.obtenerReporteVentas({
        fechaInicio: semanaAnterior.toISOString().split('T')[0],
        fechaFin: semanaAnterior.toISOString().split('T')[0],
        sucursal_id: sucursalId
      });

      setComparativos({
        ventasAyer: datosAyer?.resumen?.totalVentas || 0,
        gananciasAyer: datosAyer?.resumen?.ganancia || 0,
        ventasSemanaAnterior: datosSemanaAnterior?.resumen?.totalVentas || 0
      });

    } catch (error) {
      console.warn('⚠️ Error cargando comparativos:', error);
      // No mostrar error al usuario, usar valores por defecto
    }
  };

  // Modificar cargarClientesDeuda para ocultar el botón 'Cargar más' si ya no hay más resultados
  const cargarClientesDeuda = async (reset = false) => {
    setLoadingDeuda(true);
    try {
      const filtros = { limit: 100 };
      if (!reset && lastClienteId) filtros.startAfter = lastClienteId;
      const { clientes, lastClienteId: nuevoLastId } = await clientesService.obtenerClientesConDeuda(filtros);
      const clientesFiltrados = clientes.filter(cliente => {
        if (!cliente.deudas || !Array.isArray(cliente.deudas)) return false;
        return cliente.deudas.some(deuda => deuda.importe > 0);
      });
      if (reset) {
        setClientesDeuda(clientesFiltrados);
      } else {
        setClientesDeuda(prev => [...prev, ...clientesFiltrados]);
      }
      setLastClienteId(nuevoLastId);
      // Si la cantidad recibida es menor al límite, ya no hay más para cargar
      setHayMasClientes(!!nuevoLastId && clientesFiltrados.length === 100);
      if (clientesFiltrados.length < 100) setHayMasClientes(false);
    } catch (error) {
      setClientesDeuda([]);
      setLastClienteId(null);
      setHayMasClientes(false);
      console.error('[DEBUG] Error al cargar clientes con deuda:', error);
    } finally {
      setLoadingDeuda(false);
    }
  };

  const abrirModalWA = (cliente, deuda) => {
    const mensaje = `Hola ${cliente.nombre || ''}, tienes una deuda pendiente de $${deuda.importe} desde el ${new Date(deuda.fecha).toLocaleDateString('es-AR')}. Por favor, regulariza tu situación. ¡Gracias!`;
    setMensajeWA(mensaje);
    setClienteWA({ ...cliente, deuda });
    setModalOpen(true);
  };

  const enviarWA = () => {
    if (!clienteWA) return;
    const telefono = clienteWA.telefono ? clienteWA.telefono.replace(/[^\d]/g, '') : '';
    if (!telefono) {
      toast.error('El cliente no tiene teléfono válido');
      return;
    }
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensajeWA)}`;
    window.open(url, '_blank');
    setModalOpen(false);
  };

  // Función para abrir el modal de pago
  const abrirModalPago = async (cliente, deuda) => {
    try {
      // Obtener datos completos de la venta
      const ventaId = deuda.venta_id || deuda.id_venta;
      
      if (ventaId) {
        const ventaCompleta = await ventasService.obtenerPorId(ventaId);
        setClienteSeleccionado(cliente);
        setDeudaSeleccionada({ ...deuda, ventaCompleta });
        setModalPagoOpen(true);
      } else {
        toast.error('No se puede obtener los datos de la venta');
      }
    } catch (error) {
      console.error('Error al obtener datos de venta:', error);
      toast.error('Error al cargar datos de la venta');
    }
  };

  // Función para registrar el pago (delega a ventasService)
  const registrarPago = async (pagoData) => {
    try {
      // Log robusto para depuración
      console.log('[DEBUG] Deuda seleccionada al registrar pago:', deudaSeleccionada);
      console.log('[DEBUG] Cliente seleccionado al registrar pago:', clienteSeleccionado);
      // Usar ambos campos para máxima compatibilidad
      const idVenta = deudaSeleccionada?.venta_id || deudaSeleccionada?.id_venta;
      if (!idVenta) {
        toast.error('No se puede registrar el pago: falta el ID de la venta asociada a la deuda.');
        return;
      }
      await ventasService.registrarPago(idVenta, pagoData);
      toast.success('Pago registrado correctamente');
      
      // Obtener los datos ACTUALIZADOS de la venta después del pago
      console.log('🔄 Obteniendo datos actualizados de la venta después del pago en Dashboard...');
      const ventaActualizada = await ventasService.obtenerPorId(idVenta);
      console.log('✅ Venta actualizada obtenida en Dashboard:', ventaActualizada);
      
      // Actualizar deudaSeleccionada con los datos actualizados
      setDeudaSeleccionada(prev => ({
        ...prev,
        ventaCompleta: ventaActualizada
      }));
      
      // Guardar datos del pago para mostrar el ticket
      console.log('🎫 Activando ticket de pago en Dashboard:', pagoData);
      setPagoRegistrado(pagoData);
      setMostrarTicket(true);
      console.log('🎫 Estado mostrarTicket establecido en true');
      
      // NO cerrar el modal automáticamente - dejar que el ticket se muestre
      // setModalPagoOpen(false);
      // setDeudaSeleccionada(null);
      // setClienteSeleccionado(null);
      cargarClientesDeuda();
    } catch (error) {
      toast.error(error.message || 'Error al registrar el pago');
    }
  };

  /**
   * Cierra el ticket de pago
   */
  const cerrarTicket = () => {
    console.log('🎫 Cerrando ticket de pago en Dashboard');
    setMostrarTicket(false);
    setPagoRegistrado(null);
    // Cerrar también el modal de registro
    setModalPagoOpen(false);
    setDeudaSeleccionada(null);
    setClienteSeleccionado(null);
  };

  // Manejar selección/deselección de una deuda
  const toggleSeleccionDeuda = (cliente, deuda) => {
    const key = `${cliente.id}_${deuda.id_venta || deuda.venta_id}`;
    const yaSeleccionada = deudasSeleccionadas.find(d => d.key === key);
    if (yaSeleccionada) {
      setDeudasSeleccionadas(deudasSeleccionadas.filter(d => d.key !== key));
    } else {
      setDeudasSeleccionadas([
        ...deudasSeleccionadas,
        { key, cliente, deuda }
      ]);
    }
  };

  // Procesar pagos completos en lote
  const registrarPagosCompletosLote = async () => {
    setProcesandoPagos(true);
    try {
      console.log(`🔄 Iniciando procesamiento de ${deudasSeleccionadas.length} pagos en lote...`);
      console.log('📋 Deudas seleccionadas:', deudasSeleccionadas);
      
      // ✅ Verificar que el servicio esté disponible
      if (!ventasService) {
        console.error('❌ Error: ventasService no está disponible');
        toast.error('Error: Servicio de ventas no disponible');
        return;
      }
      
      console.log('✅ ventasService disponible:', ventasService);
      console.log('🔧 Métodos disponibles:', Object.keys(ventasService));
      
      let exitos = 0, errores = 0;
      const pagosRegistrados = [];
      
      for (const item of deudasSeleccionadas) {
        console.log('🔍 Procesando item:', item);
        
        const idVenta = item.deuda.venta_id || item.deuda.id_venta;
        if (!idVenta) {
          console.error(`❌ Error: No se pudo obtener ID de venta para deuda:`, item.deuda);
          errores++;
          continue;
        }
        
        try {
          console.log(`💰 Procesando pago para venta ${idVenta}: $${item.deuda.importe}`);
          console.log('📊 Datos de la deuda:', item.deuda);
          
          const pagoData = {
            monto: item.deuda.importe,
            metodo_pago: 'efectivo',
            referencia: 'Pago masivo',
            concepto: 'Pago completo (masivo)',
            nota: 'Pago marcado en limpieza masiva',
            generar_ticket: false // ✅ NO generar ticket automáticamente para evitar tráfico
          };
          
          console.log('📝 Datos del pago a registrar:', pagoData);
          console.log('🔧 Llamando a ventasService.registrarPago...');
          
          const resultadoPago = await ventasService.registrarPago(idVenta, pagoData);
          
          console.log('✅ Resultado del pago:', resultadoPago);
          
          // Guardar información del pago para referencia posterior
          pagosRegistrados.push({
            venta_id: idVenta,
            cliente: `${item.cliente.nombre} ${item.cliente.apellido}`,
            monto: item.deuda.importe,
            pago_id: resultadoPago?.id || 'N/A',
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Pago registrado exitosamente para venta ${idVenta}:`, resultadoPago);
          exitos++;
          
        } catch (err) {
          console.error(`❌ Error al registrar pago para venta ${idVenta}:`, err);
          console.error('🔍 Detalles del error:', {
            message: err.message,
            stack: err.stack,
            venta_id: idVenta,
            deuda: item.deuda
          });
          errores++;
        }
      }
      
      // Mostrar resultado detallado
      if (exitos > 0) {
        const mensaje = `${exitos} pago(s) registrado(s) correctamente`;
        if (errores > 0) {
          toast.success(`${mensaje} - ${errores} error(es)`);
        } else {
          toast.success(mensaje);
        }
        
        // Mostrar resumen de pagos en consola para auditoría
        console.group('📊 RESUMEN DE PAGOS EN LOTE - DASHBOARD');
        console.table(pagosRegistrados);
        console.groupEnd();
        
        // Opcional: Mostrar modal con resumen de pagos
        if (pagosRegistrados.length > 0) {
          mostrarResumenPagosLote(pagosRegistrados);
        }
      } else {
        toast.error('No se pudo registrar ningún pago');
      }
      
      // Limpiar selección y recargar
      setDeudasSeleccionadas([]);
      setModalConfirmarPagos(false);
      
      // ✅ FORZAR actualización de la lista de deudas
      console.log('🔄 Recargando lista de deudas después de procesamiento en lote...');
      await cargarClientesDeuda();
      
      // ✅ Verificar que la lista se actualizó correctamente
      console.log('✅ Lista de deudas actualizada después de pagos en lote');
      
    } catch (error) {
      console.error('❌ Error general en procesamiento por lote:', error);
      toast.error('Error al registrar pagos masivos: ' + error.message);
    } finally {
      setProcesandoPagos(false);
    }
  };

  /**
   * Muestra un resumen de los pagos procesados en lote desde el Dashboard
   */
  const mostrarResumenPagosLote = (pagos) => {
    // Crear un modal temporal para mostrar el resumen
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">✅ Resumen de Pagos en Lote - Dashboard</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">
            Se procesaron <strong>${pagos.length} pagos</strong> exitosamente desde el Dashboard.
          </p>
          <p class="text-xs text-gray-500">
            💡 Los tickets no se generaron automáticamente para evitar tráfico. 
            Puedes acceder a cada venta individualmente para generar tickets si es necesario.
          </p>
        </div>
        
        <div class="border rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venta</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${pagos.map(pago => `
                <tr>
                  <td class="px-3 py-2 text-sm text-gray-900">${pago.venta_id}</td>
                  <td class="px-3 py-2 text-sm text-gray-900">${pago.cliente}</td>
                  <td class="px-3 py-2 text-sm text-gray-900">$${pago.monto.toLocaleString()}</td>
                  <td class="px-3 py-2 text-sm text-gray-900">
                    <button 
                      onclick="window.open('/ventas/${pago.venta_id}', '_blank')"
                      class="text-indigo-600 hover:text-indigo-900 text-xs underline"
                    >
                      Ver Venta
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="mt-4 flex justify-end space-x-3">
          <button 
            onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remover después de 10 segundos
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 10000);
  };

  /**
   * Calcular porcentaje de cambio
   */
  const calcularCambio = (actual, anterior) => {
    if (anterior === 0) return { porcentaje: 0, esPositivo: true };
    
    const cambio = ((actual - anterior) / anterior) * 100;
    return {
      porcentaje: Math.abs(cambio).toFixed(1),
      esPositivo: cambio >= 0
    };
  };

  /**
   * Función para formatear moneda mejorada
   */
  const formatMoney = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return '$' + amount.toLocaleString('es-AR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  /**
   * Componente para mostrar cambios con iconos
   */
  const CambioIndicador = ({ actual, anterior, esMoneda = false }) => {
    const cambio = calcularCambio(actual, anterior);
    
    return (
      <div className={`text-xs flex items-center mt-1 ${
        cambio.esPositivo ? 'text-green-600' : 'text-red-600'
      }`}>
        {cambio.esPositivo ? <FaArrowUp /> : <FaArrowDown />}
        <span className="ml-1">
          {cambio.porcentaje}% vs ayer
        </span>
      </div>
    );
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
        <p className="ml-4 text-gray-600">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            🏪 Dashboard {sucursalSeleccionada?.nombre || 'La Fábrica'}
          </h1>
          <p className="text-gray-600 flex items-center">
            <FaCalendarAlt className="mr-2" />
            {new Date().toLocaleDateString('es-AR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {sucursalSeleccionada && (
              <span className="ml-4 flex items-center">
                <FaStore className="mr-1" />
                {sucursalSeleccionada.nombre}
              </span>
            )}
          </p>
        </div>
        
        <Link to="/punto-venta">
          <Button
            color="primary"
            size="lg"
            icon={<FaShoppingCart />}
          >
            Punto de Venta
          </Button>
        </Link>
      </div>

      {/* Métricas principales con restricción de ganancias */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${puedeVerGanancias ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        {/* Ventas de hoy */}
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FaDollarSign size={24} />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMoney(stats.ventasHoy)}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-500">
                  {stats.cantidadVentasHoy} ventas
                </p>
                <CambioIndicador 
                  actual={stats.ventasHoy} 
                  anterior={comparativos.ventasAyer}
                  esMoneda={true}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Ganancias de hoy - SOLO VISIBLE PARA ADMINISTRADORES */}
		{puedeVerGanancias && (
		  <Card>
			<div className="flex items-center">
			  <div className="p-3 rounded-full bg-green-100 text-green-600">
				<FaTrendingUp size={24} />
			  </div>
			  <div className="ml-4 flex-1">
				<p className="text-sm font-medium text-gray-600">Ganancias Hoy</p>
				<p className="text-2xl font-bold text-gray-900">
				  {formatMoney(stats.gananciasHoy)}
				</p>
				<div className="flex items-center justify-between">
				  <p className="text-sm text-green-500 flex items-center">
					<FaPercent className="mr-1" size={10} />
					{stats.margenPromedio.toFixed(1)}% margen
				  </p>
				  <CambioIndicador 
					actual={stats.gananciasHoy} 
					anterior={comparativos.gananciasAyer}
					esMoneda={true}
				  />
				</div>
			  </div>
			</div>
		  </Card>
		)}

        {/* Ticket promedio */}
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <FaFileInvoiceDollar size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMoney(stats.ticketPromedio)}
              </p>
              <p className="text-sm text-purple-500">
                {stats.cantidadVentasHoy > 0 
                  ? `${stats.cantidadVentasHoy} ventas hoy`
                  : 'Sin ventas hoy'
                }
              </p>
            </div>
          </div>
        </Card>

        {/* Total productos y stock bajo */}
        <Card>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${
              stats.stockBajo > 0 
                ? 'bg-red-100 text-red-600' 
                : 'bg-blue-100 text-blue-600'
            }`}>
              <FaBoxOpen size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProductos}
              </p>
              <p className={`text-sm ${
                stats.stockBajo > 0 ? 'text-red-500' : 'text-green-500'
              }`}>
                {stats.stockBajo > 0 
                  ? `${stats.stockBajo} con stock bajo`
                  : 'Stock OK'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 🆕 NUEVO: Jardín de Tareas y Muro de Innovación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jardín de Tareas */}
        <JardinTareas />

        {/* Muro de Innovación */}
        <MuroInnovacion />
      </div>

      {/* Acciones rápidas compactas */}
      <Card title="⚡ Acciones Rápidas" icon={<FaPlus />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/punto-venta">
            <div className="bg-green-50 hover:bg-green-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
              <FaShoppingCart className="text-green-600 mb-2" size={20} />
              <p className="text-sm font-medium text-green-800">Nueva Venta</p>
              <p className="text-xs text-green-600">{stats.cantidadVentasHoy} hoy</p>
            </div>
          </Link>
          
          <Link to="/productos/nuevo">
            <div className="bg-blue-50 hover:bg-blue-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
              <FaBoxOpen className="text-blue-600 mb-2" size={20} />
              <p className="text-sm font-medium text-blue-800">Agregar Producto</p>
              <p className="text-xs text-blue-600">{stats.totalProductos} total</p>
            </div>
          </Link>
          
          <Link to="/reportes/ventas">
            <div className="bg-purple-50 hover:bg-purple-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
              <FaChartLine className="text-purple-600 mb-2" size={20} />
              <p className="text-sm font-medium text-purple-800">Reportes</p>
              <p className="text-xs text-purple-600">📊</p>
            </div>
          </Link>

          {stats.stockBajo > 0 && (
            <Link to="/productos?filtro=stock_bajo">
              <div className="bg-red-50 hover:bg-red-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
                <FaExclamationTriangle className="text-red-600 mb-2" size={20} />
                <p className="text-sm font-medium text-red-800">Stock Bajo</p>
                <p className="text-xs text-red-600">{stats.stockBajo}</p>
              </div>
            </Link>
          )}
          {/* Iniciar Pre-venta */}
          <div onClick={() => setModalPreventaOpen(true)}>
            <div className="bg-indigo-50 hover:bg-indigo-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
              <FaFileInvoiceDollar className="text-indigo-600 mb-2" size={20} />
              <p className="text-sm font-medium text-indigo-800">Iniciar Pre-venta</p>
              <p className="text-xs text-indigo-600">Recorrer clientes por zona</p>
            </div>
          </div>
          {/* Administrar Zonas */}
          <div onClick={() => setZonasModalOpen(true)}>
            <div className="bg-sky-50 hover:bg-sky-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
              <FaUser className="text-sky-600 mb-2" size={20} />
              <p className="text-sm font-medium text-sky-800">Administrar Zonas</p>
              <p className="text-xs text-sky-600">Crear/editar zonas</p>
            </div>
          </div>
          {/* Iniciar Reparto */}
          <div onClick={() => setModalRepartoOpen(true)}>
            <div className="bg-amber-50 hover:bg-amber-100 p-3 rounded-lg flex flex-col items-center transition-colors cursor-pointer text-center">
              <FaTruck className="text-amber-600 mb-2" size={20} />
              <p className="text-sm font-medium text-amber-800">Iniciar Reparto</p>
              <p className="text-xs text-amber-600">Ordenar entregas y cobrar</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Vista rápida: Pedidos de Pre-venta (borradores) */}
      {resumenPreventa.length > 0 && (
        <Card title="📝 Pedidos de Pre-venta (borradores)" icon={<FaFileInvoiceDollar />}>
          <div className="max-h-64 overflow-auto text-sm">
            {resumenPreventa.slice(0, 10).map((p, idx) => (
              <div key={p.id || idx} className="flex items-center justify-between border-b py-2">
                <div>
                  <div className="font-medium text-gray-800">{p.cliente?.nombre || p.cliente_nombre || 'Cliente'}</div>
                  <div className="text-gray-500">Items: {(p.items?.length) || (Array.isArray(p.items) ? p.items.length : 0)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" color="primary" onClick={() => confirmarPreventaPedido(p)} loading={confirmandoId === (p.id || 'tmp')}>
                    Confirmar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {resumenPreventa.length > 10 && (
            <div className="text-xs text-gray-500 mt-2">Mostrando 10 de {resumenPreventa.length}</div>
          )}
        </Card>
      )}

      {/* Clientes destacados con datos reales */}
      <Card title="👥 Mejores Clientes del Día" icon={<FaUser />}>
        {clientesDestacados.length === 0 ? (
          <div className="text-center py-8">
            <FaUser className="mx-auto text-4xl text-gray-400 mb-2" />
            <p className="text-gray-500">No hay clientes con compras hoy</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesDestacados.slice(0, 6).map((cliente, index) => (
              <div key={cliente.id || index} className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-medium text-gray-800">
                  {`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Cliente General'}
                </h3>
                <p className="text-sm text-gray-500">{cliente.email || 'Sin email'}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm text-blue-600">
                    {cliente.compras || 0} compras
                  </span>
                  <span className="font-bold text-green-600">
                    {formatMoney(cliente.total || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 🆕 NUEVO: Sección de análisis de clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* <ClientesSinCompras /> */}
      </div>

      {/* Bloque de advertencia de clientes con deuda mayor a 20 días */}
      <div className="mb-6">
        <Card title="Clientes con deudas" icon={<FaExclamationTriangle />}>
          <div className="mb-2 text-blue-800 text-sm font-medium text-center">
            Solo se muestran clientes con deudas mayores a 15 días. Mostrando los primeros 100 clientes.
          </div>
          <div className="mb-4 flex justify-center">
            <Button color="primary" onClick={() => cargarClientesDeuda(true)} disabled={loadingDeuda}>
              {loadingDeuda ? 'Buscando...' : 'Buscar clientes con deuda'}
            </Button>
          </div>
          {loadingDeuda ? (
            <div className="flex items-center py-4"><Spinner size="md" /><span className="ml-2">Cargando...</span></div>
          ) : clientesDeuda.length === 0 ? (
            <div className="text-center py-4 text-green-700 font-medium">Sin clientes con deuda</div>
          ) : (
            <>
            <div className="space-y-4">
              {clientesDeuda.map(cliente => (
                <div key={cliente.id} className="border-b pb-2 mb-2">
                  <div className="font-bold text-gray-800">{cliente.nombre} {cliente.apellido}</div>
                  <div className="text-sm text-gray-600">Tel: {cliente.telefono || 'N/A'}</div>
                  {cliente.deudas.map((deuda, idx) => {
                    const key = `${cliente.id}_${deuda.id_venta || deuda.venta_id}`;
                    const checked = deudasSeleccionadas.some(d => d.key === key);
                    return (
                      <div key={idx} className="flex items-center justify-between mt-1 gap-2 bg-gray-50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSeleccionDeuda(cliente, deuda)}
                          />
                          <span>
                            <span className="text-red-700 font-semibold">${deuda.importe}</span> | 
                            <span className="text-gray-700">{new Date(deuda.fecha).toLocaleDateString('es-AR')}</span> | 
                            <span className="text-xs text-gray-500">{deuda.dias_atraso} días</span> | 
                            <span className="text-xs text-gray-700 font-bold">{deuda.estado ? deuda.estado : 'Pendiente'}</span>
                            {deuda.id_venta && (
                              <a
                                href={`/ventas/${deuda.id_venta}`}
                                className="ml-2 text-blue-700 underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver factura
                              </a>
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" color="green" onClick={() => abrirModalWA(cliente, deuda)}>
                            WhatsApp
                          </Button>
                          <Button size="sm" color="primary" onClick={() => abrirModalPago(cliente, deuda)}>
                            Registrar Pago
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {/* Botón global para pagos masivos */}
            <div className="mt-4 flex flex-col items-end gap-2">
              {/* ✅ BOTÓN DE DEBUG TEMPORAL */}
              <Button
                color="warning"
                size="sm"
                onClick={() => {
                  console.log('🔍 DEBUG: Verificando servicios...');
                  console.log('ventasService:', ventasService);
                  console.log('ventasService.registrarPago:', ventasService?.registrarPago);
                  console.log('deudasSeleccionadas:', deudasSeleccionadas);
                  toast.info('Ver consola para debug');
                }}
              >
                🔍 Debug Servicios
              </Button>
              
              <Button
                color="primary"
                disabled={deudasSeleccionadas.length === 0 || procesandoPagos}
                onClick={() => setModalConfirmarPagos(true)}
              >
                Registrar Pagos Completos ({deudasSeleccionadas.length})
              </Button>
              {hayMasClientes && (
                <Button color="secondary" onClick={() => cargarClientesDeuda(false)} disabled={loadingDeuda}>
                  {loadingDeuda ? 'Cargando...' : 'Cargar más'}
                </Button>
              )}
            </div>
            </>
          )}
        </Card>
      </div>
      {/* Modal para editar mensaje de WhatsApp */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Editar mensaje de WhatsApp">
        <textarea
          className="w-full border rounded p-2 mb-4"
          rows={4}
          value={mensajeWA}
          onChange={e => setMensajeWA(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <Button color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button color="green" onClick={enviarWA}>Enviar WhatsApp</Button>
        </div>
      </Modal>
      {/* Modal para registrar pago */}
      <RegistrarPagoDialog
        isOpen={modalPagoOpen}
        onClose={() => setModalPagoOpen(false)}
        venta={deudaSeleccionada?.ventaCompleta || (deudaSeleccionada ? {
          id: deudaSeleccionada.venta_id || deudaSeleccionada.id_venta,
          numero: deudaSeleccionada.numero_venta || deudaSeleccionada.venta_id || deudaSeleccionada.id_venta || '',
          cliente_id: clienteSeleccionado?.id,
          cliente_info: clienteSeleccionado ? {
            id: clienteSeleccionado.id,
            nombre: clienteSeleccionado.nombre,
            apellido: clienteSeleccionado.apellido,
            nombre_completo: `${clienteSeleccionado.nombre || ''} ${clienteSeleccionado.apellido || ''}`.trim(),
            telefono: clienteSeleccionado.telefono,
            email: clienteSeleccionado.email
          } : {},
          total: deudaSeleccionada.total || deudaSeleccionada.importe,
          saldo_pendiente: deudaSeleccionada.importe,
        } : null)}
        onPagoRegistrado={registrarPago}
      />
      
      {/* Modal del ticket de recibo */}
      {console.log('🎫 Renderizando ticket en Dashboard, mostrarTicket:', mostrarTicket, 'pagoRegistrado:', pagoRegistrado)}
      {mostrarTicket && (
        <TicketReciboPago
          isOpen={mostrarTicket}
          onClose={cerrarTicket}
          pagoData={pagoRegistrado}
          venta={deudaSeleccionada?.ventaCompleta || (deudaSeleccionada ? {
            id: deudaSeleccionada.venta_id || deudaSeleccionada.id_venta,
            numero: deudaSeleccionada.numero_venta || deudaSeleccionada.venta_id || deudaSeleccionada.id_venta || '',
            cliente_id: clienteSeleccionado?.id,
            cliente_info: clienteSeleccionado ? {
              id: clienteSeleccionado.id,
              nombre: clienteSeleccionado.nombre,
              apellido: clienteSeleccionado.apellido,
              nombre_completo: `${clienteSeleccionado.nombre || ''} ${clienteSeleccionado.apellido || ''}`.trim(),
              telefono: clienteSeleccionado.telefono,
              email: clienteSeleccionado.email
            } : {},
            total: deudaSeleccionada.total || deudaSeleccionada.importe,
            saldo_pendiente: deudaSeleccionada.importe,
          } : null)}
          cliente={clienteSeleccionado}
        />
      )}
      {/* Iniciar Pre-venta */}
      <IniciarPreVentaModal
        isOpen={modalPreventaOpen}
        onClose={() => setModalPreventaOpen(false)}
        onStart={(sesion) => { setPreventaSesion(sesion); setWizardOpen(true); }}
      />
      <ZonasABMModal isOpen={zonasModalOpen} onClose={() => setZonasModalOpen(false)} />
      {/* Wizard Pre-venta */}
      <PreVentaWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        sesion={preventaSesion}
        sucursalId={sucursalSeleccionada?.id || null}
      />
      {/* Iniciar Reparto */}
      <IniciarRepartoModal
        isOpen={modalRepartoOpen}
        onClose={() => setModalRepartoOpen(false)}
        sucursalId={sucursalSeleccionada?.id || null}
        sucursalesDisponibles={[]}
        onStart={(sesion) => { setRepartoSesion(sesion); setRepartoWizardOpen(true); }}
      />
      <RepartoWizardMovil
        isOpen={repartoWizardOpen}
        onClose={() => setRepartoWizardOpen(false)}
        sesion={repartoSesion}
        sucursalId={sucursalSeleccionada?.id || null}
      />
      {/* Iniciar Pre-venta */}
      <IniciarPreVentaModal
        isOpen={modalPreventaOpen}
        onClose={() => setModalPreventaOpen(false)}
        onStart={(sesion) => { setPreventaSesion(sesion); setWizardOpen(true); }}
      />
      {/* Wizard Pre-venta */}
      <PreVentaWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        sesion={preventaSesion}
        sucursalId={sucursalSeleccionada?.id || null}
      />
      {/* Modal de confirmación de pagos masivos */}
      <Modal isOpen={modalConfirmarPagos} onClose={() => setModalConfirmarPagos(false)} title="Confirmar pagos completos">
        <div className="mb-4">
          <p>¿Seguro que deseas registrar el pago completo de las siguientes deudas?</p>
          <ul className="list-disc pl-5 mt-2">
            {deudasSeleccionadas.map((item, idx) => (
              <li key={item.key}>
                <b>{item.cliente.nombre} {item.cliente.apellido}</b> - ${item.deuda.importe} ({item.deuda.estado}) - {new Date(item.deuda.fecha).toLocaleDateString('es-AR')}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button color="gray" onClick={() => setModalConfirmarPagos(false)} disabled={procesandoPagos}>Cancelar</Button>
          <Button color="primary" onClick={registrarPagosCompletosLote} loading={procesandoPagos} disabled={procesandoPagos}>
            Confirmar y Registrar Pagos
          </Button>
        </div>
      </Modal>
     </div>
  );
};

export default Dashboard;