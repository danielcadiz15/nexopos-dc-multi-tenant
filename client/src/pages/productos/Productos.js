/**
 * Página de administración de productos
 * 
 * Muestra un listado de productos y permite realizar operaciones CRUD.
 * Diseñado para ser compatible con migración futura a Firebase.
 * 
 * @module pages/productos/Productos
 * @requires react, react-router-dom, react-toastify
 * @related_files ../../services/productos.service.js, ../../services/categorias.service.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaEye, 
  FaBox, FaFilter, FaTags,  FaTimes, FaFileExport, FaFileExcel 
} from 'react-icons/fa';


// Servicios
import productosService from '../../services/productos.service';
import categoriasService from '../../services/categorias.service';


// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImportarExcel from '../../components/modules/productos/ImportarExcel';


// Utilidades
import { formatCurrency } from '../../utils/format';

/**
 * Componente de página de administración de productos
 * @returns {JSX.Element} Componente Productos
 */
const Productos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Estados
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Estado para diálogo de confirmación de eliminación
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  /**
   * Carga inicial de datos
   */
	useEffect(() => {
	  // Verificar si viene de crear/editar con señal de recarga
	  const shouldReload = location.state?.reload;
	  
	  if (shouldReload) {
		// Limpiar el state para evitar recargas infinitas
		navigate('/productos', { replace: true, state: {} });
	  }
	  
	const fetchData = async () => {
	  try {
		setLoading(true);
		
		// Obtener productos
		console.log('Solicitando productos...');
		const response = await productosService.obtenerTodos();
		console.log('Respuesta de productos:', response);
		
		// Verificar la estructura de datos
		if (Array.isArray(response)) {
		  console.log(`Productos cargados: ${response.length}`);
		  setProductos(response);
		} else if (response && response.data && Array.isArray(response.data)) {
		  console.log(`Productos cargados: ${response.data.length}`);
		  setProductos(response.data);
		} else {
		  console.error('Formato de respuesta inesperado:', response);
		  // Usar datos de respaldo
		  setProductos([
			{ id: 1, codigo: 'P001', nombre: 'Producto de prueba 1', precio_venta: 100, categoria: 'General', stock_actual: 20 },
			{ id: 2, codigo: 'P002', nombre: 'Producto de prueba 2', precio_venta: 180, categoria: 'General', stock_actual: 15 },
			{ id: 3, codigo: 'P003', nombre: 'Producto de prueba 3', precio_venta: 300, categoria: 'General', stock_actual: 8 }
		  ]);
		}
		  
		} catch (error) {
		  console.error('Error al cargar productos:', error);
		  toast.error('Error al cargar datos');
		  
		  // Usar datos de respaldo si falla la carga
		  setProductos([
			{ id: 1, codigo: 'P001', nombre: 'Producto de prueba 1', precio_venta: 100, categoria: 'General', stock_actual: 20 },
			{ id: 2, codigo: 'P002', nombre: 'Producto de prueba 2', precio_venta: 180, categoria: 'General', stock_actual: 15 },
			{ id: 3, codigo: 'P003', nombre: 'Producto de prueba 3', precio_venta: 300, categoria: 'General', stock_actual: 8 }
		  ]);
		} finally {
		  setLoading(false);
		}
	  };
	  
	  fetchData();
	}, [location.state, navigate]);
	
	// Agregar un useEffect adicional para recargar cuando cambie la URL
	useEffect(() => {
	  const fetchData = async () => {
		try {
		  setLoading(true);
		  console.log('🔄 Recargando productos...');
		  const response = await productosService.obtenerTodos();
		  console.log('🔄 Respuesta de recarga:', response);
		  
		  if (Array.isArray(response)) {
			console.log(`🔄 Productos recargados: ${response.length}`);
			setProductos(response);
		  } else if (response && response.data && Array.isArray(response.data)) {
			console.log(`🔄 Productos recargados: ${response.data.length}`);
			setProductos(response.data);
		  }
		} catch (error) {
		  console.error('🔄 Error al recargar productos:', error);
		} finally {
		  setLoading(false);
		}
	  };
	  
	  // Recargar cuando se monte el componente
	  fetchData();
	}, []);
	  
  /**
   * Búsqueda de productos
   */
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // Si la búsqueda está vacía, cargar todos los productos
      try {
        setLoading(true);
        const data = await productosService.obtenerTodos();
        setProductos(data);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        toast.error('Error en la búsqueda');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      setLoading(true);
      console.log(`🔍 Buscando productos: "${searchTerm}"`);
      const productosEncontrados = await productosService.buscar(searchTerm);
      
      // Verificar si el servicio devolvió productos sin filtrar
      if (productosEncontrados && productosEncontrados.length > 0) {
        console.log(`⚠️ Servicio devolvió ${productosEncontrados.length} productos, verificando filtrado...`);
        
        // Aplicar filtro local si es necesario
        const terminoLower = searchTerm.toLowerCase();
        const productosFiltrados = productosEncontrados.filter(p => {
          const coincideNombre = p.nombre?.toLowerCase().includes(terminoLower);
          const coincideCodigo = p.codigo?.toLowerCase().includes(terminoLower);
          const coincideDescripcion = p.descripcion?.toLowerCase().includes(terminoLower);
          
          return coincideNombre || coincideCodigo || coincideDescripcion;
        });
        
        console.log(`🔍 Productos filtrados localmente: ${productosFiltrados.length} de ${productosEncontrados.length}`);
        setProductos(productosFiltrados);
      } else {
        setProductos([]);
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      toast.error('Error en la búsqueda');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Limpia la búsqueda y filtros
   */
  const handleClearSearch = async () => {
    setSearchTerm('');
    setCategoriaSeleccionada('');
    
    try {
      setLoading(true);
      const data = await productosService.obtenerTodos();
      setProductos(data);
    } catch (error) {
      console.error('Error al restablecer productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Filtra productos por categoría
   */
  const handleFilterByCategory = async (e) => {
    const categoriaId = e.target.value;
    setCategoriaSeleccionada(categoriaId);
    
    try {
      setLoading(true);
      
      if (!categoriaId) {
        // Si no hay categoría seleccionada, mostrar todos
        const data = await productosService.obtenerTodos();
        setProductos(data);
      } else {
        // Filtrar por categoría
        const data = await productosService.obtenerPorCategoria(categoriaId);
        setProductos(data);
      }
    } catch (error) {
      console.error('Error al filtrar por categoría:', error);
      toast.error('Error al filtrar productos');
      
      // Si falla, realizar filtrado local como respaldo
      try {
        const allProducts = await productosService.obtenerTodos();
        if (!categoriaId) {
          setProductos(allProducts);
        } else {
          const filtered = allProducts.filter(p => 
            p.categoria_id === parseInt(categoriaId) || p.categoria === categoriaId
          );
          setProductos(filtered);
        }
      } catch (fallbackError) {
        console.error('Error en filtrado local:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Abre el diálogo de confirmación para eliminar
   * @param {Object} producto - Producto a eliminar
   */
  const handleDeleteClick = (producto) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar el producto "${producto.nombre}"?`,
      onConfirm: () => handleDelete(producto.id)
    });
  };
 
 //Maneja el éxito de la importación
 
	const handleImportSuccess = () => {
	  // Recargar productos después de importar
	  const fetchData = async () => {
		try {
		  setLoading(true);
		  const response = await productosService.obtenerTodos();
		  
		  if (Array.isArray(response)) {
			setProductos(response);
		  } else if (response && response.data && Array.isArray(response.data)) {
			setProductos(response.data);
		  }
		} catch (error) {
		  console.error('Error al recargar productos:', error);
		  toast.error('Error al recargar productos');
		} finally {
		  setLoading(false);
		}
	  };
	  
	  fetchData();
	  toast.success('Productos importados correctamente');
	};
  /**
   * Elimina un producto
   * @param {number} id - ID del producto
   */
  const handleDelete = async (id) => {
    try {
      await productosService.eliminar(id);
      
      // Actualizar lista de productos
      setProductos(productos.filter(producto => producto.id !== id));
      
      toast.success('Producto eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar el producto');
    } finally {
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    }
  };
  
  /**
   * Redirecciona a la página de detalle de producto
   * @param {number} id - ID del producto
   */
  const handleViewClick = (id) => {
    navigate(`/productos/${id}`);
  };
  
  /**
   * Redirecciona a la página de edición de producto
   * @param {number} id - ID del producto
   */
  const handleEditClick = (id) => {
    navigate(`/productos/editar/${id}`);
  };
  
  /**
   * Exporta productos a CSV
   */
  const handleExport = () => {
    try {
      // Convertir productos a CSV
      const headers = ['ID', 'Código', 'Nombre', 'Precio', 'Categoría', 'Stock'];
      const data = productos.map(p => [
        p.id,
        p.codigo,
        p.nombre,
        p.precio_venta,
        p.categoria,
        p.stock_actual
      ]);
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.join(','))
      ].join('\n');
      
      // Crear Blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'productos.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Productos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar productos:', error);
      toast.error('Error al exportar productos');
    }
  };
  
  /**
 * Columnas para la tabla de productos - CORREGIDAS PARA FIREBASE
 */
	const columns = [
	  {
		header: 'Código',
		accessor: 'codigo',
		cell: (row) => <span className="font-medium">{row.codigo || 'N/A'}</span>
	  },
	  {
		header: 'Nombre',
		accessor: 'nombre',
		cell: (row) => (
		  <div>
			<div className="font-medium">{row.nombre || 'Sin nombre'}</div>
			<div className="text-sm text-gray-500">
			  {/* ✅ CORREGIDO: Acceso anidado a categoria.nombre */}
			  {row.categoria?.nombre || 'Sin categoría'}
			</div>
		  </div>
		)
	  },
	  {
		header: 'Precio',
		accessor: 'precio_venta',
		cell: (row) => (
		  <span className="font-medium">
			{formatCurrency(row.precio_venta || 0)}
		  </span>
		)
	  },
	  {
		header: 'Stock',
		accessor: 'stock',
		cell: (row) => {
		  // ✅ CORREGIDO: Acceso anidado a stock.cantidad y stock.stock_minimo
		  const stockActual = row.stock?.cantidad || 0;
		  const stockMinimo = row.stock?.stock_minimo || 5;
		  
		  // Determinar color según nivel de stock
		  let stockClass = 'text-green-600 bg-green-100';
		  
		  if (stockActual <= stockMinimo) {
			stockClass = 'text-red-600 bg-red-100';
		  } else if (stockActual <= stockMinimo * 1.5) {
			stockClass = 'text-yellow-600 bg-yellow-100';
		  }
		  
		  return (
			<span className={`px-2 py-1 rounded-full text-sm font-medium ${stockClass}`}>
			  {stockActual}
			</span>
		  );
		}
	  },
	  {
		header: 'Acciones',
		accessor: 'acciones',
		cell: (row) => (
		  <div className="flex space-x-2">
			<button
			  onClick={() => handleViewClick(row.id)}
			  className="text-blue-600 hover:text-blue-800"
			  title="Ver detalles"
			>
			  <FaEye />
			</button>
			
			<button
			  onClick={() => handleEditClick(row.id)}
			  className="text-green-600 hover:text-green-800"
			  title="Editar"
			>
			  <FaEdit />
			</button>
			
			<button
			  onClick={() => handleDeleteClick(row)}
			  className="text-red-600 hover:text-red-800"
			  title="Eliminar"
			>
			  <FaTrash />
			</button>
		  </div>
		)
	  }
	];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        
        <div className="flex space-x-2">
          <Link to="/productos/nuevo">
            <Button
              color="primary"
              icon={<FaPlus />}
            >
              Nuevo Producto
            </Button>
          </Link>
		  <Link to="/productos/precios">
		  <Button color="info" icon={<FaTags />}>
			Gestión de Precios
		  </Button>
		</Link>
          <Button
            color="secondary"
            icon={<FaFileExport />}
            onClick={handleExport}
          >
            Exportar
          </Button>
        </div>
      </div>
      <Button
	  color="success"
	  icon={<FaFileExcel />}
	  onClick={() => setShowImportDialog(true)}
	>
	  Importar Excel
	</Button>
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <SearchBar
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              onClear={handleClearSearch}
            />
          </div>
          
          <div className="md:w-64">
            <select
              value={categoriaSeleccionada}
              onChange={handleFilterByCategory}
              className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
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
            {(() => {
              console.log('🔍 [RENDER] Estado de productos:', {
                productosLength: productos.length,
                productos: productos,
                loading: loading
              });
              
              return productos.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <FaBox className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay productos disponibles
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || categoriaSeleccionada
                      ? 'No se encontraron resultados para tu búsqueda'
                      : 'Comienza agregando productos a tu inventario'
                    }
                  </p>
                  
                  <div className="mt-4">
                    <Link to="/productos/nuevo">
                      <Button
                        color="primary"
                        icon={<FaPlus />}
                      >
                        Agregar Producto
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={productos}
                  pagination={true}
                  itemsPerPage={10}
                />
              );
            })()}
          </>
        )}
      </Card>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
	  {/* Modal de importación */}
		<ImportarExcel
		  isOpen={showImportDialog}
		  onClose={() => setShowImportDialog(false)}
		  onImportSuccess={handleImportSuccess}
		/>
    </div>
  );
};

export default Productos;