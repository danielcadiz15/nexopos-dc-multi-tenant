// src/pages/productos/GestionPrecios.js - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaPercent, FaDollarSign, FaSearch, 
  FaEdit, FaHistory, FaFileExport, FaFileImport,
  FaExclamationTriangle, FaTags, FaPrint, FaSyncAlt
} from 'react-icons/fa';

// Servicios
import productosService from '../../services/productos.service';
import categoriasService from '../../services/categorias.service';
import listasPreciosService from '../../services/listas-precios.service';
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import ListasPreciosModal from '../../components/modules/productos/ListasPreciosModal';
import ListaPreciosImprimir from '../../components/modules/productos/ListaPreciosImprimir';

// Utilidades
import { formatCurrency } from '../../utils/format';

const GestionPrecios = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Estados
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  
  // Modal de edición individual
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  // Vista de impresión
  const [mostrarVistaImpresion, setMostrarVistaImpresion] = useState(false);
  
  // Actualización masiva
  const [mostrarActualizacionMasiva, setMostrarActualizacionMasiva] = useState(false);
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);
  const [configuracionMasiva, setConfiguracionMasiva] = useState({
    tipo_actualizacion: 'porcentaje',
    valor: 0,
    lista_precio: 'todas',
    categoria_id: '',
    motivo: '',
    base_calculo: 'precio_venta',
    tipo_redondeo: 'sin_redondeo'
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);
  
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar productos y categorías en paralelo
      const [productosData, categoriasData] = await Promise.all([
        productosService.obtenerTodos(),
        categoriasService.obtenerTodos()
      ]);
      
      // Asegurar que las listas de precios existan
      const productosConListas = productosData.map(producto => ({
        ...producto,
        listas_precios: producto.listas_precios || {
          mayorista: producto.precio_venta || 0,
          interior: producto.precio_venta || 0,
          posadas: producto.precio_venta || 0
        }
      }));
      
      setProductos(productosConListas);
      setCategorias(categoriasData);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const coincideTermino = !searchTerm || 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const coincideCategoria = !categoriaSeleccionada || 
      producto.categoria_id === categoriaSeleccionada;
    
    return coincideTermino && coincideCategoria;
  });
  
  // Calcular estadísticas
  const calcularEstadisticas = () => {
    const stats = {
      totalProductos: productos.length,
      conListasConfiguradas: productos.filter(p => p.listas_precios && 
        (p.listas_precios.mayorista !== p.precio_venta || 
         p.listas_precios.interior !== p.precio_venta || 
         p.listas_precios.posadas !== p.precio_venta)
      ).length,
      sinPrecioCosto: productos.filter(p => !p.precio_costo || p.precio_costo === 0).length,
      margenBajo: productos.filter(p => {
        const margen = p.precio_costo > 0 
          ? ((p.precio_venta - p.precio_costo) / p.precio_costo * 100)
          : 0;
        return margen < 20 && margen >= 0;
      }).length
    };
    
    return stats;
  };
  
  const stats = calcularEstadisticas();
  
  // Abrir modal de edición
  const abrirModalEdicion = (producto) => {
    setProductoSeleccionado(producto);
    setModalAbierto(true);
  };
  
  // Actualizar producto después de edición
  const handleProductoActualizado = async (productoActualizado) => {
    console.log('Actualizando producto en la lista:', productoActualizado);
    
    // Actualizar el estado local inmediatamente
    setProductos(prevProductos => 
      prevProductos.map(p => {
        if (p.id === productoActualizado.id) {
          return {
            ...p,
            precio_costo: productoActualizado.precio_costo,
            precio_venta: productoActualizado.precio_venta,
            listas_precios: productoActualizado.listas_precios || {
              mayorista: productoActualizado.precio_venta || 0,
              interior: productoActualizado.precio_venta || 0,
              posadas: productoActualizado.precio_venta || 0
            }
          };
        }
        return p;
      })
    );
    
    // Opcionalmente, recargar los datos del servidor para asegurar sincronización
    setTimeout(() => {
      cargarDatos();
    }, 1000);
  };
  
  // Ejecutar actualización masiva
  const ejecutarActualizacionMasiva = async () => {
    if (configuracionMasiva.valor === 0) {
      toast.warning('El valor de actualización no puede ser 0');
      return;
    }
    
    if (!configuracionMasiva.motivo.trim()) {
      toast.warning('Por favor indica el motivo de la actualización');
      return;
    }
    
    try {
      setProcesandoMasivo(true);
      
      const resultado = await listasPreciosService.actualizacionMasiva({
        ...configuracionMasiva,
        usuario_id: currentUser?.uid
      });
      
      toast.success(resultado.message || 'Actualización masiva completada');
      
      // Recargar productos
      await cargarDatos();
      
      // Cerrar panel
      setMostrarActualizacionMasiva(false);
      
      // Resetear configuración
      setConfiguracionMasiva({
        tipo_actualizacion: 'porcentaje',
        valor: 0,
        lista_precio: 'todas',
        categoria_id: '',
        motivo: '',
        base_calculo: 'precio_venta',
        tipo_redondeo: 'sin_redondeo'
      });
      
    } catch (error) {
      console.error('Error en actualización masiva:', error);
      toast.error('Error al ejecutar actualización masiva');
    } finally {
      setProcesandoMasivo(false);
    }
  };
  
  // Exportar precios a Excel
  const exportarPrecios = () => {
    try {
      // Preparar datos para CSV
      const headers = [
        'Código',
        'Nombre',
        'Categoría',
        'Costo',
        'Precio Mayorista',
        'Precio Interior',
        'Precio Posadas',
        'Margen Mayorista %',
        'Margen Interior %',
        'Margen Posadas %'
      ];
      
      const data = productosFiltrados.map(p => {
        const listas = p.listas_precios || {};
        const costo = p.precio_costo || 0;
        const categoria = categorias.find(c => c.id === p.categoria_id);
        
        return [
          p.codigo || '',
          p.nombre || '',
          categoria?.nombre || '',
          costo.toFixed(2),
          (listas.mayorista || p.precio_venta || 0).toFixed(2),
          (listas.interior || p.precio_venta || 0).toFixed(2),
          (listas.posadas || p.precio_venta || 0).toFixed(2),
          costo > 0 ? ((((listas.mayorista || p.precio_venta) - costo) / costo) * 100).toFixed(2) : '0',
          costo > 0 ? ((((listas.interior || p.precio_venta) - costo) / costo) * 100).toFixed(2) : '0',
          costo > 0 ? ((((listas.posadas || p.precio_venta) - costo) / costo) * 100).toFixed(2) : '0'
        ];
      });
      
      // Crear CSV con BOM para Excel
      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(','),
        ...data.map(row => row.join(','))
      ].join('\n');
      
      // Descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `listas_precios_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Precios exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar precios');
    }
  };
  
  // Columnas de la tabla
  const columns = [
    {
      header: 'Producto',
      accessor: 'nombre',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.nombre}</div>
          <div className="text-sm text-gray-500">{row.codigo}</div>
        </div>
      )
    },
    {
      header: 'Costo',
      accessor: 'precio_costo',
      cell: (row) => (
        <span className="font-medium">
          {formatCurrency(row.precio_costo || 0)}
        </span>
      )
    },
    {
      header: 'Mayorista',
      accessor: 'precio_mayorista',
      cell: (row) => {
        const precio = row.listas_precios?.mayorista || row.precio_venta || 0;
        const margen = row.precio_costo > 0 
          ? ((precio - row.precio_costo) / row.precio_costo * 100).toFixed(1)
          : 0;
        
        return (
          <div>
            <div className="font-medium">{formatCurrency(precio)}</div>
            <div className={`text-xs ${margen < 20 ? 'text-red-500' : 'text-gray-500'}`}>
              {margen}%
            </div>
          </div>
        );
      }
    },
    {
      header: 'Interior',
      accessor: 'precio_interior',
      cell: (row) => {
        const precio = row.listas_precios?.interior || row.precio_venta || 0;
        const margen = row.precio_costo > 0 
          ? ((precio - row.precio_costo) / row.precio_costo * 100).toFixed(1)
          : 0;
        
        return (
          <div>
            <div className="font-medium">{formatCurrency(precio)}</div>
            <div className={`text-xs ${margen < 20 ? 'text-red-500' : 'text-gray-500'}`}>
              {margen}%
            </div>
          </div>
        );
      }
    },
    {
      header: 'Posadas',
      accessor: 'precio_posadas',
      cell: (row) => {
        const precio = row.listas_precios?.posadas || row.precio_venta || 0;
        const margen = row.precio_costo > 0 
          ? ((precio - row.precio_costo) / row.precio_costo * 100).toFixed(1)
          : 0;
        
        return (
          <div>
            <div className="font-medium">{formatCurrency(precio)}</div>
            <div className={`text-xs ${margen < 20 ? 'text-red-500' : 'text-gray-500'}`}>
              {margen}%
            </div>
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      accessor: 'acciones',
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => abrirModalEdicion(row)}
            className="text-blue-600 hover:text-blue-800"
            title="Editar precios"
          >
            <FaEdit />
          </button>
        </div>
      )
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Listas de Precios</h1>
          <p className="text-gray-600 mt-1">Administra los precios por lista para todos los productos</p>
        </div>
        
        <Button
          color="secondary"
          onClick={() => navigate('/productos')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalProductos}
            </div>
            <div className="text-sm text-gray-600">Total Productos</div>
          </div>
        </Card>
        
        <Card className="bg-green-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.conListasConfiguradas}
            </div>
            <div className="text-sm text-gray-600">Con Listas Configuradas</div>
          </div>
        </Card>
        
        <Card className="bg-yellow-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.sinPrecioCosto}
            </div>
            <div className="text-sm text-gray-600">Sin Precio de Costo</div>
          </div>
        </Card>
        
        <Card className="bg-red-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.margenBajo}
            </div>
            <div className="text-sm text-gray-600">Margen Bajo (&lt;20%)</div>
          </div>
        </Card>
      </div>
      
      {/* Panel de actualización masiva */}
      {mostrarActualizacionMasiva && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center">
                <FaExclamationTriangle className="mr-2 text-amber-600" />
                Actualización Masiva de Precios
              </h3>
              <button
                onClick={() => setMostrarActualizacionMasiva(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Actualización
                </label>
                <select
                  value={configuracionMasiva.tipo_actualizacion}
                  onChange={(e) => setConfiguracionMasiva({
                    ...configuracionMasiva,
                    tipo_actualizacion: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="porcentaje">Porcentaje %</option>
                  <option value="monto_fijo">Monto Fijo $</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {`Valor (${configuracionMasiva.tipo_actualizacion === 'porcentaje' ? '%' : '$'})`}
                </label>
                <input
                  type="number"
                  value={configuracionMasiva.valor}
                  onChange={(e) => setConfiguracionMasiva({
                    ...configuracionMasiva,
                    valor: parseFloat(e.target.value) || 0
                  })}
                  className="w-full border rounded px-3 py-2"
                  step="0.01"
                  placeholder={configuracionMasiva.tipo_actualizacion === 'porcentaje' ? '10' : '100'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calcular desde
                </label>
                <select
                  value={configuracionMasiva.base_calculo}
                  onChange={(e) => setConfiguracionMasiva({
                    ...configuracionMasiva,
                    base_calculo: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="precio_venta">Precio de Venta Actual</option>
                  <option value="precio_costo">Precio de Costo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Redondeo
                </label>
                <select
                  value={configuracionMasiva.tipo_redondeo}
                  onChange={(e) => setConfiguracionMasiva({
                    ...configuracionMasiva,
                    tipo_redondeo: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="sin_redondeo">Sin Redondeo</option>
                  <option value="arriba">Redondear Arriba</option>
                  <option value="abajo">Redondear Abajo</option>
                  <option value="multiplo_5">Múltiplo de 5</option>
                  <option value="multiplo_10">Múltiplo de 10</option>
				  <option value="personalizado_50">Personalizado (X50/X+100)</option>
				  <option value="personalizado_100">Personalizado (X+100)</option>
				  <option value="centena">Redondear a Centena</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lista de Precios
                </label>
                <select
                  value={configuracionMasiva.lista_precio}
                  onChange={(e) => setConfiguracionMasiva({
                    ...configuracionMasiva,
                    lista_precio: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="todas">Todas las listas</option>
                  <option value="mayorista">Solo Mayorista</option>
                  <option value="interior">Solo Interior</option>
                  <option value="posadas">Solo Posadas</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría (opcional)
                </label>
                <select
                  value={configuracionMasiva.categoria_id}
                  onChange={(e) => setConfiguracionMasiva({
                    ...configuracionMasiva,
                    categoria_id: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo
              </label>
              <input
                type="text"
                value={configuracionMasiva.motivo}
                onChange={(e) => setConfiguracionMasiva({
                  ...configuracionMasiva,
                  motivo: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Ajuste por inflación, actualización de costos..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                color="secondary"
                onClick={() => setMostrarActualizacionMasiva(false)}
              >
                Cancelar
              </Button>
              <Button
                color="warning"
                onClick={ejecutarActualizacionMasiva}
                disabled={configuracionMasiva.valor === 0 || procesandoMasivo}
                loading={procesandoMasivo}
              >
                {procesandoMasivo ? 'Procesando...' : 'Aplicar Actualización'}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Filtros y acciones */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <Button
              color="warning"
              icon={<FaPercent />}
              onClick={() => setMostrarActualizacionMasiva(true)}
            >
              Actualización Masiva
            </Button>
            
            <Button
              color="info"
              icon={<FaPrint />}
              onClick={() => setMostrarVistaImpresion(true)}
            >
              Imprimir Lista
            </Button>
            
            <Button
              color="success"
              icon={<FaFileExport />}
              onClick={exportarPrecios}
            >
              Exportar
            </Button>
            
            <Button
              color="secondary"
              icon={<FaSyncAlt />}
              onClick={cargarDatos}
            >
              Actualizar
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Tabla de productos */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {productosFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm || categoriaSeleccionada 
                    ? 'No se encontraron productos con los filtros aplicados'
                    : 'No hay productos registrados'}
                </p>
              </div>
            ) : (
              <Table
                columns={columns}
                data={productosFiltrados}
                pagination={true}
                itemsPerPage={20}
              />
            )}
          </>
        )}
      </Card>
      
      {/* Modal de edición */}
      {modalAbierto && (
        <ListasPreciosModal
          isOpen={modalAbierto}
          onClose={() => {
            setModalAbierto(false);
            setProductoSeleccionado(null);
          }}
          producto={productoSeleccionado}
          onUpdate={handleProductoActualizado}
        />
      )}
      
      {/* Vista de impresión */}
      {mostrarVistaImpresion && (
        <ListaPreciosImprimir
          productos={productosFiltrados}
          categorias={categorias}
          onClose={() => setMostrarVistaImpresion(false)}
        />
      )}
    </div>
  );
};

export default GestionPrecios;