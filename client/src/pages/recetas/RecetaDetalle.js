/**
 * Página de detalle de receta - CORREGIDA PARA SISTEMA UNIFICADO
 * 
 * Muestra información detallada de una receta, incluyendo ingredientes e instrucciones.
 * 
 * @module pages/recetas/RecetaDetalle
 * @requires react, react-router-dom, ../../services/recetas.service
 * @related_files ./Recetas.js, ./RecetaForm.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import recetasService from '../../services/recetas.service';
import produccionService from '../../services/produccion.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaClipboardList, FaArrowLeft, FaEdit, FaTrash, 
  FaBoxOpen, FaCubes, FaIndustry, FaChevronRight, 
  FaMoneyBillWave, FaExclamationTriangle
} from 'react-icons/fa';

/**
 * Componente de página para mostrar detalle de receta
 * @returns {JSX.Element} Componente RecetaDetalle
 */
const RecetaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estado
  const [receta, setReceta] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [costos, setCostos] = useState({});
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProducirDialog, setShowProducirDialog] = useState(false);
  const [cantidadProducir, setCantidadProducir] = useState(1);
  const [sistemaUnificado, setSistemaUnificado] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarDatos();
  }, [id]);
  
  /**
   * Detecta si la receta usa el sistema unificado
   */
  const detectarSistemaUnificado = (ingredientesData) => {
    // Si algún ingrediente tiene producto_ingrediente_id, es sistema unificado
    const esUnificado = ingredientesData.some(ing => 
      ing.producto_ingrediente_id || ing.migrado_a_producto_unificado
    );
    setSistemaUnificado(esUnificado);
    return esUnificado;
  };
  
  /**
   * Obtiene información de materias primas del sistema unificado
   */
  const obtenerMateriasPrimasUnificadas = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/materias-primas-unificadas`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        console.warn('Error al obtener materias primas unificadas:', data.message);
        return [];
      }
    } catch (error) {
      console.error('Error al cargar materias primas unificadas:', error);
      return [];
    }
  };
  
  /**
   * Enriquece ingredientes con información del sistema unificado
   */
  const enriquecerIngredientesUnificados = async (ingredientesData) => {
    try {
      const materiasPrimasUnificadas = await obtenerMateriasPrimasUnificadas();
      
      return ingredientesData.map(ingrediente => {
        // Buscar en sistema unificado usando producto_ingrediente_id
        const productoId = ingrediente.producto_ingrediente_id || ingrediente.materia_prima_id;
        const materiaPrimaUnificada = materiasPrimasUnificadas.find(mp => mp.id === productoId);
        
        if (materiaPrimaUnificada) {
          return {
            ...ingrediente,
            // Mapear campos del sistema unificado
            materia_prima_nombre: materiaPrimaUnificada.nombre,
            nombre: materiaPrimaUnificada.nombre,
            precio_unitario: materiaPrimaUnificada.precio_unitario || materiaPrimaUnificada.precio_costo,
            unidad_medida: materiaPrimaUnificada.unidad_medida,
            stock_actual: materiaPrimaUnificada.stock_actual,
            codigo: materiaPrimaUnificada.codigo,
            // Mantener compatibilidad con campos existentes
            subtotal: ingrediente.subtotal || (parseFloat(ingrediente.cantidad || 0) * parseFloat(materiaPrimaUnificada.precio_unitario || 0))
          };
        } else {
          // Si no se encuentra en sistema unificado, usar datos originales
          console.warn(`Materia prima no encontrada en sistema unificado: ${productoId}`);
          return {
            ...ingrediente,
            // Valores por defecto si faltan datos
            materia_prima_nombre: ingrediente.materia_prima_nombre || ingrediente.nombre || 'Ingrediente sin nombre',
            nombre: ingrediente.nombre || ingrediente.materia_prima_nombre || 'Ingrediente sin nombre',
            precio_unitario: ingrediente.precio_unitario || 0,
            unidad_medida: ingrediente.unidad_medida || 'unidad',
            stock_actual: ingrediente.stock_actual || 0
          };
        }
      });
    } catch (error) {
      console.error('Error al enriquecer ingredientes:', error);
      return ingredientesData;
    }
  };
  
  /**
   * Carga los datos de la receta
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar receta, ingredientes y costos
      const [recetaData, ingredientesData, costosData] = await Promise.all([
        recetasService.obtenerPorId(id),
        recetasService.obtenerDetalle(id),
        recetasService.calcularCosto(id)
      ]);
      
      setReceta(recetaData);
      
      // Detectar si usa sistema unificado y enriquecer ingredientes
      const esUnificado = detectarSistemaUnificado(ingredientesData);
      
      if (esUnificado) {
        console.log('🔄 Detectado sistema unificado, enriqueciendo ingredientes...');
        const ingredientesEnriquecidos = await enriquecerIngredientesUnificados(ingredientesData);
        setIngredientes(ingredientesEnriquecidos);
      } else {
        console.log('📋 Usando sistema tradicional');
        setIngredientes(ingredientesData);
      }
      
      setCostos(costosData);
    } catch (error) {
      console.error('Error al cargar datos de la receta:', error);
      toast.error('Error al cargar los detalles de la receta');
      navigate('/recetas');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Prepara la eliminación de la receta
   */
  const prepararEliminar = () => {
    setShowConfirmDialog(true);
  };
  
  /**
   * Elimina la receta
   */
  const confirmarEliminar = async () => {
    try {
      await recetasService.eliminar(id);
      toast.success('Receta eliminada correctamente');
      navigate('/recetas');
    } catch (error) {
      console.error('Error al eliminar receta:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la receta');
    } finally {
      setShowConfirmDialog(false);
    }
  };
  
  /**
   * Prepara la producción
   */
  const prepararProducir = () => {
    setShowProducirDialog(true);
  };
  
  /**
   * Crea una orden de producción
   */
  const confirmarProducir = async () => {
    try {
      if (cantidadProducir <= 0) {
        toast.error('La cantidad debe ser mayor a cero');
        return;
      }
      
      // Si es sistema unificado, usar el endpoint unificado
      if (sistemaUnificado) {
        console.log('🏭 Usando producción unificada...');
        
        // Obtener sucursal actual (se podría obtener del contexto)
        const sucursalId = 'sucursal-principal'; // TODO: Obtener de contexto real
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/produccion-unificada`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receta_id: id,
            cantidad: cantidadProducir,
            sucursal_id: sucursalId
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast.success('Producción completada. Materias primas descontadas automáticamente.');
          // Recargar datos para ver stock actualizado
          cargarDatos();
        } else {
          throw new Error(data.message || 'Error en producción unificada');
        }
      } else {
        // Sistema tradicional
        const response = await produccionService.crear({
          receta_id: id,
          cantidad: cantidadProducir,
          notas: `Producción iniciada desde la receta: ${receta.nombre}`
        });
        
        toast.success('Orden de producción creada correctamente');
        navigate(`/produccion/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error al crear orden de producción:', error);
      toast.error(error.message || 'Error al crear la orden de producción');
    } finally {
      setShowProducirDialog(false);
    }
  };
  
  /**
   * Formatea el costo con 2 decimales
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearCosto = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };
  
  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Si no se encontró la receta
  if (!receta) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <FaClipboardList className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            Receta no encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            La receta que intentas ver no existe o ha sido eliminada.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/recetas')}
            icon={<FaArrowLeft />}
          >
            Volver a Recetas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{receta.nombre}</h1>
          <p className="text-gray-600">
            Receta para: <span className="font-medium">{receta.producto_nombre}</span>
            {receta.producto_codigo && ` (${receta.producto_codigo})`}
          </p>
          {sistemaUnificado && (
            <div className="mt-1 flex items-center text-sm text-green-600">
              <FaChevronRight className="mr-1" />
              Sistema Unificado - Descuento automático de materias primas
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/recetas')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <Button
            color="primary"
            onClick={() => navigate(`/recetas/editar/${id}`)}
            icon={<FaEdit />}
          >
            Editar
          </Button>
          
          <Button
            color="danger"
            onClick={prepararEliminar}
            icon={<FaTrash />}
          >
            Eliminar
          </Button>
          
          <Button
            color="success"
            onClick={prepararProducir}
            icon={<FaIndustry />}
          >
            {sistemaUnificado ? 'Producir (Automático)' : 'Producir'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información general */}
        <Card
          title="Información General"
          icon={<FaClipboardList />}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {receta.nombre}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Producto:</p>
                  <p className="text-gray-600">{receta.producto_nombre}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Rendimiento:</p>
                  <p className="text-gray-600">{receta.rendimiento} {receta.rendimiento > 1 ? 'unidades' : 'unidad'}</p>
                </div>
                
                {receta.tiempo_preparacion && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tiempo:</p>
                    <p className="text-gray-600">{receta.tiempo_preparacion} minutos</p>
                  </div>
                )}
              </div>
            </div>
            
            {receta.descripcion && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Descripción:</p>
                <p className="text-gray-600">{receta.descripcion}</p>
              </div>
            )}
            
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Costos:
              </p>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Materias Primas:</span>
                  <span>{formatearCosto(costos.costo_materias_primas)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Mano de Obra:</span>
                  <span>{formatearCosto(receta.costo_mano_obra)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Adicionales:</span>
                  <span>{formatearCosto(receta.costo_adicional)}</span>
                </div>
                
                <div className="flex justify-between font-medium pt-1 border-t mt-1">
                  <span>Costo Total:</span>
                  <span>{formatearCosto(costos.costo_total)}</span>
                </div>
                
                <div className="flex justify-between font-medium text-green-600">
                  <span>Costo Unitario:</span>
                  <span>{formatearCosto(costos.costo_unitario)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Materias primas / Ingredientes */}
        <Card
          title={sistemaUnificado ? "Ingredientes (Sistema Unificado)" : "Materias Primas"}
          icon={<FaCubes />}
        >
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {ingredientes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No hay ingredientes en esta receta</p>
              </div>
            ) : (
              ingredientes.map(ingrediente => (
                <div 
                  key={ingrediente.id} 
                  className={`border rounded-lg p-3 transition-colors ${
                    sistemaUnificado ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {ingrediente.nombre || ingrediente.materia_prima_nombre || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ingrediente.cantidad} {ingrediente.unidad_medida || 'unidad'}
                      </p>
                      {ingrediente.codigo && (
                        <p className="text-xs text-gray-500">Código: {ingrediente.codigo}</p>
                      )}
                      {sistemaUnificado && (
                        <div className="text-xs text-green-600 mt-1">
                          <FaChevronRight className="inline mr-1" />
                          Stock se descuenta automáticamente
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Precio: ${parseFloat(ingrediente.precio_unitario || 0).toFixed(2)}/{ingrediente.unidad_medida || 'unidad'}
                      </p>
                      <p className="font-medium">
                        ${parseFloat(ingrediente.subtotal || 0).toFixed(2)}
                      </p>
                      
                      {/* Mostrar stock actual si está disponible */}
                      {ingrediente.stock_actual !== undefined && (
                        <div className="text-xs mt-1">
                          <span className={`${
                            parseFloat(ingrediente.stock_actual) < parseFloat(ingrediente.cantidad) 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            Stock: {ingrediente.stock_actual} {ingrediente.unidad_medida || 'unidad'}
                          </span>
                        </div>
                      )}
                      
                      {/* Advertencia de stock insuficiente */}
                      {parseFloat(ingrediente.stock_actual || 0) < parseFloat(ingrediente.cantidad || 0) && (
                        <div className="text-xs text-red-600 mt-1 flex items-center">
                          <FaExclamationTriangle className="mr-1" />
                          Stock insuficiente
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="border-t pt-3 mt-3">
            <Link to={`/recetas/editar/${id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
              <FaEdit className="mr-1" /> Editar ingredientes
            </Link>
          </div>
        </Card>
        
        {/* Instrucciones */}
        <Card
          title="Instrucciones"
          icon={<FaClipboardList />}
        >
          <div className="space-y-4">
            {!receta.instrucciones ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No hay instrucciones para esta receta</p>
                
                <div className="mt-4">
                  <Link to={`/recetas/editar/${id}`}>
                    <Button
                      color="secondary"
                      size="sm"
                      icon={<FaEdit />}
                    >
                      Agregar Instrucciones
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-gray-700 font-sans">
                  {receta.instrucciones}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Panel de acción para producir */}
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              ¿Listo para producir?
            </h3>
            <p className="text-gray-600">
              {sistemaUnificado 
                ? 'El sistema descontará automáticamente las materias primas del stock' 
                : 'Crea una orden de producción a partir de esta receta'
              }
            </p>
          </div>
          
          <Button
            color={sistemaUnificado ? "success" : "primary"}
            size="lg"
            onClick={prepararProducir}
            icon={<FaIndustry />}
          >
            {sistemaUnificado ? 'Producir Automáticamente' : 'Crear Orden de Producción'}
          </Button>
        </div>
      </Card>
      
      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Eliminar Receta"
        message={`¿Estás seguro de eliminar la receta "${receta.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={() => setShowConfirmDialog(false)}
      />
      
      {/* Diálogo para crear orden de producción */}
      <ConfirmDialog
        isOpen={showProducirDialog}
        title={sistemaUnificado ? "Producir Automáticamente" : "Crear Orden de Producción"}
        confirmText={sistemaUnificado ? "Producir Ahora" : "Crear Orden"}
        cancelText="Cancelar"
        onConfirm={confirmarProducir}
        onCancel={() => setShowProducirDialog(false)}
        customContent={
          <div className="py-2">
            <p className="mb-4">
              ¿Cuántas unidades de {receta.producto_nombre} quieres producir?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a Producir
              </label>
              <input
                type="number"
                min="1"
                value={cantidadProducir}
                onChange={(e) => setCantidadProducir(parseInt(e.target.value) || 1)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div className={`p-3 rounded-lg ${sistemaUnificado ? 'bg-green-50' : 'bg-blue-50'}`}>
              <div className="flex items-start">
                <FaMoneyBillWave className={`mt-1 mr-2 ${sistemaUnificado ? 'text-green-500' : 'text-blue-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${sistemaUnificado ? 'text-green-800' : 'text-blue-800'}`}>
                    {sistemaUnificado ? 'Producción Automática:' : 'Costos estimados:'}
                  </p>
                  <p className={`text-sm ${sistemaUnificado ? 'text-green-700' : 'text-blue-700'}`}>
                    Costo unitario: {formatearCosto(costos.costo_unitario)}
                  </p>
                  <p className={`text-sm ${sistemaUnificado ? 'text-green-700' : 'text-blue-700'}`}>
                    Costo total: {formatearCosto(costos.costo_unitario * cantidadProducir)}
                  </p>
                  {sistemaUnificado && (
                    <p className="text-sm text-green-700 mt-1 font-medium">
                      ✅ Las materias primas se descontarán automáticamente del stock
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default RecetaDetalle;