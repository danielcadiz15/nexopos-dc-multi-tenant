// src/pages/reportes/ReporteVentas.js - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Servicios
import reportesService from '../../services/reportes.service';

// Contexto
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import GraficoVentasPorPeriodo from '../../components/modules/reportes/GraficoVentasPorPeriodo';
import GraficoVentasPorMetodoPago from '../../components/modules/reportes/GraficoVentasPorMetodoPago';

// Iconos
import { 
  FaChartBar, FaChartLine, FaShoppingBag, FaCalendarAlt, 
  FaFilter, FaDownload, FaSearch, FaUser, FaMoneyBillWave, 
  FaExclamationTriangle, FaCreditCard, FaPercent, FaTag, FaBoxOpen,
  FaArrowUp, FaArrowDown, FaEquals
} from 'react-icons/fa';

/**
 * Componente de página para reportes de ventas - CORREGIDO
 */
const ReporteVentas = () => {
  const { sucursalSeleccionada } = useAuth();
  
  // ✅ CORRECCIÓN 1: Estados para fechas con valores por defecto válidos
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(1); // Primer día del mes
    return fecha.toISOString().split('T')[0];
  });
  
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Estados para datos del reporte
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [ventasPorPeriodo, setVentasPorPeriodo] = useState([]);
  const [ventasPorCategoria, setVentasPorCategoria] = useState([]);
  const [ventasPorMetodoPago, setVentasPorMetodoPago] = useState([]);
  const [productosDestacados, setProductosDestacados] = useState([]);
  const [clientesDestacados, setClientesDestacados] = useState([]);
  
  // Estados para filtros
  const [agrupacion, setAgrupacion] = useState('dia');
  const [tipoGrafico, setTipoGrafico] = useState('area');
  
  // ✅ CORRECCIÓN 2: Estado para datos históricos (comparación)
  const [resumenAnterior, setResumenAnterior] = useState(null);
  
  /**
   * ✅ CORRECCIÓN 3: Efecto para cargar datos automáticamente
   */
  useEffect(() => {
    // Cargar datos inmediatamente al montar el componente
    cargarDatosReporte();
  }, [sucursalSeleccionada]);
  
  /**
   * ✅ CORRECCIÓN 4: Función principal de carga con manejo de errores robusto
   */
  const cargarDatosReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error('Por favor selecciona un rango de fechas válido');
      return;
    }
    
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }
    
    try {
      setLoading(true);
      console.log('📊 Cargando reporte de ventas...', { fechaInicio, fechaFin, agrupacion });
      
      // ✅ CORRECCIÓN 5: Parámetros correctamente estructurados
      const params = {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        agrupacion: agrupacion
      };
      
      // Agregar sucursal si está seleccionada
      if (sucursalSeleccionada?.id) {
        params.sucursal_id = sucursalSeleccionada.id;
      }
      
      console.log('📊 Enviando parámetros:', params);
      
      // ✅ CORRECCIÓN 6: Llamada al servicio con parámetros correctos
      const data = await reportesService.obtenerReporteVentas(params);
      
      console.log('📊 Datos recibidos:', data);
      
      // ✅ CORRECCIÓN 7: Validación de datos recibidos
      if (!data) {
        throw new Error('No se recibieron datos del servidor');
      }
      
      // Actualizar estados con datos validados
      setResumen(data.resumen || {});
      setVentasPorPeriodo(Array.isArray(data.ventasPorPeriodo) ? data.ventasPorPeriodo : []);
      setVentasPorCategoria(Array.isArray(data.ventasPorCategoria) ? data.ventasPorCategoria : []);
      setVentasPorMetodoPago(Array.isArray(data.ventasPorMetodoPago) ? data.ventasPorMetodoPago : []);
      setProductosDestacados(Array.isArray(data.productosDestacados) ? data.productosDestacados : []);
      setClientesDestacados(Array.isArray(data.clientesDestacados) ? data.clientesDestacados : []);
      
      // ✅ CORRECCIÓN 8: Cargar datos del período anterior para comparación
      await cargarDatosComparacion(params);
      
      console.log('✅ Reporte cargado exitosamente');
      toast.success('Reporte actualizado correctamente');
      
    } catch (error) {
      console.error('❌ Error al cargar reporte de ventas:', error);
      toast.error(`Error al cargar el reporte: ${error.message}`);
      
      // ✅ CORRECCIÓN 9: Limpiar estados en caso de error
      setResumen(null);
      setVentasPorPeriodo([]);
      setVentasPorCategoria([]);
      setVentasPorMetodoPago([]);
      setProductosDestacados([]);
      setClientesDestacados([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * ✅ NUEVO: Cargar datos del período anterior para comparación
   */
  const cargarDatosComparacion = async (params) => {
    try {
      // Calcular período anterior
      const inicio = new Date(params.fechaInicio);
      const fin = new Date(params.fechaFin);
      const diasDiferencia = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
      
      const inicioAnterior = new Date(inicio);
      inicioAnterior.setDate(inicioAnterior.getDate() - diasDiferencia - 1);
      
      const finAnterior = new Date(inicio);
      finAnterior.setDate(finAnterior.getDate() - 1);
      
      const paramsAnterior = {
        ...params,
        fechaInicio: inicioAnterior.toISOString().split('T')[0],
        fechaFin: finAnterior.toISOString().split('T')[0]
      };
      
      const dataAnterior = await reportesService.obtenerReporteVentas(paramsAnterior);
      setResumenAnterior(dataAnterior?.resumen || {});
      
    } catch (error) {
      console.warn('⚠️ Error cargando datos comparativos:', error);
      setResumenAnterior(null);
    }
  };
  
  /**
   * ✅ CORRECCIÓN 10: Manejo de cambio de fechas con validación
   */
  const handleFechaChange = (tipo, valor) => {
    if (tipo === 'fechaInicio') {
      setFechaInicio(valor);
      // Si la fecha de inicio es mayor a la de fin, ajustar la de fin
      if (valor > fechaFin) {
        setFechaFin(valor);
      }
    } else {
      setFechaFin(valor);
      // Si la fecha de fin es menor a la de inicio, ajustar la de inicio
      if (valor < fechaInicio) {
        setFechaInicio(valor);
      }
    }
  };
  
  /**
   * ✅ CORRECCIÓN 11: Aplicar filtros predefinidos
   */
  const aplicarPeriodoPredefinido = (periodo) => {
    const hoy = new Date();
    let inicio = new Date(hoy);
    let fin = new Date(hoy);
    
    switch (periodo) {
      case 'hoy':
        inicio = fin = hoy;
        break;
      case 'ayer':
        inicio.setDate(hoy.getDate() - 1);
        fin.setDate(hoy.getDate() - 1);
        break;
      case 'semana':
        inicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'trimestre':
        inicio.setMonth(hoy.getMonth() - 3);
        break;
      case 'anio':
        inicio.setFullYear(hoy.getFullYear() - 1);
        break;
      default:
        return;
    }
    
    setFechaInicio(inicio.toISOString().split('T')[0]);
    setFechaFin(fin.toISOString().split('T')[0]);
    
    // Auto-actualizar después de cambiar fechas
    setTimeout(() => {
      cargarDatosReporte();
    }, 100);
  };
  
  /**
   * ✅ CORRECCIÓN 12: Descarga de reporte mejorada
   */
  const descargarReporte = async () => {
    try {
      const params = {
        fechaInicio,
        fechaFin,
        agrupacion
      };
      
      if (sucursalSeleccionada?.id) {
        params.sucursal_id = sucursalSeleccionada.id;
      }
      
      await reportesService.descargarReporteVentas(params);
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('❌ Error al descargar reporte:', error);
      toast.error('Error al descargar el reporte');
    }
  };
  
  /**
   * ✅ CORRECCIÓN 13: Función para formatear moneda mejorada
   */
  const formatoMoneda = (valor) => {
    if (typeof valor !== 'number' || isNaN(valor)) return '$0.00';
    return '$' + valor.toLocaleString('es-AR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };
  
  /**
   * ✅ NUEVO: Calcular porcentaje de cambio y mostrar indicador
   */
  const calcularCambioYMostrar = (actual, anterior) => {
    if (!anterior || anterior === 0) {
      return <span className="text-gray-500 text-xs">Sin datos anteriores</span>;
    }
    
    const cambio = ((actual - anterior) / anterior) * 100;
    const esPositivo = cambio >= 0;
    const esNeutral = Math.abs(cambio) < 0.1;
    
    if (esNeutral) {
      return (
        <div className="text-gray-500 text-xs flex items-center">
          <FaEquals className="mr-1" />
          Sin cambios
        </div>
      );
    }
    
    return (
      <div className={`text-xs flex items-center ${
        esPositivo ? 'text-green-600' : 'text-red-600'
      }`}>
        {esPositivo ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
        {Math.abs(cambio).toFixed(1)}% vs período anterior
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📊 Reporte de Ventas</h1>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={cargarDatosReporte}
            icon={<FaSearch />}
            loading={loading}
          >
            Actualizar
          </Button>
          
          <Button
            color="success"
            onClick={descargarReporte}
            icon={<FaDownload />}
            disabled={loading || !resumen}
          >
            Descargar CSV
          </Button>
        </div>
      </div>
      
      {/* ✅ CORRECCIÓN 14: Filtros mejorados con validación */}
      <Card title="🔍 Filtros de Búsqueda" icon={<FaFilter />}>
        <div className="space-y-4">
          {/* Filtros de fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => handleFechaChange('fechaInicio', e.target.value)}
                  className="nexo-field pl-10 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => handleFechaChange('fechaFin', e.target.value)}
                  className="nexo-field pl-10 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agrupar por
              </label>
              <select
                value={agrupacion}
                onChange={(e) => setAgrupacion(e.target.value)}
                className="nexo-field sm:text-sm"
              >
                <option value="dia">Día</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="año">Año</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Gráfico
              </label>
              <select
                value={tipoGrafico}
                onChange={(e) => setTipoGrafico(e.target.value)}
                className="nexo-field sm:text-sm"
              >
                <option value="area">Área</option>
                <option value="linea">Línea</option>
                <option value="barra">Barra</option>
              </select>
            </div>
          </div>
          
          {/* Períodos predefinidos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Períodos Comunes
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'hoy', label: 'Hoy' },
                { key: 'ayer', label: 'Ayer' },
                { key: 'semana', label: 'Última Semana' },
                { key: 'mes', label: 'Último Mes' },
                { key: 'trimestre', label: 'Último Trimestre' },
                { key: 'anio', label: 'Último Año' }
              ].map(periodo => (
                <Button
                  key={periodo.key}
                  color="secondary"
                  size="sm"
                  onClick={() => aplicarPeriodoPredefinido(periodo.key)}
                  disabled={loading}
                >
                  {periodo.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Botón aplicar filtros */}
          <div className="flex justify-end">
            <Button
              color="primary"
              onClick={cargarDatosReporte}
              icon={<FaSearch />}
              loading={loading}
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </Card>
      
      {loading ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Cargando reporte de ventas...</p>
          </div>
        </Card>
      ) : !resumen ? (
        <Card>
          <div className="text-center py-10">
            <FaExclamationTriangle className="mx-auto text-4xl text-yellow-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              No hay datos disponibles
            </h3>
            <p className="text-gray-500 mb-4">
              Selecciona un período y haz clic en "Aplicar Filtros"
            </p>
            <Button
              color="primary"
              onClick={cargarDatosReporte}
              icon={<FaSearch />}
            >
              Cargar Datos
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* ✅ CORRECCIÓN 15: Tarjetas de resumen con comparaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Total Ventas</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {formatoMoneda(resumen.totalVentas || 0)}
                </div>
                {calcularCambioYMostrar(
                  resumen.totalVentas || 0,
                  resumenAnterior?.totalVentas || 0
                )}
              </div>
            </Card>
            
            <Card className="bg-white">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Cantidad de Ventas</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {resumen.cantidadVentas || 0}
                </div>
                {calcularCambioYMostrar(
                  resumen.cantidadVentas || 0,
                  resumenAnterior?.cantidadVentas || 0
                )}
              </div>
            </Card>
            
            <Card className="bg-white">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Ticket Promedio</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {formatoMoneda(resumen.ticketPromedio || 0)}
                </div>
                {calcularCambioYMostrar(
                  resumen.ticketPromedio || 0,
                  resumenAnterior?.ticketPromedio || 0
                )}
              </div>
            </Card>
            
            <Card className="bg-white">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Ganancia Total</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatoMoneda(resumen.ganancia || 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Margen: {(resumen.margenPromedio || 0).toFixed(1)}%
                </div>
                {calcularCambioYMostrar(
                  resumen.ganancia || 0,
                  resumenAnterior?.ganancia || 0
                )}
              </div>
            </Card>
          </div>
          
          {/* ✅ CORRECCIÓN 16: Gráfico principal con datos validados */}
          <Card
            title={`Ventas por ${agrupacion.charAt(0).toUpperCase() + agrupacion.slice(1)}`}
            icon={<FaChartBar />}
          >
            {ventasPorPeriodo.length === 0 ? (
              <div className="text-center py-8">
                <FaChartLine className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  Sin datos para el período seleccionado
                </h3>
                <p className="text-gray-500">
                  Prueba con un rango de fechas diferente
                </p>
              </div>
            ) : (
              <div className="h-80">
                <GraficoVentasPorPeriodo
                  datos={ventasPorPeriodo}
                  tipo={tipoGrafico}
                />
              </div>
            )}
          </Card>
          
          {/* Distribución por categorías y métodos de pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ventas por categoría */}
            <Card
              title="Ventas por Categoría"
              icon={<FaTag />}
            >
              {ventasPorCategoria.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No hay datos por categoría
                </div>
              ) : (
                <div className="space-y-4">
                  {ventasPorCategoria.slice(0, 5).map((categoria, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{categoria.nombre}</div>
                        <div className="text-indigo-600 font-medium">
                          {formatoMoneda(categoria.total)}
                        </div>
                      </div>
                      <div className="mt-2 relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                          <div 
                            style={{ width: `${Math.min(categoria.porcentaje, 100)}%` }} 
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                          <span>{categoria.cantidad} unidades</span>
                          <span>{categoria.porcentaje.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            
            {/* Ventas por método de pago */}
            <Card
              title="Métodos de Pago"
              icon={<FaCreditCard />}
            >
              {ventasPorMetodoPago.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No hay datos de métodos de pago
                </div>
              ) : (
                <>
                  <div className="h-60 mb-4">
                    <GraficoVentasPorMetodoPago datos={ventasPorMetodoPago} />
                  </div>
                  
                  <div className="space-y-2">
                    {ventasPorMetodoPago.map((metodo, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="font-medium flex items-center">
                            {metodo.metodo_pago === 'efectivo' && <FaMoneyBillWave className="mr-2 text-green-500" />}
                            {metodo.metodo_pago === 'tarjeta' && <FaCreditCard className="mr-2 text-blue-500" />}
                            {metodo.metodo_pago === 'transferencia' && <FaMoneyBillWave className="mr-2 text-indigo-500" />}
                            {(metodo.metodo_pago || 'efectivo').charAt(0).toUpperCase() + (metodo.metodo_pago || 'efectivo').slice(1)}
                          </div>
                          <div className="text-gray-700">
                            {formatoMoneda(metodo.total)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                          <span>{metodo.cantidad} ventas</span>
                          <span>{metodo.porcentaje.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
          
          {/* Productos y clientes destacados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Productos más vendidos */}
            <Card
              title="Productos Más Vendidos"
              icon={<FaBoxOpen />}
            >
              {productosDestacados.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No hay productos vendidos en el período
                </div>
              ) : (
                <div className="space-y-3">
                  {productosDestacados.slice(0, 8).map((producto, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{producto.nombre}</div>
                          <div className="text-xs text-gray-500">
                            {producto.codigo} | {producto.cantidad} unidades
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-indigo-600">
                            {formatoMoneda(producto.total)}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{index + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            
            {/* Clientes destacados */}
            <Card
              title="Mejores Clientes"
              icon={<FaUser />}
            >
              {clientesDestacados.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No hay datos de clientes en el período
                </div>
              ) : (
                <div className="space-y-3">
                  {clientesDestacados.slice(0, 8).map((cliente, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {cliente.nombre || 'Cliente General'}
                          </div>
                          {cliente.email && (
                            <div className="text-xs text-gray-500">
                              {cliente.email}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-indigo-600">
                            {formatoMoneda(cliente.total)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cliente.cantidad} compras
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ReporteVentas;