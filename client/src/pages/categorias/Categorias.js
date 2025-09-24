/**
 * Página de gestión de categorías
 * 
 * Muestra el listado de categorías y permite realizar búsquedas,
 * crear, editar y eliminar categorías.
 * 
 * @module pages/categorias/Categorias
 * @requires react, react-router-dom, ../../services/categorias.service
 * @related_files ./CategoriaForm.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import categoriasService from '../../services/categorias.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaTags, FaTag, FaSearch, FaEdit, 
  FaTrash, FaPlus, FaBoxes
} from 'react-icons/fa';

/**
 * Componente de página para gestión de categorías
 * @returns {JSX.Element} Componente Categorias
 */
const Categorias = () => {
  const navigate = useNavigate();
  
  // Estado
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarCategorias();
  }, []);
  
  /**
   * Carga todas las categorías
   */
  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const data = await categoriasService.obtenerTodos();
      setCategorias(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Busca categorías por término
   */
  const buscarCategorias = async () => {
    try {
      setLoading(true);
      
      if (!searchTerm.trim()) {
        // Si el término está vacío, cargar todas las categorías
        await cargarCategorias();
        return;
      }
      
      const data = await categoriasService.buscar(searchTerm);
      setCategorias(data);
    } catch (error) {
      console.error('Error al buscar categorías:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Prepara la eliminación de una categoría
   * @param {Object} categoria - Categoría a eliminar
   */
  const prepararEliminarCategoria = (categoria) => {
    setCategoriaAEliminar(categoria);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma la eliminación de una categoría
   */
  const confirmarEliminarCategoria = async () => {
    try {
      await categoriasService.eliminar(categoriaAEliminar.id);
      
      toast.success('Categoría eliminada correctamente');
      
      // Actualizar lista de categorías
      cargarCategorias();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error al eliminar la categoría');
      }
    } finally {
      setShowConfirmDialog(false);
      setCategoriaAEliminar(null);
    }
  };
  
  /**
   * Cancela la eliminación de una categoría
   */
  const cancelarEliminarCategoria = () => {
    setShowConfirmDialog(false);
    setCategoriaAEliminar(null);
  };
  
  /**
   * Columnas para la tabla de categorías
   */
  const columns = [
    {
      header: 'Nombre',
      accessor: 'nombre',
      cell: (row) => (
        <div className="flex items-center">
          <FaTag className="mr-2 text-indigo-500" />
          <span className="font-medium">{row.nombre}</span>
        </div>
      )
    },
    {
      header: 'Descripción',
      accessor: 'descripcion',
      cell: (row) => (
        <div className="text-gray-600 truncate max-w-xs">
          {row.descripcion || 'Sin descripción'}
        </div>
      )
    },
    {
      header: 'Productos',
      accessor: 'total_productos',
      cell: (row) => (
        <div className="flex items-center">
          <FaBoxes className="mr-2 text-gray-500" />
          <span className="font-medium">{row.total_productos}</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/categorias/editar/${row.id}`)}
            className="text-blue-600 hover:text-blue-800"
            title="Editar categoría"
          >
            <FaEdit />
          </button>
          
          <button
            onClick={() => navigate(`/categorias/${row.id}`)}
            className="text-indigo-600 hover:text-indigo-800"
            title="Ver detalles"
          >
            <FaSearch />
          </button>
          
          <button
            onClick={() => prepararEliminarCategoria(row)}
            className="text-red-600 hover:text-red-800"
            title="Eliminar categoría"
            disabled={row.total_productos > 0}
            className={`${
              row.total_productos > 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-red-600 hover:text-red-800'
            }`}
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
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Categorías</h1>
        
        <Link to="/categorias/nueva">
          <Button
            color="primary"
            icon={<FaPlus />}
          >
            Nueva Categoría
          </Button>
        </Link>
      </div>
      
      <Card>
        <SearchBar
          placeholder="Buscar por nombre o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={buscarCategorias}
          onClear={() => {
            setSearchTerm('');
            cargarCategorias();
          }}
        />
      </Card>
      
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {categorias.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaTags className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay categorías disponibles
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? 'No se encontraron resultados para tu búsqueda'
                    : 'Comienza creando nuevas categorías para organizar tus productos'
                  }
                </p>
                
                <div className="mt-4">
                  <Link to="/categorias/nueva">
                    <Button
                      color="primary"
                      icon={<FaPlus />}
                    >
                      Agregar Categoría
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Table
                columns={columns}
                data={categorias}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Eliminar Categoría"
        message={
          categoriaAEliminar
            ? `¿Estás seguro de que deseas eliminar la categoría "${categoriaAEliminar.nombre}"?`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminarCategoria}
        onCancel={cancelarEliminarCategoria}
      />
    </div>
  );
};

export default Categorias;