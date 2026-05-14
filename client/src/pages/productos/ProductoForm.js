/**
 * Formulario de producto (nuevo/edición)
 * Diseñado para ser resiliente ante errores de API y compatible con Firebase
 * 
 * @module pages/productos/ProductoForm
 * @requires react, react-router-dom, react-toastify
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSave, FaArrowLeft, FaSpinner } from 'react-icons/fa';

// Servicios
import productosService from '../../services/productos.service';
import categoriasService from '../../services/categorias.service';
import proveedoresService from '../../services/proveedores.service';
import configuracionService from '../../services/configuracion.service';
import {
  buscarCadenaExternaConCache,
  normalizarGtin
} from '../../services/barcodeLookup.service';
import { contribuirCatalogoComunidad } from '../../services/barcodeCatalog.service';
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ProductoFormWizard from '../../components/modules/productos/ProductoFormWizard';
import {
  computeSuggestedPrice,
  getPricingSuggestionDefaults
} from '../../utils/precioSugerido';

const ProductoForm = () => {
  const { currentUser, hasPermission } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const modoAsistente = !isEditing && searchParams.get('modo') === 'asistente';
  
  // Estados
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_costo: '',
    precio_venta: '',
    categoria_id: '',
    proveedor_id: '',
    stock_minimo: '5',
    activo: true
  });
  
  // Para corregir el error de ESLint, definimos una variable producto para usarla en el formulario
  const producto = formData;
  
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [margenGanancia, setMargenGanancia] = useState(0);
  const [modoCalculo, setModoCalculo] = useState('manual'); // 'manual' o 'porcentaje'
  const [wizardStep, setWizardStep] = useState(1);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [showSugerenciaPanel, setShowSugerenciaPanel] = useState(true);
  const [pricingSuggestionConfig, setPricingSuggestionConfig] = useState(
    getPricingSuggestionDefaults()
  );
  const pricingConfigLoadedRef = useRef(false);
  const pricingConfigSaveTimeoutRef = useRef(null);
  /** true si en esta sesión hubo datos desde caché/OFF/UPC (no contribuir al catálogo global como “manual”) */
  const sesionAltaDesdeFuenteExternaRef = useRef(false);

  useEffect(() => {
    if (!id) {
      sesionAltaDesdeFuenteExternaRef.current = false;
    }
  }, [id]);

  const isAdminUser =
    currentUser?.rol === 'Administrador' ||
    currentUser?.rol === 'admin' ||
    currentUser?.rol === 'Admin' ||
    currentUser?.rolId === 'admin';
  const canUsePricingSuggestion =
    isAdminUser || hasPermission('productos', 'crear') || hasPermission('productos', 'editar');

  const normalizePricingConfig = useCallback((source = {}) => {
    const defaults = getPricingSuggestionDefaults();
    return {
      alquilerMensual: Number(source.alquilerMensual ?? defaults.alquilerMensual) || 0,
      movilMensual: Number(source.movilMensual ?? defaults.movilMensual) || 0,
      combustibleMensual: Number(source.combustibleMensual ?? defaults.combustibleMensual) || 0,
      otrosGastosMensuales: Number(source.otrosGastosMensuales ?? defaults.otrosGastosMensuales) || 0,
      unidadesMensualesEstimadas:
        Number(source.unidadesMensualesEstimadas ?? defaults.unidadesMensualesEstimadas) ||
        defaults.unidadesMensualesEstimadas,
      margenObjetivoPct:
        Number(source.margenObjetivoPct ?? defaults.margenObjetivoPct) || defaults.margenObjetivoPct
    };
  }, []);

  useEffect(() => {
    if (!canUsePricingSuggestion) return;
    let isMounted = true;
    const cargarConfiguracionPrecios = async () => {
      try {
        const configEmpresa = await configuracionService.obtener();
        if (!isMounted) return;
        const backendConfig = normalizePricingConfig(configEmpresa?.pricing_suggestion || {});
        setPricingSuggestionConfig(backendConfig);
      } catch (e) {
        console.warn('No se pudo cargar configuración de sugerencia desde backend:', e?.message || e);
      } finally {
        if (isMounted) pricingConfigLoadedRef.current = true;
      }
    };
    cargarConfiguracionPrecios();
    return () => {
      isMounted = false;
    };
  }, [canUsePricingSuggestion, normalizePricingConfig]);
  
  // Datos de respaldo para cuando fallan las APIs
  const CATEGORIAS_RESPALDO = [];
  
  const PROVEEDORES_RESPALDO = [];
  
  // Calcular margen de ganancia cuando cambian los precios
  const calcularMargen = (costo, venta) => {
    const costoNum = parseFloat(costo) || 0;
    const ventaNum = parseFloat(venta) || 0;
    
    if (costoNum > 0) {
      const margen = ((ventaNum - costoNum) / costoNum) * 100;
      setMargenGanancia(margen.toFixed(2));
    } else {
      setMargenGanancia(0);
    }
  };

  // Calcular precio de venta basado en margen
  const calcularPrecioVentaPorMargen = (costo, margen) => {
    const costoNum = parseFloat(costo) || 0;
    const margenNum = parseFloat(margen) || 0;
    
    const precioVenta = costoNum * (1 + margenNum / 100);
    return precioVenta.toFixed(2);
  };

  // Actualizar handleChange para los precios
  const handlePrecioChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (modoCalculo === 'manual') {
      if (name === 'precio_costo') {
        calcularMargen(value, formData.precio_venta);
      } else if (name === 'precio_venta') {
        calcularMargen(formData.precio_costo, value);
      }
    }
  };

  // Manejar cambio de margen
  const handleMargenChange = (e) => {
    const nuevoMargen = e.target.value;
    setMargenGanancia(nuevoMargen);
    
    if (modoCalculo === 'porcentaje') {
      const nuevoPrecioVenta = calcularPrecioVentaPorMargen(formData.precio_costo, nuevoMargen);
      setFormData(prev => ({ ...prev, precio_venta: nuevoPrecioVenta }));
    }
  };

  const handlePricingSuggestionConfigChange = (field, value) => {
    setPricingSuggestionConfig((prev) => {
      const next = normalizePricingConfig({ ...prev, [field]: value });
      return next;
    });
  };

  useEffect(() => {
    if (!canUsePricingSuggestion || !pricingConfigLoadedRef.current) return;
    if (pricingConfigSaveTimeoutRef.current) {
      clearTimeout(pricingConfigSaveTimeoutRef.current);
    }
    pricingConfigSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await configuracionService.actualizar({
          pricing_suggestion: normalizePricingConfig(pricingSuggestionConfig)
        });
      } catch (e) {
        console.warn('No se pudo persistir configuración de sugerencia en backend:', e?.message || e);
      }
    }, 700);
    return () => {
      if (pricingConfigSaveTimeoutRef.current) {
        clearTimeout(pricingConfigSaveTimeoutRef.current);
      }
    };
  }, [canUsePricingSuggestion, normalizePricingConfig, pricingSuggestionConfig]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        let categoriasData = [];
        let proveedoresData = [];
        
        // Cargar categorías con manejo de errores
        try {
          // Intentar primero con el método estándar
          categoriasData = await categoriasService.obtenerTodos();
        } catch (catError) {
          console.warn('Error con obtenerTodos, intentando con obtenerTodas:', catError);
          
          try {
            // Intentar con método alternativo si falla el primero
            categoriasData = await categoriasService.obtenerTodas();
          } catch (altCatError) {
            console.error('Error incluso con método alternativo:', altCatError);
            // Usar datos de respaldo
            categoriasData = CATEGORIAS_RESPALDO;
            toast.warning('Usando datos de categorías de respaldo');
          }
        }
        
        setCategorias(categoriasData);
        
        // Cargar proveedores con manejo de errores
        try {
          proveedoresData = await proveedoresService.obtenerTodos();
        } catch (provError) {
          console.error('Error al cargar proveedores:', provError);
          // Usar datos de respaldo
            proveedoresData = PROVEEDORES_RESPALDO;
          toast.warning('No se cargaron proveedores; podés crear uno en Compras → Proveedores');
        }
        
        setProveedores(proveedoresData);
        
        // Si estamos editando, cargar datos del producto
        if (isEditing) {
          try {
            const productoData = await productosService.obtenerPorId(id);
            setFormData({
              codigo: productoData.codigo || '',
              nombre: productoData.nombre || '',
              descripcion: productoData.descripcion || '',
              precio_costo: productoData.precio_costo || '',
              precio_venta: productoData.precio_venta || '',
              categoria_id: productoData.categoria_id || '',
              proveedor_id: productoData.proveedor_id || '',
              stock_minimo: productoData.stock_minimo || '5',
              activo: productoData.activo !== undefined ? productoData.activo : true
            });
            
            // Calcular margen para producto existente
            if (productoData.precio_costo && productoData.precio_venta) {
              calcularMargen(productoData.precio_costo, productoData.precio_venta);
            }
          } catch (prodError) {
            console.error('Error al cargar producto para edición:', prodError);
            toast.error('No se pudo cargar el producto para editar');
            setLoadError('No se pudo cargar el producto para editar');
          }
        }
      } catch (error) {
        console.error('Error general al cargar datos iniciales:', error);
        setLoadError('Error al cargar datos iniciales. Intente nuevamente.');
        toast.error('Error al cargar datos iniciales');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [id, isEditing]);

  useEffect(() => {
    if (isEditing || loading) return;
    setFormData((prev) => {
      if (prev.categoria_id && prev.proveedor_id) return prev;
      const cat = categorias.find(
        (c) => String(c.nombre || '').toLowerCase().trim() === 'bebidas'
      );
      const prov = proveedores.find(
        (p) => String(p.nombre || '').toLowerCase().trim() === 'proveedor general'
      );
      if (!cat && !prov) return prev;
      return {
        ...prev,
        categoria_id: prev.categoria_id || (cat ? String(cat.id) : ''),
        proveedor_id: prev.proveedor_id || (prov ? String(prov.id) : '')
      };
    });
  }, [isEditing, loading, categorias, proveedores]);

  useEffect(() => {
    setWizardStep(1);
  }, [modoAsistente, id]);
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  /**
   * Carga por código: duplicado en Firebase (empresa) → catálogo comunitario → caché → OFF → UPCitemdb.
   * Alta nueva: guarda el producto automáticamente si hay datos externos. Edición: solo sugiere campos vacíos.
   */
  const handleCodigoBlur = useCallback(
    async (e) => {
      const raw = String(e?.target?.value ?? '').trim();
      const digits = normalizarGtin(raw);
      if (!digits) return;

      setBarcodeLookupLoading(true);
      try {
        const dup = await productosService.verificarRegistradoPorCodigo(digits);
        if (dup.registrado && dup.productoId) {
          if (!isEditing) {
            toast.info('Este código ya está registrado en tu catálogo (Firebase). Abrimos la ficha para que la edites.');
            navigate(`/productos/editar/${dup.productoId}`);
            return;
          }
          if (isEditing && id && String(dup.productoId) !== String(id)) {
            toast.warning('Ya existe otro producto con este código en tu empresa.');
            return;
          }
          if (isEditing && id && String(dup.productoId) === String(id)) {
            return;
          }
        }

        const ext = await buscarCadenaExternaConCache(digits);
        if (!ext.ok) {
          if (ext.motivo === 'not_found') {
            toast.info(
              'No encontramos el código en tu catálogo, en el catálogo comunitario NexoPOS, ni en Open Food Facts ni en UPCitemdb. Podés cargar los datos a mano.'
            );
          }
          return;
        }

        sesionAltaDesdeFuenteExternaRef.current = true;

        const labelFuente =
          ext.fuente === 'cache'
            ? 'caché local (resultado previo de catálogo público o comunitario)'
            : ext.fuente === 'nexopos_comunidad'
              ? 'catálogo comunitario NexoPOS (otras empresas)'
              : ext.fuente === 'openfoodfacts'
                ? 'Open Food Facts'
                : 'UPCitemdb';

        if (!isEditing) {
          try {
            const payload = {
              codigo: digits,
              codigo_barras: digits,
              nombre: ext.nombre,
              descripcion: ext.descripcion || '',
              precio_costo: 0,
              precio_venta: 0,
              stock_minimo: parseInt(formData.stock_minimo || 5, 10) || 5,
              categoria_id: formData.categoria_id || '',
              proveedor_id: formData.proveedor_id || '',
              activo: true,
              origen_carga_codigo: ext.fuente === 'cache' ? ext.fuenteReal || 'externo' : ext.fuente
            };
            const created = await productosService.crear(payload);
            const newId = created?.id || created?.data?.id;
            const fuenteContrib =
              ext.fuente === 'cache'
                ? ext.fuenteReal || 'externo'
                : ext.fuente === 'nexopos_comunidad'
                  ? 'nexopos_comunidad'
                  : ext.fuente === 'openfoodfacts'
                    ? 'openfoodfacts'
                    : 'upcitemdb';
            try {
              await contribuirCatalogoComunidad({
                gtin: digits,
                nombre: ext.nombre,
                descripcion: ext.descripcion || '',
                fuente: fuenteContrib
              });
            } catch (ce) {
              console.warn('[catalogo comunitario]', ce?.message || ce);
            }
            toast.success(
              `Producto creado desde ${labelFuente}. Revisá costo y venta en la ficha; podés afinar las listas en Gestión de precios.`
            );
            if (newId) {
              navigate(`/productos/editar/${newId}`, { replace: true });
            }
          } catch (err) {
            console.error(err);
            toast.error(
              'No se pudo guardar automáticamente. Los datos se dejaron en el formulario; revisá precios y guardá a mano.'
            );
            setFormData((prev) => ({
              ...prev,
              codigo: digits,
              nombre: ext.nombre || prev.nombre,
              descripcion: ext.descripcion || prev.descripcion
            }));
          }
          return;
        }

        let aplicoNombre = false;
        let aplicoDesc = false;
        setFormData((prev) => {
          const next = { ...prev };
          if (!String(prev.nombre || '').trim() && ext.nombre) {
            next.nombre = ext.nombre;
            aplicoNombre = true;
          }
          if (!String(prev.descripcion || '').trim() && ext.descripcion) {
            next.descripcion = ext.descripcion;
            aplicoDesc = true;
          }
          return next;
        });

        if (aplicoNombre || aplicoDesc) {
          toast.success(`Datos sugeridos desde ${labelFuente}. Revisá y ajustá si hace falta.`);
        } else if (ext.nombre) {
          toast.info(
            `Hay datos en ${labelFuente}, pero el nombre o la descripción ya estaban cargados; no los modificamos.`
          );
        }
      } finally {
        setBarcodeLookupLoading(false);
      }
    },
    [isEditing, id, navigate, formData.stock_minimo, formData.categoria_id, formData.proveedor_id]
  );
  
  const guardarProducto = async () => {
    if (submitting) {
      console.log('Formulario ya está siendo enviado, ignorando clic adicional');
      return;
    }
    try {
      setSubmitting(true);

      if (!formData.nombre || !formData.codigo) {
        toast.error('Nombre y código son obligatorios');
        return;
      }

      const costoNum = parseFloat(String(formData.precio_costo ?? '').replace(',', '.'));
      const ventaNum = parseFloat(String(formData.precio_venta ?? '').replace(',', '.'));
      if (Number.isNaN(costoNum) || Number.isNaN(ventaNum)) {
        toast.error('Los precios deben ser valores numéricos');
        return;
      }

      const ventaRounded = ventaNum;
      const productoData = {
        ...formData,
        precio_costo: costoNum,
        precio_venta: ventaRounded,
        stock_minimo: parseInt(formData.stock_minimo || 5, 10)
      };
      /** En alta inicial las tres listas = precio de venta; en edición no pisamos listas ya diferenciadas */
      if (!isEditing) {
        productoData.listas_precios = {
          mayorista: ventaRounded,
          interior: ventaRounded,
          posadas: ventaRounded
        };
      }

      if (isEditing) {
        await productosService.actualizar(id, productoData);
        toast.success('Producto actualizado correctamente');
      } else {
        await productosService.crear(productoData);
        toast.success(
          'Producto creado correctamente. Las listas de precio están alineadas al precio de venta hasta que los ajustes en Gestión de precios.'
        );
      }

      const gtin = normalizarGtin(formData.codigo);
      if (gtin && String(formData.nombre || '').trim()) {
        try {
          await contribuirCatalogoComunidad({
            gtin,
            nombre: String(formData.nombre || '').trim(),
            descripcion: String(formData.descripcion || '').trim(),
            fuente: sesionAltaDesdeFuenteExternaRef.current ? 'empresa_tras_externo' : 'empresa'
          });
        } catch (e) {
          console.warn('[catalogo comunitario NexoPOS]', e?.message || e);
        }
      }

      navigate('/productos', { state: { reload: true } });
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await guardarProducto();
  };

  const avanzarWizard = () => {
    if (wizardStep === 1) {
      if (!String(formData.nombre || '').trim()) {
        toast.error('Ingresá el nombre del producto');
        return;
      }
      let cod = String(formData.codigo || '').trim();
      if (!cod) {
        cod = `P-${Date.now().toString(36).toUpperCase()}`;
        setFormData((prev) => ({ ...prev, codigo: cod }));
      }
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      const c = parseFloat(String(formData.precio_costo ?? '').replace(',', '.'));
      const v = parseFloat(String(formData.precio_venta ?? '').replace(',', '.'));
      if (Number.isNaN(c) || Number.isNaN(v)) {
        toast.error('Ingresá precios de costo y venta válidos');
        return;
      }
      setWizardStep(3);
      return;
    }
    if (wizardStep === 3) {
      setWizardStep(4);
    }
  };

  const retrocederWizard = () => setWizardStep((s) => Math.max(1, s - 1));

  const sugerencia = computeSuggestedPrice({
    costoUnitario: formData.precio_costo,
    ...pricingSuggestionConfig
  });
  const diferenciaSugerida =
    (parseFloat(String(formData.precio_venta ?? '').replace(',', '.')) || 0) -
    sugerencia.suggestedPrice;

  const usarPrecioSugerido = () => {
    if (!sugerencia.canSuggest) return;
    const suggestedRounded = sugerencia.suggestedPrice.toFixed(2);
    setFormData((prev) => ({ ...prev, precio_venta: suggestedRounded }));
    calcularMargen(formData.precio_costo, suggestedRounded);
    toast.info('Aplicamos el precio sugerido al campo de venta.');
  };

  // Si hay error de carga, mostrar mensaje de error
  if (loadError && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          
          <Button
            color="secondary"
            onClick={() => navigate('/productos')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
        </div>
        
        <Card>
          <div className="bg-red-50 p-6 text-center">
            <div className="text-red-600 mb-4 text-lg font-medium">
              {loadError}
            </div>
            <Button color="primary" onClick={() => window.location.reload()}>
              Intentar nuevamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (modoAsistente) {
    if (loading) {
      return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner size="lg" />
            <p className="mt-4 text-slate-600">Preparando el asistente…</p>
          </div>
        </div>
      );
    }
    return (
      <ProductoFormWizard
        wizardStep={wizardStep}
        avanzarWizard={avanzarWizard}
        retrocederWizard={retrocederWizard}
        formData={formData}
        producto={producto}
        handleChange={handleChange}
        categorias={categorias}
        proveedores={proveedores}
        modoCalculo={modoCalculo}
        setModoCalculo={setModoCalculo}
        margenGanancia={margenGanancia}
        handlePrecioChange={handlePrecioChange}
        handleMargenChange={handleMargenChange}
        sugerencia={sugerencia}
        pricingSuggestionConfig={pricingSuggestionConfig}
        onPricingSuggestionConfigChange={handlePricingSuggestionConfigChange}
        onAplicarPrecioSugerido={usarPrecioSugerido}
        canUsePricingSuggestion={canUsePricingSuggestion}
        guardarProducto={guardarProducto}
        submitting={submitting}
        navigate={navigate}
        onCodigoBlur={handleCodigoBlur}
        barcodeLookupLoading={barcodeLookupLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          {!isEditing && (
            <button
              type="button"
              onClick={() => navigate('/productos/nuevo?modo=asistente')}
              className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Preferís el asistente paso a paso
            </button>
          )}
        </div>

        <Button color="secondary" onClick={() => navigate('/productos')} icon={<FaArrowLeft />}>
          Volver
        </Button>
      </div>
      
      {loading ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información básica */}
            <Card title="Información Básica">
              <div className="space-y-4">
                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={producto.codigo}
                    onChange={handleChange}
                    onBlur={handleCodigoBlur}
                    className="nexo-field"
                    required
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Con 8 a 14 dígitos (GTIN/EAN), al salir: comprobamos si el código ya está en{' '}
                    <span className="font-medium">Firebase (tu empresa)</span>, luego el{' '}
                    <span className="font-medium">catálogo comunitario NexoPOS</span> (otros clientes), caché local,{' '}
                    <span className="font-medium">Open Food Facts</span> y <span className="font-medium">UPCitemdb</span>.
                    En producto nuevo, si hay datos de catálogo se crea el ítem; podés cargar costo y venta en esta misma ficha y afinar listas en Productos →
                    Gestión de precios. Las ventas siguen usando solo tus productos.
                  </p>
                  {barcodeLookupLoading && (
                    <p className="mt-1 text-xs font-medium text-indigo-600">Buscando código en catálogos…</p>
                  )}
                </div>
                
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={producto.nombre}
                    onChange={handleChange}
                    className="nexo-field"
                    required
                  />
                </div>
                
                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={producto.descripcion}
                    onChange={handleChange}
                    rows="3"
                    className="nexo-field"
                  />
                </div>
                
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    name="categoria_id"
                    value={producto.categoria_id}
                    onChange={handleChange}
                    className="nexo-field"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Podés crear categorías adicionales en Productos → Categorías.
                  </p>
                </div>
                
                {/* Proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    name="proveedor_id"
                    value={producto.proveedor_id}
                    onChange={handleChange}
                    className="nexo-field"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
            
            <Card title="Precios y Stock">
              {canUsePricingSuggestion && (
                <div className="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-indigo-900">
                    Precio sugerido inteligente (gastos + margen objetivo)
                  </p>
                  <p className="mt-1 text-xs text-indigo-800">
                    Diferencial NexoPOS: distribuimos gastos fijos mensuales por unidad y calculamos el precio objetivo.
                  </p>
                </div>
              )}
              {!isEditing && (
                <p className="mb-4 text-sm text-gray-600">
                  Las tres listas de precio se guardan igual al precio de venta hasta que los diferencies en Gestión de precios.
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de costo *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="precio_costo"
                      value={producto.precio_costo}
                      onChange={handlePrecioChange}
                      className="nexo-field pl-7 pr-12"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de Cálculo
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="modoCalculo"
                        value="manual"
                        checked={modoCalculo === 'manual'}
                        onChange={(e) => setModoCalculo(e.target.value)}
                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm">Manual</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="modoCalculo"
                        value="porcentaje"
                        checked={modoCalculo === 'porcentaje'}
                        onChange={(e) => setModoCalculo(e.target.value)}
                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm">Por Margen %</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de venta *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="precio_venta"
                      value={producto.precio_venta}
                      onChange={handlePrecioChange}
                      className={`nexo-field pl-7 pr-12 ${
                        modoCalculo === 'porcentaje' ? 'bg-gray-100' : ''
                      }`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      readOnly={modoCalculo === 'porcentaje'}
                    />
                  </div>
                  {canUsePricingSuggestion && sugerencia.canSuggest && (
                    <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                      <p>
                        Precio sugerido: <strong>${sugerencia.suggestedPrice.toFixed(2)}</strong>
                        {' · '}
                        costo total unitario (con gastos): ${sugerencia.costoTotalUnitario.toFixed(2)}
                      </p>
                      <p className="mt-1">
                        Diferencia vs precio actual:{' '}
                        <strong className={diferenciaSugerida >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                          ${diferenciaSugerida.toFixed(2)}
                        </strong>
                      </p>
                      <button
                        type="button"
                        onClick={usarPrecioSugerido}
                        className="mt-2 rounded-md border border-indigo-300 bg-white px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        Usar sugerido
                      </button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margen de Ganancia (%)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={margenGanancia}
                      onChange={handleMargenChange}
                      step="0.01"
                      className={`nexo-field pr-8 ${
                        modoCalculo === 'manual' ? 'bg-gray-100' : ''
                      } ${
                        margenGanancia < 0 ? 'text-red-600' : margenGanancia > 0 ? 'text-green-600' : ''
                      }`}
                      placeholder="0.00"
                      readOnly={modoCalculo === 'manual'}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                  {margenGanancia > 0 && (
                    <p className="mt-1 text-sm text-green-600">
                      Ganancia: ${((parseFloat(formData.precio_venta) || 0) - (parseFloat(formData.precio_costo) || 0)).toFixed(2)}
                    </p>
                  )}
                  {margenGanancia < 0 && (
                    <p className="mt-1 text-sm text-red-600">
                      ⚠️ El precio de venta está por debajo del costo
                    </p>
                  )}
                </div>
                
                {canUsePricingSuggestion && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSugerenciaPanel((v) => !v)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {showSugerenciaPanel ? 'Ocultar' : 'Mostrar'} cálculo de precio sugerido (gastos + margen objetivo)
                    </button>
                  </div>
                )}

                {canUsePricingSuggestion && showSugerenciaPanel && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-600">
                      Cargá tus gastos mensuales y el margen objetivo para sugerir un precio de venta por unidad.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="text-xs text-slate-600">
                        Alquiler mensual
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingSuggestionConfig.alquilerMensual}
                          onChange={(e) =>
                            handlePricingSuggestionConfigChange('alquilerMensual', e.target.value)
                          }
                          className="nexo-field mt-1"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Móvil / teléfono mensual
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingSuggestionConfig.movilMensual}
                          onChange={(e) =>
                            handlePricingSuggestionConfigChange('movilMensual', e.target.value)
                          }
                          className="nexo-field mt-1"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Combustible mensual
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingSuggestionConfig.combustibleMensual}
                          onChange={(e) =>
                            handlePricingSuggestionConfigChange('combustibleMensual', e.target.value)
                          }
                          className="nexo-field mt-1"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Otros gastos mensuales
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingSuggestionConfig.otrosGastosMensuales}
                          onChange={(e) =>
                            handlePricingSuggestionConfigChange('otrosGastosMensuales', e.target.value)
                          }
                          className="nexo-field mt-1"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Unidades mensuales estimadas
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={pricingSuggestionConfig.unidadesMensualesEstimadas}
                          onChange={(e) =>
                            handlePricingSuggestionConfigChange('unidadesMensualesEstimadas', e.target.value)
                          }
                          className="nexo-field mt-1"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Margen objetivo (%)
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="0.1"
                          value={pricingSuggestionConfig.margenObjetivoPct}
                          onChange={(e) =>
                            handlePricingSuggestionConfigChange('margenObjetivoPct', e.target.value)
                          }
                          className="nexo-field mt-1"
                        />
                      </label>
                    </div>
                    <p className="mt-3 text-xs text-slate-700">
                      Gastos mensuales: <strong>${sugerencia.gastosMensuales.toFixed(2)}</strong>{' '}
                      · Gasto por unidad: <strong>${sugerencia.gastoPorUnidad.toFixed(2)}</strong>
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      Fórmula: <strong>Precio sugerido = (Costo + Gastos/Unidades) / (1 - Margen%)</strong>
                    </p>
                    {sugerencia.warnings?.margenAjustado && (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        El margen objetivo se ajustó automáticamente al rango 0-95%.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    name="stock_minimo"
                    value={producto.stock_minimo}
                    onChange={handleChange}
                    className="nexo-field"
                    min="0"
                  />
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={producto.activo}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Producto activo
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Botones de acción */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button 
              type="button"
              color="secondary"
              onClick={() => navigate('/productos')}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              color="primary"
              icon={submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : 'Guardar Producto'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductoForm;