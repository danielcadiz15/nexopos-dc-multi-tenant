/**
 * Página de Punto de Venta con gestión de sucursales y listas de precios
 * VERSIÓN CORREGIDA - CONTROL DE PAGOS PARCIALES RESTAURADO
 * 
 * Interfaz para realizar ventas rápidas con búsqueda de productos,
 * carrito, aplicación de descuentos, listas de precios diferenciadas
 * y finalización de venta con pagos parciales.
 * 
 * @module pages/ventas/PuntoVenta
 * @requires react, ../../services/productos.service, ../../services/ventas.service
 * @related_files ../../components/modules/ventas/*, ../ventas/VentaDetalle.js
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import productosService from '../../services/productos.service';
import ventasService from '../../services/ventas.service';
import clientesService from '../../services/clientes.service';
import promocionesService from '../../services/promociones.service';
import ClienteDialog from '../../components/modules/ventas/ClienteDialog';
import ConfiguracionMargenesModal from '../../components/modules/ventas/ConfiguracionMargenesModal';
import TicketVenta from '../../components/modules/ventas/TicketVenta';

// Hooks
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaSearch, FaShoppingCart, FaPlus, FaMinus, FaTrash, 
  FaUserPlus, FaPercentage, FaCreditCard, FaMoneyBill,
  FaReceipt, FaSave, FaMobile, FaCheck, FaClock,
  FaCalculator, FaStore, FaExclamationTriangle, FaTags, FaPercent,
  FaEdit, FaUser, FaUserTag
} from 'react-icons/fa';

// Variable para evitar llamadas duplicadas de promociones
let isApplyingPromotions = false;

/**
 * Componente de página para el punto de venta
 * @returns {JSX.Element} Componente PuntoVenta
 */
const PuntoVenta = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles, hasPermission } = useAuth();

  const verificarPermisoEditarPrecios = () => {
	  if (!currentUser) return false;
	  
	  // Verificar por rol
	  if (currentUser.rol === 'admin' || currentUser.rol === 'gerente') return true;
	  if (currentUser.role === 'admin' || currentUser.role === 'gerente') return true;
	  if (currentUser.isAdmin === true) return true;
	  
	  // Verificar array de permisos si existe
	  if (Array.isArray(currentUser.permisos)) {
		return currentUser.permisos.includes('editar_precios');
	  }
	  
	  return false;
	};

	const puedeEditarPrecios = hasPermission('listas_precios', 'editar') || 
                          hasPermission('ventas', 'editar') ||
                          currentUser?.rol === 'Administrador';
  const searchInputRef = useRef(null);
  const [showTicket, setShowTicket] = useState(false);
  const [ventaCreada, setVentaCreada] = useState(null);
  // Obtener sucursal preseleccionada desde navegación
  const sucursalPreseleccionada = location.state?.sucursal_preseleccionada;
  
  // Estado general
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Estado del carrito
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [deudasCliente, setDeudasCliente] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referenciaMercadoPago, setReferenciaMercadoPago] = useState('');
  const [descuentoGeneral, setDescuentoGeneral] = useState(0);
  const [descuentoGeneralTipo, setDescuentoGeneralTipo] = useState('porcentaje');
  
  // ✅ CORREGIDO: Estados de pago con valores por defecto correctos
  const [estadoPago, setEstadoPago] = useState('pendiente'); // ← CAMBIO: Valor por defecto correcto
  const [montoPagado, setMontoPagado] = useState(0); // ← CAMBIO: Inicia en 0, no en total
  
  // Estado para sucursal
  const [sucursalVenta, setSucursalVenta] = useState(
    sucursalPreseleccionada || sucursalSeleccionada?.id || ''
  );
  
  // CAMBIO: Lista por defecto ahora es 'interior'
  const [listaSeleccionada, setListaSeleccionada] = useState('interior');
  
  // Estado de diálogos
  const [showClienteDialog, setShowClienteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showConfigMargenesModal, setShowConfigMargenesModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [ventaEnProceso, setVentaEnProceso] = useState(false);
  
  /**
   * Establece el foco en el campo de búsqueda al cargar y configura sucursal
   */
  useEffect(() => {
    // Esperar a que el componente se monte completamente
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
    
    // Configurar sucursal inicial
    if (sucursalPreseleccionada) {
      setSucursalVenta(sucursalPreseleccionada);
    } else if (sucursalSeleccionada) {
      setSucursalVenta(sucursalSeleccionada.id);
    } else if (sucursalesDisponibles && sucursalesDisponibles.length === 1) {
      setSucursalVenta(sucursalesDisponibles[0].id);
    }
    
    return () => clearTimeout(timer);
  }, [sucursalPreseleccionada, sucursalSeleccionada, sucursalesDisponibles]);
  
  /**
   * Cambiar lista cuando se selecciona un cliente
   */
  useEffect(() => {
    // Si el cliente tiene una lista predeterminada, seleccionarla automáticamente
    if (cliente?.lista_precio_default) {
      setListaSeleccionada(cliente.lista_precio_default);
      toast.info(`Lista cambiada a "${cliente.lista_precio_default}" (predeterminada para este cliente)`);
    }
  }, [cliente]);

  /**
   * ✅ NUEVO: Efecto para recalcular monto pagado cuando cambia el total
   */
  useEffect(() => {
    const totales = calcularTotales();
    
    // Si el estado es "completada", actualizar automáticamente el monto pagado
    if (estadoPago === 'completada') {
      setMontoPagado(totales.total);
    }
    // Si el estado es "pendiente" y el monto pagado es mayor al total, ajustarlo
    else if (estadoPago === 'pendiente' && montoPagado > totales.total) {
      setMontoPagado(totales.total);
    }
  }, [carrito, descuentoGeneral, descuentoGeneralTipo, estadoPago, listaSeleccionada]);
  
  /**
   * Función para calcular precio con margen
   */
  const calcularPrecioConMargen = (costo, margen) => {
    return costo * (1 + margen / 100);
  };

  /**
   * Función para aplicar márgenes guardados
   */
  const aplicarMargenesGuardados = (producto) => {
    const margenesGuardados = localStorage.getItem('margenes_listas');
    
    if (!margenesGuardados || !producto.precio_costo) {
      return producto.precio_venta || 0;
    }
    
    const margenes = JSON.parse(margenesGuardados);
    const margenLista = margenes[listaSeleccionada] || margenes.interior || 40;
    
    return calcularPrecioConMargen(producto.precio_costo, margenLista);
  };
  
  /**
   * Busca productos por código o nombre
   */
  const buscarProductos = async (termino = null) => {
    console.log('🔧 MÉTODO USADO:', 'buscarConStockPorSucursal');
    console.log('🔧 PARÁMETROS:', { termino, sucursalVenta });
    const terminoBusqueda = termino || searchTerm;
    
    if (!terminoBusqueda || terminoBusqueda.length < 3) {
      return;
    }
    
    // Validar que hay sucursal seleccionada
    if (!sucursalVenta) {
      toast.warning('Debe seleccionar una sucursal primero');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Buscando productos con stock por sucursal:', terminoBusqueda, 'en sucursal:', sucursalVenta);
      
      const productos = await productosService.buscarConStockPorSucursal(terminoBusqueda, sucursalVenta);
      console.log('📦 Productos encontrados con stock por sucursal:', productos?.length || 0);
      
      const productosArray = Array.isArray(productos) ? productos : [];
      
      // Ordenar por stock disponible (descendente)
      const productosOrdenados = productosArray.sort((a, b) => 
        (b.stock_actual || 0) - (a.stock_actual || 0)
      );
      
      setSearchResults(productosOrdenados);
    } catch (error) {
      console.error('❌ Error al buscar productos con stock por sucursal:', error);
      // No mostrar toast para no interrumpir al usuario mientras escribe
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Busca un producto por código exacto
   */
  const buscarProductoPorCodigoExacto = async (codigo) => {
    // Validar que hay sucursal seleccionada
    if (!sucursalVenta) {
      toast.warning('Debe seleccionar una sucursal primero');
      return;
    }
    
    try {
      console.log('🔍 Buscando producto por código con stock en sucursal:', codigo, 'sucursal:', sucursalVenta);
      
      const producto = await productosService.obtenerPorCodigoConStock(codigo, sucursalVenta);
      
      if (producto) {
        // Verificar stock antes de agregar (ya viene con stock de la sucursal)
        if (producto.stock_actual > 0) {
          agregarAlCarrito(producto);
          setSearchTerm('');
          console.log('✅ Producto agregado al carrito con stock:', producto.stock_actual);
        } else {
          toast.warning(`Producto ${producto.nombre} sin stock disponible en esta sucursal`);
        }
      } else {
        toast.warning(`Producto con código ${codigo} no encontrado o sin stock en sucursal`);
      }
    } catch (error) {
      console.error('❌ Error al buscar producto por código con stock:', error);
      toast.error('Error al buscar producto');
    }
  };
  
  /**
   * Manejador para cambio en el campo de búsqueda
   * @param {Event} e - Evento de cambio
   */
  const handleSearchChange = (e) => {
    const valor = e.target.value;
    setSearchTerm(valor);
    
    // Si el término es menor a 3 caracteres, limpiar resultados
    if (valor.length < 3) {
      setSearchResults([]);
      return;
    }
    
    // Realizar búsqueda automática a partir de 3 caracteres
    buscarProductos(valor);
  };
      
  /**
   * Manejador para tecla Enter en el campo de búsqueda
   * @param {Event} e - Evento de teclado
   */
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Los lectores de códigos de barras suelen enviar el código completo seguido de Enter
      // Si el término tiene al menos 6 caracteres, probablemente sea un código de barras
      if (searchTerm.length >= 6 && /^[0-9]+$/.test(searchTerm)) {
        buscarProductoPorCodigoExacto(searchTerm);
      } else {
        // Búsqueda normal para términos cortos o que contienen letras
        buscarProductos();
      }
    }
  };
  
  /**
   * Agrega un producto al carrito con precio según lista seleccionada
   * @param {Object} producto - Producto a agregar
   */
	const agregarAlCarrito = async (producto) => {
	  console.log('🛒 [CARRITO] Agregando producto:', {
		id: producto.id,
		nombre: producto.nombre,
		stock_actual: producto.stock_actual,
		stock_sucursal: producto.stock_sucursal,
		sucursal_id: producto.sucursal_id,
		sucursalVenta: sucursalVenta
	  });
	  
	  // VALIDACIÓN: Verificar stock disponible
	  const stockDisponibleSucursal = parseInt(producto.stock_actual || producto.stock_sucursal || 0);
	  
	  console.log('📦 [CARRITO] Stock disponible:', {
		stock_actual: producto.stock_actual,
		stock_sucursal: producto.stock_sucursal,
		stockDisponibleSucursal: stockDisponibleSucursal,
		sucursal: sucursalVenta
	  });
	  
	  if (stockDisponibleSucursal <= 0) {
		toast.error(`❌ No hay stock disponible de ${producto.nombre} en esta sucursal`);
		console.error('❌ [CARRITO] Stock insuficiente:', {
		  producto: producto.nombre,
		  stock: stockDisponibleSucursal,
		  sucursal: sucursalVenta
		});
		return;
	  }
	  
	  // PASO 1: Determinar el precio según la lista seleccionada
	  let precioLista;
	  
	  // Verificar si el producto tiene listas de precios definidas
	  if (producto.listas_precios && typeof producto.listas_precios === 'object') {
		// Usar el precio de la lista seleccionada
		precioLista = producto.listas_precios[listaSeleccionada];
		
		// Si no existe precio para esa lista, intentar con interior (defecto)
		if (!precioLista || precioLista === 0) {
		  precioLista = producto.listas_precios.interior || producto.precio_venta || 0;
		  
		  if (precioLista > 0) {
			console.info(`ℹ️ Usando precio de lista interior para ${producto.nombre}`);
		  }
		}
	  } else {
		// Si no hay listas de precios, usar precio_venta o calcular con margen
		console.info(`ℹ️ Producto ${producto.nombre} sin listas configuradas`);
		
		// Intentar calcular con margen si hay precio de costo
		if (producto.precio_costo > 0) {
		  precioLista = aplicarMargenesGuardados(producto);
		  console.info(`ℹ️ Aplicando margen automático: $${precioLista}`);
		} else {
		  precioLista = producto.precio_venta || 0;
		}
	  }
	  
	  // Asegurar que el precio sea numérico
	  precioLista = parseFloat(precioLista) || 0;
	  
	  // Si aún no hay precio válido, avisar pero permitir agregar con precio 0 para editarlo después
	  if (precioLista <= 0) {
		toast.warning(`⚠️ ${producto.nombre} no tiene precio configurado. Se agregará con precio $0 para que lo edites.`);
		precioLista = 0;
	  }
	  
	  // PASO 2: Verificar si el producto ya está en el carrito
	  const productoEnCarrito = carrito.find(item => item.id === producto.id);
	  
	  let carritoActualizado;
	  
	  if (productoEnCarrito) {
		// ACTUALIZAR CANTIDAD EN PRODUCTO EXISTENTE
		const nuevaCantidad = Math.min(
		  productoEnCarrito.cantidad + 1,
		  stockDisponibleSucursal
		);
		
		console.log('🔄 [CARRITO] Actualizando cantidad:', {
		  producto: producto.nombre,
		  cantidadActual: productoEnCarrito.cantidad,
		  nuevaCantidad: nuevaCantidad,
		  stockDisponible: stockDisponibleSucursal
		});
		
		// Verificar si se alcanzó el límite de stock
		if (nuevaCantidad === productoEnCarrito.cantidad) {
		  toast.warning(`⚠️ No hay más stock disponible de ${producto.nombre} en esta sucursal (máximo: ${stockDisponibleSucursal})`);
		  console.warn('⚠️ [CARRITO] Límite de stock alcanzado:', {
			producto: producto.nombre,
			stockDisponible: stockDisponibleSucursal,
			cantidadEnCarrito: productoEnCarrito.cantidad
		  });
		  return;
		}
		
		// Actualizar el producto en el carrito
		carritoActualizado = carrito.map(item => 
		  item.id === producto.id 
			? { 
				...item, 
				cantidad: nuevaCantidad,
				precio: precioLista,
				precio_lista: precioLista,
				lista_aplicada: listaSeleccionada,
				subtotal: nuevaCantidad * precioLista,
				stock_disponible: stockDisponibleSucursal,
				sucursal_id: sucursalVenta
			  } 
			: item
		);
		
		console.log('✅ [CARRITO] Producto actualizado en carrito');
		
	  } else {
		// AGREGAR NUEVO PRODUCTO AL CARRITO
		
		console.log('🆕 [CARRITO] Agregando nuevo producto:', {
		  nombre: producto.nombre,
		  precio: precioLista,
		  stock: stockDisponibleSucursal,
		  lista: listaSeleccionada
		});
		
		carritoActualizado = [
		  ...carrito,
		  {
			// Datos básicos del producto
			id: producto.id,
			codigo: producto.codigo || '',
			nombre: producto.nombre || 'Producto sin nombre',
			
			// Precios
			precio: precioLista,
			precio_lista: precioLista,
			precio_original: producto.precio_venta || precioLista,
			lista_aplicada: listaSeleccionada,
			precio_base: precioLista, // Precio antes de editar
			precio_editado: false,    // Bandera de edición
			precio_original_backup: precioLista, // Precio original antes de cualquier edición
			precio_editado_manual: false,        // Flag para saber si fue editado
			editado_por: null,                  // Usuario que editó (opcional)
			fecha_edicion: null,                // Fecha de edición (opcional)
			
			// Cantidades
			cantidad: 1,
			subtotal: precioLista,
			stock_disponible: stockDisponibleSucursal,
			
			// Referencias
			sucursal_id: sucursalVenta,
			producto_sucursal_id: `${producto.id}_${sucursalVenta}`,
			
			// Promociones (vacío inicialmente)
			promociones: [],
			
			// Descuentos (inicialmente 0)
			descuento: 0,
			descuento_porcentaje: 0,
			
			// Información adicional
			categoria_id: producto.categoria_id || '',
			proveedor_id: producto.proveedor_id || ''
		  }
		];
		
		console.log('✅ [CARRITO] Nuevo producto agregado al carrito');
	  }
	  
	  // PASO 4: Actualizar el estado del carrito
	  setCarrito(carritoActualizado);
	  
	  // PASO 5: Limpiar búsqueda y mantener foco
	  setSearchTerm('');
	  setShowSearchResults(false);
	  
	  // Volver a enfocar el campo de búsqueda
	  if (searchInputRef.current) {
		searchInputRef.current.focus();
	  }
	  
	  console.log('🛒 [CARRITO] Estado actualizado, productos en carrito:', carritoActualizado.length);
	  
	  // MOSTRAR MENSAJE DE ÉXITO
	  toast.success(`✅ ${producto.nombre} agregado al carrito (Stock: ${stockDisponibleSucursal})`);
	  
	  // PASO 6: Aplicar promociones automáticamente (si existe el módulo)
	  if (typeof promocionesService !== 'undefined' && promocionesService.aplicarPromociones) {
		try {
		  if (isApplyingPromotions) {
			console.log('⚠️ Ya se están aplicando promociones, saltando...');
			return;
		  }
		  
		  isApplyingPromotions = true;
		  
		  const itemsFormateados = carritoActualizado.map(item => ({
			id: item.id,
			producto_id: item.id,
			codigo: item.codigo,
			nombre: item.nombre,
			precio: Math.round(item.precio * 100) / 100,
			cantidad: parseInt(item.cantidad),
			subtotal: Math.round((item.precio * item.cantidad) * 100) / 100,
			lista_aplicada: item.lista_aplicada,
			sucursal_id: item.sucursal_id
		  }));
		  
		  console.log('🎁 [CARRITO] Aplicando promociones automáticas...');
		  
		  const response = await promocionesService.aplicarPromociones(itemsFormateados);
		  
		  if (response.data && Array.isArray(response.data)) {
			setCarrito(response.data.map(item => ({
			  ...item,
			  lista_aplicada: item.lista_aplicada || listaSeleccionada,
			  sucursal_id: item.sucursal_id || sucursalVenta
			})));
			
			const nuevasPromociones = response.data.some(item => 
			  item.promociones && item.promociones.length > 0 && item.id === producto.id
			);
			
			if (nuevasPromociones) {
			  toast.success('🎁 ¡Promoción aplicada automáticamente!');
			  console.log('✅ [CARRITO] Promociones aplicadas automáticamente');
			}
		  }
		} catch (error) {
		  console.error('❌ [CARRITO] Error al aplicar promociones automáticas:', error);
		} finally {
		  isApplyingPromotions = false;
		}
	  }
	};

  
  /**
   * Actualiza la cantidad de un producto en el carrito
   * @param {string|number} id - ID del producto
   * @param {number} nuevaCantidad - Nueva cantidad deseada
   */
  const actualizarCantidad = async (id, nuevaCantidad) => {
	  // Buscar el producto en el carrito
	  const producto = carrito.find(item => item.id === id);
	  
	  if (!producto) {
		console.error('Producto no encontrado en el carrito');
		return;
	  }
	  
	  // Obtener el stock disponible del producto en el carrito
	  const stockDisponible = producto.stock_disponible || producto.stock_actual || 0;
	  
	  console.log('📦 [ACTUALIZAR CANTIDAD] Verificando stock:', {
		producto: producto.nombre,
		stockDisponible: stockDisponible,
		nuevaCantidad: nuevaCantidad,
		productoCompleto: producto
	  });
	  
	  // Validar que la cantidad no exceda el stock disponible
	  if (stockDisponible > 0 && nuevaCantidad > stockDisponible) {
		toast.warning(`No hay suficiente stock de ${producto.nombre}. Stock disponible: ${stockDisponible}`);
		return;
	  }
	  
	  // Validar que la cantidad sea al menos 1
	  if (nuevaCantidad < 1) {
		// Si se intenta poner 0 o menos, preguntar si quiere eliminar
		if (window.confirm(`¿Deseas eliminar ${producto.nombre} del carrito?`)) {
		  eliminarDelCarrito(id);
		}
		return;
	  }
	  
	  // Actualizar carrito local primero
	  const carritoActualizado = carrito.map(item => 
		item.id === id 
		  ? { 
			  ...item, 
			  cantidad: nuevaCantidad,
			  subtotal: nuevaCantidad * item.precio
			} 
		  : item
	  );
	  
	  setCarrito(carritoActualizado);
	  
	  // Aplicar promociones automáticamente (si está disponible el servicio)
	  if (typeof promocionesService !== 'undefined' && promocionesService.aplicarPromociones && !isApplyingPromotions) {
		try {
		  isApplyingPromotions = true;
		  
		  // Formatear los datos antes de enviarlos
		  const itemsFormateados = carritoActualizado.map(item => ({
			id: item.id,
			producto_id: item.id,
			codigo: item.codigo,
			nombre: item.nombre,
			precio: Math.round(item.precio * 100) / 100,
			cantidad: parseInt(item.cantidad),
			subtotal: Math.round((item.precio * item.cantidad) * 100) / 100,
			lista_aplicada: item.lista_aplicada || listaSeleccionada,
			sucursal_id: item.sucursal_id || sucursalVenta // Mantener referencia a sucursal
		  }));
		  
		  const response = await promocionesService.aplicarPromociones(itemsFormateados);
		  
		  if (response.data && Array.isArray(response.data)) {
			// Actualizar carrito con las promociones aplicadas manteniendo el stock_disponible
			setCarrito(response.data.map((item, index) => ({
			  ...item,
			  lista_aplicada: item.lista_aplicada || listaSeleccionada,
			  stock_disponible: carritoActualizado[index]?.stock_disponible || item.stock_disponible,
			  sucursal_id: item.sucursal_id || sucursalVenta
			})));
		  }
		} catch (error) {
		  console.error('Error al actualizar promociones:', error);
		  // No mostrar toast para no interrumpir la experiencia del usuario
		} finally {
		  isApplyingPromotions = false;
		}
	  }
	};
	/**
 * Actualiza el precio de un producto en el carrito
 * @param {string|number} id - ID del producto
 * @param {number} nuevoPrecio - Nuevo precio
 */
	const actualizarPrecio = (id, nuevoPrecio) => {
	  const precio = parseFloat(nuevoPrecio) || 0;
	  
	  if (precio < 0) {
		toast.error('El precio no puede ser negativo');
		return;
	  }
	  
	  const carritoActualizado = carrito.map(item => 
		item.id === id 
		  ? { 
			  ...item, 
			  precio: precio,
			  precio_editado: true, // Marcar que fue editado manualmente
			  subtotal: item.cantidad * precio
			} 
		  : item
	  );
	  
	  setCarrito(carritoActualizado);
	  toast.success('Precio actualizado');
	};
  
  /**
   * Elimina un producto del carrito
   * @param {string|number} id - ID del producto a eliminar
   */
  const eliminarDelCarrito = (id) => {
    // Buscar el producto para mostrar confirmación con nombre
    const producto = carrito.find(item => item.id === id);
    
    if (producto) {
      // Actualizar el carrito filtrando el producto eliminado
      const carritoActualizado = carrito.filter(item => item.id !== id);
      setCarrito(carritoActualizado);
      
      // Mostrar notificación
      toast.info(`${producto.nombre} eliminado del carrito`);
      
      // Si el carrito queda vacío, enfocar el campo de búsqueda
      if (carritoActualizado.length === 0 && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  /**
   * Maneja el cambio de cantidad desde el input numérico
   * @param {string|number} id - ID del producto
   * @param {Event} e - Evento del input
   */
  const handleCantidadInputChange = (id, e) => {
    const valor = e.target.value;
    
    // Si el campo está vacío, no hacer nada (permitir que el usuario borre y escriba)
    if (valor === '') {
      return;
    }
    
    // Convertir a número y validar
    const nuevaCantidad = parseInt(valor) || 0;
    
    // Solo actualizar si es un número válido mayor a 0
    if (nuevaCantidad > 0) {
      actualizarCantidad(id, nuevaCantidad);
    }
  };

  /**
   * Maneja cuando el input pierde el foco (para validar valores vacíos)
   * @param {string|number} id - ID del producto
   * @param {Event} e - Evento del input
   */
  const handleCantidadInputBlur = (id, e) => {
    const valor = e.target.value;
    const producto = carrito.find(item => item.id === id);
    
    // Si el campo está vacío o es 0, restaurar a 1
    if (!valor || parseInt(valor) === 0) {
      const carritoActualizado = carrito.map(item => 
        item.id === id 
          ? { ...item, cantidad: 1, subtotal: item.precio } 
          : item
      );
      setCarrito(carritoActualizado);
    }
  };
  
/**
 * Actualiza los precios del carrito cuando se cambia la lista - MÉTODO CORREGIDO
 * @param {string} nuevaLista - Nueva lista seleccionada
 */
	const cambiarListaPrecios = async (nuevaLista) => {
	  console.log(`🔄 [PUNTO VENTA] Cambiando lista de precios a: ${nuevaLista}`);
	  setListaSeleccionada(nuevaLista);
	  
	  // Si hay productos en el carrito, actualizar sus precios
	  if (carrito.length > 0) {
		try {
		  console.log(`📦 [PUNTO VENTA] Actualizando precios de ${carrito.length} productos en carrito`);
		  
		  const carritoActualizado = await Promise.all(carrito.map(async item => {
			try {
			  // Buscar el producto completo para obtener las listas de precios
			  console.log(`🔍 [PUNTO VENTA] Obteniendo precios para producto: ${item.nombre}`);
			  const producto = await productosService.obtenerPorId(item.id);
			  
			  let nuevoPrecio = item.precio; // Precio actual como fallback
			  
			  if (producto && producto.listas_precios && producto.listas_precios[nuevaLista]) {
				// Usar precio de la nueva lista
				nuevoPrecio = parseFloat(producto.listas_precios[nuevaLista]);
				console.log(`💰 [PUNTO VENTA] Precio actualizado para ${item.nombre}: $${nuevoPrecio} (lista: ${nuevaLista})`);
			  } else if (producto && producto.precio_costo > 0) {
				// Si no hay listas de precios, intentar calcular con margen
				const margenesGuardados = localStorage.getItem('margenes_listas');
				if (margenesGuardados) {
				  const margenes = JSON.parse(margenesGuardados);
				  const margenLista = margenes[nuevaLista] || margenes.interior || 40;
				  nuevoPrecio = calcularPrecioConMargen(producto.precio_costo, margenLista);
				  console.log(`📊 [PUNTO VENTA] Precio calculado con margen para ${item.nombre}: $${nuevoPrecio}`);
				} else {
				  // Fallback al precio de venta original
				  nuevoPrecio = producto.precio_venta || item.precio;
				  console.log(`⚠️ [PUNTO VENTA] Usando precio de venta base para ${item.nombre}: $${nuevoPrecio}`);
				}
			  } else {
				console.log(`⚠️ [PUNTO VENTA] No se pudo actualizar precio para ${item.nombre}, manteniendo actual: $${item.precio}`);
			  }
			  
			  return {
				...item,
				precio: nuevoPrecio,
				precio_lista: nuevoPrecio,
				lista_aplicada: nuevaLista,
				subtotal: item.cantidad * nuevoPrecio
			  };
			} catch (error) {
			  console.error(`❌ [PUNTO VENTA] Error al actualizar precio del producto ${item.id}:`, error);
			  // En caso de error, mantener el producto sin cambios pero actualizar la lista aplicada
			  return {
				...item,
				lista_aplicada: nuevaLista
			  };
			}
		  }));
		  
		  setCarrito(carritoActualizado);
		  
		  // Mostrar notificación de éxito
		  const productosActualizados = carritoActualizado.filter(item => item.precio !== carrito.find(original => original.id === item.id)?.precio).length;
		  
		  if (productosActualizados > 0) {
			toast.success(`✅ Precios actualizados para ${productosActualizados} productos (Lista: ${nuevaLista})`);
		  } else {
			toast.info(`ℹ️ Lista cambiada a "${nuevaLista}" (precios sin cambios)`);
		  }
		  
		  // Opcional: Aplicar promociones nuevamente con los nuevos precios
		  if (typeof promocionesService !== 'undefined' && promocionesService.aplicarPromociones) {
			try {
			  console.log(`🎁 [PUNTO VENTA] Recalculando promociones con nuevos precios...`);
			  
			  // Formatear los datos antes de enviarlos
			  const itemsFormateados = carritoActualizado.map(item => ({
				id: item.id,
				producto_id: item.id,
				codigo: item.codigo,
				nombre: item.nombre,
				precio: Math.round(item.precio * 100) / 100,
				cantidad: parseInt(item.cantidad),
				subtotal: Math.round((item.precio * item.cantidad) * 100) / 100,
				lista_aplicada: nuevaLista,
				sucursal_id: item.sucursal_id || sucursalVenta
			  }));
			  
			  const response = await promocionesService.aplicarPromociones(itemsFormateados);
			  
			  if (response.data && Array.isArray(response.data)) {
				setCarrito(response.data.map(item => ({
				  ...item,
				  lista_aplicada: nuevaLista,
				  stock_disponible: carritoActualizado.find(c => c.id === item.id)?.stock_disponible || item.stock_disponible,
				  sucursal_id: item.sucursal_id || sucursalVenta
				})));
				
				console.log(`✅ [PUNTO VENTA] Promociones recalculadas con nueva lista de precios`);
			  }
			} catch (promocionError) {
			  console.error('❌ [PUNTO VENTA] Error al recalcular promociones:', promocionError);
			  // No mostrar error al usuario, continuar con los precios actualizados
			}
		  }
		  
		} catch (error) {
		  console.error('❌ [PUNTO VENTA] Error al actualizar precios del carrito:', error);
		  toast.error('Error al actualizar precios. Por favor, elimina y vuelve a agregar los productos.');
		}
	  } else {
		// Si el carrito está vacío, solo mostrar notificación
		toast.info(`ℹ️ Lista de precios cambiada a "${nuevaLista}"`);
	  }
	};
  
  /**
   * Aplica promociones a los productos del carrito
   */
  const aplicarPromociones = async () => {
	  toast.info('Aplicando promociones disponibles...');
	  
	  try {
		if (carrito.length === 0) {
		  toast.warning('No hay productos en el carrito');
		  return;
		}
		
		// Mostrar un indicador de carga
		setLoading(true);
		
		// Guardar información de stock antes de aplicar promociones
		const stockPorProducto = {};
		carrito.forEach(item => {
		  stockPorProducto[item.id] = item.stock_disponible || item.stock_actual || 0;
		});
		
		// Formatear los datos antes de enviarlos
		const itemsFormateados = carrito.map(item => ({
		  id: item.id,
		  codigo: item.codigo,
		  nombre: item.nombre,
		  precio: parseFloat(item.precio),
		  cantidad: parseInt(item.cantidad),
		  subtotal: parseFloat(item.subtotal || (item.precio * item.cantidad)),
		  lista_aplicada: item.lista_aplicada || listaSeleccionada,
		  stock_disponible: item.stock_disponible || 0,
		  sucursal_id: item.sucursal_id || sucursalVenta
		}));
		
		// Llamar al servicio de promociones
		const response = await promocionesService.aplicarPromociones(itemsFormateados);
		
		if (response.success === false) {
		  toast.error('Error del servidor: ' + response.message);
		  return;
		}
		
		// Actualizar el carrito con las promociones aplicadas
		if (response.data && Array.isArray(response.data)) {
		  // Asegurarse de mantener la lista aplicada Y el stock disponible
		  setCarrito(response.data.map(item => ({
			...item,
			lista_aplicada: item.lista_aplicada || listaSeleccionada,
			stock_disponible: stockPorProducto[item.id] || item.stock_disponible || 0,
			sucursal_id: item.sucursal_id || sucursalVenta
		  })));
		  
		  // Verificar si se aplicó alguna promoción
		  const tienePromociones = response.data.some(item => 
			item.promociones && item.promociones.length > 0
		  );
		  
		  if (tienePromociones) {
			toast.success('¡Promociones aplicadas correctamente!');
		  } else {
			toast.info('No hay promociones disponibles para estos productos');
		  }
		}
	  } catch (error) {
		console.error('Error al aplicar promociones:', error);
		toast.error('Error al aplicar promociones: ' + (error.response?.data?.message || error.message));
	  } finally {
		setLoading(false);
	  }
	};
  
  /**
   * Busca un cliente por nombre, teléfono o email
   * @param {string} termino - Término de búsqueda
   */
  const buscarCliente = async (termino) => {
    try {
      const clientes = await clientesService.buscar(termino);
      return clientes;
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      toast.error('Error al buscar clientes');
      return [];
    }
  };
  
  /**
   * Selecciona un cliente y verifica si tiene deudas pendientes
   * @param {Object} clienteSeleccionado - Cliente seleccionado
   */
  const seleccionarCliente = async (clienteSeleccionado) => {
    console.log('🔍 [DEBUG] seleccionarCliente llamado con:', clienteSeleccionado);
    console.log('🔍 [DEBUG] Cliente tiene saldo?', clienteSeleccionado.saldo);
    
    // Verificar si el cliente tiene deudas antes de seleccionarlo
    if (clienteSeleccionado?.id) {
      try {
        console.log('🔍 [DEBUG] Verificando deudas para cliente:', clienteSeleccionado.nombre, 'ID:', clienteSeleccionado.id);
        
        // 🆕 CORREGIDO: Usar la nueva función específica para obtener deudas del cliente
        console.log('🔄 [DEBUG] Llamando a obtenerDeudasCliente...');
        const deudasCliente = await clientesService.obtenerDeudasCliente(clienteSeleccionado.id);
        console.log('📋 [DEBUG] Respuesta de obtenerDeudasCliente:', deudasCliente);
        
        // 🆕 CORREGIDO: Verificar tanto deudas pendientes como saldo total del backend
        const tieneDeudasPendientes = deudasCliente && deudasCliente.total_deuda > 0;
        const tieneSaldoNegativoBackend = deudasCliente && deudasCliente.saldo_total < 0;
        const tieneSaldoNegativoFrontend = clienteSeleccionado.saldo < 0;
        
        console.log('🔍 [DEBUG] Análisis de deudas:', {
          tieneDeudasPendientes,
          tieneSaldoNegativoBackend,
          tieneSaldoNegativoFrontend,
          total_deuda: deudasCliente?.total_deuda,
          saldo_total: deudasCliente?.saldo_total,
          saldo_frontend: clienteSeleccionado.saldo
        });
        
        if (tieneDeudasPendientes || tieneSaldoNegativoBackend || tieneSaldoNegativoFrontend) {
          console.log('⚠️ [DEBUG] Cliente con deudas! Deudas pendientes:', deudasCliente?.total_deuda, 'Saldo backend:', deudasCliente?.saldo_total, 'Saldo frontend:', clienteSeleccionado.saldo);
          
          // Usar las deudas del backend si existen, o crear una simulada
          let deudasFormateadas = [];
          if (deudasCliente.deudas && deudasCliente.deudas.length > 0) {
            deudasFormateadas = deudasCliente.deudas.map(deuda => ({
              id_venta: deuda.id_venta,
              numero_venta: deuda.numero_venta,
              fecha: deuda.fecha,
              total: deuda.total_venta,
              saldo_pendiente: deuda.saldo_pendiente,
              dias_atraso: deuda.dias_atraso,
              estado: deuda.estado,
              sucursal: deuda.sucursal
            }));
          } else if (tieneSaldoNegativoBackend) {
            // Usar el saldo del backend
            deudasFormateadas = [{
              id_venta: 'saldo_total',
              numero_venta: 'Saldo Total',
              fecha: new Date().toISOString(),
              total: Math.abs(deudasCliente.saldo_total),
              saldo_pendiente: Math.abs(deudasCliente.saldo_total),
              dias_atraso: 0,
              estado: 'Pendiente',
              sucursal: 'General'
            }];
          } else if (tieneSaldoNegativoFrontend) {
            // Usar el saldo del frontend como respaldo
            deudasFormateadas = [{
              id_venta: 'saldo_total',
              numero_venta: 'Saldo Total',
              fecha: new Date().toISOString(),
              total: Math.abs(clienteSeleccionado.saldo),
              saldo_pendiente: Math.abs(clienteSeleccionado.saldo),
              dias_atraso: 0,
              estado: 'Pendiente',
              sucursal: 'General'
            }];
          }
          
          console.log('🔄 [DEBUG] Deudas formateadas:', deudasFormateadas);
          console.log('🔄 [DEBUG] Setting deudasCliente state...');
          setDeudasCliente(deudasFormateadas);
          console.log('🔄 [DEBUG] Setting showDebtModal to true...');
          setShowDebtModal(true);
          console.log('🔄 [DEBUG] Setting showClienteDialog to false...');
          setShowClienteDialog(false);
          // Temporalmente guardamos el cliente pero no lo seleccionamos hasta que el usuario decida
          window.pendingClienteSelection = clienteSeleccionado;
          console.log('🔄 [DEBUG] Cliente guardado en window.pendingClienteSelection');
          return;
        } else {
          console.log('✅ [DEBUG] Cliente sin deudas pendientes ni saldo negativo');
          console.log('✅ [DEBUG] deudasCliente:', deudasCliente);
          console.log('✅ [DEBUG] total_deuda:', deudasCliente?.total_deuda);
          console.log('✅ [DEBUG] saldo_cliente:', clienteSeleccionado.saldo);
        }
      } catch (error) {
        console.error('❌ [DEBUG] Error al verificar deudas:', error);
        // En caso de error, continuar con la selección del cliente
      }
    } else {
      console.log('⚠️ [DEBUG] Cliente seleccionado sin ID válido:', clienteSeleccionado);
    }
    
    // Si no tiene deudas, seleccionar normalmente
    console.log('🔄 [DEBUG] Seleccionando cliente normalmente...');
    setCliente(clienteSeleccionado);
    setDeudasCliente([]);
    setShowClienteDialog(false);
    console.log('✅ [DEBUG] Cliente seleccionado exitosamente');
  };

  /**
   * Maneja cuando el usuario acepta continuar con un cliente con deudas
   */
  const handleContinueWithDebt = () => {
    const clienteSeleccionado = window.pendingClienteSelection;
    if (clienteSeleccionado) {
      setCliente(clienteSeleccionado);
      setShowDebtModal(false);
      window.pendingClienteSelection = null;
      toast.info('Venta iniciada con cliente que tiene deudas pendientes');
    }
  };

  /**
   * Maneja la redirección a WhatsApp Business para recordatorio de deuda
   */
  const handleRemindDebt = () => {
    const clienteSeleccionado = window.pendingClienteSelection;
    if (clienteSeleccionado && deudasCliente.length > 0) {
      // 🆕 CORREGIDO: Calcular total de deuda considerando saldo total negativo
      // 🆕 CORREGIDO: Calcular total de deuda considerando saldo del backend y frontend
      let totalDeuda = 0;
      
      // Primero intentar usar el saldo del backend
      if (deudasCliente && deudasCliente.saldo_total < 0) {
        totalDeuda = Math.abs(deudasCliente.saldo_total);
      } else if (clienteSeleccionado.saldo < 0) {
        // Si no hay saldo del backend, usar el del frontend
        totalDeuda = Math.abs(clienteSeleccionado.saldo);
      } else {
        // Si no hay saldo negativo, sumar saldos pendientes de ventas específicas
        totalDeuda = deudasCliente.reduce((sum, deuda) => sum + parseFloat(deuda.saldo_pendiente || 0), 0);
      }
      
      const mensaje = `Hola ${clienteSeleccionado.nombre}, te recordamos que tienes una deuda pendiente de $${totalDeuda.toLocaleString()}. ¿Podrías ponerte al día con los pagos? ¡Gracias!`;
      const numeroWhatsApp = clienteSeleccionado.telefono || clienteSeleccionado.celular;
      
      if (numeroWhatsApp) {
        const numeroLimpio = numeroWhatsApp.replace(/[^0-9]/g, '');
        // 🆕 CAMBIO: Usar WhatsApp Business en lugar de WhatsApp común
        const url = `https://business.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
      } else {
        toast.warning('No hay número de teléfono registrado para este cliente');
      }
      
      setShowDebtModal(false);
      window.pendingClienteSelection = null;
    }
  };

  /**
   * Maneja la navegación a las ventas del cliente
   */
  const handleViewClientSales = () => {
    const clienteSeleccionado = window.pendingClienteSelection;
    if (clienteSeleccionado?.id) {
      // Abrir las ventas del cliente en una nueva ventana
      window.open(`/ventas?cliente=${clienteSeleccionado.id}`, '_blank');
      setShowDebtModal(false);
      window.pendingClienteSelection = null;
    }
  };
  
  /**
   * 🆕 NUEVO: Abre la factura de una venta específica
   * @param {Object} deuda - Objeto de deuda con información de la venta
   */
  const handleViewVenta = (deuda) => {
    // Verificar si es una venta real o una deuda simulada
    if (deuda.id_venta === 'saldo_total' || deuda.id_venta === 'saldo_total_frontend') {
      // Es una deuda simulada, mostrar todas las ventas del cliente
      const clienteSeleccionado = window.pendingClienteSelection;
      if (clienteSeleccionado?.id) {
        window.open(`/ventas?cliente=${clienteSeleccionado.id}`, '_blank');
        toast.info('Abriendo todas las ventas del cliente (deuda simulada)');
        // No cerrar el modal para que pueda ver otras opciones
      }
    } else if (deuda && deuda.id_venta) {
      // 🆕 CAMBIO: Es una venta real, abrir el detalle específico de la venta
      window.open(`/ventas/${deuda.id_venta}`, '_blank');
      toast.success(`Abriendo detalle de venta #${deuda.numero_venta}`);
      // Cerrar el modal después de abrir la factura específica
      setShowDebtModal(false);
      window.pendingClienteSelection = null;
    } else {
      toast.error('No se pudo abrir la factura: ID de venta no válido');
    }
  };
  
  /**
   * Crea un nuevo cliente
   * @param {Object} nuevoCliente - Datos del nuevo cliente
   */
  const crearCliente = async (nuevoCliente) => {
    try {
      const clienteCreado = await clientesService.crear(nuevoCliente);
      seleccionarCliente(clienteCreado);
      toast.success('Cliente creado correctamente');
    } catch (error) {
      console.error('Error al crear cliente:', error);
      toast.error('Error al crear cliente');
    }
  };
  
  /**
   * Calcula el total de la venta con descuentos y precios de lista
   * @returns {Object} Totales calculados
   */
  const calcularTotales = () => {
    // Calcular subtotal (precio * cantidad, sin descuentos)
    const subtotalSinDescuento = carrito.reduce(
      (total, item) => total + (item.precio * item.cantidad), 
      0
    );
    
    // Calcular descuento de promociones
    const descuentoPromociones = carrito.reduce(
      (total, item) => total + (item.descuento || 0), 
      0
    );
    
    // Calcular subtotal real (con descuentos de promociones aplicados)
    const subtotalConPromociones = subtotalSinDescuento - descuentoPromociones;
    
    // Calcular descuento general
    let descuentoGeneralValor = 0;
    if (descuentoGeneralTipo === 'porcentaje') {
      descuentoGeneralValor = (subtotalConPromociones * descuentoGeneral) / 100;
    } else {
      descuentoGeneralValor = Math.min(descuentoGeneral, subtotalConPromociones);
    }
    
    // Descuento total (promociones + general)
    const descuentoTotal = descuentoPromociones + descuentoGeneralValor;
    
    // Calcular total
    const total = Math.max(subtotalSinDescuento - descuentoTotal, 0);
    
    // Calcular diferencia si no es lista interior
    const diferenciaListaInterior = carrito.reduce((total, item) => {
      if (item.lista_aplicada !== 'interior' && item.precio_original) {
        return total + ((item.precio_original - item.precio) * item.cantidad);
      }
      return total;
    }, 0);
    
    return {
      subtotalSinDescuento,
      descuentoPromociones,
      descuentoGeneralValor,
      descuentoTotal,
      total,
      diferenciaListaInterior,
      listaAplicada: listaSeleccionada
    };
  };
  
  /**
   * Formatea un número como moneda
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatMoneda = (valor) => {
    return `$${parseFloat(valor).toFixed(2)}`;
  };
  
  /**
   * Valida que los datos de la venta sean correctos
   * @returns {boolean} True si los datos son válidos
   */
  const validarVenta = () => {
    if (carrito.length === 0) {
      toast.error('Debe agregar al menos un producto al carrito');
      return false;
    }
    
    return true;
  };
  
  /**
   * Prepara la confirmación de la venta
   */
  const prepararConfirmacion = () => {
    if (!validarVenta()) return;
    
    // NUEVA VALIDACIÓN: Sucursal obligatoria
    if (!sucursalVenta) {
      toast.error('Debe seleccionar una sucursal para la venta');
      return;
    }
    
    setShowConfirmDialog(true);
  };

  /**
   * ✅ CORREGIDO: Manejador del estado de pago
   * @param {string} nuevoEstado - Nuevo estado de pago
   */
  const handleEstadoPagoChange = (nuevoEstado) => {
    const totales = calcularTotales();
    
    setEstadoPago(nuevoEstado);
    
    if (nuevoEstado === 'completada') {
      // Si se marca como completada, el monto pagado debe ser el total
      setMontoPagado(totales.total);
    } else if (nuevoEstado === 'pendiente') {
      // Si se marca como pendiente, mantener el monto actual o poner 0 si es mayor al total
      if (montoPagado > totales.total) {
        setMontoPagado(0);
      }
    }
  };

  /**
   * ✅ CORREGIDO: Manejador del cambio de monto pagado
   * @param {number} nuevoMonto - Nuevo monto pagado
   */
  const handleMontoPagadoChange = (nuevoMonto) => {
    const totales = calcularTotales();
    const monto = parseFloat(nuevoMonto) || 0;
    
    // Limitar el monto al total de la venta
    const montoLimitado = Math.min(Math.max(0, monto), totales.total);
    
    setMontoPagado(montoLimitado);
    
    // Actualizar automáticamente el estado según el monto
    if (montoLimitado >= totales.total) {
      setEstadoPago('completada');
    } else if (montoLimitado > 0) {
      setEstadoPago('pendiente');
    } else {
      setEstadoPago('pendiente');
    }
  };
  
  /**
   * ✅ CORREGIDO: Procesa la venta final con lógica de pagos correcta
   */
  const procesarVenta = async () => {
	  console.log('🚨 INICIANDO procesarVenta');
	  console.log('🚨 Validando venta...');
	  if (!validarVenta()) return;

	  // NUEVA VALIDACIÓN: Sucursal obligatoria
	  if (!sucursalVenta) {
		toast.error('Debe seleccionar una sucursal para la venta');
		return;
	  }

	  // NUEVA VALIDACIÓN: Verificar stock de todos los productos antes de procesar
	  console.log('🔍 Verificando stock antes de procesar venta...');
	  
	  for (const item of carrito) {
		// Verificar stock actual (podría haber cambiado desde que se agregó al carrito)
		try {
		  const productoActualizado = await productosService.obtenerPorCodigoConStock(
			item.codigo, 
			sucursalVenta
		  );
		  
		  if (!productoActualizado) {
			toast.error(`❌ Producto ${item.nombre} no encontrado`);
			return;
		  }
		  
		  const stockActual = productoActualizado.stock_actual || 0;
		  
		  if (stockActual < item.cantidad) {
			toast.error(
			  `❌ Stock insuficiente para ${item.nombre}. ` +
			  `Disponible: ${stockActual}, Solicitado: ${item.cantidad}`
			);
			return;
		  }
		} catch (error) {
		  console.error('Error verificando stock:', error);
		  toast.error(`Error al verificar stock de ${item.nombre}`);
		  return;
		}
	  }
	  
	  console.log('✅ Stock verificado, procesando venta...');

	  try {
		setVentaEnProceso(true);
		const totales = calcularTotales();
		
		// Validar método de pago antes de enviar
		const metodosValidos = ['efectivo', 'tarjeta', 'MercadoPago', 'credito'];
		if (!metodosValidos.includes(metodoPago)) {
		  toast.error('Método de pago inválido');
		  return;
		}

		// ✅ CORREGIDO: Cálculo correcto del estado y montos de pago
		let estadoFinal = estadoPago;
		let montoPagadoFinal = montoPagado;
		let saldoPendienteFinal = 0;

		// Validaciones de consistencia
		if (montoPagadoFinal >= totales.total) {
		  estadoFinal = 'completada';
		  montoPagadoFinal = totales.total;
		  saldoPendienteFinal = 0;
		} else if (montoPagadoFinal > 0) {
		  estadoFinal = 'pendiente';
		  saldoPendienteFinal = totales.total - montoPagadoFinal;
		} else {
		  estadoFinal = 'pendiente';
		  montoPagadoFinal = 0;
		  saldoPendienteFinal = totales.total;
		}

		console.log('💰 [VENTA] Estados de pago calculados:', {
		  estadoOriginal: estadoPago,
		  estadoFinal: estadoFinal,
		  montoPagadoOriginal: montoPagado,
		  montoPagadoFinal: montoPagadoFinal,
		  total: totales.total,
		  saldoPendiente: saldoPendienteFinal
		});
		
		// Estructura mejorada para incluir información completa
		const ventaData = {
		  venta: {
			sucursal_id: sucursalVenta,
			cliente_id: cliente?.id || null,
			cliente_nombre: cliente ? `${cliente.nombre} ${cliente.apellido}`.trim() : 'Cliente General',
			cliente_info: cliente ? {
			  id: cliente.id,
			  nombre: cliente.nombre || '',
			  apellido: cliente.apellido || '',
			  nombre_completo: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
			  telefono: cliente.telefono || '',
			  email: cliente.email || ''
			} : null,
			usuario_id: currentUser?.id || null,
			metodo_pago: metodoPago,
			subtotal: totales.subtotalSinDescuento,
			descuento: totales.descuentoTotal,
			total: totales.total,
			estado: estadoFinal, // ← USAR ESTADO CALCULADO
			lista_precio_aplicada: listaSeleccionada,
			// ✅ CAMPOS DE PAGO CORREGIDOS
			monto_pagado: montoPagadoFinal,
			total_pagado: montoPagadoFinal,
			saldo_pendiente: saldoPendienteFinal,
			estado_pago: montoPagadoFinal >= totales.total ? 'pagado' : 
						 montoPagadoFinal > 0 ? 'parcial' : 'pendiente'
		  },
		  detalles: carrito.map(item => ({
			producto_id: item.id,
			cantidad: item.cantidad,
			precio_unitario: item.precio,
			precio_lista: item.precio_lista || item.precio,
			lista_aplicada: item.lista_aplicada || listaSeleccionada,
			precio_editado_manual: item.precio_editado_manual || false,
			precio_original: item.precio_original_backup || item.precio_lista,
			
			descuento: item.descuento || 0,
			precio_total: item.subtotal || (item.precio * item.cantidad - (item.descuento || 0)),
			
			// Información de auditoría si el precio fue editado
			...(item.precio_editado_manual && {
			  auditoria_precio: {
				editado_por: currentUser.email,
				fecha_edicion: new Date().toISOString(),
				precio_anterior: item.precio_original_backup,
				precio_nuevo: item.precio
			  }
			}),
			// Añadir información completa del producto
			producto_info: {
			  id: item.id,
			  codigo: item.codigo || '',
			  nombre: item.nombre || 'Producto sin nombre',
			  precio: item.precio
			}
		  }))
		};
		
		console.log('📤 [VENTA] Datos de venta a enviar:', {
		  sucursal: ventaData.venta.sucursal_id,
		  total: ventaData.venta.total,
		  estado: ventaData.venta.estado,
		  monto_pagado: ventaData.venta.monto_pagado,
		  saldo_pendiente: ventaData.venta.saldo_pendiente,
		  detalles_count: ventaData.detalles.length
		});
		
		// Pasar sucursal al servicio
		const respuesta = await ventasService.crear(ventaData.venta, ventaData.detalles, sucursalVenta);
		
		// NUEVO: Preparar datos para el ticket
		const ventaParaTicket = {
		  id: respuesta.id || respuesta.data?.id,
		  numero: respuesta.numero || respuesta.data?.numero || `V-${Date.now()}`,
		  fecha: new Date().toISOString(),
		  cliente_nombre: ventaData.venta.cliente_nombre,
		  cliente_info: ventaData.venta.cliente_info,
		  usuario_nombre: currentUser?.nombre || currentUser?.email || 'Sistema',
		  metodo_pago: metodoPago,
		  estado: estadoFinal,
		  estado_pago: ventaData.venta.estado_pago,
		  subtotal: totales.subtotalSinDescuento,
		  descuento: totales.descuentoTotal,
		  total: totales.total,
		  monto_pagado: montoPagadoFinal,
		  saldo_pendiente: saldoPendienteFinal,
		  detalles: ventaData.detalles,
		  sucursal_nombre: sucursalesDisponibles.find(s => s.id === sucursalVenta)?.nombre || 'Principal'
		};
		
		// Guardar venta creada y mostrar ticket
		setVentaCreada(ventaParaTicket);
		setShowTicket(true);
		
		// Mostrar mensaje de éxito diferenciado
		if (estadoFinal === 'completada') {
		  toast.success('✅ Venta completada y pagada correctamente');
		} else {
		  toast.success(`✅ Venta registrada - Saldo pendiente: ${formatMoneda(saldoPendienteFinal)}`);
		}
		
	  } catch (error) {
		console.error('❌ Error al procesar la venta:', error);
		
		let mensajeError = 'Error al procesar la venta';
		
		if (error.response?.data?.message) {
		  mensajeError = error.response.data.message;
		} else if (error.message) {
		  mensajeError = error.message;
		}
		
		toast.error(mensajeError);
	  } finally {
		setVentaEnProceso(false);
		setShowConfirmDialog(false);
	  }
	};

  
  /**
   * Cancela la confirmación de venta
   */
  const cancelarConfirmacion = () => {
    setShowConfirmDialog(false);
  };
  
  /**
   * ✅ CORREGIDO: Reinicia el formulario de venta con estados correctos
   */
  const nuevaVenta = () => {
    setCarrito([]);
    setCliente(null);
    setMetodoPago('efectivo');
    setDescuentoGeneral(0);
    setDescuentoGeneralTipo('porcentaje');
    setEstadoPago('pendiente'); // ← VALOR CORRECTO por defecto
    setMontoPagado(0); // ← VALOR CORRECTO por defecto
    setListaSeleccionada('interior');
    
    // No resetear sucursal para mantenerla entre ventas
    
    // Enfocar el campo de búsqueda
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Calcular totales para mostrar
  const totales = calcularTotales();

  return (
  <div className="container mx-auto p-4 max-w-7xl">
      {/* Header con título e indicadores */}
	<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
	  <div className="flex items-center gap-2 flex-wrap">
		<h1 className="text-xl md:text-2xl font-bold text-gray-800">
		  Punto de Venta
		</h1>
		
		{/* Indicador de permisos */}
		{puedeEditarPrecios && (
		  <div className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-200">
			<FaEdit className="mr-1" size={10} />
			Puede editar precios
		  </div>
		)}
		
		{/* Indicador de rol (opcional) */}
		{currentUser?.rol && (
		  <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
			<FaUserTag className="mr-1" size={10} />
			{currentUser.rol}
		  </div>
		)}
	  </div>
	  
	  {/* Información adicional del usuario (opcional) */}
	  <div className="text-sm text-gray-600 mt-2 sm:mt-0">
		<span className="flex items-center">
		  <FaUser className="mr-1" size={12} />
		  {currentUser?.nombre || currentUser?.email || 'Usuario'}
		</span>
	  </div>
	</div>
      
      {/* Selector de sucursal */}
      {(!sucursalVenta || sucursalesDisponibles.length > 1) && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-600 mr-2" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Seleccionar Sucursal</h3>
              <p className="text-sm text-yellow-700">Debe seleccionar una sucursal para registrar la venta</p>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {sucursalesDisponibles.map(sucursal => (
              <button
                key={sucursal.id}
                onClick={() => setSucursalVenta(sucursal.id)}
                className={`px-3 py-2 lg:px-4 rounded-md flex items-center text-sm lg:text-base ${
                  sucursalVenta === sucursal.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FaStore className="mr-1 lg:mr-2" size={16} />
                {sucursal.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de sucursal seleccionada */}
      {sucursalVenta && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaStore className="text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                Facturando en: {sucursalesDisponibles.find(s => s.id === sucursalVenta)?.nombre || 'Sucursal desconocida'}
              </span>
            </div>
            {sucursalesDisponibles.length > 1 && (
              <button
                onClick={() => setSucursalVenta('')}
                className="text-blue-600 text-sm hover:text-blue-800"
              >
                Cambiar
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Panel derecho: Opciones de venta y resumen - PRIMERO EN MÓVIL */}
        <div className="order-1 lg:order-2 lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Detalles de Venta
            </h2>
            
            {/* Cliente */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <button
                  onClick={() => setShowClienteDialog(true)}
                  className="text-indigo-600 text-sm hover:text-indigo-900"
                  disabled={!sucursalVenta}
                >
                  {cliente ? 'Cambiar' : 'Seleccionar'}
                </button>
              </div>
              
              {cliente ? (
                <div className="border rounded-md p-3 bg-gray-50">
                  <div className="text-gray-800 font-medium">
                    {cliente.nombre} {cliente.apellido}
                  </div>


                  <div className="text-gray-500 text-sm">
                    {cliente.telefono || 'Sin teléfono'}
                  </div>


                  <div className="text-gray-500 text-sm">
                    {cliente.email || 'Sin email'}
                  </div>


                  {cliente.lista_precio_default && (
                    <div className="text-blue-600 text-sm mt-1">
                      Lista predeterminada: {cliente.lista_precio_default}
                    </div>
                  )}


                </div>


              ) : (
                <div className="border rounded-md p-3 bg-gray-50 text-center">
                  <p className="text-gray-500">Venta sin cliente asignado</p>
                  <button
                    onClick={() => setShowClienteDialog(true)}
                    className="mt-1 text-indigo-600 hover:text-indigo-900 flex items-center justify-center mx-auto"
                    disabled={!sucursalVenta}
                  >
                    <FaUserPlus className="mr-1" /> Agregar cliente
                  </button>
                </div>


              )}
            </div>
            
            {/* Lista de Precios */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Lista de Precios
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfigMargenesModal(true)}
                  className="text-indigo-600 text-sm hover:text-indigo-900 flex items-center"
                  disabled={!sucursalVenta}
                >
                  <FaPercent className="mr-1" size={12} />
                  Configurar Márgenes
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {['mayorista', 'interior', 'posadas'].map(lista => (
                  <button
                    key={lista}
                    type="button"
                    onClick={() => cambiarListaPrecios(lista)}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors
                      ${listaSeleccionada === lista 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                    `}
                    disabled={!sucursalVenta}
                  >
                    {lista}
                  </button>
                ))}
              </div>
              
              {/* Indicador cuando el cliente tiene otra lista asignada */}
              {cliente?.lista_precio_default && cliente.lista_precio_default !== listaSeleccionada && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-800 flex items-center">
                    <FaExclamationTriangle className="mr-1" />
                    Cliente tiene lista "{cliente.lista_precio_default}" pero se está usando "{listaSeleccionada}"
                  </p>
                </div>


              )}
              
              {/* Mostrar diferencia de precios si no es interior */}
              {listaSeleccionada !== 'interior' && carrito.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Descuento aplicado vs. precio interior
                </div>


              )}
            </div>
            
            {/* Método de pago */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setMetodoPago('efectivo')}
                  className={`
                    flex items-center justify-center px-3 py-3 rounded-md text-sm lg:text-base min-h-[44px]
                    ${metodoPago === 'efectivo' 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 border-2' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'}
                  `}
                  disabled={!sucursalVenta}
                >
                  <FaMoneyBill className="mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Efectivo</span>
                  <span className="sm:hidden">Efect.</span>
                </button>
                
                <button
                  onClick={() => setMetodoPago('tarjeta')}
                  className={`
                    flex items-center justify-center px-3 py-3 rounded-md text-sm lg:text-base min-h-[44px]
                    ${metodoPago === 'tarjeta' 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 border-2' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'}
                  `}
                  disabled={!sucursalVenta}
                >
                  <FaCreditCard className="mr-1 lg:mr-2" />
                  Tarjeta
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMetodoPago('credito')}
                  className={`
                    flex items-center justify-center px-3 py-3 rounded-md text-sm lg:text-base min-h-[44px]
                    ${metodoPago === 'credito' 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 border-2' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'}
                  `}
                  disabled={!sucursalVenta}
                >
                  <FaMobile className="mr-1 lg:mr-2" />
                  Crédito
                </button>
                
                <button
                  onClick={() => setMetodoPago('MercadoPago')}
                  className={`
                    flex items-center justify-center px-3 py-3 rounded-md text-sm lg:text-base min-h-[44px]
                    ${metodoPago === 'MercadoPago' 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 border-2' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'}
                  `}
                  disabled={!sucursalVenta}
                >
                  <FaMobile className="mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">MercadoPago</span>
                  <span className="sm:hidden">MP</span>
                </button>
              </div>
            </div>

            {/* Campo de referencia para MercadoPago */}
            {metodoPago === 'MercadoPago' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Referencia de MercadoPago *
                </label>
                <input
                  type="text"
                  value={referenciaMercadoPago}
                  onChange={(e) => setReferenciaMercadoPago(e.target.value)}
                  placeholder="Ingrese el número de referencia de MercadoPago"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            )}

            {/* ✅ CORREGIDO: Estado del pago con lógica mejorada */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Pago
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEstadoPagoChange('completada')}
                  className={`
                    flex items-center justify-center px-4 py-2 rounded-md
                    ${estadoPago === 'completada' 
                      ? 'bg-green-100 text-green-700 border-green-300 border-2' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'}
                  `}
                  disabled={!sucursalVenta || carrito.length === 0}
                >
                  <FaCheck className="mr-2" />
                  Pago Completo
                </button>
                
                <button
                  onClick={() => handleEstadoPagoChange('pendiente')}
                  className={`
                    flex items-center justify-center px-4 py-2 rounded-md
                    ${estadoPago === 'pendiente' 
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-300 border-2' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'}
                  `}
                  disabled={!sucursalVenta}
                >
                  <FaClock className="mr-2" />
                  Pago Pendiente
                </button>
              </div>
            </div>

            {/* ✅ CORREGIDO: Monto pagado con mejor control */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Pagado
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={montoPagado}
                  onChange={(e) => handleMontoPagadoChange(e.target.value)}
                  min="0"
                  max={totales.total}
                  step="0.01"
                  className="w-full border rounded-md px-3 py-2"
                  disabled={!sucursalVenta || carrito.length === 0}
                  placeholder="0.00"
                />
                <span className="ml-2 text-sm text-gray-600">
                  de {formatMoneda(totales.total)}
                </span>
              </div>
              
              {/* Indicadores visuales del estado de pago */}
              <div className="mt-2 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  {montoPagado >= totales.total ? (
                    <span className="flex items-center text-green-600">
                      <FaCheck className="mr-1" size={12} />
                      Pago completo
                    </span>
                  ) : montoPagado > 0 ? (
                    <span className="flex items-center text-yellow-600">
                      <FaClock className="mr-1" size={12} />
                      Pago parcial
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600">
                      <FaClock className="mr-1" size={12} />
                      Sin pago
                    </span>
                  )}
                </div>


                
                <span className="font-medium">
                  Saldo: {formatMoneda(Math.max(0, totales.total - montoPagado))}
                </span>
              </div>
              
              {/* Botones de monto rápido */}
              {estadoPago === 'pendiente' && carrito.length > 0 && (
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => handleMontoPagadoChange(0)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    $0
                  </button>
                  <button
                    onClick={() => handleMontoPagadoChange(totales.total / 2)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => handleMontoPagadoChange(totales.total)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Total
                  </button>
                </div>


              )}
            </div>
            
            {/* Descuento general */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descuento General
              </label>
              
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  value={descuentoGeneral}
                  onChange={(e) => setDescuentoGeneral(parseFloat(e.target.value) || 0)}
                  className="border rounded-l-md px-3 py-2 w-full"
                  disabled={!sucursalVenta}
                />
                
                <select
                  value={descuentoGeneralTipo}
                  onChange={(e) => setDescuentoGeneralTipo(e.target.value)}
                  className="border-t border-r border-b rounded-r-md px-2 py-2 bg-gray-50"
                  disabled={!sucursalVenta}
                >
                  <option value="porcentaje">%</option>
                  <option value="monto">$</option>
                </select>
              </div>
            </div>
            
            {/* Resumen de venta */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-2">
                Resumen
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-800">{formatMoneda(totales.subtotalSinDescuento)}</span>
                </div>


                
                <div className="flex justify-between">
                  <span className="text-gray-600">Descuento:</span>
                  <span className="text-red-600">-{formatMoneda(totales.descuentoTotal)}</span>
                </div>


                
                {totales.listaAplicada && totales.listaAplicada !== 'interior' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lista aplicada:</span>
                    <span className="text-blue-600 capitalize">{totales.listaAplicada}</span>
                  </div>


                )}
                
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total a pagar:</span>
                  <span>{formatMoneda(totales.total)}</span>
                </div>


                
                {/* ✅ NUEVO: Mostrar estado de pago en el resumen */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto pagado:</span>
                  <span className={montoPagado > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                    {formatMoneda(montoPagado)}
                  </span>
                </div>


                
                {montoPagado < totales.total && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saldo pendiente:</span>
                    <span className="text-red-600 font-medium">
                      {formatMoneda(totales.total - montoPagado)}
                    </span>
                  </div>


                )}
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="space-y-2">
              <Button
                color="primary"
                fullWidth
                onClick={prepararConfirmacion}
                disabled={carrito.length === 0 || !sucursalVenta}
                icon={<FaReceipt />}
                className="min-h-[48px] text-base font-medium"
              >
                {estadoPago === 'completada' ? 'Finalizar Venta' : 
                 montoPagado > 0 ? 'Venta con Saldo Pendiente' : 'Venta a Crédito'}
              </Button>
              
              <Button
                color="secondary"
                fullWidth
                onClick={nuevaVenta}
                disabled={carrito.length === 0 || !sucursalVenta}
                icon={<FaSave />}
                className="min-h-[44px] text-base"
              >
                Nueva Venta
              </Button>
            </div>
          </div>
        </div>
        
        {/* Panel izquierdo: Búsqueda de productos - SEGUNDO EN MÓVIL */}
        <div className="order-2 lg:order-1 lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            {/* Barra de búsqueda */}
            <div className="mb-4 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar producto por código o nombre..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                inputMode="search"
                disabled={!sucursalVenta}
              />
              
              {loading && (
                <div className="absolute right-3 top-2">
                  <Spinner size="sm" />
                </div>


              )}
              
              {/* Dropdown de autocompletado */}
              {searchTerm.length >= 3 && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-[50vh] overflow-y-auto">
                  {searchResults.map(producto => (
                    <div 
                      key={producto.id}
                      className={`px-4 py-3 hover:bg-gray-100 cursor-pointer ${
                        producto.stock_actual <= 0 ? 'bg-red-50' : ''
                      }`}
                      onClick={() => {
                        if (producto.stock_actual > 0) {
                          agregarAlCarrito(producto);
                          setSearchTerm('');
                          setSearchResults([]);
                        } else {
                          toast.warning(`No hay stock disponible de ${producto.nombre}`);
                        }
                      }}
                    >
                      <div className="font-medium text-sm lg:text-base">{producto.nombre}</div>
                      <div className="text-xs lg:text-sm flex justify-between">
                        <span className="text-gray-600">{producto.codigo}</span>
                        <span className={`font-medium ${
                          producto.stock_actual <= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          Stock: {producto.stock_actual}
                        </span>
                      </div>


                    </div>


                  ))}
                </div>


              )}
            </div>
            
            {/* Carrito de compras */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-700 flex items-center">
                  <FaShoppingCart className="mr-2" />
                  Carrito
                  {carrito.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      {carrito.length}
                    </span>
                  )}
                </h2>
                {carrito.length > 0 && (
                  <Button
                    color="secondary"
                    size="sm"
                    onClick={aplicarPromociones}
                    icon={<FaPercentage />}
                    disabled={!sucursalVenta}
                  >
                    Aplicar Promociones
                  </Button>
                )}
              </div>
              
              {carrito.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <FaShoppingCart className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    Carrito vacío
                  </h3>
                  <p className="text-gray-500">
                    {!sucursalVenta 
                      ? 'Selecciona una sucursal y busca productos para comenzar una venta'
                      : 'Busca y añade productos para comenzar una venta'}
                  </p>
                </div>


              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio Unit.
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtotal
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {carrito.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900">
                                {item.nombre}
                              </div>


                              <div className="text-gray-500">
                                Código: {item.codigo}
                              </div>


                              
                              {/* Mostrar lista aplicada si no es interior */}
                              {item.lista_aplicada && item.lista_aplicada !== 'interior' && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Lista: {item.lista_aplicada}
                                </div>


                              )}
                              
                              {/* Mostrar promociones aplicadas */}
                              {item.promociones && item.promociones.length > 0 && (
                                <div className="mt-2">
                                  {item.promociones.map((promo, idx) => (
                                    <div 
                                      key={`${item.id}-promo-${idx}`}
                                      className="flex items-center justify-between text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md mt-1"
                                    >
                                      <span className="flex items-center">
                                        <FaPercentage className="mr-1" size={10} />
                                        {promo.mensaje || `¡${promo.nombre}!`}
                                      </span>
                                      <span className="font-bold ml-1">
                                        -{formatMoneda(promo.descuento)}
                                      </span>
                                    </div>


                                  ))}
                                </div>


                              )}
                            </td>
                            
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
							  {puedeEditarPrecios ? (
								<div className="flex flex-col items-center">
								  <div className="flex items-center">
									<span className="mr-1 text-gray-600">$</span>
									<input
									  type="number"
									  value={item.precio}
									  onChange={(e) => actualizarPrecio(item.id, e.target.value)}
									  onBlur={(e) => {
										// Validar al salir del campo
										if (parseFloat(e.target.value) <= 0) {
										  actualizarPrecio(item.id, item.precio_original_backup || item.precio_lista);
										  toast.warning('Precio restaurado al original');
										}
									  }}
									  className="w-20 text-center border rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400"
									  min="0"
									  step="0.01"
									  title="Click para editar precio"
									/>
								  </div>
								  {item.precio_editado_manual && (
									<span className="text-xs text-blue-600 mt-1 flex items-center">
									  <FaEdit size={10} className="mr-1" />
									  Editado
									</span>
								  )}
								  {item.precio_original_backup && item.precio !== item.precio_original_backup && (
									<button
									  onClick={() => actualizarPrecio(item.id, item.precio_original_backup)}
									  className="text-xs text-gray-500 hover:text-gray-700 mt-1 underline"
									  title="Restaurar precio original"
									>
									  Restaurar: {formatMoneda(item.precio_original_backup)}
									</button>
								  )}
								</div>
							  ) : (
								<div>
								  {formatMoneda(item.precio)}
								  {item.precio_original && item.precio_original !== item.precio && (
									<div className="text-xs text-gray-400 line-through">
									  {formatMoneda(item.precio_original)}
									</div>
								  )}
								</div>
							  )}
							</td>
                            
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                  className="bg-gray-200 text-gray-600 hover:bg-gray-300 p-2 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                  title="Disminuir cantidad"
                                >
                                  <FaMinus size={14} />
                                </button>
                                
                                <input
                                  type="number"
                                  min="1"
                                  max={item.stock_disponible}
                                  value={item.cantidad}
                                  onChange={(e) => handleCantidadInputChange(item.id, e)}
                                  onBlur={(e) => handleCantidadInputBlur(item.id, e)}
                                  className="mx-1 w-16 text-center text-base border rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  inputMode="numeric"
                                  title={`Stock disponible: ${item.stock_disponible}`}
                                />
                                
                                <button
                                  onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                  className="bg-gray-200 text-gray-600 hover:bg-gray-300 p-2 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                  title="Aumentar cantidad"
                                  disabled={item.cantidad >= item.stock_disponible}
                                >
                                  <FaPlus size={14} />
                                </button>
                              </div>


                              
                              {/* Indicador de stock */}
                              <div className="text-xs text-gray-500 text-center mt-1">
                                Stock: {item.stock_disponible}
                              </div>


                            </td>
                            
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {/* Mostrar precio original tachado si hay descuento */}
                              {item.descuento > 0 ? (
                                <div>
                                  <span className="line-through text-gray-400">
                                    {formatMoneda(item.precio * item.cantidad)}
                                  </span>
                                  <span className="ml-2 text-green-600 font-bold">
                                    {formatMoneda(item.subtotal)}
                                  </span>
                                </div>


                              ) : (
                                <span className="font-medium">
                                  {formatMoneda(item.subtotal || (item.precio * item.cantidad))}
                                </span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <button
                                onClick={() => eliminarDelCarrito(item.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Eliminar del carrito"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>


                </div>


              )}
              
              {/* Resumen del carrito */}
              {carrito.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm lg:text-md font-medium text-gray-700 mb-2 flex items-center">
                    <FaCalculator className="mr-2" />
                    Resumen del Carrito
                  </h3>
                  
                  <div className="space-y-2">
                    {/* Subtotal sin descuentos */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-800">
                        {formatMoneda(totales.subtotalSinDescuento)}
                      </span>
                    </div>


                    
                    {/* Descuentos por promociones */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Descuento promociones:</span>
                      <span className="text-green-600">
                        -{formatMoneda(totales.descuentoPromociones)}
                      </span>
                    </div>


                    
                    {/* Descuento general */}
                    {descuentoGeneral > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Descuento adicional {descuentoGeneralTipo === 'porcentaje' ? `(${descuentoGeneral}%)` : '(monto fijo)'}:
                        </span>
                        <span className="text-green-600">
                          -{formatMoneda(totales.descuentoGeneralValor)}
                        </span>
                      </div>


                    )}
                    
                    {/* Diferencia por lista de precios */}
                    {totales.diferenciaListaInterior > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Descuento por lista {listaSeleccionada}:
                        </span>
                        <span className="text-blue-600">
                          -{formatMoneda(totales.diferenciaListaInterior)}
                        </span>
                      </div>


                    )}
                    
                    {/* Total final */}
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatMoneda(totales.total)}</span>
                    </div>


                  </div>


                </div>


              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Diálogo de selección de cliente */}
      <ClienteDialog
        isOpen={showClienteDialog}
        onClose={() => setShowClienteDialog(false)}
        onSelectCliente={(cliente) => seleccionarCliente(cliente)}
        onCreateCliente={(cliente) => seleccionarCliente(cliente)}
      />

      {/* Modal de configuración de márgenes */}
      <ConfiguracionMargenesModal
        isOpen={showConfigMargenesModal}
        onClose={() => setShowConfigMargenesModal(false)}
        onSave={(margenes) => {
          console.log('Márgenes configurados:', margenes);
          // Los márgenes se guardan en localStorage dentro del modal
          // Aquí podrías actualizar precios si es necesario
        }}
      />
	   {/* Modal de Ticket */}
		{showTicket && ventaCreada && (
		  <TicketVenta
			venta={ventaCreada}
			onClose={() => {
			  setShowTicket(false);
			  // Opcional: Redirigir después de cerrar el ticket
			  if (ventaCreada.id) {
				navigate(`/ventas/${ventaCreada.id}`);
			  } else {
				// O simplemente limpiar para nueva venta
				nuevaVenta();
			  }
			}}
		  />
		)}
      {/* ✅ CORREGIDO: Diálogo de confirmación con información mejorada */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirmar Venta"
        message={
          <div className="space-y-3">
            <p className="text-base">¿Estás seguro de procesar esta venta?</p>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">{formatMoneda(totales.total)}</span>
                </div>


                <div className="flex justify-between">
                  <span>Método:</span>
                  <span className="capitalize">{metodoPago}</span>
                </div>


                <div className="flex justify-between">
                  <span>Lista:</span>
                  <span className="capitalize">{listaSeleccionada}</span>
                </div>


                <div className="flex justify-between">
                  <span>Sucursal:</span>
                  <span>{sucursalesDisponibles.find(s => s.id === sucursalVenta)?.nombre || 'Desconocida'}</span>
                </div>


              </div>
              
              {/* Estado de pago */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estado de Pago:</span>
                  <div className="text-right">
                    {montoPagado >= totales.total ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <FaCheck className="mr-1" size={10} />
                        Pago Completo
                      </span>
                    ) : montoPagado > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <FaClock className="mr-1" size={10} />
                        Pago Parcial
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <FaClock className="mr-1" size={10} />
                        A Crédito
                      </span>
                    )}
                  </div>


                </div>


                
                <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                  <div className="flex justify-between">
                    <span>Monto pagado:</span>
                    <span className="font-medium">{formatMoneda(montoPagado)}</span>
                  </div>


                  {montoPagado < totales.total && (
                    <div className="flex justify-between">
                      <span>Saldo pendiente:</span>
                      <span className="font-medium text-red-600">{formatMoneda(totales.total - montoPagado)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        }
        confirmText={estadoPago === 'completada' ? 'Finalizar Venta' : 'Procesar Venta'}
        cancelText="Cancelar"
        onConfirm={procesarVenta}
        onCancel={cancelarConfirmacion}
        confirmColor="primary"
        loading={ventaEnProceso}
      />

      {/* Modal prominente de advertencia de deuda */}
      {showDebtModal && deudasCliente.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">⚠️ Cliente con Deuda Pendiente</h3>
                  <p className="text-red-100 text-sm mt-1">Atención requerida</p>
                  <p className="text-red-100 text-xs mt-1">💡 Las ventas son clickeables para ver facturas</p>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-gray-800 text-lg mb-2">
                    <strong>{window.pendingClienteSelection?.nombre || 'Cliente'}</strong> tiene{' '}
                    <span className="text-red-600 font-bold">
                      {deudasCliente.filter(d => d.id_venta !== 'saldo_total' && d.id_venta !== 'saldo_total_frontend').length}
                    </span> venta{deudasCliente.filter(d => d.id_venta !== 'saldo_total' && d.id_venta !== 'saldo_total_frontend').length !== 1 ? 's' : ''} pendiente{deudasCliente.filter(d => d.id_venta !== 'saldo_total' && d.id_venta !== 'saldo_total_frontend').length !== 1 ? 's' : ''}:
                  </p>
                  
                  {/* 🆕 CORREGIDO: Mostrar total de deuda considerando saldo total */}
                  <div className="bg-red-100 rounded-lg p-3 mb-4">
                    <p className="text-red-800 text-2xl font-bold">
                      ${(() => {
                        const clienteSeleccionado = window.pendingClienteSelection;
                        // Primero intentar usar el saldo del backend
                        if (deudasCliente && deudasCliente.saldo_total < 0) {
                          return Math.abs(deudasCliente.saldo_total).toLocaleString();
                        } else if (clienteSeleccionado && clienteSeleccionado.saldo < 0) {
                          return Math.abs(clienteSeleccionado.saldo).toLocaleString();
                        } else {
                          return deudasCliente.reduce((sum, deuda) => sum + parseFloat(deuda.saldo_pendiente || 0), 0).toLocaleString();
                        }
                      })()}
                    </p>
                    <p className="text-red-600 text-sm">Deuda total</p>
                  </div>
                  
                  {/* 🆕 NUEVO: Mostrar detalle de deudas individuales con enlaces clickeables */}
                  {deudasCliente.length > 0 && (
                    <div className="text-left mb-4">
                      <p className="text-gray-700 text-sm font-medium mb-2">Detalle de deudas (click para ver factura):</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {deudasCliente.map((deuda, idx) => {
                          const esDeudaSimulada = deuda.id_venta === 'saldo_total' || deuda.id_venta === 'saldo_total_frontend';
                          const esVentaReal = !esDeudaSimulada;
                          
                          return (
                            <div 
                              key={idx} 
                              className={`rounded p-2 text-xs border transition-all duration-200 ${
                                esDeudaSimulada 
                                  ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-100' 
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              } cursor-pointer`}
                              onClick={() => handleViewVenta(deuda)}
                              title={esDeudaSimulada ? "Click para ver todas las ventas del cliente" : "Click para ver la factura de esta venta"}
                            >
                              <div className="flex justify-between items-center">
                                <span className={`font-medium ${
                                  esDeudaSimulada ? 'text-yellow-700' : 'text-blue-600 hover:text-blue-800'
                                }`}>
                                  {esDeudaSimulada ? '💰 Saldo Total' : `Venta #${deuda.numero_venta}`}
                                </span>
                                <span className="text-red-600 font-bold">${parseFloat(deuda.saldo_pendiente || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-gray-500">
                                <span>{deuda.fecha ? new Date(deuda.fecha).toLocaleDateString() : 'Sin fecha'}</span>
                                <span>{deuda.dias_atraso > 0 ? `${deuda.dias_atraso} días` : 'Al día'}</span>
                              </div>
                              <div className="text-center mt-1">
                                <span className={`text-xs ${
                                  esDeudaSimulada ? 'text-yellow-600' : 'text-blue-500'
                                }`}>
                                  👆 {esDeudaSimulada ? 'Click para ver todas las ventas' : 'Click para ver factura'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-gray-600 text-sm">
                    ¿Deseas continuar con la venta o recordar al cliente sobre su deuda?
                  </p>
                </div>
              </div>
            </div>

            {/* Botones del modal */}
            <div className="p-6 pt-0 space-y-3">
              {/* Enlace a ver ventas del cliente */}
              <div className="text-center mb-4">
                <button
                  onClick={handleViewClientSales}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center space-x-2 mx-auto transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>📋 Ver todas las ventas del cliente</span>
                </button>
              </div>
              
              {/* 🆕 NUEVO: Botón para cerrar el modal */}
              <button
                onClick={() => {
                  setShowDebtModal(false);
                  window.pendingClienteSelection = null;
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
              >
                ❌ Cerrar
              </button>

              <button
                onClick={handleContinueWithDebt}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                ✓ Ya lo sé - Continuar con la venta
              </button>
              
              <button
                onClick={handleRemindDebt}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.316"/>
                </svg>
                <span>📱 Recordar Deuda por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuntoVenta;
