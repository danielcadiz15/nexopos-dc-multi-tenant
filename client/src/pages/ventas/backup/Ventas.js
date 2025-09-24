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
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import ventasService from '../../services/ventas.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaShoppingCart, FaPlus, FaEye, FaCheck, FaTimes,
  FaUndo, FaCalendarAlt, FaUserTie, FaMoneyBillWave,
  FaCreditCard, FaExchangeAlt, FaFilter, FaUserAlt,
  FaStore, FaSyncAlt, FaFileAlt, FaClock,
  FaExclamationTriangle, FaFileExcel, FaDownload,
  FaSearch, FaCheckDouble, FaCheckSquare, FaSquare
} from 'react-icons/fa';

/**
 * Componente de página para gestión de ventas con filtro por sucursal
 * @returns {JSX.Element} Componente Ventas
 */
const Ventas = () => {
  const navigate = useNavigate();
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles } = useAuth();
  
  // Estado
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ventaProcesando, setVentaProcesando] = useState(null);
  const [accion, setAccion] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(''); // '', 'completada', 'pendiente', 'cancelada', 'devuelta'
  const [estadisticas, setEstadisticas] = useState(null);
  
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
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarVentas();
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
  const cargarVentas = async (limite = 200) => {
    try {
      setLoading(true);
      
      let data;
      
      if (sucursalFiltro) {
        // Cargar ventas de una sucursal específica con límite mayor
        data = await ventasService.obtenerPorSucursal(sucursalFiltro, limite);
      } else {
        // Cargar todas las ventas con límite mayor
        data = await ventasService.obtenerTodas({ limit: limite });
      }
      
      setVentas(data);
      setTodasLasVentas(data); // Guardar copia para búsquedas
      setLimiteActual(limite);
      
      // Informar si hay más ventas disponibles
      if (data.length === limite) {
        toast.info(`Mostrando las primeras ${limite} ventas. Use la búsqueda para encontrar ventas específicas.`, {
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
  const cargarMasVentas = async () => {
    try {
      setCargandoMas(true);
      const nuevoLimite = limiteActual + 200;
      
      let data;
      if (sucursalFiltro) {
        data = await ventasService.obtenerPorSucursal(sucursalFiltro, nuevoLimite);
      } else {
        data = await ventasService.obtenerTodas({ limit: nuevoLimite });
      }
      
      setVentas(data);
      setTodasLasVentas(data);
      setLimiteActual(nuevoLimite);
      
      const nuevasVentas = data.length - limiteActual;
      if (nuevasVentas > 0) {
        toast.success(`Se cargaron ${nuevasVentas} ventas adicionales`);
      } else {
        toast.info('No hay más ventas para cargar');
      }
    } catch (error) {
      console.error('Error al cargar más ventas:', error);
      toast.error('Error al cargar más ventas');
    } finally {
      setCargandoMas(false);
    }
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
      
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };
  
  /**
   * Busca ventas por término (optimizada para búsqueda local primero)
   */
  const buscarVentas = async () => {
    try {
      setLoading(true);
      setBusquedaActiva(true);
      
      if (!searchTerm.trim()) {
        // Si el término está vacío, mostrar todas las ventas cargadas
        setVentas(todasLasVentas);
        setBusquedaActiva(false);
        setLoading(false);
        return;
      }
      
      const terminoBusqueda = searchTerm.toLowerCase().trim();
      
      // Primero buscar en las ventas ya cargadas (búsqueda local)
      const ventasLocales = todasLasVentas.filter(venta => {
        // Buscar en número de venta
        if (venta.numero && venta.numero.toLowerCase().includes(terminoBusqueda)) {
          return true;
        }
        
        // Buscar en nombre del cliente
        if (venta.cliente_info?.nombre_completo && 
            venta.cliente_info.nombre_completo.toLowerCase().includes(terminoBusqueda)) {
          return true;
        }
        
        // Buscar por monto exacto
        if (venta.total && venta.total.toString().includes(terminoBusqueda)) {
          return true;
        }
        
        // Buscar en fecha (formato: DD/MM/YYYY)
        const fecha = new Date(venta.fecha).toLocaleDateString();
        if (fecha.includes(terminoBusqueda)) {
          return true;
        }
        
        return false;
      });
      
      // Si encontramos resultados localmente, mostrarlos
      if (ventasLocales.length > 0) {
        setVentas(ventasLocales);
        toast.success(`Se encontraron ${ventasLocales.length} ventas`);
      } else {
        // Si no hay resultados locales, buscar en el servidor
        toast.info('Buscando en todas las ventas...');
        const data = await ventasService.buscar(searchTerm, sucursalFiltro);
        setVentas(data);
        
        if (data.length === 0) {
          toast.warning('No se encontraron ventas con ese criterio');
        } else {
          toast.success(`Se encontraron ${data.length} ventas`);
        }
      }
    } catch (error) {
      console.error('Error al buscar ventas:', error);
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
    
    const sucursal = sucursalesDisponibles.find(s => s.id === sucursalFiltro);
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
    setVentaProcesando(venta);
    setAccion(nuevoEstado);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma el cambio de estado de la venta
   */
  const confirmarCambiarEstado = async () => {
    try {
      // Solicitar motivo si es cancelación o devolución
      let motivo = '';
      if (accion === 'cancelada' || accion === 'devuelta') {
        motivo = prompt(`Por favor, ingresa el motivo de la ${accion === 'cancelada' ? 'cancelación' : 'devolución'}:`);
        
        if (motivo === null) { // El usuario canceló el prompt
          setShowConfirmDialog(false);
          setVentaProcesando(null);
          setAccion('');
          return;
        }
      }
      
      await ventasService.cambiarEstado(ventaProcesando.id, accion, motivo);
      
      toast.success(`Venta ${accion === 'completada' ? 'completada' : accion === 'cancelada' ? 'cancelada' : 'devuelta'} correctamente`);
      
      // Recargar ventas y estadísticas
      cargarVentas(limiteActual);
      cargarEstadisticas();
    } catch (error) {
      console.error(`Error al cambiar estado de venta:`, error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error al procesar la venta`);
      }
    } finally {
      setShowConfirmDialog(false);
      setVentaProcesando(null);
      setAccion('');
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
  
  /**
   * Navega al punto de venta con sucursal preseleccionada
   */
  const irAPuntoVenta = () => {
    // Si hay una sucursal filtrada, usarla como preselección
    const sucursalParaPV = sucursalFiltro || sucursalSeleccionada?.id;
    
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
    if (!filtroEstado) {
      return ventas;
    }
    
    return ventas.filter(venta => venta.estado === filtroEstado);
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
    const ventasSeleccionables = ventasFiltradas.filter(v => 
      v.estado === 'pendiente' || (v.estado === 'completada' && v.saldo_pendiente > 0)
    );
    
    if (ventasSeleccionadas.length === ventasSeleccionables.length) {
      // Deseleccionar todas
      setVentasSeleccionadas([]);
    } else {
      // Seleccionar todas las seleccionables
      setVentasSeleccionadas(ventasSeleccionables.map(v => v.id));
    }
  };
  
  /**
   * Verifica si una venta es seleccionable
   */
  const esVentaSeleccionable = (venta) => {
    return venta.estado === 'pendiente' || 
           (venta.estado === 'completada' && venta.saldo_pendiente > 0);
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
      
      for (const venta of ventasAProcesar) {
        try {
          // Cambiar estado a completada si está pendiente
          if (venta.estado === 'pendiente') {
            await ventasService.cambiarEstado(venta.id, 'completada');
          }
          
          // Si tiene saldo pendiente, registrar pago completo
          if (venta.saldo_pendiente > 0) {
            await ventasService.registrarPago(venta.id, {
              monto: venta.saldo_pendiente,
              metodo_pago: 'efectivo',
              concepto: 'Pago completo - Procesamiento en lote',
              observaciones: 'Marcado como pagado desde gestión de ventas'
            });
          }
          
          exitosas++;
        } catch (error) {
          console.error(`Error al procesar venta ${venta.numero}:`, error);
          errores++;
        }
      }
      
      // Mostrar resultado
      if (exitosas > 0) {
        toast.success(`${exitosas} venta(s) procesada(s) correctamente`);
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
      console.error('Error en procesamiento por lote:', error);
      toast.error('Error al procesar las ventas');
    } finally {
      setProcesandoLote(false);
      setShowConfirmLote(false);
      setAccionLote('');
    }
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
        >
          {ventasSeleccionadas.length > 0 ? <FaCheckSquare /> : <FaSquare />}
        </button>
      ),
      cell: (row) => {
        const seleccionable = esVentaSeleccionable(row);
        return seleccionable ? (
          <button
            onClick={() => toggleSeleccionVenta(row.id)}
            className="text-indigo-600 hover:text-indigo-800"
          >
            {ventasSeleccionadas.includes(row.id) ? <FaCheckSquare /> : <FaSquare />}
          </button>
        ) : (
          <span className="text-gray-300">
            <FaSquare />
          </span>
        );
      }
    }] : []),
    // 1. Acciones
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => verDetalleVenta(row.id)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <FaEye />
          </button>
          
          {row.estado === 'pendiente' && !modoSeleccion && (
            <>
              <button
                onClick={() => prepararCambiarEstado(row, 'completada')}
                className="text-green-600 hover:text-green-800"
                title="Completar venta"
              >
                <FaCheck />
              </button>
              
              <button
                onClick={() => prepararCambiarEstado(row, 'cancelada')}
                className="text-red-600 hover:text-red-800"
                title="Cancelar venta"
              >
                <FaTimes />
              </button>
            </>
          )}
          
          {row.estado === 'completada' && !modoSeleccion && (
            <button
              onClick={() => prepararCambiarEstado(row, 'devuelta')}
              className="text-orange-600 hover:text-orange-800"
              title="Devolver venta"
            >
              <FaUndo />
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
        <div className="flex items-center">
          <FaCalendarAlt className="mr-2 text-gray-500" />
          <span>{new Date(row.fecha).toLocaleDateString()} {new Date(row.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
        const sucursal = sucursalesDisponibles.find(s => s.id === row.sucursal_id);
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
    // 5. Estado
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => {
        let color = 'bg-gray-100 text-gray-600';
        let icon = <FaCheck className="mr-1" />;
        
        if (row.estado === 'pendiente') {
          color = 'bg-yellow-100 text-yellow-600';
          icon = <FaClock className="mr-1" />;
        } else if (row.estado === 'cancelada') {
          color = 'bg-red-100 text-red-600';
          icon = <FaTimes className="mr-1" />;
        } else if (row.estado === 'devuelta') {
          color = 'bg-orange-100 text-orange-600';
          icon = <FaUndo className="mr-1" />;
        } else if (row.estado === 'completada') {
          color = 'bg-green-100 text-green-600';
          icon = <FaCheck className="mr-1" />;
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${color}`}>
            {icon}
            {row.estado ? row.estado.charAt(0).toUpperCase() + row.estado.slice(1) : 'Pendiente'}
          </span>
        );
      }
    },
    // 6. Estado Pago
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
    // 7. Total
    {
      header: 'Total',
      accessor: 'total',
      cell: (row) => (
        <span className="font-medium">
          {formatearTotal(row.total)}
        </span>
      )
    },
    // 8. Número
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
        
        <Button
          color="primary"
          icon={<FaPlus />}
          onClick={irAPuntoVenta}
        >
          Nueva Venta
        </Button>
      </div>
      
      {/* Filtro de sucursal */}
      {sucursalesDisponibles.length > 1 && (
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
              
              {sucursalesDisponibles.map(sucursal => (
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
      {modoSeleccion && ventasSeleccionadas.length > 0 && (
        <Card className="bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaCheckDouble className="text-indigo-600" />
              <span className="font-medium text-indigo-800">
                {ventasSeleccionadas.length} venta(s) seleccionada(s)
              </span>
            </div>
            
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
      
      {/* Tarjetas de estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-indigo-50 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-indigo-800 font-medium">
                  Ventas hoy
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
                <h3 className="text-blue-800 font-medium">Tarjeta</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatearTotal(estadisticas.tarjeta || 0)}
                </p>
              </div>
              <FaCreditCard className="text-4xl text-blue-300" />
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
            {/* Botón de modo selección */}
            <Button
              size="sm"
              color={modoSeleccion ? 'primary' : 'secondary'}
              onClick={() => setModoSeleccion(!modoSeleccion)}
              icon={<FaCheckSquare />}
            >
              {modoSeleccion ? 'Salir de Selección' : 'Selección Múltiple'}
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
              color={filtroEstado === 'completada' ? 'success' : 'secondary'}
              icon={<FaCheck />}
              onClick={() => filtrarPorEstado('completada')}
              size="sm"
            >
              Completadas
            </Button>
            
            <Button
              color={filtroEstado === 'pendiente' ? 'warning' : 'secondary'}
              icon={<FaClock />}
              onClick={() => filtrarPorEstado('pendiente')}
              size="sm"
            >
              Pendientes
            </Button>
            
            <Button
              color={filtroEstado === 'cancelada' ? 'danger' : 'secondary'}
              icon={<FaTimes />}
              onClick={() => filtrarPorEstado('cancelada')}
              size="sm"
            >
              Canceladas
            </Button>
            
            <Button
              color={filtroEstado === 'devuelta' ? 'primary' : 'secondary'}
              icon={<FaUndo />}
              onClick={() => filtrarPorEstado('devuelta')}
              size="sm"
            >
              Devueltas
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
				
                <Table
                  columns={columns}
                  data={getVentasFiltradas()}
                  pagination={true}
                  itemsPerPage={25}
                />
                
                {/* Botón para cargar más ventas */}
                {!busquedaActiva && todasLasVentas.length === limiteActual && todasLasVentas.length >= 200 && (
                  <div className="mt-6 text-center">
                    <Button
                      color="secondary"
                      onClick={cargarMasVentas}
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
          accion === 'completada' 
            ? 'Completar Venta' 
            : accion === 'cancelada' 
              ? 'Cancelar Venta' 
              : 'Devolver Venta'
        }
        message={
          ventaProcesando
            ? accion === 'completada'
              ? `¿Estás seguro de marcar la venta ${ventaProcesando.numero} como completada?`
              : accion === 'cancelada'
                ? `¿Estás seguro de cancelar la venta ${ventaProcesando.numero}? Esta acción devolverá los productos al inventario.`
                : `¿Estás seguro de marcar la venta ${ventaProcesando.numero} como devuelta? Esta acción devolverá los productos al inventario.`
            : ''
        }
        confirmText={
          accion === 'completada' 
            ? 'Completar' 
            : accion === 'cancelada' 
              ? 'Cancelar' 
              : 'Devolver'
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
              <li>• Las ventas pendientes se marcarán como completadas</li>
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
    </div>
  );
};

export default Ventas;