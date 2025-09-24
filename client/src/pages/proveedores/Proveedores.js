/**
 * Página de gestión de proveedores
 * 
 * Muestra el listado de proveedores y permite realizar operaciones CRUD.
 * 
 * @module pages/proveedores/Proveedores
 * @requires react, react-router-dom, ../../services/proveedores.service
 * @related_files ./ProveedorForm.js
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaTruck, FaPlus, FaEdit, FaTrash, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaUserTie, FaSearch, FaCheckCircle,
  FaTimesCircle, FaBuilding
} from 'react-icons/fa';

/**
 * Componente de página para gestión de proveedores
 * @returns {JSX.Element} Componente Proveedores
 */
const Proveedores = () => {
  // Estado
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState(''); // '', 'activos', 'inactivos'
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarProveedores();
  }, []);
  
  /**
   * Carga todos los proveedores
   */
  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const data = await proveedoresService.obtenerTodos();
      setProveedores(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      toast.error('Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Busca proveedores por término
   */
  const buscarProveedores = async () => {
    try {
      setLoading(true);
      
      if (!searchTerm.trim()) {
        await cargarProveedores();
        return;
      }
      
      const data = await proveedoresService.buscar(searchTerm);
      setProveedores(data);
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Prepara la eliminación de un proveedor
   * @param {Object} proveedor - Proveedor a eliminar
   */
  const prepararEliminarProveedor = (proveedor) => {
    setProveedorAEliminar(proveedor);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma la eliminación del proveedor
   */
  const confirmarEliminarProveedor = async () => {
    try {
      await proveedoresService.eliminar(proveedorAEliminar.id);
      
      toast.success('Proveedor eliminado correctamente');
      
      // Recargar proveedores
      cargarProveedores();
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error al eliminar el proveedor');
      }
    } finally {
      setShowConfirmDialog(false);
      setProveedorAEliminar(null);
    }
  };
  
  /**
   * Cancela la eliminación del proveedor
   */
  const cancelarEliminarProveedor = () => {
    setShowConfirmDialog(false);
    setProveedorAEliminar(null);
  };
  
  /**
   * Filtra los proveedores según el estado
   * @param {string} estado - Estado a filtrar
   */
  const filtrarPorEstado = (estado) => {
    setFiltroActivo(filtroActivo === estado ? '' : estado);
  };
  
  /**
   * Obtiene los proveedores filtrados
   * @returns {Array} Proveedores filtrados
   */
  const getProveedoresFiltrados = () => {
    if (!filtroActivo) return proveedores;
    
    if (filtroActivo === 'activos') {
      return proveedores.filter(p => p.activo);
    } else {
      return proveedores.filter(p => !p.activo);
    }
  };
  
  /**
   * Columnas para la tabla de proveedores
   */
  const columns = [
    {
      header: 'Nombre',
      accessor: 'nombre',
      cell: (row) => (
        <div className="flex items-center">
          <FaBuilding className="mr-2 text-gray-500" />
          <span className="font-medium">{row.nombre}</span>
        </div>
      )
    },
    {
      header: 'Contacto',
      accessor: 'contacto',
      cell: (row) => (
        <div className="flex items-center">
          <FaUserTie className="mr-2 text-gray-500" />
          <span>{row.contacto || 'Sin contacto'}</span>
        </div>
      )
    },
    {
      header: 'Teléfono',
      accessor: 'telefono',
      cell: (row) => (
        <div className="flex items-center">
          <FaPhone className="mr-2 text-gray-500" />
          <span>{row.telefono || 'Sin teléfono'}</span>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      cell: (row) => (
        <div className="flex items-center">
          <FaEnvelope className="mr-2 text-gray-500" />
          <span className="text-sm">{row.email || 'Sin email'}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'activo',
      cell: (row) => (
        <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${
          row.activo 
            ? 'bg-green-100 text-green-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {row.activo ? (
            <>
              <FaCheckCircle className="mr-1" />
              Activo
            </>
          ) : (
            <>
              <FaTimesCircle className="mr-1" />
              Inactivo
            </>
          )}
        </span>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <Link
            to={`/proveedores/editar/${row.id}`}
            className="text-blue-600 hover:text-blue-800"
            title="Editar proveedor"
          >
            <FaEdit />
          </Link>
          
          <button
            onClick={() => prepararEliminarProveedor(row)}
            className="text-red-600 hover:text-red-800"
            title="Eliminar proveedor"
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
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Proveedores</h1>
        
        <Link to="/proveedores/nuevo">
          <Button
            color="primary"
            icon={<FaPlus />}
          >
            Nuevo Proveedor
          </Button>
        </Link>
      </div>
      
      <Card>
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <SearchBar
              placeholder="Buscar proveedores por nombre o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={buscarProveedores}
              onClear={() => {
                setSearchTerm('');
                cargarProveedores();
              }}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              color={filtroActivo === 'activos' ? 'success' : 'secondary'}
              icon={<FaCheckCircle />}
              onClick={() => filtrarPorEstado('activos')}
              size="sm"
            >
              Activos
            </Button>
            
            <Button
              color={filtroActivo === 'inactivos' ? 'danger' : 'secondary'}
              icon={<FaTimesCircle />}
              onClick={() => filtrarPorEstado('inactivos')}
              size="sm"
            >
              Inactivos
            </Button>
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
            {getProveedoresFiltrados().length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaTruck className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  {searchTerm || filtroActivo
                    ? 'No se encontraron proveedores'
                    : 'No hay proveedores registrados'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filtroActivo
                    ? 'Intenta con otros términos de búsqueda o quita los filtros'
                    : 'Comienza registrando tu primer proveedor'}
                </p>
                
                <div className="mt-4">
                  <Link to="/proveedores/nuevo">
                    <Button
                      color="primary"
                      icon={<FaPlus />}
                    >
                      Registrar Proveedor
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Mostrando {getProveedoresFiltrados().length} proveedor(es)
                  {filtroActivo && ` ${filtroActivo}`}
                  {searchTerm && ` que coinciden con "${searchTerm}"`}
                </div>
                
                <Table
                  columns={columns}
                  data={getProveedoresFiltrados()}
                  pagination={true}
                  itemsPerPage={10}
                />
              </>
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Eliminar Proveedor"
        message={
          proveedorAEliminar
            ? `¿Estás seguro de eliminar el proveedor "${proveedorAEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminarProveedor}
        onCancel={cancelarEliminarProveedor}
      />
    </div>
  );
};

export default Proveedores;