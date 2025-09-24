/**
 * Detalles de categoría
 * 
 * Muestra información detallada de una categoría y sus productos asociados.
 * 
 * @module pages/categorias/CategoriaDetalle
 * @requires react, react-router-dom, ../../services/categorias.service
 * @related_files ./Categorias.js, ./CategoriaForm.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import categoriasService from '../../services/categorias.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';

// Iconos
import { 
  FaTags, FaEdit, FaArrowLeft, FaBoxOpen, 
  FaBoxes, FaSearch, FaShoppingBag
} from 'react-icons/fa';

/**
 * Componente de detalles de categoría
 * @returns {JSX.Element} Componente CategoriaDetalle
 */
const CategoriaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [categoria, setCategoria] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loadingCategoria, setLoadingCategoria] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar datos de la categoría
        const categoriaData = await categoriasService.obtenerPorId(id);
        setCategoria(categoriaData);
        setLoadingCategoria(false);
        
        // Cargar productos de la categoría
        const productosData = await categoriasService.obtenerProductos(id);
        setProductos(productosData);
        setLoadingProductos(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast.error('Error al cargar los datos de la categoría');
        navigate('/categorias');
      }
    };
    
    cargarDatos();
  }, [id, navigate]);
  
  /**
   * Columnas para la tabla de productos
   */
  const columns = [
    {
      header: 'Producto',
      accessor: 'nombre',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.nombre}</div>
          <div className="text-sm text-gray-500">
            Código: {row.codigo}
          </div>
        </div>
      )
    },
    {
      header: 'Stock',
      accessor: 'stock_actual',
      cell: (row) => {
        let stockClass = 'text-green-600 bg-green-100';
        
        if (row.stock_actual <= 5) {
          stockClass = 'text-red-600 bg-red-100';
        } else if (row.stock_actual <= 10) {
          stockClass = 'text-yellow-600 bg-yellow-100';
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockClass}`}>
            {row.stock_actual}
          </span>
        );
      }
    },
    {
      header: 'Precio',
      accessor: 'precio_venta',
      cell: (row) => (
        <div>
          <div className="font-medium">
            ${parseFloat(row.precio_venta).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            Costo: ${parseFloat(row.precio_costo).toFixed(2)}
          </div>
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <Link
            to={`/productos/${row.id}`}
            className="text-blue-600 hover:text-blue-800"
            title="Ver producto"
          >
            <FaSearch />
          </Link>
          
          <Link
            to={`/productos/editar/${row.id}`}
            className="text-indigo-600 hover:text-indigo-800"
            title="Editar producto"
          >
            <FaEdit />
          </Link>
        </div>
      )
    }
  ];

  // Si está cargando la categoría
  if (loadingCategoria) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Si no se encontró la categoría
  if (!categoria) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <FaTags className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            Categoría no encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            La categoría que intentas ver no existe o ha sido eliminada.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/categorias')}
            icon={<FaArrowLeft />}
          >
            Volver a Categorías
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Detalles de Categoría
        </h1>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/categorias')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <Button
            color="primary"
            onClick={() => navigate(`/categorias/editar/${id}`)}
            icon={<FaEdit />}
          >
            Editar
          </Button>
        </div>
      </div>
      
      {/* Información de la categoría */}
      <Card
        title="Información de la Categoría"
        icon={<FaTags />}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {categoria.nombre}
            </h3>
            
            <p className="text-gray-600">
              {categoria.descripcion || 'Sin descripción'}
            </p>
          </div>
          
          <div className="border-t pt-4 flex justify-between items-center">
            <div className="flex items-center">
              <FaBoxes className="text-indigo-600 mr-2" />
              <span className="font-medium">
                {categoria.total_productos} productos en esta categoría
              </span>
            </div>
            
            <Link
              to={`/productos?categoria=${id}`}
              className="text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <FaSearch className="mr-1" />
              Ver todos
            </Link>
          </div>
        </div>
      </Card>
      
      {/* Productos de la categoría */}
      <Card
        title="Productos en esta Categoría"
        icon={<FaBoxOpen />}
      >
        {loadingProductos ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            {productos.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaBoxOpen className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay productos en esta categoría
                </h3>
                <p className="text-gray-500 mb-4">
                  Esta categoría aún no tiene productos asociados
                </p>
                
                <Link to="/productos/nuevo">
                  <Button
                    color="primary"
                    icon={<FaBoxOpen />}
                  >
                    Crear Producto
                  </Button>
                </Link>
              </div>
            ) : (
              <Table
                columns={columns}
                data={productos}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default CategoriaDetalle;