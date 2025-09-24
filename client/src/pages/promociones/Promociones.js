/**
 * Página de listado de promociones
 * 
 * Muestra la lista de promociones con opciones de filtrado
 * y acciones (ver, editar, eliminar).
 * 
 * @module pages/promociones/Promociones
 * @requires react, react-router-dom, ../../services/promociones.service
 * @related_files ./PromocionForm.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import promocionesService from '../../services/promociones.service';

// Hooks
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaTag, 
  FaToggleOn, FaToggleOff, FaFilter
} from 'react-icons/fa';

// Utilidades
import { formatDateDisplay } from '../../utils/format';

/**
 * Componente de página para listar promociones
 * @returns {JSX.Element} Componente Promociones
 */
const Promociones = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // Estado
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivas, setFiltroActivas] = useState(false);
  
  // Estado para confirmación de eliminación
  const [promocionAEliminar, setPromocionAEliminar] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarPromociones();
  }, []);
  
  /**
   * Carga las promociones desde la API
   */
  const cargarPromociones = async () => {
    try {
      setLoading(true);
      const promociones = await promocionesService.obtenerTodas();
      setPromociones(promociones);
    } catch (error) {
      console.error('Error al cargar promociones:', error);
      toast.error('Error al cargar las promociones');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Carga sólo las promociones activas
   */
  const cargarPromocionesActivas = async () => {
    try {
      setLoading(true);
      const promociones = await promocionesService.obtenerActivas();
      setPromociones(promociones);
      setFiltroActivas(true);
    } catch (error) {
      console.error('Error al cargar promociones activas:', error);
      toast.error('Error al cargar las promociones activas');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Filtra promociones por término de búsqueda
   * @param {string} termino - Término de búsqueda
   */
  const buscarPromociones = (termino) => {
    setSearchTerm(termino);
  };
  
  /**
   * Alterna entre mostrar todas o sólo promociones activas
   */
  const toggleFiltroActivas = () => {
    if (filtroActivas) {
      cargarPromociones();
      setFiltroActivas(false);
    } else {
      cargarPromocionesActivas();
    }
  };
  
  /**
   * Cambia el estado de una promoción (activa/inactiva)
   * @param {number} id - ID de la promoción
   * @param {boolean} activo - Nuevo estado
   */
  const cambiarEstado = async (id, activo) => {
    try {
      await promocionesService.cambiarEstado(id, activo);
      
      // Actualizar la lista
      setPromociones(promociones.map(p => 
        p.id === id ? { ...p, activo } : p
      ));
      
      toast.success(`Promoción ${activo ? 'activada' : 'desactivada'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar estado de promoción:', error);
      toast.error('Error al cambiar el estado de la promoción');
    }
  };
  
  /**
   * Prepara la eliminación de una promoción
   * @param {Object} promocion - Promoción a eliminar
   */
  const prepararEliminar = (promocion) => {
    setPromocionAEliminar(promocion);
    setShowDeleteDialog(true);
  };
  
  /**
   * Confirma la eliminación de una promoción
   */
  const confirmarEliminar = async () => {
    if (!promocionAEliminar) return;
    
    try {
      await promocionesService.eliminar(promocionAEliminar.id);
      
      // Actualizar la lista
      setPromociones(promociones.filter(p => p.id !== promocionAEliminar.id));
      
      toast.success('Promoción eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar promoción:', error);
      toast.error('Error al eliminar la promoción');
    } finally {
      // Cerrar diálogo y limpiar estado
      setShowDeleteDialog(false);
      setPromocionAEliminar(null);
    }
  };
  
  /**
   * Cancela la eliminación de una promoción
   */
  const cancelarEliminar = () => {
    setShowDeleteDialog(false);
    setPromocionAEliminar(null);
  };
  
  /**
   * Filtra promociones según búsqueda y filtros
   * @returns {Array} Promociones filtradas
   */
  const getPromocionesFilteredAndSorted = () => {
    if (!promociones) return [];
    
    return promociones
      .filter(promocion => {
        // Filtrar por término de búsqueda
        if (searchTerm && !promocion.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Ordenar por fecha de creación (más recientes primero)
        return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
      });
  };
  
  /**
   * Columnas para la tabla de promociones
   */
  const columns = [
    {
      header: 'Nombre',
      accessor: 'nombre',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.nombre}</div>
          <div className="text-sm text-gray-500 truncate max-w-xs">
            {row.descripcion}
          </div>
        </div>
      )
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      cell: (row) => {
        // Mapeo de tipos a etiquetas legibles
        const tiposMap = {
          'porcentaje': <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{row.valor}% descuento</span>,
          'monto_fijo': <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">${row.valor} descuento</span>,
          '2x1': <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">2x1</span>,
          'nx1': <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{row.condiciones.n || 3}x1</span>
        };
        
        return tiposMap[row.tipo] || row.tipo;
      }
    },
    {
      header: 'Vigencia',
      accessor: 'fecha_inicio',
      cell: (row) => (
        <div className="text-sm">
          <div>Desde: {formatDateDisplay(row.fecha_inicio)}</div>
          <div>Hasta: {formatDateDisplay(row.fecha_fin)}</div>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'activo',
      cell: (row) => {
        // Verificar si está vigente según fechas
        const hoy = new Date();
        const inicio = new Date(row.fecha_inicio);
        const fin = new Date(row.fecha_fin);
        const vigente = hoy >= inicio && hoy <= fin;
        
        // Mostrar etiqueta según estado
        return (
          <div>
            {row.activo ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Activa
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                Inactiva
              </span>
            )}
            
            {row.activo && !vigente && (
              <span className="block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                Fuera de vigencia
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          {/* Ver detalle */}
          <button
            onClick={() => navigate(`/promociones/${row.id}`)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalle"
          >
            <FaEye />
          </button>
          
          {/* Editar - Requiere permiso editar:promociones */}
          {hasPermission('promociones', 'editar') && (
            <button
              onClick={() => navigate(`/promociones/editar/${row.id}`)}
              className="text-green-600 hover:text-green-800"
              title="Editar promoción"
            >
              <FaEdit />
            </button>
          )}
          
          {/* Activar/Desactivar - Requiere permiso editar:promociones */}
          {hasPermission('promociones', 'editar') && (
            <button
              onClick={() => cambiarEstado(row.id, !row.activo)}
              className={row.activo ? "text-orange-600 hover:text-orange-800" : "text-blue-600 hover:text-blue-800"}
              title={row.activo ? "Desactivar promoción" : "Activar promoción"}
            >
              {row.activo ? <FaToggleOff /> : <FaToggleOn />}
            </button>
          )}
          
          {/* Eliminar - Requiere permiso eliminar:promociones */}
          {hasPermission('promociones', 'eliminar') && (
            <button
              onClick={() => prepararEliminar(row)}
              className="text-red-600 hover:text-red-800"
              title="Eliminar promoción"
            >
              <FaTrash />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Promociones</h1>
        
        {/* Botón para crear nueva promoción */}
        {hasPermission('promociones', 'crear') && (
          <Link to="/promociones/nueva">
            <Button color="primary" icon={<FaPlus />}>
              Nueva Promoción
            </Button>
          </Link>
        )}
      </div>
      
      {/* Filtros y búsqueda */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <SearchBar
              placeholder="Buscar promociones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={() => buscarPromociones(searchTerm)}
              onClear={() => buscarPromociones('')}
            />
          </div>
          
          <div>
            <Button
              color={filtroActivas ? "primary" : "secondary"}
              onClick={toggleFiltroActivas}
              icon={<FaFilter />}
            >
              {filtroActivas ? "Ver todas" : "Sólo activas"}
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Tabla de promociones */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {promociones.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaTag className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay promociones disponibles
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filtroActivas
                    ? 'No se encontraron resultados para tu búsqueda'
                    : 'Comienza creando tu primera promoción'
                  }
                </p>
                
                {hasPermission('promociones', 'crear') && (
                  <div className="mt-4">
                    <Link to="/promociones/nueva">
                      <Button color="primary" icon={<FaPlus />}>
                        Crear promoción
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Table
                columns={columns}
                data={getPromocionesFilteredAndSorted()}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Eliminar Promoción"
        message={`¿Estás seguro de eliminar la promoción "${promocionAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        confirmColor="danger"
      />
    </div>
  );
};

export default Promociones;