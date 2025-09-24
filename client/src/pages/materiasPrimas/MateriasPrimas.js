/**
 * Página de gestión de materias primas
 * 
 * Muestra y permite gestionar el inventario de materias primas para producción.
 * 
 * @module pages/materiasPrimas/MateriasPrimas
 * @requires react, react-router-dom, ../../services/materiasPrimas.service
 * @related_files ./MateriaPrimaForm.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import materiasPrimasService from '../../services/materiasPrimas.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaCubes, FaPlus, FaSearch, FaEdit, FaTrash, 
  FaExclamationTriangle, FaFilter, FaBoxes
} from 'react-icons/fa';

/**
 * Componente de página para gestión de materias primas
 * @returns {JSX.Element} Componente MateriasPrimas
 */
const MateriasPrimas = () => {
  const navigate = useNavigate();
  
  // Estado
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [materiaPrimaAEliminar, setMateriaPrimaAEliminar] = useState(null);
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el modal de ajuste
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [materiaPrimaAjustar, setMateriaPrimaAjustar] = useState(null);
  const [ajusteData, setAjusteData] = useState({
    tipo: 'ingreso', // 'ingreso' o 'egreso'
    cantidad: '',
    motivo: 'compra',
    notas: ''
  });
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarMateriasPrimas();
  }, []);
  
  /**
   * Carga todas las materias primas
   */
  const cargarMateriasPrimas = async () => {
    try {
      setLoading(true);
      const data = await materiasPrimasService.obtenerTodas();
      setMateriasPrimas(data);
      setFiltroStockBajo(false);
    } catch (error) {
      console.error('Error al cargar materias primas:', error);
      toast.error('Error al cargar las materias primas');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Carga materias primas con stock bajo
   */
  const cargarStockBajo = async () => {
    try {
      setLoading(true);
      const data = await materiasPrimasService.obtenerStockBajo();
      setMateriasPrimas(data);
      setFiltroStockBajo(true);
    } catch (error) {
      console.error('Error al cargar materias primas con stock bajo:', error);
      toast.error('Error al cargar las materias primas con stock bajo');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Alterna el filtro de stock bajo
   */
  const toggleFiltroStockBajo = () => {
    if (filtroStockBajo) {
      cargarMateriasPrimas();
    } else {
      cargarStockBajo();
    }
  };
  
  /**
   * Busca materias primas por término
   */
  const buscarMateriasPrimas = () => {
    // Implementar la búsqueda por nombre, código, etc.
    // Por ahora solo filtramos el estado actual
    if (!searchTerm) return cargarMateriasPrimas();
    
    const resultados = materiasPrimas.filter(mp => 
      mp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mp.codigo && mp.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setMateriasPrimas(resultados);
  };
  
  /**
   * Prepara la eliminación de una materia prima
   * @param {Object} materiaPrima - Materia prima a eliminar
   */
  const prepararEliminar = (materiaPrima) => {
    setMateriaPrimaAEliminar(materiaPrima);
    setShowConfirmDialog(true);
  };
  
  /**
   * Elimina una materia prima
   */
  const confirmarEliminar = async () => {
    try {
      await materiasPrimasService.eliminar(materiaPrimaAEliminar.id);
      toast.success('Materia prima eliminada correctamente');
      cargarMateriasPrimas();
    } catch (error) {
      console.error('Error al eliminar materia prima:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la materia prima');
    } finally {
      setShowConfirmDialog(false);
      setMateriaPrimaAEliminar(null);
    }
  };
  
  /**
   * Prepara el ajuste de stock
   * @param {Object} materiaPrima - Materia prima a ajustar
   */
  const prepararAjusteStock = (materiaPrima) => {
    setMateriaPrimaAjustar(materiaPrima);
    setAjusteData({
      tipo: 'ingreso',
      cantidad: '',
      motivo: 'compra',
      notas: ''
    });
    setShowAjusteModal(true);
  };

  /**
   * Confirma el ajuste de stock
   */
  const confirmarAjusteStock = async () => {
    try {
      if (!ajusteData.cantidad || parseFloat(ajusteData.cantidad) <= 0) {
        toast.error('La cantidad debe ser mayor a cero');
        return;
      }

      setGuardandoAjuste(true);
      
      const cantidadAjuste = parseFloat(ajusteData.cantidad);
      const nuevaCantidad = ajusteData.tipo === 'ingreso' 
        ? parseFloat(materiaPrimaAjustar.stock_actual) + cantidadAjuste
        : parseFloat(materiaPrimaAjustar.stock_actual) - cantidadAjuste;
      
      if (nuevaCantidad < 0) {
        toast.error('El stock no puede quedar negativo');
        return;
      }
      
      // Actualizar stock
      await materiasPrimasService.ajustarStock(materiaPrimaAjustar.id, {
        stock_actual: nuevaCantidad,
        ajuste: {
          tipo: ajusteData.tipo,
          cantidad: cantidadAjuste,
          motivo: ajusteData.motivo,
          notas: ajusteData.notas,
          stock_anterior: materiaPrimaAjustar.stock_actual,
          stock_nuevo: nuevaCantidad,
          fecha: new Date().toISOString()
        }
      });
      
      toast.success(
        ajusteData.tipo === 'ingreso' 
          ? 'Stock aumentado correctamente' 
          : 'Stock reducido correctamente'
      );
      // NUEVO: Sincronizar con productos
    if (materiaPrimaAjustar.codigo) {
      const { default: stockSyncService } = await import('../../services/stockSync.service');
      await stockSyncService.sincronizarStock(
        materiaPrimaAjustar.codigo, 
        nuevaCantidad, 
        'materia_prima'
      );
    }
    
    toast.success(
      ajusteData.tipo === 'ingreso' 
        ? 'Stock aumentado correctamente' 
        : 'Stock reducido correctamente'
    );
      cargarMateriasPrimas();
      setShowAjusteModal(false);
    } catch (error) {
      console.error('Error al ajustar stock:', error);
      toast.error('Error al ajustar el stock');
    } finally {
      setGuardandoAjuste(false);
    }
  };
  
  /**
   * Formatea el precio con 2 decimales y el símbolo de moneda
   * @param {number} precio - Precio a formatear
   * @returns {string} Precio formateado
   */
  const formatearPrecio = (precio) => {
    return `$${parseFloat(precio).toFixed(2)}`;
  };
  
  /**
   * Columnas para la tabla de materias primas
   */
  const columns = [
    {
      header: 'Código',
      accessor: 'codigo',
      cell: (row) => (
        <span className="font-medium">{row.codigo || '-'}</span>
      )
    },
    {
      header: 'Nombre',
      accessor: 'nombre'
    },
    {
      header: 'Unidad',
      accessor: 'unidad_medida',
      cell: (row) => (
        <span className="uppercase">{row.unidad_medida}</span>
      )
    },
    {
      header: 'Precio',
      accessor: 'precio_unitario',
      cell: (row) => (
        <span>{formatearPrecio(row.precio_unitario)}</span>
      )
    },
    {
      header: 'Stock',
      accessor: 'stock_actual',
      cell: (row) => {
        let stockClass = 'text-green-600 bg-green-100';
        
        if (row.stock_actual <= row.stock_minimo) {
          stockClass = 'text-red-600 bg-red-100';
        } else if (row.stock_actual <= row.stock_minimo * 1.5) {
          stockClass = 'text-yellow-600 bg-yellow-100';
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockClass}`}>
            {row.stock_actual} {row.unidad_medida}
          </span>
        );
      }
    },
    {
      header: 'Mínimo',
      accessor: 'stock_minimo',
      cell: (row) => (
        <span className="text-gray-600">
          {row.stock_minimo} {row.unidad_medida}
        </span>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => prepararAjusteStock(row)}
            className="text-purple-600 hover:text-purple-800"
            title="Ajustar stock"
          >
            <FaBoxes />
          </button>
          
          <button
            onClick={() => navigate(`/materias-primas/editar/${row.id}`)}
            className="text-blue-600 hover:text-blue-800"
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
        <h1 className="text-2xl font-bold text-gray-800">Materias Primas</h1>
        
        <Link to="/materias-primas/nueva">
          <Button
            color="primary"
            icon={<FaPlus />}
          >
            Nueva Materia Prima
          </Button>
        </Link>
      </div>
      
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <SearchBar
              placeholder="Buscar materias primas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={buscarMateriasPrimas}
              onClear={() => {
                setSearchTerm('');
                cargarMateriasPrimas();
              }}
            />
          </div>
          
          <div>
            <Button
              color={filtroStockBajo ? "primary" : "secondary"}
              onClick={toggleFiltroStockBajo}
              icon={<FaExclamationTriangle />}
            >
              {filtroStockBajo ? "Ver todas" : "Stock bajo"}
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
            {materiasPrimas.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaCubes className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay materias primas disponibles
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filtroStockBajo
                    ? 'No se encontraron resultados para tu búsqueda'
                    : 'Comienza agregando materias primas al inventario'
                  }
                </p>
                
                <div className="mt-4">
                  <Link to="/materias-primas/nueva">
                    <Button
                      color="primary"
                      icon={<FaPlus />}
                    >
                      Agregar Materia Prima
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Table
                columns={columns}
                data={materiasPrimas}
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
        title="Eliminar Materia Prima"
        message={
          materiaPrimaAEliminar
            ? `¿Estás seguro de eliminar la materia prima "${materiaPrimaAEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setShowConfirmDialog(false);
          setMateriaPrimaAEliminar(null);
        }}
      />
      
      {/* Modal de Ajuste de Stock */}
      {showAjusteModal && materiaPrimaAjustar && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Ajustar Stock - {materiaPrimaAjustar.nombre}
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Stock actual:</p>
                <p className="text-xl font-bold text-gray-800">
                  {materiaPrimaAjustar.stock_actual} {materiaPrimaAjustar.unidad_medida}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Ajuste
                </label>
                <select
                  value={ajusteData.tipo}
                  onChange={(e) => setAjusteData({ ...ajusteData, tipo: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="ingreso">Ingreso (+)</option>
                  <option value="egreso">Egreso (-)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={ajusteData.cantidad}
                    onChange={(e) => setAjusteData({ ...ajusteData, cantidad: e.target.value })}
                    min="0.01"
                    step="0.01"
                    className="block w-full pr-12 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">{materiaPrimaAjustar.unidad_medida}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <select
                  value={ajusteData.motivo}
                  onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="compra">Compra</option>
                  <option value="ajuste_inventario">Ajuste de Inventario</option>
                  <option value="devolucion">Devolución</option>
                  <option value="merma">Merma/Pérdida</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={ajusteData.notas}
                  onChange={(e) => setAjusteData({ ...ajusteData, notas: e.target.value })}
                  rows={2}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Detalles adicionales..."
                />
              </div>
              
              {ajusteData.cantidad && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Nuevo stock:</p>
                  <p className="text-lg font-bold text-gray-800">
                    {ajusteData.tipo === 'ingreso' 
                      ? parseFloat(materiaPrimaAjustar.stock_actual) + parseFloat(ajusteData.cantidad || 0)
                      : parseFloat(materiaPrimaAjustar.stock_actual) - parseFloat(ajusteData.cantidad || 0)
                    } {materiaPrimaAjustar.unidad_medida}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                color="secondary"
                onClick={() => setShowAjusteModal(false)}
                disabled={guardandoAjuste}
              >
                Cancelar
              </Button>
              
              <Button
                color="primary"
                onClick={confirmarAjusteStock}
                loading={guardandoAjuste}
                disabled={!ajusteData.cantidad || parseFloat(ajusteData.cantidad) <= 0}
              >
                Confirmar Ajuste
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MateriasPrimas;