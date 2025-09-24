/**
 * Página de gestión de ventas con filtro por sucursal y selección múltiple
 * 
 * Muestra el listado de ventas y permite realizar búsquedas,
 * filtrar por estado y sucursal, cambiar estados y procesar en lote.
 * 
 * @module pages/ventas/Ventas
 * @requires react, react-router-dom, ../../services/ventas.service
 * @related_files ./DetalleVenta.js, ./PuntoVenta.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import ventasService from '../../services/ventas.service';
import productosService from '../../services/productos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LimpiezaVentas from '../../components/common/LimpiezaVentas';
import RegistrarPagoDialog from '../../components/modules/ventas/RegistrarPagoDialog';
import TicketReciboPago from '../../components/modules/ventas/TicketReciboPago';

// Iconos
import { 
  FaShoppingCart, FaPlus, FaEye, FaCheck, FaTimes,
  FaUndo, FaCalendarAlt, FaUserTie, FaMoneyBillWave,
  FaCreditCard, FaExchangeAlt, FaFilter, FaUserAlt,
  FaStore, FaSyncAlt, FaFileAlt, FaClock,
  FaExclamationTriangle, FaFileExcel, FaDownload,
  FaSearch, FaCheckDouble, FaCheckSquare, FaSquare,
  FaTruck, FaMoneyBill, FaStickyNote, FaUniversity, 
  FaEdit, FaMinus, FaBroom, FaTrash, FaCheckCircle, FaPrint, FaSave,
} from 'react-icons/fa';

// Hooks
import useIsMobile from '../../hooks/useIsMobile';

/**
 * Componente de página para gestión de ventas con filtro por sucursal
 * @returns {JSX.Element} Componente Ventas
 */
const Ventas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, hasPermission, sucursalSeleccionada, ...rest } = useAuth();
  const isMobile = useIsMobile();
  
  // Estado
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ventaProcesando, setVentaProcesando] = useState(null);
  const [accion, setAccion] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(''); // '', 'en_curso', 'entregado', 'cancelada', 'devuelta'
  const [estadisticas, setEstadisticas] = useState(null);
  const [incluyeTransporte, setIncluyeTransporte] = useState(false);//transporte
  const [filtroFecha, setFiltroFecha] = useState('hoy'); // 'hoy', 'semana', 'mes', 'personalizado'
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  
  // Estado para filtro de sucursal
  const [sucursalFiltro, setSucursalFiltro] = useState(''); // '' = todas, o ID específico
  const [estadisticasPorSucursal, setEstadisticasPorSucursal] = useState(false);
  
  // Estados para mejorar la búsqueda y carga
  const [todasLasVentas, setTodasLasVentas] = useState([]); // Cache de todas las ventas
  const [cargandoMas, setCargandoMas] = useState(false);
  const [limiteActual, setLimiteActual] = useState(200);
  const [busquedaActiva, setBusquedaActiva] = useState(false);
  
  // Estados para selección múltiple
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [procesandoLote, setProcesandoLote] = useState(false);
  const [showConfirmLote, setShowConfirmLote] = useState(false);
  const [accionLote, setAccionLote] = useState('');
  
  // Estados para paginación
  const [lastVentaId, setLastVentaId] = useState(null);
  const [hasMoreVentas, setHasMoreVentas] = useState(false);
  
  // Estado para modal de limpieza
  const [showLimpiezaModal, setShowLimpiezaModal] = useState(false);
  
  // Estados para modal de pago
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  
  // Estados para ticket de pago
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [pagoRegistrado, setPagoRegistrado] = useState(null);
  const [showComprobantePago, setShowComprobantePago] = useState(false);

  // 3. Agregar useEffect para recargar cuando cambien las fechas:
	useEffect(() => {
	  if (filtroFecha === 'personalizado' && fechaInicio && fechaFin) {
		cargarEstadisticas();
	  }
	}, [fechaInicio, fechaFin]);

	useEffect(() => {
	  if (filtroFecha !== 'personalizado') {
		cargarEstadisticas();
	  }
	}, [filtroFecha]);
	/**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarVentas(true);
    cargarEstadisticas();
  }, [sucursalFiltro]); // Recargar cuando cambie el filtro de sucursal
  
  /**
   * Limpiar selección cuando se desactiva el modo selección
   */
  useEffect(() => {
    if (!modoSeleccion) {
      setVentasSeleccionadas([]);
    }
  }, [modoSeleccion]);
  
  /**
   * Carga todas las ventas con filtro opcional de sucursal
   */
  const cargarVentas = async (reset = true, ventaIdVerificar = null) => {
    try {
      setLoading(true);
      
      let data;
      
      if (reset) {
        if (sucursalFiltro) {
          // Cargar ventas de una sucursal específica con límite mayor
          data = await ventasService.obtenerPorSucursal(sucursalFiltro, 50);
        } else {
          // Cargar todas las ventas con límite mayor
          data = await ventasService.obtenerTodas({ limit: 50 });
        }
      } else {
        if (sucursalFiltro) {
          data = await ventasService.obtenerPorSucursal(sucursalFiltro, 50, lastVentaId);
        } else {
          data = await ventasService.obtenerTodas({ limit: 50, startAfter: lastVentaId });
        }
      }
      
      if (reset) {
        // Buscar específicamente la venta que se actualizó
        if (ventaIdVerificar) {
          const ventaActualizada = data.find(v => v.id === ventaIdVerificar);
          if (ventaActualizada) {
            console.log(`✅ Venta ${ventaActualizada.id} actualizada a estado: ${ventaActualizada.estado}`);
          } else {
            console.log(`⚠️ Venta ${ventaIdVerificar} no encontrada en datos recargados`);
            // Si no se encuentra, intentar obtener la venta específica
            try {
              const ventaEspecifica = await ventasService.obtenerPorId(ventaIdVerificar);
              if (ventaEspecifica) {
                console.log(`✅ Venta específica obtenida: ${ventaEspecifica.estado}`);
                // Reemplazar la venta en la lista si existe
                const ventaIndex = data.findIndex(v => v.id === ventaIdVerificar);
                if (ventaIndex !== -1) {
                  data[ventaIndex] = ventaEspecifica;
                } else {
                  // Si no está en la lista, agregarla al principio
                  data.unshift(ventaEspecifica);
                }
              }
            } catch (error) {
              console.error('Error al obtener venta específica:', error);
            }
          }
        }
        
        setVentas(data);
      } else {
        setVentas(prev => [...prev, ...data]);
      }
      
      if (data.length === 50) {
        setHasMoreVentas(true);
        setLastVentaId(data[data.length - 1].fechaCreacion);
      } else {
        setHasMoreVentas(false);
      }
      
      // Informar si hay más ventas disponibles
      if (data.length === 50) {
        toast.info(`Mostrando las primeras 50 ventas más recientes. Use la búsqueda o "Buscar Antiguas" para encontrar ventas específicas.`, {
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      toast.error('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Cargar más ventas
   */
  const handleCargarMasVentas = () => {
    cargarVentas(false);
  };
  
  /**
 * Carga estadísticas con filtro opcional de sucursal
 */
	const cargarEstadisticas = async () => {
	  try {
		let data;
		
		if (sucursalFiltro) {
		  // Estadísticas de una sucursal específica
		  data = await ventasService.obtenerEstadisticasDia(sucursalFiltro);
		  setEstadisticasPorSucursal(true);
		} else {
		  // Estadísticas globales
		  data = await ventasService.obtenerEstadisticasDia();
		  setEstadisticasPorSucursal(false);
		}
		
		// DEBUG: Ver qué datos está devolviendo
		console.log('📊 Estadísticas recibidas:', data);
		
		setEstadisticas(data);
	  } catch (error) {
		console.error('Error al cargar estadísticas:', error);
		// Establecer valores por defecto en caso de error
		setEstadisticas({
		  total_ventas: 0,
		  monto_total: 0,
		  efectivo: 0,
		  transferencia: 0,
		  tarjeta: 0
		});
	  }
	};

  
  /**
   * Busca ventas por término consultando directamente a Firebase (histórico completo)
   */
  const buscarVentas = async () => {
    try {
      setLoading(true);
      setBusquedaActiva(true);
      
      if (!searchTerm.trim()) {
        // Si el término está vacío, mantener la lista actual cargada
        setVentas(todasLasVentas);
        setBusquedaActiva(false);
        return;
      }
      
      toast.info('Buscando en todas las ventas del sistema...');
      const data = await ventasService.buscar(searchTerm.trim(), sucursalFiltro || null);
      setVentas(Array.isArray(data) ? data : []);
      
      if (!data || data.length === 0) {
        toast.warning('No se encontraron ventas con ese criterio');
      } else {
        toast.success(`Se encontraron ${data.length} ventas en el sistema completo`);
      }
    } catch (error) {
      console.error('Error al buscar ventas:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Agrega un pago a una venta usando el modal
   */
  const agregarPago = (venta) => {
    setVentaSeleccionada(venta);
    setModalPagoOpen(true);
  };

  /**
   * Registra el pago desde el modal
   */
  const registrarPago = async (pagoData) => {
    try {
      setLoading(true);
      
      await ventasService.registrarPago(ventaSeleccionada.id, pagoData);
      
      toast.success(`Pago de ${formatearTotal(pagoData.monto)} registrado correctamente`);
      
      // Obtener los datos ACTUALIZADOS de la venta después del pago
      console.log('🔄 Obteniendo datos actualizados de la venta después del pago...');
      const ventaActualizada = await ventasService.obtenerPorId(ventaSeleccionada.id);
      console.log('✅ Venta actualizada obtenida:', ventaActualizada);
      
      // Actualizar ventaSeleccionada con los datos actualizados
      setVentaSeleccionada(ventaActualizada);
      
      // Recargar ventas para mostrar el pago actualizado
      await cargarVentas(true, ventaSeleccionada.id);
      await cargarEstadisticas();
      
      // Guardar datos del pago para mostrar el ticket
      console.log('🎫 Activando ticket de pago:', pagoData);
      setPagoRegistrado(pagoData);
      setMostrarTicket(true);
      console.log('🎫 Estado mostrarTicket establecido en true');
      
      // NO cerrar el modal automáticamente - dejar que el ticket se muestre
      // setModalPagoOpen(false);
      // setVentaSeleccionada(null);
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error('Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cierra el ticket de pago
   */
  const cerrarTicket = () => {
    console.log('🎫 Cerrando ticket de pago');
    setMostrarTicket(false);
    setPagoRegistrado(null);
    // Cerrar también el modal de registro
    setModalPagoOpen(false);
    setVentaSeleccionada(null);
  };

  /**
   * Imprime el comprobante de pago de una venta pagada
   */
  const imprimirComprobantePago = (venta) => {
    setVentaSeleccionada(venta);
    setShowComprobantePago(true);
  };

  /**
   * Busca ventas antiguas por cliente
   */
  const buscarVentasAntiguas = async () => {
    const nombreCliente = prompt('Ingresa el nombre del cliente que buscas:');
    
    if (!nombreCliente || nombreCliente.trim() === '') {
      return;
    }
    
    try {
      setLoading(true);
      setBusquedaActiva(true);
      
      toast.info('Buscando ventas por cliente en todo el sistema...');
      
      const ventas = await ventasService.buscarPorCliente(nombreCliente.trim());
      
      if (ventas && ventas.length > 0) {
        setVentas(ventas);
        toast.success(`${ventas.length} venta(s) encontrada(s) para el cliente`);
      } else {
        toast.warning(`No se encontraron ventas para el cliente "${nombreCliente}"`);
        setVentas([]);
      }
    } catch (error) {
      console.error('Error al buscar ventas por cliente:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio de sucursal en el filtro
   */
  const handleCambiarSucursalFiltro = (sucursalId) => {
    setSucursalFiltro(sucursalId);
    setSearchTerm(''); // Limpiar búsqueda
    setFiltroEstado(''); // Limpiar filtro de estado
    setBusquedaActiva(false);
    setModoSeleccion(false); // Salir del modo selección
  };
  
  /**
   * Obtiene el nombre de la sucursal seleccionada
   */
  const getNombreSucursalFiltro = () => {
    if (!sucursalFiltro) return 'Todas las sucursales';
    
    const sucursal = rest.sucursalesDisponibles.find(s => s.id === sucursalFiltro);
    return sucursal ? sucursal.nombre : 'Sucursal desconocida';
  };
  
  /**
   * Formatea el total con 2 decimales y el símbolo de moneda
   * @param {number} total - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearTotal = (total) => {
    return `$${parseFloat(total).toFixed(2)}`;
  };
  
  /**
   * Prepara el cambio de estado de una venta
   * @param {Object} venta - Venta a procesar
   * @param {string} nuevoEstado - Estado a aplicar
   */
  const prepararCambiarEstado = (venta, nuevoEstado) => {
    console.log('🔧 Preparando cambio de estado:', { venta: venta.numero, nuevoEstado });
    setVentaProcesando(venta);
    setAccion(nuevoEstado);
    setShowConfirmDialog(true);
    console.log('🔧 Diálogo de confirmación activado');
  };
  
  /**
   * Confirma el cambio de estado de la venta o la eliminación
   */
  const confirmarCambiarEstado = async () => {
    try {
      // Si es eliminación, usar la función específica
      if (accion === 'eliminar') {
        await confirmarEliminarVenta();
        return;
      }
      
      // Solicitar motivo si es cancelación o devolución
      let motivo = '';
      if (accion === 'cancelada' || accion === 'devuelta') {
        motivo = prompt(`Por favor, ingresa el motivo de la ${accion === 'cancelada' ? 'cancelación' : 'devolución'}:`);
        
        if (motivo === null) { // El usuario canceló el prompt
          setShowConfirmDialog(false);
          setVentaProcesando(null);
          setAccion('');
          setIncluyeTransporte(false); // Reset
          return;
        }
      }
      
      // Si es entregar, incluir información de transporte
      if (accion === 'entregado') {
        await ventasService.cambiarEstado(ventaProcesando.id, accion, '', incluyeTransporte);
      } else {
        await ventasService.cambiarEstado(ventaProcesando.id, accion, motivo);
      }
      
      // Mensaje de éxito con nombres nuevos
      const mensajeExito = accion === 'entregado' ? 'entregada' : 
                          accion === 'cancelada' ? 'cancelada' : 
                          accion === 'devuelta' ? 'devuelta' : 'procesada';
      
      toast.success(`Venta ${mensajeExito} correctamente`);
      
      // Recargar ventas y estadísticas
      await cargarVentas(true, ventaProcesando.id);
      await cargarEstadisticas();
      
      // Forzar actualización del estado local para UI inmediata
      setVentas(prevVentas => 
        prevVentas.map(v => 
          v.id === ventaProcesando.id 
            ? { ...v, estado: accion }
            : v
        )
      );
    } catch (error) {
      console.error(`Error al cambiar estado de venta:`, error);
      
      // Si es error 403, intentar con método alternativo
      if (error.message && error.message.includes('403')) {
        try {
          console.log('🔄 Intentando método alternativo para cambiar estado...');
          
          // Intentar múltiples métodos para asegurar la actualización
          let ventaActualizada = null;
          
          try {
            // Método 1: actualizarVenta
            ventaActualizada = await ventasService.actualizarVenta(ventaProcesando.id, {
              estado: accion,
              fecha_actualizacion: new Date().toISOString(),
              fechaActualizacion: new Date().toISOString(),
              [`fecha_${accion}`]: new Date().toISOString()
            });
          } catch (error) {
            console.log('Método 1 falló, intentando método 2...');
            
            try {
              // Método 2: cambiarEstado con PUT directo
              ventaActualizada = await ventasService.put(`/${ventaProcesando.id}`, {
                estado: accion,
                fecha_actualizacion: new Date().toISOString()
              });
            } catch (error2) {
              console.log('Método 2 falló, intentando método 3...');
              
              // Método 3: POST a actualizar-estado
              ventaActualizada = await ventasService.post(`/${ventaProcesando.id}/actualizar-estado`, {
                estado: accion,
                motivo: '',
                fecha_actualizacion: new Date().toISOString()
              });
            }
          }
          
          if (ventaActualizada) {
            toast.success(`Venta actualizada correctamente (método alternativo)`);
            
            // Forzar actualización del estado local para UI inmediata
            setVentas(prevVentas => 
              prevVentas.map(v => 
                v.id === ventaProcesando.id 
                  ? { ...v, estado: accion }
                  : v
              )
            );
            
            // Recargar datos después de actualizar UI
            await cargarVentas(true, ventaProcesando.id);
            await cargarEstadisticas();
          }
        } catch (errorAlternativo) {
          console.error('Error en método alternativo:', errorAlternativo);
          toast.error('No tienes permisos para cambiar el estado de ventas. Contacta al administrador.');
        }
      } else if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error al procesar la venta`);
      }
    } finally {
      setShowConfirmDialog(false);
      setVentaProcesando(null);
      setAccion('');
      setIncluyeTransporte(false); // Reset
    }
  };
  
  /**
   * Cancela el cambio de estado de la venta
   */
  const cancelarAccion = () => {
    setShowConfirmDialog(false);
    setVentaProcesando(null);
    setAccion('');
  };

  /**
   * Prepara la eliminación de una venta
   */
  const prepararEliminarVenta = (venta) => {
    console.log('🔧 Preparando eliminación de venta:', {
      venta: venta.numero,
      usuario: currentUser?.email,
      rol: currentUser?.rol,
      tienePermisoEliminar: hasPermission('ventas', 'eliminar'),
      tienePermisoEditar: hasPermission('ventas', 'editar'),
              esAdmin: currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin',
      esDaniel: currentUser?.email === 'danielcadiz15@gmail.com'
    });
    setVentaProcesando(venta);
    setAccion('eliminar');
    setShowConfirmDialog(true);
  };

  /**
   * Confirma la eliminación de la venta
   */
  const confirmarEliminarVenta = async () => {
    try {
      // Solicitar motivo de eliminación
      const motivo = prompt('Por favor, ingresa el motivo de la eliminación:');
      
      if (motivo === null) { // El usuario canceló el prompt
        setShowConfirmDialog(false);
        setVentaProcesando(null);
        setAccion('');
        return;
      }
      
      await ventasService.eliminarVenta(ventaProcesando.id, motivo);
      
      toast.success('Venta eliminada correctamente');
      
      // Recargar ventas y estadísticas
      await cargarVentas(true, ventaProcesando.id);
      await cargarEstadisticas();
    } catch (error) {
      console.error(`Error al eliminar venta:`, error);
      
      if (error.message && error.message.includes('403')) {
        toast.error('No tienes permisos para eliminar ventas. Contacta al administrador.');
      } else if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error al eliminar la venta`);
      }
    } finally {
      setShowConfirmDialog(false);
      setVentaProcesando(null);
      setAccion('');
    }
  };
  
  /**
   * Filtra las ventas por estado
   * @param {string} estado - Estado a filtrar
   */
  const filtrarPorEstado = (estado) => {
    // Si se hace clic en el estado actualmente seleccionado, quitar filtro
    if (filtroEstado === estado) {
      setFiltroEstado('');
    } else {
      setFiltroEstado(estado);
    }
  };
  
  /**
   * Navega a los detalles de la venta
   * @param {number} id - ID de la venta
   */
  const verDetalleVenta = (id) => {
    navigate(`/ventas/${id}`);
  };

  // Modal de edición de venta
  const EditarVentaModal = ({ venta, isOpen, onClose, onGuardar }) => {
    const [productos, setProductos] = useState(venta.detalles || []);
    const [cliente, setCliente] = useState(venta.cliente_info || {});
    const [metodoPago, setMetodoPago] = useState(venta.metodo_pago || 'efectivo');
    const [notas, setNotas] = useState(venta.notas || '');
    const [procesando, setProcesando] = useState(false);
    
    // Estados para agregar productos
    const [showProductosDisponibles, setShowProductosDisponibles] = useState(false);
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingProductos, setLoadingProductos] = useState(false);
    
    // Calcular total en tiempo real
    const totalCalculado = productos.reduce((sum, producto) => {
      return sum + (producto.cantidad * (producto.precio_unitario || producto.precio));
    }, 0);

    // Buscar productos usando la misma lógica del punto de venta
    const buscarProductos = async (termino) => {
      try {
        setLoadingProductos(true);
        
        // Solo buscar si hay al menos 3 caracteres
        if (termino.length < 3) {
          setProductosDisponibles([]);
          return;
        }
        
        // Usar la misma función que usa el punto de venta
        const productos = await productosService.buscarConStockPorSucursal(termino, sucursalSeleccionada?.id);
        console.log('Productos encontrados:', productos);
        
        // Filtrar productos con stock
        const productosConStock = (Array.isArray(productos) ? productos : [])
          .filter(p => p.stock_actual > 0);
        
        console.log('Productos con stock:', productosConStock);
        setProductosDisponibles(productosConStock);
      } catch (error) {
        console.error('Error al buscar productos:', error);
        toast.error('Error al buscar productos');
      } finally {
        setLoadingProductos(false);
      }
    };

    // Agregar producto a la venta usando la misma lógica del punto de venta
    const agregarProducto = (producto) => {
      console.log('🛒 [EDITAR VENTA] Agregando producto:', {
        id: producto.id,
        nombre: producto.nombre,
        stock_actual: producto.stock_actual,
        precio_venta: producto.precio_venta
      });
      
      // VALIDACIÓN: Verificar stock disponible
      const stockDisponible = parseInt(producto.stock_actual || 0);
      
      if (stockDisponible <= 0) {
        toast.error(`❌ No hay stock disponible de ${producto.nombre}`);
        return;
      }
      
      // PASO 1: Determinar el precio
      let precioUnitario = producto.precio_venta || 0;
      
      // Si no hay precio válido, avisar pero permitir agregar con precio 0 para editarlo después
      if (precioUnitario <= 0) {
        toast.warning(`⚠️ ${producto.nombre} no tiene precio configurado. Se agregará con precio $0 para que lo edites.`);
        precioUnitario = 0;
      }
      
      // PASO 2: Verificar si el producto ya está en la venta
      const productoExistente = productos.find(item => item.producto_id === producto.id);
      
      if (productoExistente) {
        // ACTUALIZAR CANTIDAD EN PRODUCTO EXISTENTE
        const nuevaCantidad = Math.min(
          productoExistente.cantidad + 1,
          stockDisponible
        );
        
        if (nuevaCantidad === productoExistente.cantidad) {
          toast.warning(`⚠️ No hay más stock disponible de ${producto.nombre} (máximo: ${stockDisponible})`);
          return;
        }
        
        // Actualizar el producto en la venta
        const nuevosProductos = productos.map(item => 
          item.producto_id === producto.id 
            ? { 
                ...item, 
                cantidad: nuevaCantidad,
                precio_unitario: precioUnitario,
                precio: precioUnitario * nuevaCantidad
              }
            : item
        );
        setProductos(nuevosProductos);
        toast.success(`Cantidad de "${producto.nombre}" aumentada`);
      } else {
        // AGREGAR NUEVO PRODUCTO
        const nuevoProducto = {
          producto_id: producto.id,
          producto_info: producto,
          nombre: producto.nombre,
          precio_unitario: precioUnitario,
          precio: precioUnitario,
          cantidad: 1,
          stock: stockDisponible
        };
        setProductos([...productos, nuevoProducto]);
        toast.success(`"${producto.nombre}" agregado a la venta`);
      }
      
      setShowProductosDisponibles(false);
      setSearchTerm('');
    };

    const actualizarCantidad = (index, nuevaCantidad) => {
      const nuevosProductos = [...productos];
      nuevosProductos[index].cantidad = nuevaCantidad;
      setProductos(nuevosProductos);
    };

    const eliminarProducto = (index) => {
      // Validar que no se eliminen todos los productos
      if (productos.length <= 1) {
        toast.warning('No se puede eliminar todos los productos de la venta');
        return;
      }
      
      const productoAEliminar = productos[index];
      
      // Confirmar eliminación
      if (window.confirm(`¿Estás seguro de eliminar "${productoAEliminar.producto_info?.nombre || productoAEliminar.nombre}" de la venta?\n\nEsta acción restaurará el stock a la sucursal original.`)) {
        const nuevosProductos = productos.filter((_, idx) => idx !== index);
        setProductos(nuevosProductos);
        
        toast.success(`Producto "${productoAEliminar.producto_info?.nombre || productoAEliminar.nombre}" eliminado de la venta`);
      }
    };

    const handleGuardar = async (e) => {
      e.preventDefault();
      setProcesando(true);
      try {
        await onGuardar({
          ...venta,
          detalles: productos,
          cliente_info: cliente,
          metodo_pago: metodoPago,
          notas,
        });
      } finally {
        setProcesando(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header mejorado */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <FaEdit className="mr-3 text-blue-600" />
                  Editar Venta {venta?.numero}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Cliente: {cliente.nombre_completo || 'Sin cliente'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>
          <form onSubmit={handleGuardar}>
            {/* Cuerpo con scroll */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Productos */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-blue-700">Productos de la venta:</h3>
                  <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                    💡 Al eliminar productos, el stock se restaura automáticamente
                  </div>
                </div>
                
                {/* Botón para agregar productos */}
                <div className="mb-6">
                  <button
                    type="button"
                    className="w-full py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center border-0"
                    onClick={() => {
                      setShowProductosDisponibles(!showProductosDisponibles);
                      if (!showProductosDisponibles) {
                        setProductosDisponibles([]);
                        setSearchTerm('');
                      }
                    }}
                  >
                    <FaPlus className="mr-3" size={20} />
                    {showProductosDisponibles ? 'Ocultar Productos Disponibles' : '+ Agregar Nuevo Producto a la Venta'}
                  </button>
                </div>

                {/* Lista de productos disponibles */}
                {showProductosDisponibles && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Productos Disponibles</h4>
                      <input
                        type="text"
                        placeholder="Escribe al menos 3 letras para buscar..."
                        value={searchTerm}
                        onChange={(e) => {
                          const valor = e.target.value;
                          setSearchTerm(valor);
                          if (valor.length >= 3) {
                            buscarProductos(valor);
                          } else {
                            setProductosDisponibles([]);
                          }
                        }}
                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {loadingProductos ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Cargando productos...</p>
                      </div>
                    ) : (
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                        {searchTerm.length < 3 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>Escribe al menos 3 letras para buscar productos</p>
                          </div>
                        ) : productosDisponibles.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No se encontraron productos con "{searchTerm}"</p>
                          </div>
                        ) : (
                          productosDisponibles.map(producto => (
                            <div
                              key={producto.id}
                              className={`flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-blue-50 cursor-pointer transition-colors ${
                                producto.stock_actual <= 0 ? 'bg-red-50' : ''
                              }`}
                              onClick={() => {
                                if (producto.stock_actual > 0) {
                                  agregarProducto(producto);
                                } else {
                                  toast.warning(`No hay stock disponible de ${producto.nombre}`);
                                }
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{producto.nombre}</p>
                                <p className="text-sm text-gray-600 flex justify-between">
                                  <span>{producto.codigo}</span>
                                  <span className={`font-medium ${
                                    producto.stock_actual <= 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    Stock: {producto.stock_actual}
                                  </span>
                                </p>
                              </div>
                              <FaPlus className="text-blue-600" size={16} />
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                {productos.map((prod, idx) => (
                  <div key={prod.producto_id || prod.id} className="border rounded-lg p-4 hover:bg-gray-50 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{prod.producto_info?.nombre || prod.nombre}</p>
                        <p className="text-sm text-gray-600">
                          Precio unitario: ${(prod.precio_unitario || prod.precio).toLocaleString()} | 
                          Cantidad: {prod.cantidad}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Subtotal: ${((prod.precio_unitario || prod.precio) * prod.cantidad).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Controles de cantidad mejorados */}
                        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
                          <button
                            type="button"
                            onClick={() => actualizarCantidad(idx, Math.max(1, prod.cantidad - 1))}
                            className="p-2 rounded bg-white hover:bg-gray-200 transition-colors shadow-sm"
                            disabled={prod.cantidad <= 1}
                            title="Reducir cantidad"
                          >
                            <FaMinus size={12} />
                          </button>
                          <input
                            type="number"
                            value={prod.cantidad}
                            onChange={e => actualizarCantidad(idx, Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 text-center border rounded px-3 py-2 font-medium"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => actualizarCantidad(idx, prod.cantidad + 1)}
                            className="p-2 rounded bg-white hover:bg-gray-200 transition-colors shadow-sm"
                            title="Aumentar cantidad"
                          >
                            <FaPlus size={12} />
                          </button>
                        </div>
                        
                        {/* Botón eliminar producto mejorado */}
                        <button
                          type="button"
                          onClick={() => eliminarProducto(idx)}
                          className="p-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors border border-red-200"
                          title="Eliminar producto de la venta"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total - MEJORADO con actualización en tiempo real */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6 border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xl font-bold text-gray-800">Total de la Venta:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${totalCalculado.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-blue-600">
                  <span>{productos.length} producto{productos.length !== 1 ? 's' : ''} en la venta</span>
                  <span className="font-medium">Total actualizado en tiempo real</span>
                </div>
              </div>
              
              {/* Cliente */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente
                </label>
                <input
                  type="text"
                  value={cliente.nombre_completo || ''}
                  onChange={e => setCliente({ ...cliente, nombre_completo: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Método de pago */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              {/* Notas */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
            </div>
            {/* Footer mejorado */}
            <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total final:</span> ${totalCalculado.toLocaleString()}
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    color="secondary"
                    onClick={onClose}
                    disabled={procesando}
                    className="px-6 py-2"
                  >
                    <FaTimes className="mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    loading={procesando}
                    disabled={procesando}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <FaSave className="mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const [ventaEditando, setVentaEditando] = useState(null);
  const [showEditarModal, setShowEditarModal] = useState(false);

  const editarVenta = (ventaId) => {
    const venta = ventas.find(v => v.id === ventaId);
    setVentaEditando(venta);
    setShowEditarModal(true);
  };

  const guardarEdicionVenta = async (ventaEditada) => {
    try {
      // Calcular el nuevo total basado en los productos
      const nuevoTotal = ventaEditada.detalles.reduce((sum, producto) => {
        return sum + (producto.cantidad * (producto.precio_unitario || producto.precio));
      }, 0);
      
      // Actualizar el total en la venta
      const ventaActualizada = {
        ...ventaEditada,
        total: nuevoTotal,
        subtotal: nuevoTotal
      };
      
      await ventasService.actualizarVenta(ventaEditada.id, ventaActualizada);
      setShowEditarModal(false);
      setVentaEditando(null);
      toast.success('Venta actualizada correctamente');
      
          // Actualizar la venta en la lista local con el total correcto
    setVentas(prevVentas => 
      prevVentas.map(v => 
        v.id === ventaEditada.id 
          ? { 
              ...v, 
              ...ventaActualizada,
              total: nuevoTotal,
              subtotal: nuevoTotal,
              detalles: ventaEditada.detalles,
              // Actualizar el saldo deudor basado en el nuevo total
              saldo_deudor: nuevoTotal - (v.monto_pagado || 0),
              // Actualizar también el saldo pendiente que es el que se muestra en "Debe"
              saldo_pendiente: nuevoTotal - (v.monto_pagado || 0),
              // Asegurar que el estado de pago se mantenga correcto
              estado_pago: nuevoTotal > (v.monto_pagado || 0) ? 'pendiente' : 'pagado'
            }
          : v
      )
    );
      
      // Recargar estadísticas
      cargarEstadisticas();
    } catch (error) {
      console.error('Error al actualizar la venta:', error);
      toast.error('Error al actualizar la venta');
    }
  };
  
  /**
   * Navega al punto de venta con sucursal preseleccionada
   */
  const irAPuntoVenta = () => {
    // Si hay una sucursal filtrada, usarla como preselección
    const sucursalParaPV = sucursalFiltro || rest.sucursalSeleccionada?.id;
    
    if (sucursalParaPV) {
      navigate('/ventas/nueva', { 
        state: { sucursal_preseleccionada: sucursalParaPV } 
      });
    } else {
      navigate('/ventas/nueva');
    }
  };
  
  /**
   * Obtiene el ícono según el método de pago
   * @param {string} metodo - Método de pago
   * @returns {JSX.Element} Ícono correspondiente
   */
  const getIconoMetodoPago = (metodo) => {
    switch(metodo) {
      case 'efectivo':
        return <FaMoneyBillWave className="mr-2 text-green-500" />;
      case 'tarjeta':
        return <FaCreditCard className="mr-2 text-blue-500" />;
      case 'transferencia':
        return <FaExchangeAlt className="mr-2 text-purple-500" />;
      default:
        return <FaMoneyBillWave className="mr-2 text-gray-500" />;
    }
  };
  
  /**
   * Obtiene las ventas filtradas según el estado seleccionado
   * @returns {Array} Ventas filtradas
   */
  const getVentasFiltradas = () => {
    let ventasFiltradas = ventas;
    
    if (!filtroEstado) {
      return ventasFiltradas;
    }
    
    // Filtros de estado tradicionales
    if (['entregado', 'en_curso', 'cancelada', 'devuelta'].includes(filtroEstado)) {
      return ventasFiltradas.filter(venta => venta.estado === filtroEstado);
    }
    
    // Filtro sin pagos - corregido
    if (filtroEstado === 'sin_pago') {
      return ventasFiltradas.filter(venta => {
        // Una venta sin pagos tiene estado_pago !== 'pagado' y total_pagado = 0
        const totalPagado = parseFloat(venta.total_pagado || 0);
        const saldoPendiente = parseFloat(venta.saldo_pendiente || venta.total || 0);
        return totalPagado === 0 && saldoPendiente > 0 && venta.estado !== 'cancelada';
      });
    }
    
    // Filtro pago parcial - corregido
    if (filtroEstado === 'pago_parcial') {
      return ventasFiltradas.filter(venta => {
        const totalPagado = parseFloat(venta.total_pagado || 0);
        const total = parseFloat(venta.total || 0);
        const saldoPendiente = parseFloat(venta.saldo_pendiente || 0);
        // Tiene pagos pero no está completamente pagada
        return totalPagado > 0 && saldoPendiente > 0 && venta.estado !== 'cancelada';
      });
    }
    
    return ventasFiltradas;
  };
  
  /**
   * Maneja la selección/deselección de una venta
   */
  const toggleSeleccionVenta = (ventaId) => {
    setVentasSeleccionadas(prev => {
      if (prev.includes(ventaId)) {
        return prev.filter(id => id !== ventaId);
      } else {
        return [...prev, ventaId];
      }
    });
  };
  
  /**
   * Selecciona/deselecciona todas las ventas visibles
   */
  const toggleSeleccionarTodas = () => {
    const ventasFiltradas = getVentasFiltradas();
    const ventasSeleccionables = ventasFiltradas.filter(v => esVentaSeleccionable(v));
    
    console.log(`🔍 Ventas filtradas: ${ventasFiltradas.length}`);
    console.log(`✅ Ventas seleccionables: ${ventasSeleccionables.length}`);
    console.log(`📋 Ventas ya seleccionadas: ${ventasSeleccionadas.length}`);
    
    if (ventasSeleccionadas.length === ventasSeleccionables.length) {
      // Deseleccionar todas
      setVentasSeleccionadas([]);
      console.log('🔄 Deseleccionando todas las ventas');
    } else {
      // Seleccionar todas las seleccionables
      const idsSeleccionables = ventasSeleccionables.map(v => v.id);
      setVentasSeleccionadas(idsSeleccionables);
      console.log(`✅ Seleccionando ${idsSeleccionables.length} ventas:`, idsSeleccionables);
    }
  };
  
  /**
   * Verifica si una venta es seleccionable
   * ✅ CORREGIDO: Ahora permite seleccionar más tipos de ventas
   */
  const esVentaSeleccionable = (venta) => {
    // Permitir seleccionar ventas que:
    // 1. Estén en curso (para completar)
    // 2. Estén entregadas pero con saldo pendiente (para pagar)
    // 3. Estén completadas pero con saldo pendiente (para pagar)
    // 4. Estén canceladas pero con saldo pendiente (para pagar)
    
    const tieneSaldoPendiente = (venta.saldo_pendiente && venta.saldo_pendiente > 0) || 
                               (venta.total && venta.total_pagado && (venta.total > venta.total_pagado));
    
    return venta.estado === 'en_curso' || 
           venta.estado === 'entregado' || 
           venta.estado === 'completada' ||
           (venta.estado === 'cancelada' && tieneSaldoPendiente) ||
           tieneSaldoPendiente;
  };
  
  /**
   * Prepara el procesamiento en lote
   */
  const prepararProcesamientoLote = (tipoAccion) => {
    if (ventasSeleccionadas.length === 0) {
      toast.warning('Por favor selecciona al menos una venta');
      return;
    }
    
    setAccionLote(tipoAccion);
    setShowConfirmLote(true);
  };
  
  /**
   * Confirma y procesa las ventas en lote
   */
  const confirmarProcesamientoLote = async () => {
    try {
      setProcesandoLote(true);
      
      const ventasAProcesar = ventas.filter(v => ventasSeleccionadas.includes(v.id));
      let exitosas = 0;
      let errores = 0;
      const pagosRegistrados = []; // Para almacenar información de pagos
      
      console.log(`🔄 Procesando ${ventasAProcesar.length} ventas en lote...`);
      
      for (const venta of ventasAProcesar) {
        try {
          console.log(`📦 Procesando venta ${venta.numero || venta.id}...`);
          
          // Cambiar estado a entregado si está en curso
          if (venta.estado === 'en_curso') {
            console.log(`✅ Cambiando estado de venta ${venta.numero} a 'entregado'`);
            await ventasService.cambiarEstado(venta.id, 'entregado');
          }
          
          // Si tiene saldo pendiente, registrar pago completo
          if (venta.saldo_pendiente > 0) {
            console.log(`💰 Registrando pago completo para venta ${venta.numero}: $${venta.saldo_pendiente}`);
            
            const pagoData = {
              monto: venta.saldo_pendiente,
              metodo_pago: 'efectivo',
              concepto: 'Pago completo - Procesamiento en lote',
              observaciones: 'Marcado como pagado desde gestión de ventas - Procesamiento en lote',
              generar_ticket: false // ✅ NO generar ticket automáticamente
            };
            
            const resultadoPago = await ventasService.registrarPago(venta.id, pagoData);
            
            // Guardar información del pago para referencia posterior
            pagosRegistrados.push({
              venta_id: venta.id,
              venta_numero: venta.numero || venta.id,
              cliente: venta.cliente_info?.nombre_completo || 'Cliente General',
              monto: venta.saldo_pendiente,
              pago_id: resultadoPago?.id || 'N/A',
              timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Pago registrado para venta ${venta.numero}:`, resultadoPago);
          }
          
          exitosas++;
          console.log(`✅ Venta ${venta.numero} procesada exitosamente`);
          
        } catch (error) {
          console.error(`❌ Error al procesar venta ${venta.numero || venta.id}:`, error);
          errores++;
        }
      }
      
      // Mostrar resultado detallado
      if (exitosas > 0) {
        const mensaje = `${exitosas} venta(s) procesada(s) correctamente`;
        if (pagosRegistrados.length > 0) {
          toast.success(`${mensaje} - ${pagosRegistrados.length} pago(s) registrado(s)`);
          
          // Mostrar resumen de pagos en consola para auditoría
          console.group('📊 RESUMEN DE PAGOS EN LOTE');
          console.table(pagosRegistrados);
          console.groupEnd();
          
          // Opcional: Mostrar modal con resumen de pagos
          if (pagosRegistrados.length > 0) {
            mostrarResumenPagosLote(pagosRegistrados);
          }
        } else {
          toast.success(mensaje);
        }
      }
      
      if (errores > 0) {
        toast.error(`${errores} venta(s) no pudieron ser procesadas`);
      }
      
      // Limpiar selección y recargar
      setVentasSeleccionadas([]);
      setModoSeleccion(false);
      await cargarVentas(limiteActual);
      await cargarEstadisticas();
      
    } catch (error) {
      console.error('❌ Error en procesamiento por lote:', error);
      toast.error('Error al procesar las ventas');
    } finally {
      setProcesandoLote(false);
      setShowConfirmLote(false);
      setAccionLote('');
    }
  };

  /**
   * Muestra un resumen de los pagos procesados en lote
   */
  const mostrarResumenPagosLote = (pagos) => {
    // Crear un modal temporal para mostrar el resumen
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">✅ Resumen de Pagos en Lote</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">
            Se procesaron <strong>${pagos.length} pagos</strong> exitosamente.
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
                  <td class="px-3 py-2 text-sm text-gray-900">${pago.venta_numero}</td>
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
          <button 
            onclick="window.location.reload()"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Recargar Lista
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
   * Cancela el procesamiento en lote
   */
  const cancelarProcesamientoLote = () => {
    setShowConfirmLote(false);
    setAccionLote('');
  };
  
  /**
   * Columnas para la tabla de ventas
   */
  const columns = [
    // Checkbox para selección (solo en modo selección)
    ...(modoSeleccion ? [{
      header: (
        <button
          onClick={toggleSeleccionarTodas}
          className="text-indigo-600 hover:text-indigo-800"
          title={`${ventasSeleccionadas.length > 0 ? 'Deseleccionar' : 'Seleccionar'} todas las ventas disponibles`}
        >
          <div className="flex flex-col items-center">
            {ventasSeleccionadas.length > 0 ? <FaCheckSquare /> : <FaSquare />}
            <span className="text-xs text-gray-500 mt-1">
              {ventasSeleccionadas.length}/{ventas.filter(v => esVentaSeleccionable(v)).length}
            </span>
          </div>
        </button>
      ),
      cell: (row) => {
        const seleccionable = esVentaSeleccionable(row);
        const estaSeleccionada = ventasSeleccionadas.includes(row.id);
        
        if (seleccionable) {
          return (
            <button
              onClick={() => toggleSeleccionVenta(row.id)}
              className={`transition-colors duration-200 ${
                estaSeleccionada 
                  ? 'text-indigo-600 hover:text-indigo-800' 
                  : 'text-gray-400 hover:text-indigo-600'
              }`}
              title={estaSeleccionada ? 'Deseleccionar venta' : 'Seleccionar venta'}
            >
              {estaSeleccionada ? <FaCheckSquare /> : <FaSquare />}
            </button>
          );
        } else {
          return (
            <span 
              className="text-gray-300 cursor-not-allowed"
              title="Esta venta no se puede seleccionar (ya está pagada y completada)"
            >
              <FaSquare />
            </span>
          );
        }
      }
    }] : []),
    // 1. Acciones
    {
      header: 'Acciones',
      cell: (row) => (
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'}`}>
          {/* Botón Ver Detalle */}
          <button
            onClick={() => verDetalleVenta(row.id)}
            className={`text-blue-600 hover:text-blue-800 ${isMobile ? 'p-2 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center' : ''}`}
            title="Ver detalles"
          >
            <FaEye size={isMobile ? 18 : 16} />
            {isMobile && <span className="ml-2 text-xs">Ver</span>}
          </button>
          
          {/* Botón Modificar solo para ventas NO entregadas y usuario administrador */}
          {row.estado !== 'entregado' && (currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin' || hasPermission('ventas', 'editar')) && (
            <button
              onClick={() => editarVenta(row.id)}
              className={`text-purple-600 hover:text-purple-800 ${isMobile ? 'p-2 rounded-lg bg-purple-50 hover:bg-purple-100 flex items-center justify-center' : ''}`}
              title="Modificar venta"
            >
              <FaEdit size={isMobile ? 18 : 16} />
              {isMobile && <span className="ml-2 text-xs">Editar</span>}
            </button>
          )}

          {/* Botón Imprimir Comprobante de Pago - solo para ventas pagadas */}
          {row.saldo_pendiente === 0 && row.total_pagado > 0 && (
            <button
              onClick={() => imprimirComprobantePago(row)}
              className={`text-green-600 hover:text-green-800 ${isMobile ? 'p-2 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center' : ''}`}
              title="Imprimir comprobante de pago"
            >
              <FaPrint size={isMobile ? 18 : 16} />
              {isMobile && <span className="ml-2 text-xs">Imprimir</span>}
            </button>
          )}
          
          {/* Botón Agregar Pago - MOVIDO AL FINAL PARA MEJOR VISIBILIDAD EN MÓVIL */}
          {((row.total_pagado && row.total_pagado < row.total) || !row.total_pagado) && (
            <button
              onClick={() => agregarPago(row)}
              className={`text-green-600 hover:text-green-800 ${isMobile ? 'p-3 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center font-medium shadow-sm' : ''}`}
              title="Agregar pago"
            >
              <FaMoneyBillWave size={isMobile ? 20 : 16} />
              {isMobile && <span className="ml-2 text-sm font-medium">Pagar</span>}
            </button>
          )}
          
          {/* Botón Eliminar solo para usuarios autorizados */}
          {(currentUser?.email === 'danielcadiz15@gmail.com' || currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin' || hasPermission('ventas', 'eliminar')) && (
            <button
              onClick={() => prepararEliminarVenta(row)}
              className={`text-red-600 hover:text-red-800 ${isMobile ? 'p-2 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center' : ''}`}
              title="Eliminar venta"
            >
              <FaTrash size={isMobile ? 18 : 16} />
              {isMobile && <span className="ml-2 text-xs">Eliminar</span>}
            </button>
          )}
        </div>
      )
    },
    // 2. Fecha
    {
      header: 'Fecha',
      accessor: 'fecha',
      cell: (row) => (
        <div>
          <div className="flex items-center">
            <FaCalendarAlt className="mr-2 text-gray-500" />
            <span>{new Date(row.fecha).toLocaleDateString()} {new Date(row.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          {/* Iconos adicionales */}
          <div className="flex items-center mt-1 space-x-2">
            {/* Icono de nota */}
            {row.notas && (
              <span className="text-yellow-500" title={`Nota: ${row.notas}`}>
                <FaStickyNote size={14} />
              </span>
            )}
            
            {/* Icono de método de pago - solo mostrar si hay pagos */}
            {row.total_pagado && row.total_pagado > 0 && (
              <>
                {row.metodo_pago === 'efectivo' && (
                  <span className="text-green-500" title="Pago en efectivo">
                    <FaMoneyBill size={14} />
                  </span>
                )}
                {row.metodo_pago === 'transferencia' && (
                  <span className="text-blue-500" title="Pago por transferencia">
                    <FaUniversity size={14} />
                  </span>
                )}
                {row.metodo_pago === 'tarjeta' && (
                  <span className="text-purple-500" title="Pago con tarjeta">
                    <FaCreditCard size={14} />
                  </span>
                )}
              </>
            )}
            
            {/* Icono de transporte */}
            {row.con_transporte && (
              <span className="text-orange-500" title="Venta despachada por transporte/encomienda">
                <FaTruck size={14} />
              </span>
            )}
            
            {/* Icono de entregada */}
            {row.estado === 'entregado' && (
              <span className="text-green-600" title="Venta entregada">
                <FaCheckCircle size={14} />
              </span>
            )}
            
            {/* Icono de pagada */}
            {(row.estado_pago === 'pagado' || (row.total_pagado && row.total_pagado >= row.total)) && (
              <span className="text-green-600" title="Venta pagada">
                <FaMoneyBillWave size={14} />
              </span>
            )}
          </div>
        </div>
      )
    },
    // 3. Cliente
    {
      header: 'Cliente',
      accessor: 'cliente_info.nombre_completo',
      cell: (row) => (
        <div className="flex items-center">
          <FaUserAlt className="mr-2 text-gray-500" />
          <span>{row.cliente_info?.nombre_completo || 'Cliente General'}</span>
        </div>
      )
    },
    // 4. Sucursal (si aplica)
    ...(!sucursalFiltro ? [{
      header: 'Sucursal',
      accessor: 'sucursal_id',
      cell: (row) => {
        const sucursal = rest.sucursalesDisponibles.find(s => s.id === row.sucursal_id);
        return (
          <div className="flex items-center">
            <FaStore className="mr-2 text-blue-500" />
            <span className="text-sm">
              {sucursal ? sucursal.nombre : 'Sin sucursal'}
            </span>
          </div>
        );
      }
    }] : []),
    // 5. Estado (TEMPORALMENTE OCULTO - Se retomará más adelante)
    /*
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => {
        let color = 'bg-gray-100 text-gray-600';
        let icon = <FaCheck className="mr-1" />;
        let texto = 'En Curso';
        
        if (row.estado === 'en_curso') {
          color = 'bg-blue-100 text-blue-600';
          icon = <FaClock className="mr-1" />;
          texto = 'En Curso';
        } else if (row.estado === 'entregado') {
          color = 'bg-green-100 text-green-600';
          icon = <FaCheck className="mr-1" />;
          texto = 'Entregado';
        } else if (row.estado === 'cancelada') {
          color = 'bg-red-100 text-red-600';
          icon = <FaTimes className="mr-1" />;
          texto = 'Cancelada';
        } else if (row.estado === 'devuelta') {
          color = 'bg-orange-100 text-orange-600';
          icon = <FaUndo className="mr-1" />;
          texto = 'Devuelta';
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${color}`}>
            {icon}
            {texto}
          </span>
        );
      }
    },
    */
    // 5. Estado Pago (antes era 6, ahora es 5 porque quitamos la columna de Estado)
    {
      header: 'Estado Pago',
      accessor: 'estado_pago',
      cell: (row) => {
        let color = 'bg-gray-100 text-gray-600';
        let icon = <FaClock className="mr-1" />;
        let texto = 'Pendiente';
        
        // Determinar estado de pago
        const totalPagado = row.total_pagado || 0;
        const total = row.total || 0;
        const saldoPendiente = row.saldo_pendiente ?? (total - totalPagado);
        
        if (saldoPendiente <= 0 || row.estado_pago === 'pagado') {
          color = 'bg-green-100 text-green-600';
          icon = <FaCheck className="mr-1" />;
          texto = 'Pagado';
        } else if (totalPagado > 0) {
          color = 'bg-yellow-100 text-yellow-600';
          icon = <FaClock className="mr-1" />;
          const porcentaje = ((totalPagado / total) * 100).toFixed(0);
          texto = `Parcial (${porcentaje}%)`;
        } else {
          color = 'bg-red-100 text-red-600';
          icon = <FaExclamationTriangle className="mr-1" />;
          texto = 'Sin pagos';
        }
        
        return (
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${color}`}>
              {icon}
              {texto}
            </span>
            {saldoPendiente > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Debe: {formatearTotal(saldoPendiente)}
              </div>
            )}
          </div>
        );
      }
    },
    // 6. Total (antes era 7)
    {
      header: 'Total',
      accessor: 'total',
      cell: (row) => (
        <span className="font-medium">
          {formatearTotal(row.total)}
        </span>
      )
    },
    // 7. Número (antes era 8)
    {
      header: 'Número',
      accessor: 'numero',
      cell: (row) => (
        <span className="font-medium text-gray-600">{row.numero}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Ventas</h1>
          <p className="text-sm text-gray-600 mt-1">
            <FaStore className="inline mr-1" />
            {getNombreSucursalFiltro()}
            {estadisticasPorSucursal && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Vista por sucursal
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="primary"
            icon={<FaPlus />}
            onClick={irAPuntoVenta}
          >
            Nueva Venta
          </Button>
          
          <Button
            color="secondary"
            icon={<FaBroom />}
            onClick={() => setShowLimpiezaModal(true)}
            title="Limpiar ventas con clientes eliminados"
          >
            Limpiar
          </Button>
        </div>
      </div>
      
      {/* Filtro de sucursal */}
      {rest.sucursalesDisponibles.length > 1 && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaFilter className="text-blue-600" />
              <span className="font-medium text-blue-800">Filtrar por Sucursal:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                color={sucursalFiltro === '' ? 'primary' : 'secondary'}
                onClick={() => handleCambiarSucursalFiltro('')}
                icon={<FaStore />}
              >
                Todas
              </Button>
              
              {rest.sucursalesDisponibles.map(sucursal => (
                <Button
                  key={sucursal.id}
                  size="sm"
                  color={sucursalFiltro === sucursal.id ? 'primary' : 'secondary'}
                  onClick={() => handleCambiarSucursalFiltro(sucursal.id)}
                  icon={<FaStore />}
                >
                  {sucursal.nombre}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Barra de acciones en lote (visible cuando hay selección) */}
      {modoSeleccion && (
        <Card className="bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaCheckDouble className="text-indigo-600" />
              <span className="font-medium text-indigo-800">
                {ventasSeleccionadas.length > 0 ? (
                  `${ventasSeleccionadas.length} venta(s) seleccionada(s)`
                ) : (
                  'Modo selección múltiple - Selecciona ventas para procesar en lote'
                )}
              </span>
              {ventasSeleccionadas.length === 0 && (
                <span className="text-sm text-indigo-600">
                  (Ventas disponibles: {ventas.filter(v => esVentaSeleccionable(v)).length})
                </span>
              )}
            </div>
            
            {/* Mostrar mensaje si no hay ventas seleccionables */}
            {ventas.filter(v => esVentaSeleccionable(v)).length === 0 && (
              <div className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                ⚠️ No hay ventas disponibles para seleccionar
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                color="success"
                onClick={() => prepararProcesamientoLote('completar_pagar')}
                icon={<FaCheckDouble />}
                loading={procesandoLote}
              >
                Completar y Pagar al 100%
              </Button>
              
              <Button
                size="sm"
                color="secondary"
                onClick={() => {
                  setVentasSeleccionadas([]);
                  setModoSeleccion(false);
                }}
              >
                Cancelar Selección
              </Button>
            </div>
          </div>
        </Card>
      )}
      
     {/* Tarjetas de estadísticas con filtro de fecha */}
		{estadisticas && (
		  <div className="space-y-4">
			{/* Selector de período */}
			<Card className="bg-gray-50">
			  <div className="flex items-center justify-between flex-wrap gap-4">
				<div className="flex items-center space-x-2">
				  <FaCalendarAlt className="text-gray-600" />
				  <span className="font-medium text-gray-700">Período de estadísticas:</span>
				</div>
				
				<div className="flex items-center space-x-2">
				  <select
					value={filtroFecha}
					onChange={(e) => {
					  setFiltroFecha(e.target.value);
					  if (e.target.value !== 'personalizado') {
						setMostrarSelectorFecha(false);
					  }
					}}
					className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				  >
					<option value="hoy">Hoy</option>
					<option value="semana">Esta semana</option>
					<option value="mes">Este mes</option>
					<option value="personalizado">Personalizado</option>
				  </select>
				  
				  {filtroFecha === 'personalizado' && (
					<>
					  <input
						type="date"
						value={fechaInicio}
						onChange={(e) => setFechaInicio(e.target.value)}
						className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					  />
					  <span className="text-gray-500">hasta</span>
					  <input
						type="date"
						value={fechaFin}
						onChange={(e) => setFechaFin(e.target.value)}
						min={fechaInicio}
						className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					  />
					</>
				  )}
				  
				  <Button
					size="sm"
					color="secondary"
					onClick={() => cargarEstadisticas()}
					icon={<FaSyncAlt />}
				  >
					Actualizar
				  </Button>
				</div>
			  </div>
			</Card>
			
			{/* Estadísticas */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
			  <Card className="bg-indigo-50 border-indigo-200">
				<div className="flex items-center justify-between">
				  <div>
					<h3 className="text-indigo-800 font-medium">
					  Ventas {filtroFecha === 'hoy' ? 'hoy' : `del ${filtroFecha === 'semana' ? 'la semana' : filtroFecha === 'mes' ? 'mes' : 'período'}`}
					  {estadisticasPorSucursal && (
						<span className="block text-xs text-indigo-600">
						  ({getNombreSucursalFiltro()})
						</span>
					  )}
					</h3>
					<p className="text-2xl font-bold text-indigo-900">
					  {estadisticas.total_ventas || estadisticas.ventasHoy || 0}
					</p>
				  </div>
				  <FaShoppingCart className="text-4xl text-indigo-300" />
				</div>
			  </Card>
			  
			  <Card className="bg-green-50 border-green-200">
				<div className="flex items-center justify-between">
				  <div>
					<h3 className="text-green-800 font-medium">
					  Total ventas
					  {estadisticasPorSucursal && (
						<span className="block text-xs text-green-600">
						  (Esta sucursal)
						</span>
					  )}
					</h3>
					<p className="text-2xl font-bold text-green-900">
					  {formatearTotal(estadisticas.monto_total || estadisticas.totalVentasHoy || 0)}
					</p>
				  </div>
				  <FaMoneyBillWave className="text-4xl text-green-300" />
				</div>
			  </Card>
			  
			  <Card className="bg-blue-50 border-blue-200">
				<div className="flex items-center justify-between">
				  <div>
					<h3 className="text-blue-800 font-medium">Transferencias</h3>
					<p className="text-2xl font-bold text-blue-900">
					  {formatearTotal(estadisticas.transferencia || 0)}
					</p>
				  </div>
				  <FaExchangeAlt className="text-4xl text-blue-300" />
				</div>
			  </Card>
			  
			  <Card className="bg-yellow-50 border-yellow-200">
				<div className="flex items-center justify-between">
				  <div>
					<h3 className="text-yellow-800 font-medium">Efectivo</h3>
					<p className="text-2xl font-bold text-yellow-900">
					  {formatearTotal(estadisticas.efectivo || 0)}
					</p>
				  </div>
				  <FaMoneyBillWave className="text-4xl text-yellow-300" />
				</div>
			  </Card>
			</div>
		  </div>
		)}
      
      <Card>
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <SearchBar
              placeholder={`Buscar por número de venta, cliente, monto o fecha${sucursalFiltro ? ' en esta sucursal' : ''}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={buscarVentas}
              onClear={() => {
                setSearchTerm('');
                setBusquedaActiva(false);
                setVentas(todasLasVentas);
              }}
            />
            {busquedaActiva && (
              <p className="text-sm text-gray-600 mt-1">
                <FaSearch className="inline mr-1" />
                Mostrando resultados de búsqueda
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Selector de filtro de estado unificado */}
            <div className="relative">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="completada">✅ Completadas</option>
                <option value="pendiente">⏰ Pendientes</option>
                <option value="cancelada">❌ Canceladas</option>
                <option value="devuelta">↩️ Devueltas</option>
                <option value="sin_pago">💰 Sin pagos</option>
                <option value="pago_parcial">💳 Pago parcial</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <FaFilter className="h-4 w-4" />
              </div>
            </div>
            
            {/* Botón de modo selección */}
            <Button
              size="sm"
              color={modoSeleccion ? 'primary' : 'secondary'}
              onClick={() => setModoSeleccion(!modoSeleccion)}
              icon={<FaCheckSquare />}
            >
              {modoSeleccion ? 'Salir de Selección' : 'Selección Múltiple'}
              {!modoSeleccion && (
                <span className="ml-2 text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-full">
                  {ventas.filter(v => esVentaSeleccionable(v)).length} disponibles
                </span>
              )}
            </Button>
            
            <Button
              size="sm"
              color="secondary"
              onClick={() => cargarVentas(limiteActual)}
              icon={<FaSyncAlt />}
            >
              Actualizar
            </Button>
            
            <Button
              size="sm"
              color="info"
              onClick={() => buscarVentasAntiguas()}
              icon={<FaSearch />}
            >
              Buscar Antiguas
            </Button>
            
            <Link to="/reportes/cuentas-por-cobrar">
              <Button
                color="warning"
                icon={<FaMoneyBillWave />}
                size="sm"
              >
                Cuentas por Cobrar
              </Button>
            </Link>
          </div>
        </div>
      </Card>
      
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {getVentasFiltradas().length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaShoppingCart className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  {searchTerm || filtroEstado
                    ? 'No se encontraron ventas con los filtros seleccionados'
                    : sucursalFiltro
                      ? `No hay ventas registradas en ${getNombreSucursalFiltro()}`
                      : 'No hay ventas registradas'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filtroEstado
                    ? 'Intenta con otros términos de búsqueda o quita los filtros'
                    : 'Comienza registrando tu primera venta'}
                </p>
                
                <div className="mt-4">
                  <Button
                    color="primary"
                    icon={<FaPlus />}
                    onClick={irAPuntoVenta}
                  >
                    Registrar Venta
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Resumen de ventas mostradas */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>
                      Mostrando {getVentasFiltradas().length} venta{getVentasFiltradas().length !== 1 ? 's' : ''}
                      {busquedaActiva ? ' (resultado de búsqueda)' : ` de ${todasLasVentas.length} cargadas`}
                      {sucursalFiltro && ` de ${getNombreSucursalFiltro()}`}
                      {filtroEstado && ` con estado "${filtroEstado}"`}
                      {searchTerm && ` que coinciden con "${searchTerm}"`}
                    </span>
                    <span className="font-medium">
                      Total: {formatearTotal(
                        getVentasFiltradas().reduce((sum, venta) => sum + parseFloat(venta.total || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
				
                {/* Vista desktop - tabla */}
                <div className="hidden md:block">
                  <Table
                    columns={columns}
                    data={getVentasFiltradas()}
                    pagination={true}
                    itemsPerPage={25}
                  />
                </div>
                
                {/* Vista móvil - cards */}
                <div className="md:hidden space-y-3">
                  {getVentasFiltradas().map((venta) => (
                    <div key={venta.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{venta.numero}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(venta.fecha).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => verDetalleVenta(venta.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Ver detalles"
                          >
                            <FaEye size={16} />
                          </button>
                          {venta.estado !== 'entregado' && (currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin' || hasPermission('ventas', 'editar')) && (
                            <button
                              onClick={() => editarVenta(venta.id)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                              title="Modificar venta"
                            >
                              <FaEdit size={16} />
                            </button>
                          )}
                          {(currentUser?.email === 'danielcadiz15@gmail.com' || currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin') && (
                            <button
                              onClick={() => prepararEliminarVenta(venta)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar venta"
                            >
                              <FaTrash size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cliente:</span>
                          <span className="font-medium truncate max-w-[150px]">{venta.cliente_info?.nombre_completo || 'Cliente General'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">{formatearTotal(venta.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estado:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            venta.estado === 'en_curso' ? 'bg-blue-100 text-blue-600' :
                            venta.estado === 'entregado' ? 'bg-green-100 text-green-600' :
                            venta.estado === 'cancelada' ? 'bg-red-100 text-red-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {venta.estado === 'en_curso' ? 'En Curso' :
                             venta.estado === 'entregado' ? 'Entregado' :
                             venta.estado === 'cancelada' ? 'Cancelada' : 'Devuelta'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Botones de acción móviles - ELIMINADOS */}
                      {/* <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex space-x-2">
                          {venta.estado === 'en_curso' && (
                            <>
                              <button
                                onClick={() => prepararCambiarEstado(venta, 'entregado')}
                                className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-700"
                              >
                                Entregar
                              </button>
                              <button
                                onClick={() => prepararCambiarEstado(venta, 'cancelada')}
                                className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-red-700"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {venta.estado === 'entregado' && (
                            <button
                              onClick={() => prepararCambiarEstado(venta, 'devuelta')}
                              className="flex-1 bg-orange-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-orange-700"
                            >
                              Devolver
                            </button>
                          )}
                        </div>
                      </div> */}
                    </div>
                  ))}
                </div>
                
                {/* Botón para cargar más ventas */}
                {!busquedaActiva && todasLasVentas.length === limiteActual && todasLasVentas.length >= 200 && (
                  <div className="mt-6 text-center">
                    <Button
                      color="secondary"
                      onClick={handleCargarMasVentas}
                      icon={cargandoMas ? <FaSyncAlt className="animate-spin" /> : <FaDownload />}
                      loading={cargandoMas}
                      disabled={cargandoMas}
                    >
                      {cargandoMas ? 'Cargando más ventas...' : 'Cargar más ventas'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Actualmente mostrando {limiteActual} ventas. Haz clic para cargar 200 más.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación individual */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          accion === 'entregado' 
            ? 'Entregar Venta' 
            : accion === 'cancelada' 
              ? 'Cancelar Venta' 
              : accion === 'devuelta'
                ? 'Devolver Venta'
                : accion === 'eliminar'
                  ? 'Eliminar Venta'
                  : 'Confirmar Acción'
        }
        message={
          <div>
            {ventaProcesando && (
              <>
                <p>
                  {accion === 'entregado'
                    ? `¿Estás seguro de marcar la venta ${ventaProcesando.numero} como entregada?`
                    : accion === 'cancelada'
                      ? `¿Estás seguro de cancelar la venta ${ventaProcesando.numero}? Esta acción devolverá los productos al inventario.`
                      : accion === 'devuelta'
                        ? `¿Estás seguro de marcar la venta ${ventaProcesando.numero} como devuelta? Esta acción devolverá los productos al inventario.`
                        : accion === 'eliminar'
                          ? `¿Estás seguro de ELIMINAR PERMANENTEMENTE la venta ${ventaProcesando.numero}? Esta acción NO SE PUEDE DESHACER y eliminará completamente el registro.`
                          : `¿Estás seguro de realizar esta acción?`}
                </p>
                
                {/* Agregar checkbox para transporte solo al entregar */}
                {accion === 'entregado' && (
                  <div className="mt-4 flex items-center">
                    <input
                      type="checkbox"
                      id="incluye-transporte"
                      checked={incluyeTransporte}
                      onChange={(e) => setIncluyeTransporte(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="incluye-transporte" className="ml-2 text-sm text-gray-700">
                      <FaTruck className="inline mr-1" />
                      Esta venta incluye servicio de transporte
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        }
        confirmText={
          accion === 'entregado' 
            ? 'Entregar' 
            : accion === 'cancelada' 
              ? 'Cancelar' 
              : accion === 'devuelta'
                ? 'Devolver'
                : accion === 'eliminar'
                  ? 'Eliminar Permanentemente'
                  : 'Confirmar'
        }
        cancelText="Volver"
        onConfirm={confirmarCambiarEstado}
        onCancel={cancelarAccion}
      />
      
      {/* Diálogo de confirmación para procesamiento en lote */}
      <ConfirmDialog
        isOpen={showConfirmLote}
        title="Procesar Ventas en Lote"
        message={
          <div>
            <p>¿Estás seguro de procesar las {ventasSeleccionadas.length} ventas seleccionadas?</p>
            <ul className="mt-2 text-sm text-gray-600">
              <li>• Las ventas en curso se marcarán como entregadas</li>
              <li>• Se registrará el pago del 100% del saldo pendiente</li>
              <li>• Esta acción no se puede deshacer</li>
            </ul>
          </div>
        }
        confirmText={procesandoLote ? "Procesando..." : "Confirmar y Procesar"}
        cancelText="Cancelar"
        onConfirm={confirmarProcesamientoLote}
        onCancel={cancelarProcesamientoLote}
        loading={procesandoLote}
      />

      <EditarVentaModal
        venta={ventaEditando || {}}
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        onGuardar={guardarEdicionVenta}
      />
      
      {/* Modal de limpieza de ventas */}
      <LimpiezaVentas
        isOpen={showLimpiezaModal}
        onClose={() => setShowLimpiezaModal(false)}
      />
      
      {/* Modal para registrar pago */}
      <RegistrarPagoDialog
        isOpen={modalPagoOpen}
        onClose={() => setModalPagoOpen(false)}
        venta={ventaSeleccionada}
        onPagoRegistrado={registrarPago}
      />
      
      {/* Modal del ticket de recibo */}
      {console.log('🎫 Renderizando ticket en Ventas.js, mostrarTicket:', mostrarTicket, 'pagoRegistrado:', pagoRegistrado)}
      {mostrarTicket && (
        <TicketReciboPago
          isOpen={mostrarTicket}
          onClose={cerrarTicket}
          pagoData={pagoRegistrado}
          venta={ventaSeleccionada}
          cliente={ventaSeleccionada?.cliente_info}
          modo="pago"
        />
      )}

      {/* Comprobante de pago para ventas pagadas */}
      <TicketReciboPago
        isOpen={showComprobantePago}
        onClose={() => {
          setShowComprobantePago(false);
          setVentaSeleccionada(null);
        }}
        pagoData={null}
        venta={ventaSeleccionada}
        cliente={ventaSeleccionada?.cliente_info}
        modo="venta_pagada"
      />
    </div>
  );
};

export default Ventas;