// functions/routes/configuracion.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

const configuracionRoutes = async (req, res, path) => {
  try {
    // ? CORS Headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return true;
    }
    
    const pathParts = path.split('/').filter(p => p);
    
    // GET /configuracion/empresa - Obtener configuraci��n empresarial
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'empresa') {
      try {
        console.log('?? [CONFIGURACION] Obteniendo configuraci��n empresarial...');
        
        const configDoc = await db.collection('configuracion_empresa').doc('datos_principales').get();
        
        if (!configDoc.exists) {
          console.log('?? [CONFIGURACION] No existe configuraci��n, enviando configuraci��n por defecto');
          
          const configPorDefecto = {
            razon_social: '',
            nombre_fantasia: 'NexoPOS DC',
            slogan: 'Especialistas en especias, condimentos e insumos para carnicerias e industria alimentaria',
            logo_url: '',
            cuit: '',
            condicion_iva: 'Responsable Inscripto',
            ingresos_brutos: '',
            punto_venta: '0001',
            direccion: {
              calle: '',
              localidad: 'Posadas',
              provincia: 'Misiones',
              codigo_postal: '',
              pais: 'Argentina'
            },
            contacto: {
              telefono_principal: '',
              telefono_secundario: '',
              email: '',
              website: ''
            },
            facturacion: {
              numeracion_inicial: 1,
              serie_actual: 'A',
              formato_predeterminado: 'termico',
              mostrar_logo: true,
              tamano_logo: 'mediano',
              posicion_logo: 'centro'
            },
            fecha_creacion: new Date().toISOString(),
            activo: true
          };
          
          res.json({
            success: true,
            data: configPorDefecto,
            message: 'Configuraci��n por defecto'
          });
          return true;
        }

        const configuracion = {
          id: configDoc.id,
          ...configDoc.data()
        };

        console.log('? [CONFIGURACION] Configuraci��n obtenida correctamente');
        
        res.json({
          success: true,
          data: configuracion,
          message: 'Configuraci��n obtenida correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('? [CONFIGURACION] Error al obtener configuraci��n:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
        return true;
      }
    }
    
    // POST /configuracion/empresa - Crear configuraci��n empresarial
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'empresa') {
      try {
        const nuevaConfig = req.body;
        
        console.log('?? [CONFIGURACION] Creando configuraci��n empresarial:', nuevaConfig);

        const configFirestore = {
          ...nuevaConfig,
          fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
          fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
          activo: true
        };

        await db.collection('configuracion_empresa').doc('datos_principales').set(configFirestore);

        console.log('? [CONFIGURACION] Configuraci��n creada correctamente');

        res.json({
          success: true,
          data: {
            id: 'datos_principales',
            ...configFirestore
          },
          message: 'Configuraci��n empresarial creada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('? [CONFIGURACION] Error al crear configuraci��n:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear configuraci��n',
          error: error.message
        });
        return true;
      }
    }
    
    // PUT /configuracion/empresa - Actualizar configuraci��n empresarial
    if (req.method === 'PUT' && pathParts.length === 2 && pathParts[1] === 'empresa') {
      try {
        const datosActualizados = req.body;
        
        console.log('?? [CONFIGURACION] Actualizando configuraci��n empresarial:', datosActualizados);

        const configDoc = await db.collection('configuracion_empresa').doc('datos_principales').get();
        
        if (!configDoc.exists) {
          console.log('?? [CONFIGURACION] No existe configuraci��n, creando nueva...');
          req.method = 'POST';
          return await configuracionRoutes(req, res, path);
        }

        const datosCompletos = {
          ...datosActualizados,
          fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('configuracion_empresa').doc('datos_principales').update(datosCompletos);

        console.log('? [CONFIGURACION] Configuraci��n actualizada correctamente');

        res.json({
          success: true,
          data: {
            id: 'datos_principales',
            ...datosCompletos
          },
          message: 'Configuraci��n actualizada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('? [CONFIGURACION] Error al actualizar configuraci��n:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar configuraci��n',
          error: error.message
        });
        return true;
      }
    }
    
    // POST /configuracion/upload-logo - Subir logo TEMPORAL
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'upload-logo') {
      try {
        console.log('?? [CONFIGURACION] Logo guardado temporalmente...');

        const { logoData, fileName, mimeType } = req.body;

        if (!logoData || !fileName || !mimeType) {
          res.status(400).json({
            success: false,
            message: 'Faltan datos del archivo'
          });
          return true;
        }

        // Guardar como data URL temporal
        const logoUrlTemporal = logoData.startsWith('data:') ? logoData : `data:${mimeType};base64,${logoData}`;
        
        console.log('? [CONFIGURACION] Logo guardado temporalmente');

        res.json({
          success: true,
          data: logoUrlTemporal,
          message: 'Logo guardado temporalmente'
        });
        return true;
        
      } catch (error) {
        console.error('? [CONFIGURACION] Error:', error);
        res.status(500).json({
          success: false,
          message: 'Error al procesar logo',
          error: error.message
        });
        return true;
      }
    }
    
    // Si ninguna ruta coincide
    return false;
    
  } catch (error) {
    console.error('? [CONFIGURACION] Error en rutas de configuraci��n:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = configuracionRoutes;