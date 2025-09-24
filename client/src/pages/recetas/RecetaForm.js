/**
 * Formulario para crear o editar recetas - CORREGIDO PARA SISTEMA UNIFICADO
 * 
 * @module pages/recetas/RecetaForm
 * @requires react, react-router-dom, ../../services/recetas.service
 * @related_files ./Recetas.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import recetasService from '../../services/recetas.service';
import productosService from '../../services/productos.service';
import materiasPrimasHelper from '../../services/materiasPrimasHelper';
// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Hooks
import { useAuth } from '../../contexts/AuthContext';

// Iconos
import { 
  FaClipboardList, FaArrowLeft, FaSave, FaTimes, 
  FaPlus, FaTrash, FaBoxOpen, FaCubes, FaCalculator,
  FaMoneyBillWave, FaStore
} from 'react-icons/fa';

/**
 * Componente de formulario para recetas
 * @returns {JSX.Element} Componente RecetaForm
 */
const RecetaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = !!id;
  
  // Obtener datos de autenticación y sucursal
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles } = useAuth() || {};
  
  // Estado
  const [formData, setFormData] = useState({
    producto_id: '',
    nombre: '',
    descripcion: '',
    rendimiento: '1',  // Como string para el input
    tiempo_preparacion: '',
    instrucciones: '',
    costo_mano_obra: '0',
    costo_adicional: '0'
  });
  
  const [detalles, setDetalles] = useState([
     { materia_prima_id: '', cantidad: '', costo: 0, notas: '' }
  ]);
  
  const [productos, setProductos] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [costoTotal, setCostoTotal] = useState(0);
  const [costoUnitario, setCostoUnitario] = useState(0);
  
  // Nuevo estado para selección de sucursal local
  const [sucursalActiva, setSucursalActiva] = useState(sucursalSeleccionada?.id || '');
  
  /**
	 * Obtiene materias primas con stock por sucursal usando una conexión directa
	 */
	const obtenerMateriasPrimasUnificadas = async () => {
	  try {
		console.log('🔄 Obteniendo materias primas del sistema unificado...');
		
		// Obtener la sucursal activa
		const sucursalId = sucursalActiva || sucursalSeleccionada?.id;
		console.log('📍 Consultando stock para sucursal:', sucursalId || 'ninguna');
		
		// Pasar el ID de sucursal al helper
		const materiasPrimas = await materiasPrimasHelper.obtenerTodas(sucursalId);
		
		console.log(`📦 Materias primas obtenidas: ${materiasPrimas.length}`);
		
		// Agregar precio_unitario para compatibilidad
		const materiasPrimasConPrecio = materiasPrimas.map(mp => ({
		  ...mp,
		  precio_unitario: mp.precio_costo || mp.precio_venta || 0,
		  stock_actual: mp.stock_actual || 0
		}));
		
		// Log de verificación
		materiasPrimasConPrecio.forEach(mp => {
		  if (mp.nombre.includes('PECHUGA')) {
			console.log(`🥩 ${mp.nombre}: Stock = ${mp.stock_actual} ${mp.unidad_medida}`);
		  }
		});
		
		return materiasPrimasConPrecio;
		
	  } catch (error) {
		console.error('❌ Error al obtener materias primas:', error);
		return [];
	  }
	};
  
  // Carga inicial
  useEffect(() => {
    cargarDatos();
  }, [id]);
  
  // Efecto para cuando cambia la sucursal
  useEffect(() => {
    if (sucursalActiva !== (sucursalSeleccionada?.id || '')) {
      console.log(`🏬 Sucursal cambiada a: ${sucursalActiva || 'ninguna'}`);
      cargarDatos();
    }
  }, [sucursalActiva]);
  
  // Calcular costos cuando cambian detalles o costos adicionales
  useEffect(() => {
    calcularCostos();
  }, [detalles, formData.costo_mano_obra, formData.costo_adicional, formData.rendimiento]);
  
  // Cargar datos iniciales
  const cargarDatos = async () => {
	  try {
		setLoading(true);
		
		// Cargar productos primero
		const productosData = await productosService.obtenerTodos();
		setProductos(productosData);
		
		// Cargar materias primas CON la sucursal seleccionada
		const materiasPrimasData = await obtenerMateriasPrimasUnificadas();
		console.log('📊 Materias primas cargadas con stock:', materiasPrimasData.length);
		setMateriasPrimas(materiasPrimasData);
		
		// Si es edición, cargar receta
		if (esEdicion) {
		  const receta = await recetasService.obtenerPorId(id);
		  const detallesReceta = await recetasService.obtenerDetalle(id);
		  
		  setFormData({
			producto_id: String(receta.producto_id),
			nombre: receta.nombre,
			descripcion: receta.descripcion || '',
			rendimiento: String(receta.rendimiento),
			tiempo_preparacion: receta.tiempo_preparacion ? String(receta.tiempo_preparacion) : '',
			instrucciones: receta.instrucciones || '',
			costo_mano_obra: String(receta.costo_mano_obra || 0),
			costo_adicional: String(receta.costo_adicional || 0)
		  });
		  
		  if (detallesReceta.length > 0) {
			setDetalles(detallesReceta.map(d => ({
			  materia_prima_id: String(d.materia_prima_id || d.producto_ingrediente_id || d.producto_id),
			  cantidad: String(d.cantidad),
			  costo: parseFloat(d.subtotal) || 0
			})));
		  }
		}
	  } catch (error) {
		console.error('Error al cargar datos:', error);
		toast.error('Error al cargar datos necesarios');
	  } finally {
		setLoading(false);
	  }
	};
  
  // Manejar cambios en el formulario principal
  const handleChange = (e) => {
	  const { name, value } = e.target;
	  
	  // Log temporal para depuración del select de productos
	  if (name === 'producto_id') {
		console.log('Cambiando producto:', {
		  nuevoValor: value,
		  tipoValor: typeof value,
		  productosDisponibles: productos.map(p => ({ id: p.id, nombre: p.nombre }))
		});
	  }
	  
	  setFormData(prev => ({
		...prev,
		[name]: value
	  }));
	};
  
  // Manejar cambios en los detalles
	const handleDetalleChange = (index, campo, valor) => {
	  const nuevosDetalles = [...detalles];
	  nuevosDetalles[index][campo] = valor;
	  
	  // Si cambia la materia prima o la cantidad, calcular costo
	  if (campo === 'materia_prima_id' || campo === 'cantidad') {
		// CORRECCIÓN: No usar parseInt ya que los IDs de Firebase son strings
		const materiaPrima = materiasPrimas.find(
		  mp => mp.id === nuevosDetalles[index].materia_prima_id // SIN parseInt
		);
		
		// Log temporal para depuración
		console.log('Buscando materia prima:', {
		  buscandoId: nuevosDetalles[index].materia_prima_id,
		  materiaPrimaEncontrada: materiaPrima,
		  todasLasMateriasPrimas: materiasPrimas.map(mp => ({ id: mp.id, nombre: mp.nombre }))
		});
		
		if (materiaPrima && nuevosDetalles[index].cantidad && parseFloat(nuevosDetalles[index].cantidad) > 0) {
		  const precioUnitario = parseFloat(materiaPrima.precio_unitario) || 0;
		  const cantidad = parseFloat(nuevosDetalles[index].cantidad) || 0;
		  nuevosDetalles[index].costo = precioUnitario * cantidad;
		  
		  console.log('Cálculo realizado:', {
			precioUnitario,
			cantidad,
			costoCalculado: nuevosDetalles[index].costo
		  });
		} else {
		  nuevosDetalles[index].costo = 0;
		}
	  }
	  
	  setDetalles(nuevosDetalles);
	};
  
  // Calcular costos totales
  const calcularCostos = () => {
    // Costo de materias primas
    const costoMateriasPrimas = detalles.reduce(
      (total, detalle) => total + parseFloat(detalle.costo || 0), 
      0
    );
    
    // Costo total
    const total = costoMateriasPrimas + 
                parseFloat(formData.costo_mano_obra || 0) + 
                parseFloat(formData.costo_adicional || 0);
    
    setCostoTotal(total);
    
    // Costo unitario
    const rendimiento = parseInt(formData.rendimiento) || 1;
    setCostoUnitario(total / rendimiento);
  };
  
  // Agregar detalle
  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      { materia_prima_id: '', cantidad: '', costo: 0, notas: '' }
    ]);
  };
  
  // Eliminar detalle
  const eliminarDetalle = (index) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };
  
  // Enviar formulario
	const handleSubmit = async (e) => {
	  e.preventDefault();
	  
	  // Log para depuración
	  console.log('Datos del formulario antes de enviar:', {
		formData,
		detalles
	  });
	  
	  // Validaciones...
	  if (!formData.producto_id || formData.producto_id === '') {
		toast.error('Selecciona un producto');
		return;
	  }
	  
	  if (!formData.nombre) {
		toast.error('El nombre de la receta es obligatorio');
		return;
	  }
	  
	  if (formData.rendimiento < 1) {
		toast.error('El rendimiento debe ser al menos 1');
		return;
	  }
	  
	  if (detalles.length === 0 || detalles.some(d => !d.materia_prima_id || !d.cantidad)) {
		toast.error('Debes agregar al menos una materia prima con cantidad');
		return;
	  }
	  
	  setGuardando(true);
	  
	  try {
		// Preparar datos para enviar
		const datosAEnviar = {
		  ...formData,
		  producto_id: String(formData.producto_id),
		  rendimiento: parseInt(formData.rendimiento) || 1,
		  tiempo_preparacion: formData.tiempo_preparacion ? parseInt(formData.tiempo_preparacion) : null,
		  costo_mano_obra: parseFloat(formData.costo_mano_obra) || 0,
		  costo_adicional: parseFloat(formData.costo_adicional) || 0,
		  sucursal_id: sucursalActiva || sucursalSeleccionada?.id || null,
		  sucursal_nombre: sucursalesDisponibles.find(s => s.id === (sucursalActiva || sucursalSeleccionada?.id))?.nombre || null
		};
		
		// IMPORTANTE: Convertir materia_prima_id a producto_id en los detalles
		const detallesParaEnviar = detalles.map(detalle => ({
		  producto_id: detalle.materia_prima_id, // MAPEO: materia_prima_id → producto_id
		  cantidad: parseFloat(detalle.cantidad),
		  notas: detalle.notas || ''
		}));
		
		// Log para verificar lo que se envía
		console.log('📤 Enviando datos:', {
		  receta: datosAEnviar,
		  ingredientes: detallesParaEnviar
		});
		
		// Verificar que todos los ingredientes tengan producto_id
		const ingredientesInvalidos = detallesParaEnviar.filter(d => !d.producto_id || !d.cantidad);
		if (ingredientesInvalidos.length > 0) {
		  console.error('❌ Ingredientes inválidos:', ingredientesInvalidos);
		  toast.error('Hay ingredientes sin producto o cantidad');
		  setGuardando(false);
		  return;
		}
		
		if (esEdicion) {
		  await recetasService.actualizar(id, datosAEnviar, detallesParaEnviar);
		  toast.success('Receta actualizada correctamente');
		} else {
		  await recetasService.crear(datosAEnviar, detallesParaEnviar);
		  toast.success('Receta creada correctamente');
		}
		
		navigate('/recetas');
	  } catch (error) {
		console.error('Error al guardar receta:', error);
		toast.error(error.response?.data?.message || error.message || 'Error al guardar la receta');
	  } finally {
		setGuardando(false);
	  }
	};
  
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {esEdicion ? 'Editar Receta' : 'Nueva Receta'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/recetas')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      {/* Selector de sucursal */}
      {sucursalesDisponibles && sucursalesDisponibles.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <div className="flex items-center mb-2">
            <FaStore className="text-blue-500 mr-2" />
            <h3 className="font-medium text-blue-700">Seleccionar Sucursal para Stock</h3>
          </div>
          <p className="text-sm text-blue-600 mb-3">
            Seleccione la sucursal para verificar el stock disponible de materias primas
          </p>
          <div className="flex flex-wrap gap-2">
            {sucursalesDisponibles.map(sucursal => (
              <button
                key={sucursal.id}
                onClick={() => setSucursalActiva(sucursal.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  (sucursalActiva || sucursalSeleccionada?.id) === sucursal.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-blue-600 border border-blue-300'
                }`}
              >
                {sucursal.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda - Información General */}
          <div className="space-y-6">
            {/* Datos generales */}
            <Card title="Información General" icon={<FaClipboardList />}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    name="producto_id"
                    value={formData.producto_id || ''}
                    onChange={handleChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map((producto) => (
                      <option key={`producto-${producto.id}`} value={String(producto.id)}>
                        {producto.codigo ? `${producto.codigo} - ` : ''}{producto.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Receta *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={3}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rendimiento (unidades) *
                    </label>
                    <input
                      type="number"
                      name="rendimiento"
                      value={formData.rendimiento}
                      onChange={handleChange}
                      min={1}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Unidades que se obtienen
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tiempo (min)
                    </label>
                    <input
                      type="number"
                      name="tiempo_preparacion"
                      value={formData.tiempo_preparacion}
                      onChange={handleChange}
                      min={1}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Instrucciones */}
            <Card title="Instrucciones" icon={<FaClipboardList />}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pasos de Preparación
                </label>
                <textarea
                  name="instrucciones"
                  value={formData.instrucciones}
                  onChange={handleChange}
                  rows={6}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Escribe aquí las instrucciones paso a paso..."
                />
              </div>
            </Card>
          </div>
          
          {/* Columna Derecha - Costos */}
          <div className="space-y-6">
            {/* Costos adicionales */}
            <Card title="Costos Adicionales" icon={<FaMoneyBillWave />}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de Mano de Obra
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="costo_mano_obra"
                      value={formData.costo_mano_obra}
                      onChange={handleChange}
                      min={0}
                      step={0.01}
                      className="block w-full border-gray-300 pl-7 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Costo del trabajo para elaborar la receta
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Otros Costos
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="costo_adicional"
                      value={formData.costo_adicional}
                      onChange={handleChange}
                      min={0}
                      step={0.01}
                      className="block w-full border-gray-300 pl-7 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Electricidad, gas, depreciación, etc.
                  </p>
                </div>
                
                <div className="border-t pt-4 mt-4 bg-gray-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Resumen de Costos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Materias Primas:</span>
                      <span className="font-medium">${detalles.reduce((sum, d) => sum + parseFloat(d.costo || 0), 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mano de Obra:</span>
                      <span className="font-medium">${parseFloat(formData.costo_mano_obra || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm pb-2">
                      <span className="text-gray-600">Otros Costos:</span>
                      <span className="font-medium">${parseFloat(formData.costo_adicional || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between font-medium text-base border-t pt-2">
                      <span>Costo Total:</span>
                      <span className="text-blue-600">${costoTotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between font-medium text-lg text-green-600 border-t pt-2">
                      <span>Costo Por Unidad:</span>
                      <span>${costoUnitario.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Materias primas - Sección expandida */}
        <Card 
          title="Materias Primas / Ingredientes (Sistema Unificado)" 
          className="mt-6"
          icon={<FaCubes />}
        >
          <div className="space-y-4">
            {/* Información de stock por sucursal */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <div className="flex items-center">
                <FaStore className="text-blue-600 mr-2" />
                <span className="font-medium">
                  Mostrando stock para: {
                    sucursalesDisponibles.find(s => s.id === (sucursalActiva || sucursalSeleccionada?.id))?.nombre || 
                    'No se ha seleccionado sucursal'
                  }
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-700">
                El stock mostrado corresponde a la sucursal seleccionada. Cambie la sucursal si necesita verificar disponibilidad en otra ubicación.
              </p>
            </div>
            
            {/* Lista de materias primas con total */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {detalles.map((detalle, index) => {
                  const materiaPrima = materiasPrimas.find(
                    mp => mp.id === detalle.materia_prima_id // SIN parseInt para Firebase IDs
                  );
                  
                  return (
                    <div key={`detalle-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        {/* Materia Prima - 5 columnas */}
                        <div className="md:col-span-5">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Materia Prima *
                          </label>
                          <select
                            value={detalle.materia_prima_id}
                            onChange={(e) => handleDetalleChange(index, 'materia_prima_id', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          >
                            <option value="">Seleccionar materia prima</option>
                            {materiasPrimas.map(mp => (
                              <option key={`mp-${mp.id}`} value={mp.id}>
                                {mp.nombre} - ${parseFloat(mp.precio_unitario || mp.precio_costo || 0).toFixed(2)}/{mp.unidad_medida || 'unidad'}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Cantidad - 3 columnas */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad *
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={detalle.cantidad}
                              onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)}
                              min="0.01"
                              step="0.01"
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              required
                            />
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              {materiaPrima?.unidad_medida || 'unidad'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Costo - 3 columnas */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subtotal
                          </label>
                          <div className="bg-gray-100 px-3 py-2 rounded-md">
                            <span className="text-lg font-bold text-gray-900">
                              ${parseFloat(detalle.costo || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Botón eliminar - 1 columna */}
                        <div className="md:col-span-1 flex justify-end">
                          <Button
                            type="button"
                            color="danger"
                            size="sm"
                            icon={<FaTrash />}
                            onClick={() => eliminarDetalle(index)}
                            disabled={detalles.length === 1}
                            title="Eliminar ingrediente"
                          />
                        </div>
                      </div>
                      
                      {/* Información adicional de la materia prima */}
                      {materiaPrima && (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm text-gray-600 bg-green-50 p-3 rounded border border-green-200">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium">Precio unitario:</span> 
                                <span className="text-gray-900 ml-1">
								${parseFloat(materiaPrima.precio_unitario || materiaPrima.precio_costo || 0).toFixed(2)}/{materiaPrima.unidad_medida || 'unidad'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Stock disponible:</span> 
                                <span className={`ml-1 ${materiaPrima.stock_actual < parseFloat(detalle.cantidad || 0) ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}`}>
                                  {materiaPrima.stock_actual} {materiaPrima.unidad_medida}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-green-600 font-medium">
                              ✅ Mostrando stock específico para: {
                                sucursalesDisponibles.find(s => s.id === (sucursalActiva || sucursalSeleccionada?.id))?.nombre || 
                                'Sin sucursal seleccionada'
                              }
                            </div>
                            {materiaPrima.stock_actual < parseFloat(detalle.cantidad || 0) && (
                              <div className="mt-2 text-red-600 font-medium">
                                ⚠️ Stock insuficiente - Faltan {(parseFloat(detalle.cantidad || 0) - materiaPrima.stock_actual).toFixed(2)} {materiaPrima.unidad_medida}
                              </div>
                            )}
                          </div>
                          
                          {/* Cálculo del costo */}
                          {detalle.cantidad && parseFloat(detalle.cantidad) > 0 && (
                            <div className="bg-blue-50 p-3 rounded text-sm">
                              <div className="text-blue-900">
                                <span className="font-medium">Cálculo:</span> 
                                <span className="ml-2">
                                  {parseFloat(detalle.cantidad).toFixed(2)} {materiaPrima.unidad_medida} × 
                                  ${parseFloat(materiaPrima.precio_unitario).toFixed(2)} = 
                                  <span className="font-bold ml-1">
                                    ${(parseFloat(detalle.cantidad) * parseFloat(materiaPrima.precio_unitario)).toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Total de materias primas */}
              {detalles.length > 0 && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-indigo-900">
                      Total Materias Primas:
                    </span>
                    <span className="text-xl font-bold text-indigo-900">
                      ${detalles.reduce((sum, d) => sum + parseFloat(d.costo || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              type="button"
              color="secondary"
              onClick={agregarDetalle}
              icon={<FaPlus />}
              className="w-full md:w-auto"
            >
              Agregar Ingrediente
            </Button>
          </div>
        </Card>
        
        {/* Resumen Final de Costos */}
        <Card 
          title="Resumen de Costos de la Receta" 
          className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50"
          icon={<FaCalculator />}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 mb-1">Total Materias Primas</p>
              <p className="text-2xl font-bold text-gray-900">
                ${detalles.reduce((sum, d) => sum + parseFloat(d.costo || 0), 0).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 mb-1">Costos Adicionales</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(parseFloat(formData.costo_mano_obra || 0) + parseFloat(formData.costo_adicional || 0)).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 mb-1">Costo Total Receta</p>
              <p className="text-2xl font-bold text-blue-600">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium text-green-900">
                  Costo por Unidad 
                  <span className="text-sm font-normal ml-2">
                    (para {formData.rendimiento || 1} {parseInt(formData.rendimiento || 1) === 1 ? 'unidad' : 'unidades'})
                  </span>
                </p>
              </div>
              <p className="text-3xl font-bold text-green-900">
                ${costoUnitario.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        
        {/* Botones de acción */}
        <div className="flex justify-end space-x-2 pt-6">
          <Button
            type="button"
            color="secondary"
            onClick={() => navigate('/recetas')}
            icon={<FaTimes />}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            color="primary"
            loading={guardando}
            icon={<FaSave />}
          >
            {esEdicion ? 'Actualizar Receta' : 'Crear Receta'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RecetaForm;