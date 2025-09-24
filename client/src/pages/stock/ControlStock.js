/**
 * Página de control de stock/inventario físico
 * 
 * Permite realizar conteos físicos de inventario, comparar con el sistema
 * y generar ajustes automáticos con reporte imprimible.
 * 
 * @module pages/stock/ControlStock
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';


// Servicios
import stockSucursalService from '../../services/stock-sucursal.service';
import controlStockService from '../../services/control-stock.service';
import categoriasService from '../../services/categorias.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaClipboardCheck, FaStore, FaPrint, FaSave, FaPlus,
  FaEdit, FaCheckCircle, FaExclamationTriangle, FaArrowLeft,
  FaFileExport, FaBarcode, FaHistory, FaFilter, FaEye, FaCheck, FaTimes
} from 'react-icons/fa';

const ReporteImpresion = (props) => {
  // Validar que las props necesarias existan
  const {
    sucursalNombre = 'Sucursal',
    fecha = new Date().toLocaleDateString(),
    hora = new Date().toLocaleTimeString(),
    usuarioNombre = 'Usuario',
    estadisticas = { totalProductos: 0, productosContados: 0, diferenciasEncontradas: 0, valorDiferencia: 0 },
    modoConteo = 'completo',
    controlActivo = null,
    filtroCategoria = null,
    categorias = [],
    productosFiltrados = []
  } = props;

  // Validar que productosFiltrados sea un array
  const productosValidos = Array.isArray(productosFiltrados) ? productosFiltrados : [];

  return (
    <div className="p-8 bg-white" style={{ width: '100%' }}>
      {/* Encabezado */}
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-bold">Control de Inventario</h1>
        <p className="text-lg mt-2">{sucursalNombre}</p>
        <p className="text-sm text-gray-600">
          Fecha: {fecha} {hora}
        </p>
        <p className="text-sm text-gray-600">
          Realizado por: {usuarioNombre}
        </p>
      </div>
      
      {/* Estadísticas */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="border p-3">
          <h3 className="font-semibold">Resumen del Control</h3>
          <p className="text-sm">Total de productos: {estadisticas.totalProductos || 0}</p>
          <p className="text-sm">Productos contados: {estadisticas.productosContados || 0}</p>
          <p className="text-sm">Diferencias encontradas: {estadisticas.diferenciasEncontradas || 0}</p>
          <p className="text-sm font-semibold">
            Valor de diferencia: ${(estadisticas.valorDiferencia || 0).toFixed(2)}
          </p>
        </div>
        <div className="border p-3">
          <h3 className="font-semibold">Información del Control</h3>
          <p className="text-sm">Tipo: {modoConteo === 'completo' ? 'Inventario Completo' : 'Inventario Parcial'}</p>
          <p className="text-sm">Estado: {controlActivo ? 'En proceso' : 'Nuevo'}</p>
          {filtroCategoria && (
            <p className="text-sm">Categoría: {categorias.find(c => c.id === filtroCategoria)?.nombre || 'N/A'}</p>
          )}
        </div>
      </div>
      
      {/* Tabla de productos */}
      {productosValidos.length > 0 ? (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left text-sm">Código</th>
              <th className="border p-2 text-left text-sm">Producto</th>
              <th className="border p-2 text-center text-sm">Stock Sistema</th>
              <th className="border p-2 text-center text-sm">Stock Físico</th>
              <th className="border p-2 text-center text-sm">Diferencia</th>
              <th className="border p-2 text-left text-sm">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {productosValidos.map((item, index) => (
              <tr key={item.producto_id || index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border p-2 text-sm">{item.producto?.codigo || 'N/A'}</td>
                <td className="border p-2 text-sm">{item.producto?.nombre || 'N/A'}</td>
                <td className="border p-2 text-center text-sm">{item.stock_sistema || 0}</td>
                <td className="border p-2 text-center text-sm">
                  {item.contado ? (item.stock_fisico || 0) : '-'}
                </td>
                <td className="border p-2 text-center text-sm">
                  {item.contado && item.diferencia !== null ? (
                    <span className={item.diferencia > 0 ? 'text-green-600' : item.diferencia < 0 ? 'text-red-600' : ''}>
                      {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                    </span>
                  ) : '-'}
                </td>
                <td className="border p-2 text-sm text-xs">{item.observaciones || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No hay productos para mostrar en el reporte</p>
        </div>
      )}
      
      {/* Pie de página */}
      <div className="mt-8 pt-4 border-t">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <p className="text-sm">Firma del Responsable</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <p className="text-sm">Firma del Supervisor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlStock = () => {
  const navigate = useNavigate();
  const { sucursalSeleccionada, currentUser } = useAuth();
  const esAdmin = currentUser?.rol === 'Administrador' || 
                 currentUser?.rol === 'admin' || 
                 currentUser?.rol === 'Admin' ||
                 currentUser?.rol === 'administrador';
  
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [productosConteo, setProductosConteo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [controlActivo, setControlActivo] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [modoConteo, setModoConteo] = useState('completo'); // 'completo', 'parcial', 'categoria'
  const [categorias, setCategorias] = useState([]);
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalProductos: 0,
    productosContados: 0,
    diferenciasEncontradas: 0,
    valorDiferencia: 0
  });
  
  // Configuración de impresión
  const handlePrint = () => {
    // Validar que haya datos para imprimir
    if (!productosFiltrados || productosFiltrados.length === 0) {
      toast.warning('No hay datos para imprimir. Asegúrate de tener productos en el control.');
      return;
    }

    const ventanaImpresion = window.open('', '_blank');
    
    const estilos = `
      @page { 
        size: A4; 
        margin: 15mm;
      }
      @media print {
        .no-print { display: none !important; }
        body { margin: 0; padding: 0; }
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        margin: 0;
        padding: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .encabezado {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
      }
      .titulo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .subtitulo {
        font-size: 16px;
        color: #666;
        margin-bottom: 5px;
      }
      .fecha {
        font-size: 14px;
        color: #888;
      }
      .estadisticas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      .estadistica {
        border: 1px solid #ddd;
        padding: 15px;
        background-color: #f9f9f9;
      }
      .estadistica h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #333;
      }
      .estadistica p {
        margin: 5px 0;
        font-size: 14px;
      }
      .diferencia-positiva { color: #28a745; }
      .diferencia-negativa { color: #dc3545; }
    `;
    
    const html = `
      <html>
        <head>
          <title>Control de Inventario - ${sucursalSeleccionada?.nombre}</title>
          <meta charset="utf-8">
          <style>${estilos}</style>
        </head>
        <body>
          <div class="encabezado">
            <div class="titulo">Control de Inventario</div>
            <div class="subtitulo">${sucursalSeleccionada?.nombre}</div>
            <div class="fecha">Fecha: ${fecha} ${hora}</div>
            <div class="fecha">Realizado por: ${usuarioNombre}</div>
          </div>
          
          <div class="estadisticas">
            <div class="estadistica">
              <h3>Resumen del Control</h3>
              <p>Total de productos: ${estadisticas.totalProductos || 0}</p>
              <p>Productos contados: ${estadisticas.productosContados || 0}</p>
              <p>Diferencias encontradas: ${estadisticas.diferenciasEncontradas || 0}</p>
              <p><strong>Valor de diferencia: $${(estadisticas.valorDiferencia || 0).toFixed(2)}</strong></p>
            </div>
            <div class="estadistica">
              <h3>Información del Control</h3>
              <p>Tipo: ${modoConteo === 'completo' ? 'Inventario Completo' : 'Inventario Parcial'}</p>
              <p>Estado: ${controlActivo ? 'En proceso' : 'Nuevo'}</p>
              ${filtroCategoria ? `<p>Categoría: ${categorias.find(c => c.id === filtroCategoria)?.nombre || 'N/A'}</p>` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock Sistema</th>
                <th>Stock Físico</th>
                <th>Diferencia</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${productosFiltrados.map(item => `
                <tr>
                  <td>${item.producto?.codigo || 'N/A'}</td>
                  <td>${item.producto?.nombre || 'N/A'}</td>
                  <td style="text-align: center;">${item.stock_sistema || 0}</td>
                  <td style="text-align: center;">${item.contado ? (item.stock_fisico || 0) : '-'}</td>
                  <td style="text-align: center;">
                    ${item.contado && item.diferencia !== null ? 
                      `<span class="${item.diferencia > 0 ? 'diferencia-positiva' : item.diferencia < 0 ? 'diferencia-negativa' : ''}">${item.diferencia > 0 ? '+' : ''}${item.diferencia}</span>` 
                      : '-'}
                  </td>
                  <td>${item.observaciones || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            <p>Total de productos: ${productosFiltrados.length}</p>
            <p>Generado el: ${fecha} a las ${hora}</p>
          </div>
        </body>
      </html>
    `;
    
    ventanaImpresion.document.write(html);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
      toast.success('Reporte de control enviado a la impresora');
    }, 500);
  };
  
  useEffect(() => {
    if (sucursalSeleccionada) {
      inicializarControl();
    }
  }, [sucursalSeleccionada]);

  // Monitorear cambios en controlActivo
  useEffect(() => {
    if (controlActivo) {
      console.log('🔄 [useEffect] controlActivo actualizado:', controlActivo);
      console.log('🔍 [useEffect] controlActivo.id:', controlActivo.id);
      console.log('🔍 [useEffect] controlActivo._id:', controlActivo._id);
      console.log('🔍 [useEffect] controlActivo.uid:', controlActivo.uid);
      console.log('🔍 [useEffect] controlActivo.control_id:', controlActivo.control_id);
      console.log('🔍 [useEffect] Keys del objeto:', Object.keys(controlActivo));
    }
  }, [controlActivo]);
  
  /**
   * Inicializa el control de stock
   */
  const inicializarControl = async () => {
    try {
      setLoading(true);
      
      // Verificar si hay un control activo
      const controlEnProgreso = await controlStockService.obtenerControlActivo(sucursalSeleccionada.id);
      
      if (controlEnProgreso) {
        setControlActivo(controlEnProgreso);
        await cargarProductosControl(controlEnProgreso.id);
      } else {
        await cargarProductosParaNuevoControl();
      }
      
      // Cargar categorías para filtros
      try {
        const categoriasData = await categoriasService.obtenerTodos();
        setCategorias(categoriasData);
      } catch (error) {
        console.warn('Error al cargar categorías:', error);
        setCategorias([]); // Continuar sin categorías si falla
      }
      
    } catch (error) {
      console.error('Error al inicializar control:', error);
      toast.error('Error al cargar datos del control');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Carga productos para nuevo control
   */
  const cargarProductosParaNuevoControl = async () => {
    const stockActual = await stockSucursalService.obtenerStockPorSucursal(sucursalSeleccionada.id);
    
    let productosFiltrados = stockActual;
    
    // Filtrar por modo de conteo
    if (modoConteo === 'categoria' && filtroCategoria) {
      productosFiltrados = stockActual.filter(item => 
        item.producto?.categoria_id === filtroCategoria
      );
    } else if (modoConteo === 'parcial') {
      // Para control parcial, mostrar solo productos con stock > 0
      productosFiltrados = stockActual.filter(item => item.cantidad > 0);
    }
    // Para 'completo' no se filtra nada
    
    const productosFormateados = productosFiltrados.map(item => ({
      producto_id: item.producto_id,
      producto: item.producto,
      stock_sistema: item.cantidad,
      stock_fisico: null,
      diferencia: null,
      contado: false,
      observaciones: ''
    }));
    
    setProductos(stockActual);
    setProductosConteo(productosFormateados);
    actualizarEstadisticas(productosFormateados);
  };
  
  /**
   * Carga productos de un control existente
   */
  const cargarProductosControl = async (controlId) => {
    const detalles = await controlStockService.obtenerDetallesControl(controlId);
    setProductosConteo(detalles);
    actualizarEstadisticas(detalles);
  };
  
  /**
   * Inicia un nuevo control
   */
  const iniciarNuevoControl = async () => {
    try {
      console.log('🔄 Iniciando nuevo control...');
      const nuevoControl = await controlStockService.crearControl({
        sucursal_id: sucursalSeleccionada.id,
        usuario_id: currentUser.id,
        tipo: modoConteo,
        categoria_id: modoConteo === 'categoria' ? filtroCategoria : null
      });
      
      console.log('✅ Control creado:', nuevoControl);
      console.log('🔍 [iniciarNuevoControl] nuevoControl.id:', nuevoControl.id);
      console.log('🔍 [iniciarNuevoControl] nuevoControl._id:', nuevoControl._id);
      console.log('🔍 [iniciarNuevoControl] nuevoControl.uid:', nuevoControl.uid);
      console.log('🔍 [iniciarNuevoControl] nuevoControl.control_id:', nuevoControl.control_id);
      console.log('🔍 [iniciarNuevoControl] Keys del objeto:', Object.keys(nuevoControl));
      
      setControlActivo(nuevoControl);
      
      toast.success('Control de inventario iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar control:', error);
      toast.error('Error al iniciar el control');
    }
  };
  
  /**
   * Actualiza el conteo de un producto
   */
  const actualizarConteo = (productoId, stockFisico) => {
    const stockFisicoNum = parseFloat(stockFisico) || 0;
    
    setProductosConteo(productos => 
      productos.map(p => {
        if (p.producto_id === productoId) {
          const diferencia = stockFisicoNum - p.stock_sistema;
          return {
            ...p,
            stock_fisico: stockFisicoNum,
            diferencia,
            contado: true
          };
        }
        return p;
      })
    );
    
    // Actualizar estadísticas
    actualizarEstadisticas();
  };
  
  /**
   * Actualiza las observaciones de un producto
   */
  const actualizarObservaciones = (productoId, observaciones) => {
    setProductosConteo(productos => 
      productos.map(p => 
        p.producto_id === productoId 
          ? { ...p, observaciones } 
          : p
      )
    );
  };
  
  /**
   * Actualiza las estadísticas del control
   */
  const actualizarEstadisticas = (productosData = productosConteo) => {
    const totalProductos = productosData.length;
    const productosContados = productosData.filter(p => p.contado).length;
    const diferenciasEncontradas = productosData.filter(p => p.diferencia !== 0 && p.diferencia !== null).length;
    
    const valorDiferencia = productosData.reduce((total, p) => {
      if (p.diferencia && p.producto?.precio_costo) {
        return total + (p.diferencia * p.producto.precio_costo);
      }
      return total;
    }, 0);
    
    setEstadisticas({
      totalProductos,
      productosContados,
      diferenciasEncontradas,
      valorDiferencia
    });
  };
  
  /**
   * Aplica los conteos como ajustes de stock
   */
  const aplicarAjustes = async () => {
    try {
      setGuardando(true);
      
      // Verificar que haya un control activo
      if (!controlActivo || !controlActivo.id) {
        toast.error('No hay un control de inventario activo. Debes iniciar un control primero.');
        setGuardando(false);
        return;
      }
      
      const ajustes = productosConteo
        .filter(p => p.contado && p.diferencia !== 0)
        .map(p => ({
          producto_id: p.producto_id,
          cantidad_ajuste: p.diferencia,
          motivo: `Control de inventario ${new Date().toLocaleDateString()}`,
          observaciones: p.observaciones
        }));
      
      if (ajustes.length === 0) {
        toast.warning('No hay diferencias para ajustar');
        return;
      }
      
                           // APLICAR AJUSTES INMEDIATAMENTE para AMBOS roles
       for (const ajuste of ajustes) {
         // Crear motivo detallado con información del usuario
         const motivoDetallado = `Control de inventario ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()} | Usuario: ${currentUser?.nombre || currentUser?.email} | Rol: ${currentUser?.rol} | Observación: ${ajuste.observaciones || 'Sin observaciones'}`;
         
         await stockSucursalService.ajustarStock(
           sucursalSeleccionada.id,
           ajuste.producto_id,
           ajuste.cantidad_ajuste,
           motivoDetallado
         );
       }
       
       // Crear registro de auditoría para AMBOS roles
       const registroAuditoria = {
         control_id: controlActivo.id,
         sucursal_id: sucursalSeleccionada.id,
         usuario_id: currentUser.id,
         usuario_nombre: currentUser?.nombre || currentUser?.email,
         usuario_rol: currentUser?.rol,
         fecha_ajuste: new Date().toISOString(),
         fecha_ajuste_formato: new Date().toLocaleString(),
         ajustes: ajustes,
         tipo_usuario: esAdmin ? 'Administrador' : 'Empleado',
         observaciones: `Ajuste de inventario realizado por ${currentUser?.nombre || currentUser?.email} (${currentUser?.rol}) el ${new Date().toLocaleString()}`
       };
       
       // Guardar registro de auditoría en Firestore
       try {
         await controlStockService.crearRegistroAuditoria(registroAuditoria);
         console.log('✅ Registro de auditoría creado:', registroAuditoria);
       } catch (error) {
         console.warn('⚠️ Error al crear registro de auditoría:', error);
         // Continuar aunque falle el registro de auditoría
       }
       
       // Finalizar control para AMBOS roles
       if (controlActivo) {
         await controlStockService.finalizarControl(controlActivo.id, {
           productos_conteo: productosConteo,
           ajustes_aplicados: true,
           registro_auditoria: registroAuditoria
         });
       }
       
       // Mensaje de éxito personalizado
       if (esAdmin) {
         toast.success(`Se aplicaron ${ajustes.length} ajustes de inventario como administrador`);
       } else {
         toast.success(`Se aplicaron ${ajustes.length} ajustes de inventario como empleado. Se generó registro de auditoría.`);
       }
       
       setShowConfirmDialog(false);
       
       // Refrescar datos del inventario para mostrar cambios (PARA AMBOS ROLES)
       await cargarProductosParaNuevoControl();
       
       // Recargar página después de aplicar
       setTimeout(() => {
         navigate('/stock', { state: { updated: true } });
       }, 1500);
       
       return;
      
      
    } catch (error) {
      console.error('Error al aplicar ajustes:', error);
      toast.error('Error al aplicar los ajustes');
    } finally {
      setGuardando(false);
    }
  };
  
  /**
   * Carga las solicitudes de ajuste pendientes
   */
  const cargarSolicitudes = async () => {
    try {
      setLoadingSolicitudes(true);
      const solicitudesPendientes = await controlStockService.obtenerSolicitudesPendientes();
      setSolicitudes(solicitudesPendientes);
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      toast.error('Error al cargar las solicitudes de ajuste');
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  /**
   * Filtra productos según búsqueda y categoría
   */
  const productosFiltrados = productosConteo.filter(item => {
    const coincideBusqueda = !searchTerm || 
      item.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.producto?.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const coincideCategoria = !filtroCategoria || 
      item.producto?.categoria_id === filtroCategoria;
    
    return coincideBusqueda && coincideCategoria;
  });
  
  const fecha = new Date().toLocaleDateString();
  const hora = new Date().toLocaleTimeString();
  const usuarioNombre = currentUser?.nombre || currentUser?.email;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Control de Inventario
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            <FaStore className="inline mr-1" />
            {sucursalSeleccionada.nombre}
          </p>
        </div>
        
                 <div className="flex space-x-2">
           <Button
             color="secondary"
             onClick={() => navigate('/stock')}
             icon={<FaArrowLeft />}
           >
             Volver
           </Button>
           
           <Button
             color="secondary"
             onClick={handlePrint}
             icon={<FaPrint />}
             disabled={productosConteo.length === 0}
           >
             Imprimir
           </Button>
           
           {/* Botón para ver solicitudes de ajuste (solo administradores) */}
           {esAdmin && (
             <Button
               color="info"
               onClick={() => {
                 cargarSolicitudes();
                 setShowSolicitudesModal(true);
               }}
               icon={<FaEye />}
             >
               Solicitudes de Ajuste
             </Button>
           )}
           
           <Button
             color="primary"
             onClick={() => navigate('/stock/control/historial')}
             icon={<FaHistory />}
           >
             Ver Historial
           </Button>
         </div>
      </div>
      
             {/* Información del control activo */}
       {controlActivo && (
         <Card className="bg-blue-50 border-blue-200 no-print">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-blue-800 font-medium">Control Activo</h3>
               <p className="text-sm text-blue-600">
                 Tipo: {controlActivo.tipo === 'completo' ? 'Inventario Completo' : 
                        controlActivo.tipo === 'parcial' ? 'Inventario Parcial' : 
                        controlActivo.tipo === 'categoria' ? 'Por Categoría' : controlActivo.tipo}
                 {controlActivo.categoria_id && (
                   <span> - Categoría: {categorias.find(c => c.id === controlActivo.categoria_id)?.nombre}</span>
                 )}
               </p>
               <p className="text-xs text-blue-500">
                 Iniciado: {new Date(controlActivo.fecha_creacion).toLocaleString()}
               </p>
             </div>
             <FaClipboardCheck className="text-3xl text-blue-300" />
           </div>
         </Card>
       )}
       
       {/* Estadísticas */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-800 font-medium">Total Productos</h3>
              <p className="text-2xl font-bold text-blue-900">
                {estadisticas.totalProductos}
              </p>
            </div>
            <FaClipboardCheck className="text-4xl text-blue-300" />
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-800 font-medium">Contados</h3>
              <p className="text-2xl font-bold text-green-900">
                {estadisticas.productosContados}
              </p>
              <p className="text-xs text-green-600">
                {((estadisticas.productosContados / estadisticas.totalProductos) * 100).toFixed(0)}% completado
              </p>
            </div>
            <FaCheckCircle className="text-4xl text-green-300" />
          </div>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-yellow-800 font-medium">Diferencias</h3>
              <p className="text-2xl font-bold text-yellow-900">
                {estadisticas.diferenciasEncontradas}
              </p>
            </div>
            <FaExclamationTriangle className="text-4xl text-yellow-300" />
          </div>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-purple-800 font-medium">Valor Diferencia</h3>
              <p className="text-2xl font-bold text-purple-900">
                ${estadisticas.valorDiferencia.toFixed(2)}
              </p>
            </div>
            <FaFileExport className="text-4xl text-purple-300" />
          </div>
        </Card>
      </div>
      
             {/* Controles y filtros */}
       <Card className="no-print">
         <div className="space-y-4">
           {/* Selector de modo de conteo */}
           <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex items-center space-x-4">
               <label className="text-sm font-medium text-gray-700">Tipo de Control:</label>
               <div className="flex space-x-2">
                 <label className="flex items-center">
                   <input
                     type="radio"
                     value="completo"
                     checked={modoConteo === 'completo'}
                     onChange={(e) => setModoConteo(e.target.value)}
                     className="mr-2"
                   />
                   <span className="text-sm">Completo</span>
                 </label>
                 <label className="flex items-center">
                   <input
                     type="radio"
                     value="parcial"
                     checked={modoConteo === 'parcial'}
                     onChange={(e) => setModoConteo(e.target.value)}
                     className="mr-2"
                   />
                   <span className="text-sm">Parcial</span>
                 </label>
                 <label className="flex items-center">
                   <input
                     type="radio"
                     value="categoria"
                     checked={modoConteo === 'categoria'}
                     onChange={(e) => setModoConteo(e.target.value)}
                     className="mr-2"
                   />
                   <span className="text-sm">Por Categoría</span>
                 </label>
               </div>
             </div>
             
             {/* Selector de categoría (solo para modo categoría) */}
             {modoConteo === 'categoria' && (
               <select
                 value={filtroCategoria}
                 onChange={(e) => setFiltroCategoria(e.target.value)}
                 className="px-3 py-2 border border-gray-300 rounded-md"
               >
                 <option value="">Seleccionar categoría</option>
                 {categorias.map(cat => (
                   <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                 ))}
               </select>
             )}
             
                           {/* Botón iniciar control */}
              {!controlActivo && (
                <Button
                  color="primary"
                  onClick={iniciarNuevoControl}
                  icon={<FaPlus />}
                  disabled={loading || guardando || (modoConteo === 'categoria' && !filtroCategoria)}
                >
                  Iniciar Control {modoConteo === 'categoria' ? 'de Categoría' : modoConteo === 'parcial' ? 'Parcial' : 'Completo'}
                </Button>
              )}
           </div>
           
           {/* Barra de búsqueda */}
           <div className="flex flex-col md:flex-row gap-4">
             <div className="flex-1">
               <SearchBar
                 placeholder="Buscar producto por nombre o código..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 onSearch={() => {}}
                 onClear={() => setSearchTerm('')}
               />
             </div>
             
             {/* Filtro de categoría para búsqueda */}
             <select
               value={filtroCategoria}
               onChange={(e) => setFiltroCategoria(e.target.value)}
               className="px-3 py-2 border border-gray-300 rounded-md"
             >
               <option value="">Todas las categorías</option>
               {categorias.map(cat => (
                 <option key={cat.id} value={cat.id}>{cat.nombre}</option>
               ))}
             </select>
           </div>
         </div>
       </Card>
      
      {/* Tabla de control */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Stock Sistema
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Stock Físico
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Diferencia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">
                      Observaciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productosFiltrados.map(item => (
                    <tr key={item.producto_id} className={item.contado ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3 text-sm">
                        {item.producto?.codigo}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.producto?.nombre}
                          </div>
                          {item.producto?.descripcion && (
                            <div className="text-sm text-gray-500">
                              {item.producto.descripcion}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium">
                          {item.stock_sistema}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                                                 <input
                           type="number"
                           value={item.stock_fisico ?? ''}
                           onChange={e => actualizarConteo(item.producto_id, e.target.value)}
                           className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md no-print"
                           min="0"
                           step="0.001"
                           placeholder="-"
                         />
                        <span className="hidden print:inline">
                          {item.stock_fisico ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.contado && item.diferencia !== null ? (
                          <span className={`font-medium ${
                            item.diferencia > 0 
                              ? 'text-green-600' 
                              : item.diferencia < 0 
                                ? 'text-red-600' 
                                : 'text-gray-600'
                          }`}>
                            {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 no-print">
                        <input
                          type="text"
                          value={item.observaciones}
                          onChange={(e) => actualizarObservaciones(item.producto_id, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          placeholder="Observaciones..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
                                     {/* Acciones del control - solo cuando hay productos contados */}
            {estadisticas.productosContados > 0 && (
              <div className="mt-6 flex justify-end space-x-3 no-print">
                <Button
                  color="secondary"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de cancelar el control? Se perderán todos los conteos.')) {
                      setProductosConteo([]);
                      setControlActivo(null);
                      inicializarControl();
                    }
                  }}
                >
                  Cancelar Control
                </Button>
                
                                                   {esAdmin && (
                    <Button
                      color="primary"
                      onClick={() => {
                        console.log('🔍 [ADMIN] Estado controlActivo al hacer clic:', controlActivo);
                        console.log('🔍 [ADMIN] Tipo de controlActivo:', typeof controlActivo);
                        console.log('🔍 [ADMIN] controlActivo.id:', controlActivo?.id);
                        // Verificar que haya un control activo antes de abrir el modal
                        if (!controlActivo || !controlActivo.id) {
                          console.log('❌ [ADMIN] No hay control activo');
                          toast.error('No hay un control de inventario activo. Debes iniciar un control primero.');
                          return;
                        }
                        console.log('✅ [ADMIN] Control activo encontrado, abriendo modal');
                        setShowConfirmDialog(true);
                      }}
                      icon={<FaSave />}
                      disabled={guardando}
                    >
                      Aplicar Ajustes ({estadisticas.diferenciasEncontradas})
                    </Button>
                  )}
                 
                                   {!esAdmin && (
                    <Button
                      color="warning"
                      onClick={() => {
                        console.log('🔍 [NO ADMIN] Estado controlActivo al hacer clic:', controlActivo);
                        console.log('🔍 [NO ADMIN] Tipo de controlActivo:', typeof controlActivo);
                        console.log('🔍 [NO ADMIN] controlActivo.id:', controlActivo?.id);
                        // Verificar que haya un control activo antes de abrir el modal
                        if (!controlActivo || !controlActivo.id) {
                          console.log('❌ [NO ADMIN] No hay control activo');
                          toast.error('No hay un control de inventario activo. Debes iniciar un control primero.');
                          return;
                        }
                        console.log('✅ [NO ADMIN] Control activo encontrado, abriendo modal');
                        setShowConfirmDialog(true);
                      }}
                      icon={<FaSave />}
                      disabled={guardando}
                    >
                      Solicitar Ajustes ({estadisticas.diferenciasEncontradas})
                    </Button>
                  )}
               </div>
             )}
          </>
        )}
      </Card>
      

      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={esAdmin ? "Aplicar Ajustes de Inventario" : "Solicitar Ajustes de Inventario"}
        message={
          <div>
            {esAdmin ? (
              <>
                <p>¿Estás seguro de aplicar los ajustes de inventario?</p>
                <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Se aplicarán <strong>{estadisticas.diferenciasEncontradas}</strong> ajustes
                    con un valor total de <strong>${estadisticas.valorDiferencia.toFixed(2)}</strong>
                  </p>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Esta acción no se puede deshacer.
                </p>
              </>
            ) : (
              <>
                <p>¿Estás seguro de solicitar la autorización para los ajustes de inventario?</p>
                <div className="mt-3 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    Se crearán <strong>{estadisticas.diferenciasEncontradas}</strong> solicitudes de ajuste
                    con un valor total de <strong>${estadisticas.valorDiferencia.toFixed(2)}</strong>
                  </p>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Los ajustes serán aplicados una vez que el administrador los autorice.
                </p>
              </>
            )}
          </div>
        }
        confirmText={esAdmin ? "Aplicar Ajustes" : "Solicitar Autorización"}
        cancelText="Cancelar"
        onConfirm={aplicarAjustes}
        onCancel={() => setShowConfirmDialog(false)}
        confirmColor={esAdmin ? "primary" : "warning"}
        loading={guardando}
      />

      {/* Modal de Solicitudes de Ajuste */}
      {showSolicitudesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Solicitudes de Ajuste de Inventario
              </h2>
              <button
                onClick={() => setShowSolicitudesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingSolicitudes ? (
                <div className="flex justify-center py-10">
                  <Spinner size="lg" />
                </div>
              ) : solicitudes.length === 0 ? (
                <div className="text-center py-10">
                  <FaCheckCircle className="mx-auto text-green-500 text-4xl mb-4" />
                  <p className="text-gray-600">No hay solicitudes de ajuste pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solicitudes.map((solicitud, index) => (
                    <div key={solicitud.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Solicitud #{solicitud.id || index + 1}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Fecha: {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Usuario: {solicitud.usuario_id}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Pendiente
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">
                          <strong>Observaciones:</strong> {solicitud.observaciones || 'Sin observaciones'}
                        </p>
                        
                        {solicitud.ajustes && solicitud.ajustes.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Productos a ajustar:</p>
                            <div className="bg-gray-50 rounded p-3">
                              {solicitud.ajustes.map((ajuste, idx) => (
                                <div key={idx} className="text-sm text-gray-600">
                                  • Producto ID: {ajuste.producto_id} - Cantidad: {ajuste.cantidad_ajuste}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          color="success"
                          size="sm"
                          onClick={async () => {
                            try {
                              await controlStockService.autorizarSolicitud(solicitud.id);
                              toast.success('Solicitud autorizada correctamente');
                              
                              // Refrescar datos del inventario después de autorizar
                              if (controlActivo) {
                                await cargarProductosParaNuevoControl();
                              }
                              
                              cargarSolicitudes();
                            } catch (error) {
                              toast.error('Error al autorizar la solicitud');
                            }
                          }}
                        >
                          <FaCheck className="mr-1" />
                          Autorizar
                        </Button>
                        
                        <Button
                          color="danger"
                          size="sm"
                          onClick={async () => {
                            if (window.confirm('¿Estás seguro de rechazar esta solicitud?')) {
                              try {
                                await controlStockService.rechazarSolicitud(solicitud.id, 'Rechazada por administrador');
                                toast.success('Solicitud rechazada correctamente');
                                cargarSolicitudes();
                              } catch (error) {
                                toast.error('Error al rechazar la solicitud');
                              }
                            }
                          }}
                        >
                          <FaTimes className="mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlStock;