/**
 * Página de gestión de recetas
 * 
 * Muestra el listado de recetas para producción.
 * 
 * @module pages/recetas/Recetas
 * @requires react, react-router-dom, ../../services/recetas.service
 * @related_files ./RecetaForm.js, ./RecetaDetalle.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import recetasService from '../../services/recetas.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaClipboardList, FaPlus, FaEdit, FaTrash, FaEye,
  FaBoxOpen, FaCubes, FaSearch
} from 'react-icons/fa';

/**
 * Componente de página para gestión de recetas
 * @returns {JSX.Element} Componente Recetas
 */
const Recetas = () => {
  const navigate = useNavigate();
  
  // Estado
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [recetaAEliminar, setRecetaAEliminar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarRecetas();
  }, []);
  
  /**
   * Carga todas las recetas
   */
 const cargarRecetas = async () => {
	  try {
		setLoading(true);
		const data = await recetasService.obtenerTodas();
		
		// FILTRO TEMPORAL: Filtrar solo las recetas activas
		// TODO: Remover este filtro cuando se cree el índice en Firestore
		const recetasActivas = data.filter(receta => {
		  // Si no tiene campo activo, asumimos que está activa
		  return receta.activo !== false;
		});
		
		setRecetas(recetasActivas);
	  } catch (error) {
		console.error('Error al cargar recetas:', error);
		toast.error('Error al cargar las recetas');
	  } finally {
		setLoading(false);
	  }
	};
  
  /**
   * Prepara la eliminación de una receta
   * @param {Object} receta - Receta a eliminar
   */
  const prepararEliminar = (receta) => {
    setRecetaAEliminar(receta);
    setShowConfirmDialog(true);
  };
  
  /**
   * Elimina una receta
   */
  const confirmarEliminar = async () => {
    try {
      await recetasService.eliminar(recetaAEliminar.id);
      toast.success('Receta eliminada correctamente');
      cargarRecetas();
    } catch (error) {
      console.error('Error al eliminar receta:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la receta');
    } finally {
      setShowConfirmDialog(false);
      setRecetaAEliminar(null);
    }
  };
  
  /**
   * Busca recetas por término
   */
  const buscarRecetas = () => {
	  if (!searchTerm) return cargarRecetas();
	  
	  // FILTRO TEMPORAL: Incluir filtro de activas
	  const resultados = recetas.filter(receta => 
		receta.activo !== false && (
		  receta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
		  (receta.producto_nombre && receta.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
		)
	  );
	  
	  setRecetas(resultados);
	};
  
  /**
   * Columnas para la tabla de recetas
   */
  const columns = [
    {
      header: 'Receta',
      accessor: 'nombre',
      cell: (row) => (
        <span className="font-medium">{row.nombre}</span>
      )
    },
    {
      header: 'Producto',
      accessor: 'producto_nombre',
      cell: (row) => (
        <div className="flex items-center">
          <FaBoxOpen className="mr-2 text-gray-500" />
          <span>{row.producto_nombre}</span>
          {row.producto_codigo && (
            <span className="ml-2 text-xs text-gray-500">({row.producto_codigo})</span>
          )}
        </div>
      )
    },
    {
      header: 'Rendimiento',
      accessor: 'rendimiento',
      cell: (row) => (
        <span className="text-gray-700">
          {row.rendimiento} {row.rendimiento > 1 ? 'unidades' : 'unidad'}
        </span>
      )
    },
    {
      header: 'Tiempo',
      accessor: 'tiempo_preparacion',
      cell: (row) => (
        row.tiempo_preparacion ? (
          <span className="text-gray-700">
            {row.tiempo_preparacion} min
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/recetas/${row.id}`)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <FaEye />
          </button>
          
          <button
            onClick={() => navigate(`/recetas/editar/${row.id}`)}
            className="text-green-600 hover:text-green-800"
            title="Editar"
          >
            <FaEdit />
          </button>
          
          <button
            onClick={() => prepararEliminar(row)}
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
        <h1 className="text-2xl font-bold text-gray-800">Recetas de Producción</h1>
        
        <div className="flex space-x-2">
          <Link to="/materias-primas">
            <Button
              color="secondary"
              icon={<FaCubes />}
            >
              Materias Primas
            </Button>
          </Link>
          
          <Link to="/recetas/nueva">
            <Button
              color="primary"
              icon={<FaPlus />}
            >
              Nueva Receta
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <SearchBar
              placeholder="Buscar recetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={buscarRecetas}
              onClear={() => {
                setSearchTerm('');
                cargarRecetas();
              }}
            />
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
            {recetas.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaClipboardList className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay recetas disponibles
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? 'No se encontraron resultados para tu búsqueda'
                    : 'Comienza creando tu primera receta de producción'
                  }
                </p>
                
                <div className="mt-4">
                  <Link to="/recetas/nueva">
                    <Button
                      color="primary"
                      icon={<FaPlus />}
                    >
                      Crear Receta
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Table
                columns={columns}
                data={recetas}
                pagination={true}
                itemsPerPage={15}
              />
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Eliminar Receta"
        message={
          recetaAEliminar
            ? `¿Estás seguro de eliminar la receta "${recetaAEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setShowConfirmDialog(false);
          setRecetaAEliminar(null);
        }}
      />
    </div>
  );
};

export default Recetas;