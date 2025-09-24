/**
 * Formulario para crear órdenes de producción
 * 
 * @module pages/produccion/ProduccionForm
 * @requires react, react-router-dom, ../../services/produccion.service
 * @related_files ./Produccion.js
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import recetasService from '../../services/recetas.service';
import produccionService from '../../services/produccion.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaIndustry, FaArrowLeft, FaSave, FaTimes, 
  FaClipboardList, FaBoxOpen, FaCubes, FaExclamationTriangle, FaCheck
} from 'react-icons/fa';

/**
 * Componente de formulario para crear órdenes de producción
 * @returns {JSX.Element} Componente ProduccionForm
 */
const ProduccionForm = () => {
  const navigate = useNavigate();
  const { sucursalSeleccionada } = useAuth();
  // Estado
  const [stockVerificado, setStockVerificado] = useState([]);
  const [stockSuficiente, setStockSuficiente] = useState(true);
  const [formData, setFormData] = useState({
    receta_id: '',
    cantidad: 1,
    notas: ''
  });
  
  const [recetas, setRecetas] = useState([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [costos, setCostos] = useState({});
  const [verificacionStock, setVerificacionStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificandoStock, setVerificandoStock] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [costoTotal, setCostoTotal] = useState(0);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarRecetas();
  }, []);
  
  /**
   * Carga detalles de la receta seleccionada
   */
  useEffect(() => {
    if (formData.receta_id && formData.cantidad > 0) {
      cargarDetallesReceta();
    }
  }, [formData.receta_id, formData.cantidad]);
  useEffect(() => {
  if (formData.receta_id && formData.cantidad && parseInt(formData.cantidad) > 0) {
    verificarStock();
  }
}, [formData.receta_id, formData.cantidad, sucursalSeleccionada?.id]);
  /**
   * Carga el listado de recetas
   */
  const cargarRecetas = async () => {
    try {
      setLoading(true);
      const data = await recetasService.obtenerActivas();
      setRecetas(data);
    } catch (error) {
      console.error('Error al cargar recetas:', error);
      toast.error('Error al cargar las recetas disponibles');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Carga detalles de la receta seleccionada
   */
  const cargarDetallesReceta = async () => {
	  try {
		setVerificandoStock(true);
		
		// Obtener receta
		const recetaData = await recetasService.obtenerPorId(formData.receta_id);
		setRecetaSeleccionada(recetaData);
		
		// Obtener ingredientes con manejo de errores
		try {
		  const ingredientesData = await recetasService.obtenerDetalle(formData.receta_id);
		  setIngredientes(Array.isArray(ingredientesData) ? ingredientesData : []);
		} catch (error) {
		  console.error('Error al obtener ingredientes:', error);
		  setIngredientes([]);
		}
		
		// Obtener costos con manejo de errores
		try {
		  const costosData = await recetasService.calcularCosto(formData.receta_id);
		  setCostos(costosData || {});
		} catch (error) {
		  console.error('Error al calcular costos:', error);
		  setCostos({});
		}
		
		// Verificar stock con manejo de errores
		try {
		  const verificacionData = await verificarStock();
		  setVerificacionStock(Array.isArray(verificacionData) ? verificacionData : []);
		} catch (error) {
		  console.error('Error al verificar stock:', error);
		  setVerificacionStock([]);
		}
		
		// Calcular costo total según cantidad
		const costoUnitario = parseFloat(costos.costo_unitario || 0);
		const cantidad = parseInt(formData.cantidad);
		setCostoTotal(costoUnitario * cantidad);
		
	  } catch (error) {
		console.error('Error al cargar detalles de receta:', error);
		toast.error('Error al cargar los detalles de la receta');
		// Resetear todos los estados en caso de error
		setRecetaSeleccionada(null);
		setIngredientes([]);
		setCostos({});
		setVerificacionStock([]);
	  } finally {
		setVerificandoStock(false);
	  }
	};
  
  /**
   * Verifica disponibilidad de stock
   * @returns {Promise<Array>} Lista de materias primas con su disponibilidad
   */
    const verificarStock = async () => {
	  if (!formData.receta_id || !formData.cantidad) return;
	  
	  try {
		console.log('🔍 [ProduccionForm] Verificando stock para:', {
		  receta_id: formData.receta_id,
		  cantidad: formData.cantidad,
		  sucursal_id: sucursalSeleccionada?.id
		});
		
		const response = await recetasService.verificarStock(
		  formData.receta_id, 
		  parseInt(formData.cantidad),
		  sucursalSeleccionada?.id || null
		);
		
		console.log('📦 [ProduccionForm] Respuesta de verificación:', response);
		console.log('📦 [ProduccionForm] Respuesta COMPLETA:', response);
		console.log('📦 [ProduccionForm] Tipo de response:', typeof response);
		console.log('📦 [ProduccionForm] Es array?:', Array.isArray(response));
		console.log('📦 [ProduccionForm] Tiene data?:', response?.data);
    
		// ARREGLO: La respuesta puede venir de dos formas
		let dataArray = [];
		let stockSuficienteFlag = false;
		
		if (Array.isArray(response)) {
		  // Si response es directamente un array
		  dataArray = response;
		  stockSuficienteFlag = response.every(item => item.suficiente !== false);
		} else if (response && response.data) {
		  // Si response es un objeto con data
		  dataArray = response.data || [];
		  stockSuficienteFlag = response.stock_suficiente || false;
		}
		
		setStockVerificado(dataArray);
		setStockSuficiente(stockSuficienteFlag);
		
		if (!stockSuficienteFlag && dataArray.length > 0) {
		  const faltantes = dataArray
			.filter(item => !item.suficiente)
			.map(item => `${item.nombre}: faltan ${(item.faltante || 0).toFixed(2)} ${item.unidad_medida || 'unidades'}`)
			.join('\n');
		  
		  if (faltantes) {
			toast.warning(`Stock insuficiente:\n${faltantes}`);
		  }
		}
	  } catch (error) {
		console.error('Error al verificar stock:', error);
		toast.error('Error al verificar disponibilidad de materias primas');
		setStockVerificado([]);
		setStockSuficiente(false);
	  }
	};
  
  /**
   * Maneja cambios en los campos del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Verifica si hay suficiente stock para producir
   * @returns {boolean} True si hay stock suficiente
   */
  const hayStockSuficiente = () => {
  // Validar que verificacionStock sea un array
	  if (!Array.isArray(verificacionStock)) {
		return false;
	  }
	  
	  return verificacionStock.length > 0 && !verificacionStock.some(item => !item.disponible);
	};
  
  /**
   * Envía el formulario
   * @param {Event} e - Evento de envío
   */
	const handleSubmit = async (e) => {
	  e.preventDefault();
	  
	  // Validaciones
	  if (!formData.receta_id) {
		toast.error('Debes seleccionar una receta');
		return;
	  }
	  
	  if (formData.cantidad < 1) {
		toast.error('La cantidad debe ser mayor a cero');
		return;
	  }
	  
	  if (!stockSuficiente) {
		toast.error('No hay suficiente stock de materias primas');
		return;
	  }
	  
	  setGuardando(true);
	  
	  try {
		// IMPORTANTE: Agregar sucursal_id aquí
		const datosOrden = {
		  receta_id: formData.receta_id,
		  cantidad: formData.cantidad,
		  notas: formData.notas || '',
		  sucursal_id: sucursalSeleccionada?.id || 'XAgAo1pwSJ0vYITYXhLl' // ← ASEGURAR QUE SE ENVÍE
		};
		
		console.log('📤 ENVIANDO ORDEN:', datosOrden);
		
		const response = await produccionService.crear(datosOrden);
		
		toast.success('Orden de producción creada correctamente');
		navigate(`/produccion/${response.id}`);
	  } catch (error) {
		console.error('Error al crear orden de producción:', error);
		toast.error(error.response?.data?.message || 'Error al crear la orden de producción');
	  } finally {
		setGuardando(false);
	  }
	};
  
  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Nueva Orden de Producción
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/produccion')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Datos generales */}
          <Card title="Información de la Orden" icon={<FaIndustry />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receta *
                </label>
                <select
                  name="receta_id"
                  value={formData.receta_id}
                  onChange={handleChange}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Selecciona una receta</option>
                  {recetas.map((receta) => (
                    <option key={`receta-${receta.id}`} value={receta.id}>
                      {receta.nombre} - {receta.producto_nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a Producir *
                </label>
                <input
                  type="number"
                  name="cantidad"
                  value={formData.cantidad}
                  onChange={handleChange}
                  min={1}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Unidades del producto final
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Observaciones o detalles adicionales..."
                />
              </div>
              
              {recetaSeleccionada && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Detalles del Producto:</h3>
                  
                  <div className="flex items-center mb-2">
                    <FaBoxOpen className="mr-2 text-gray-500" />
                    <span className="font-medium">{recetaSeleccionada.producto_nombre}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm mb-2">
                    <span>Rendimiento por receta:</span>
                    <span>{recetaSeleccionada.rendimiento} unidades</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Costo unitario:</span>
                    <span>${parseFloat(costos.costo_unitario || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Costos y Resumen */}
          <Card title="Costos y Totales" icon={<FaSave />}>
            {verificandoStock ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : !formData.receta_id ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Selecciona una receta para ver los costos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-800 mb-2">Resumen de Producción:</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Producto:</p>
                      <p className="font-medium">{recetaSeleccionada?.producto_nombre}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Cantidad:</p>
                      <p className="font-medium">{formData.cantidad} unidades</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Costo Unitario:</span>
                    <span>${parseFloat(costos.costo_unitario || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Cantidad:</span>
                    <span>× {formData.cantidad}</span>
                  </div>
                  
                  <div className="flex justify-between font-medium text-base mb-2 border-t pt-2">
                    <span>Costo Total:</span>
                    <span className="text-blue-600">${costoTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Verificación de Stock */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-gray-800 mb-2">Estado de Materias Primas:</h3>
                  
                  {verificacionStock.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay información de stock disponible</p>
                  ) : !hayStockSuficiente() ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <FaExclamationTriangle className="text-red-500 mt-1 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Stock insuficiente</p>
                          <p className="text-sm text-red-700">
                            No hay suficientes materias primas para esta producción
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Stock disponible</p>
                          <p className="text-sm text-green-700">
                            Hay suficientes materias primas para producir
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
          
          {/* Estado de Materias Primas */}
			<Card title="Materias Primas Necesarias" icon={<FaCubes />}>
			  <div className="space-y-3">
				{stockVerificado.length === 0 ? (
				  <p className="text-gray-500 text-center py-4">
					Selecciona una receta y cantidad para verificar disponibilidad
				  </p>
				) : (
				  <>
					{!stockSuficiente && (
					  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
						<div className="flex items-center">
						  <FaExclamationTriangle className="text-red-500 mr-2" />
						  <p className="text-red-700 font-medium">
							Stock insuficiente
						  </p>
						</div>
						<p className="text-red-600 text-sm mt-1">
						  No hay suficientes materias primas para esta producción
						</p>
					  </div>
					)}
					
					<div className="space-y-2">
					  {stockVerificado.map((item, index) => (
						<div 
						  key={`stock-${index}`} 
						  className={`p-3 rounded-lg border ${
							item.suficiente 
							  ? 'bg-green-50 border-green-200' 
							  : 'bg-red-50 border-red-200'
						  }`}
						>
						  <div className="flex justify-between items-center">
							<div>
							  <p className="font-medium text-gray-800">
								{item.nombre}
							  </p>
							  <p className="text-sm text-gray-600">
								Necesario: {item.cantidad_necesaria.toFixed(2)} {item.unidad_medida}
							  </p>
							</div>
							<div className="text-right">
							  <p className={`font-medium ${
								item.suficiente ? 'text-green-600' : 'text-red-600'
							  }`}>
								Disponible: {item.stock_actual.toFixed(2)} {item.unidad_medida}
							  </p>
							  {!item.suficiente && (
								<p className="text-sm text-red-500">
								  Faltan: {item.faltante.toFixed(2)} {item.unidad_medida}
								</p>
							  )}
							</div>
						  </div>
						</div>
					  ))}
					</div>
					
					{stockSuficiente && (
					  <div className="mt-3 p-3 bg-green-100 rounded-lg">
						<p className="text-green-700 text-center font-medium">
						  ✅ Stock suficiente para producir
						</p>
					  </div>
					)}
				  </>
				)}
			  </div>
			</Card>

			{/* También agregar el botón de crear orden con validación */}
			<div className="flex justify-end space-x-2">
			  <Button
				type="button"
				color="secondary"
				onClick={() => navigate('/produccion')}
				icon={<FaTimes />}
			  >
				Cancelar
			  </Button>
			  
			  <Button
				type="submit"
				color="primary"
				loading={guardando}
				disabled={!stockSuficiente} // Deshabilitar si no hay stock
				icon={<FaSave />}
			  >
				Crear Orden
			  </Button>
			</div>

        </div>
      </form>
    </div>
  );
};

export default ProduccionForm;