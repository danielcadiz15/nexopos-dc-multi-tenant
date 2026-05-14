// src/services/configuracion.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para manejar la configuraci��n empresarial
 * Extiende FirebaseService para usar Firebase Functions
 */
class ConfiguracionService extends FirebaseService {
  constructor() {
    super('/configuracion');
  }

  /**
   * Obtener configuración de la empresa
   */
  async obtenerConfiguracionEmpresa() {
    try {
      console.log('🏢 Obteniendo configuración de empresa...');
      
      const configuracion = await this.get('/empresa');
      
      console.log('✅ Configuración de empresa obtenida:', configuracion);
      return configuracion;
      
    } catch (error) {
      console.error('❌ Error al obtener configuración de empresa:', error);
      // Retornar configuración por defecto
      return {
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        cuit: '',
        logo: null
      };
    }
  }

  /**
   * Guardar configuración de la empresa
   */
  async guardarConfiguracionEmpresa(configuracion) {
    try {
      console.log('💾 Guardando configuración de empresa:', configuracion);
      
      const resultado = await this.post('/empresa', configuracion);
      
      console.log('✅ Configuración de empresa guardada:', resultado);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al guardar configuración de empresa:', error);
      throw error;
    }
  }

  /**
   * Obtener configuracin empresarial
   * @returns {Promise<Object>} Configuraci��n empresarial
   */
  async obtener() {
    try {
      console.log('?? [CONFIGURACION] Obteniendo configuraci��n empresarial...');
      
      const response = await this.get('/empresa');
      
      if (!response) {
        console.log('?? [CONFIGURACION] No hay configuraci��n, retornando configuraci��n por defecto');
        return this.obtenerConfiguracionPorDefecto();
      }

      console.log('? [CONFIGURACION] Configuraci��n obtenida:', response);
      return this.formatearConfiguracion(response);
      
    } catch (error) {
      console.error('? [CONFIGURACION] Error al obtener configuraci��n:', error);
      
      // Si no existe configuraci��n, retornar configuraci��n por defecto
      if (error.message.includes('404') || error.message.includes('no encontrada')) {
        console.log('?? [CONFIGURACION] Creando configuraci��n por defecto...');
        return this.obtenerConfiguracionPorDefecto();
      }
      
      throw error;
    }
  }

  /**
   * Guardar configuraci��n empresarial
   * @param {Object} configuracion - Datos de configuraci��n
   * @returns {Promise<Object>} Configuraci��n guardada
   */
  async guardar(configuracion) {
    try {
      console.log('?? [CONFIGURACION] Guardando configuraci��n:', configuracion);

      // Validar datos requeridos
      this.validarConfiguracion(configuracion);

      // Formatear datos para enviar al backend
      const datosFormateados = this.formatearParaGuardar(configuracion);

      const response = await this.post('/empresa', datosFormateados);
      
      console.log('? [CONFIGURACION] Configuraci��n guardada correctamente');
      return response;
      
    } catch (error) {
      console.error('? [CONFIGURACION] Error al guardar configuraci��n:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuraci��n existente
   * @param {Object} configuracion - Datos de configuraci��n
   * @returns {Promise<Object>} Configuraci��n actualizada
   */
  async actualizar(configuracion) {
    try {
      console.log('?? [CONFIGURACION] Actualizando configuraci��n:', configuracion);

      const datosFormateados = this.formatearParaGuardar(configuracion);

      const response = await this.put('/empresa', datosFormateados);
      
      console.log('? [CONFIGURACION] Configuraci��n actualizada correctamente');
      return response;
      
    } catch (error) {
      console.error('? [CONFIGURACION] Error al actualizar configuraci��n:', error);
      throw error;
    }
  }

  /**
   * Subir logo a Firebase Storage
   * @param {File} archivo - Archivo de imagen
   * @returns {Promise<string>} URL del logo subido
   */
  async subirLogo(archivo) {
    try {
      console.log('?? [CONFIGURACION] Subiendo logo:', archivo.name);

      // Validar archivo
      this.validarArchivoLogo(archivo);

      // Convertir archivo a base64
      const logoData = await this.convertirArchivoABase64(archivo);

      // Preparar datos para enviar
      const datosLogo = {
        logoData: logoData,
        fileName: archivo.name,
        mimeType: archivo.type
      };

      // Enviar al backend
      const response = await this.post('/upload-logo', datosLogo);

      console.log('? [CONFIGURACION] Logo subido correctamente:', response);
      return response;
      
    } catch (error) {
      console.error('? [CONFIGURACION] Error al subir logo:', error);
      throw error;
    }
  }

  /**
   * Convertir archivo a base64
   * @param {File} archivo - Archivo a convertir
   * @returns {Promise<string>} Archivo en base64
   */
  convertirArchivoABase64(archivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsDataURL(archivo);
    });
  }

  /**
   * Eliminar logo existente
   * @param {string} logoUrl - URL del logo a eliminar
   * @returns {Promise<boolean>} ��xito de la operaci��n
   */
  async eliminarLogo(logoUrl) {
    try {
      console.log('??? [CONFIGURACION] Eliminando logo:', logoUrl);

      await this.delete(`/logo?url=${encodeURIComponent(logoUrl)}`);
      
      console.log('? [CONFIGURACION] Logo eliminado correctamente');
      return true;
      
    } catch (error) {
      console.error('? [CONFIGURACION] Error al eliminar logo:', error);
      throw error;
    }
  }

  /**
   * Validar configuraci��n antes de guardar
   * @param {Object} config - Configuraci��n a validar
   */
  validarConfiguracion(config) {
    const camposRequeridos = [
      'razon_social',
      'cuit',
      'direccion_calle',
      'direccion_localidad',
      'telefono_principal',
      'email'
    ];

    for (const campo of camposRequeridos) {
      if (!config[campo] || config[campo].toString().trim() === '') {
        throw new Error(`El campo ${campo.replace('_', ' ')} es requerido`);
      }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.email)) {
      throw new Error('El formato del email no es v��lido');
    }

    // Validar CUIT (formato argentino b��sico)
    if (config.cuit && config.cuit.length > 0) {
      const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
      if (!cuitRegex.test(config.cuit)) {
        console.warn('?? Formato de CUIT no est��ndar:', config.cuit);
      }
    }
  }

  /**
   * Validar archivo de logo
   * @param {File} archivo - Archivo a validar
   */
  validarArchivoLogo(archivo) {
    if (!archivo) {
      throw new Error('No se ha seleccionado ning��n archivo');
    }

    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!tiposPermitidos.includes(archivo.type)) {
      throw new Error('Solo se permiten archivos JPG, PNG o SVG');
    }

    // Validar tamano (m��ximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (archivo.size > maxSize) {
      throw new Error('El archivo debe ser menor a 2MB');
    }

    console.log('? [CONFIGURACION] Archivo de logo v��lido:', {
      nombre: archivo.name,
      tipo: archivo.type,
      tamano: `${(archivo.size / 1024).toFixed(1)}KB`
    });
  }

  /**
   * Formatear configuraci��n recibida del backend
   * @param {Object} data - Datos del backend
   * @returns {Object} Configuraci��n formateada para el frontend
   */
  formatearConfiguracion(data) {
    const pricingSuggestion = data.pricing_suggestion || {};
    return {
      // Informaci��n b��sica
      razon_social: data.razon_social || '',
      nombre_fantasia: data.nombre_fantasia || '',
      slogan: data.slogan || '',
      logo_url: data.logo_url || '',
      
      // Datos fiscales
      cuit: data.cuit || '',
      condicion_iva: data.condicion_iva || 'Responsable Inscripto',
      ingresos_brutos: data.ingresos_brutos || '',
      punto_venta: data.punto_venta || '',
      
      // Direcci��n (formatear desde objeto o campos individuales)
      direccion_calle: data.direccion?.calle || data.direccion_calle || '',
      direccion_localidad: data.direccion?.localidad || data.direccion_localidad || '',
      direccion_provincia: data.direccion?.provincia || data.direccion_provincia || '',
      direccion_codigo_postal: data.direccion?.codigo_postal || data.direccion_codigo_postal || '',
      direccion_pais: data.direccion?.pais || data.direccion_pais || '',
      
      // Contacto (formatear desde objeto o campos individuales)
      telefono_principal: data.contacto?.telefono_principal || data.telefono_principal || '',
      telefono_secundario: data.contacto?.telefono_secundario || data.telefono_secundario || '',
      email: data.contacto?.email || data.email || '',
      website: data.contacto?.website || data.website || '',
      
      // Configuraci��n de facturas
      numeracion_inicial: data.facturacion?.numeracion_inicial || data.numeracion_inicial || 1,
      serie_actual: data.facturacion?.serie_actual || data.serie_actual || 'A',
      formato_predeterminado: data.facturacion?.formato_predeterminado || data.formato_predeterminado || 'termico',
      mostrar_logo: data.facturacion?.mostrar_logo !== undefined ? data.facturacion.mostrar_logo : data.mostrar_logo !== undefined ? data.mostrar_logo : true,
      imprimir_ticket_automaticamente: data.facturacion?.imprimir_ticket_automaticamente !== undefined
        ? data.facturacion.imprimir_ticket_automaticamente
        : data.imprimir_ticket_automaticamente === true,
      tamaño_logo: data.facturacion?.tamano_logo || data.tamano_logo || data['tamaño_logo'] || 'mediano',
      posicion_logo: data.facturacion?.posicion_logo || data.posicion_logo || 'centro',
      caja_modulos: {
        clientes: data.caja_modulos?.clientes !== false,
        alerta_deudas: data.caja_modulos?.alerta_deudas !== false,
        pago_deudas: data.caja_modulos?.pago_deudas !== false,
        ver_comprobante_deuda: data.caja_modulos?.ver_comprobante_deuda !== false
      },
      pricing_suggestion: {
        alquilerMensual: Number(pricingSuggestion.alquilerMensual ?? 0) || 0,
        movilMensual: Number(pricingSuggestion.movilMensual ?? 0) || 0,
        combustibleMensual: Number(pricingSuggestion.combustibleMensual ?? 0) || 0,
        otrosGastosMensuales: Number(pricingSuggestion.otrosGastosMensuales ?? 0) || 0,
        unidadesMensualesEstimadas: Number(pricingSuggestion.unidadesMensualesEstimadas ?? 1000) || 1000,
        margenObjetivoPct: Number(pricingSuggestion.margenObjetivoPct ?? 30) || 30
      },
      /** URL pública (HTTPS) del APK de la app de caja para descarga desde login */
      caja_apk_url: typeof data.caja_apk_url === 'string' ? data.caja_apk_url.trim() : ''
    };
  }

  /**
   * Formatear configuraci��n para enviar al backend
   * @param {Object} config - Configuraci��n del frontend
   * @returns {Object} Datos formateados para el backend
   */
  formatearParaGuardar(config) {
    return {
      // Informaci��n b��sica
      razon_social: config.razon_social,
      nombre_fantasia: config.nombre_fantasia,
      slogan: config.slogan,
      logo_url: config.logo_url || '',
      
      // Datos fiscales
      cuit: config.cuit,
      condicion_iva: config.condicion_iva,
      ingresos_brutos: config.ingresos_brutos,
      punto_venta: String(config.punto_venta || '').trim() || '0001',
      
      // Direcci��n como objeto
      direccion: {
        calle: config.direccion_calle,
        localidad: config.direccion_localidad,
        provincia: config.direccion_provincia,
        codigo_postal: config.direccion_codigo_postal,
        pais: config.direccion_pais
      },
      
      // Contacto como objeto
      contacto: {
        telefono_principal: config.telefono_principal,
        telefono_secundario: config.telefono_secundario,
        email: config.email,
        website: config.website
      },
      
      // Configuraci��n de facturas como objeto
      facturacion: {
        numeracion_inicial: parseInt(config.numeracion_inicial) || 1,
        serie_actual: config.serie_actual,
        formato_predeterminado: config.formato_predeterminado,
        mostrar_logo: config.mostrar_logo,
        imprimir_ticket_automaticamente: config.imprimir_ticket_automaticamente === true,
        tamano_logo: config.tamaño_logo || config.tamano_logo,
        posicion_logo: config.posicion_logo
      },
      caja_modulos: {
        clientes: config.caja_modulos?.clientes !== false,
        alerta_deudas: config.caja_modulos?.alerta_deudas !== false,
        pago_deudas: config.caja_modulos?.pago_deudas !== false,
        ver_comprobante_deuda: config.caja_modulos?.ver_comprobante_deuda !== false
      },
      pricing_suggestion: {
        alquilerMensual: Number(config.pricing_suggestion?.alquilerMensual ?? 0) || 0,
        movilMensual: Number(config.pricing_suggestion?.movilMensual ?? 0) || 0,
        combustibleMensual: Number(config.pricing_suggestion?.combustibleMensual ?? 0) || 0,
        otrosGastosMensuales: Number(config.pricing_suggestion?.otrosGastosMensuales ?? 0) || 0,
        unidadesMensualesEstimadas: Number(config.pricing_suggestion?.unidadesMensualesEstimadas ?? 1000) || 1000,
        margenObjetivoPct: Number(config.pricing_suggestion?.margenObjetivoPct ?? 30) || 30
      },
      caja_apk_url: typeof config.caja_apk_url === 'string' ? config.caja_apk_url.trim() : '',
      
      // Metadatos
      fecha_actualizacion: new Date().toISOString(),
      activo: true
    };
  }

  /**
   * Obtener configuraci��n por defecto
   * @returns {Object} Configuraci��n por defecto
   */
  obtenerConfiguracionPorDefecto() {
    return {
      razon_social: '',
      nombre_fantasia: '',
      slogan: '',
      logo_url: '',
      
      cuit: '',
      condicion_iva: 'Responsable Inscripto',
      ingresos_brutos: '',
      punto_venta: '',
      
      direccion_calle: '',
      direccion_localidad: '',
      direccion_provincia: '',
      direccion_codigo_postal: '',
      direccion_pais: '',
      
      telefono_principal: '',
      telefono_secundario: '',
      email: '',
      website: '',
      
      numeracion_inicial: 1,
      serie_actual: 'A',
      formato_predeterminado: 'termico',
      mostrar_logo: true,
      imprimir_ticket_automaticamente: false,
      tamaño_logo: 'mediano',
      posicion_logo: 'centro',
      caja_modulos: {
        clientes: true,
        alerta_deudas: true,
        pago_deudas: true,
        ver_comprobante_deuda: true
      },
      pricing_suggestion: {
        alquilerMensual: 0,
        movilMensual: 0,
        combustibleMensual: 0,
        otrosGastosMensuales: 0,
        unidadesMensualesEstimadas: 1000,
        margenObjetivoPct: 30
      },
      caja_apk_url: ''
    };
  }
}

// Crear instancia ��nica del servicio
const configuracionService = new ConfiguracionService();

export default configuracionService;