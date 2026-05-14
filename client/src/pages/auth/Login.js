/**
 * Página de inicio de sesión
 * 
 * Permite a los usuarios autenticarse para acceder al sistema.
 * 
 * @module pages/auth/Login
 * @requires react, react-router-dom, ../../contexts/AuthContext
 * @related_files ../../services/auth.service.js
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaAndroid, FaBuilding, FaLock, FaShoppingCart, FaSignInAlt, FaUser } from 'react-icons/fa';

// Hooks
import { useAuth } from '../../contexts/AuthContext';
import configuracionService from '../../services/configuracion.service';

// Componentes
import Button from '../../components/common/Button';
import PasswordInput from '../../components/common/PasswordInput';

const ADMIN_WEB_URL = 'https://nexopos-dc.web.app/login';
const DEFAULT_CAJA_APK_URL =
  'https://firebasestorage.googleapis.com/v0/b/nexopos-dc.firebasestorage.app/o/app-debug.apk?alt=media&token=39c2debe-b394-42f3-ba3c-7917f274b1f2';

const normalizeExternalUrl = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  return `https://${value}`;
};

const isNativeCapacitorRuntime = () => {
  try {
    return typeof window !== 'undefined' &&
      !!window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Componente de página de inicio de sesión
 * @returns {JSX.Element} Componente Login
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, currentUser } = useAuth();
  const nativeRuntime = isNativeCapacitorRuntime();
  const initialAccessMode = location.state?.accessMode ||
    (location.state?.from?.pathname === '/cajero' || nativeRuntime ? 'cajero' : 'admin');
  const [accessMode, setAccessMode] = useState(initialAccessMode);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [cajaApkUrlServidor, setCajaApkUrlServidor] = useState('');
  const redirectHandledRef = useRef(false);

  const envCajaApkUrl = (process.env.REACT_APP_CAJA_APK_URL || '').trim();
  const urlDescargaApk = normalizeExternalUrl(cajaApkUrlServidor || envCajaApkUrl || DEFAULT_CAJA_APK_URL);
  const isAndroidWeb = (() => {
    try {
      const ua = String(window?.navigator?.userAgent || '').toLowerCase();
      return ua.includes('android') && !nativeRuntime;
    } catch {
      return false;
    }
  })();

  const redirectAdminToWeb = () => {
    try {
      window.location.assign(ADMIN_WEB_URL);
    } catch {
      window.location.href = ADMIN_WEB_URL;
    }
  };

  const openAdminViaNativeBridge = useCallback(() => {
    try {
      if (!nativeRuntime) return false;
      const bridge = window?.NexoAndroid;
      if (bridge && typeof bridge.openAdminInChrome === 'function') {
        bridge.openAdminInChrome();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [nativeRuntime]);

  const isAdminAuthorized = useCallback((user) => {
    const rol = String(user?.rol || user?.role || '').toLowerCase();
    return rol.includes('admin') || rol.includes('super');
  }, []);

  const handleDescargarApk = (event) => {
    event?.preventDefault?.();
    if (!urlDescargaApk) {
      toast.warning('No hay URL de descarga configurada.');
      return;
    }

    const directApk = /\.apk([?#].*)?$/i.test(urlDescargaApk);
    if (!directApk) {
      toast.info(
        'El enlace configurado no parece un archivo .apk directo. En Android, si apunta a una página intermedia (Drive/preview), la descarga puede fallar.',
        { autoClose: 6500 }
      );
    }

    // En Android Web funciona mejor descargar en la misma pestaña.
    try {
      if (isAndroidWeb) {
        window.location.assign(urlDescargaApk);
        return;
      }
      window.open(urlDescargaApk, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = urlDescargaApk;
    }
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const raw = await configuracionService.obtenerConfiguracionEmpresa();
        const u = typeof raw?.caja_apk_url === 'string' ? raw.caja_apk_url.trim() : '';
        if (!cancelado && u) setCajaApkUrlServidor(u);
      } catch {
        /* sin URL desde API */
      }
    })();
    return () => { cancelado = true; };
  }, []);
  
  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      redirectHandledRef.current = false;
      return;
    }
    if (redirectHandledRef.current) return;

    if (isAuthenticated) {
      redirectHandledRef.current = true;
      const quiereAdmin = accessMode === 'admin';
      if (quiereAdmin) {
        if (!isAdminAuthorized(currentUser)) {
          toast.warning('Este usuario solo tiene acceso de cajero.');
          navigate('/cajero', { replace: true });
          return;
        }
        if (nativeRuntime) {
          if (!openAdminViaNativeBridge()) {
            redirectAdminToWeb();
          }
          return;
        }
        redirectAdminToWeb();
        return;
      }
      const rol = String(currentUser?.rol || currentUser?.role || '').toLowerCase();
      const esCajero = ['cajero', 'empleado', 'vendedor', 'viewer'].includes(rol);
      const quiereMostrador = accessMode === 'cajero';
      if (esCajero || quiereMostrador) {
        navigate('/cajero', { replace: true });
        return;
      }

      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }

      navigate('/', { replace: true });
    }
  }, [
    accessMode,
    currentUser,
    isAuthenticated,
    navigate,
    location,
    nativeRuntime,
    openAdminViaNativeBridge,
    isAdminAuthorized
  ]);
  
  /**
   * Actualiza el estado del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Limpiar error al cambiar el valor
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  /**
   * Valida el formulario antes de enviar
   * @returns {boolean} True si es válido
   */
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    }
    
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * Maneja el envío del formulario
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await login(formData.email, formData.password);
      
      // La redirección se manejará en el useEffect
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      const errorMsg = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(errorMsg);
      
      // Si es error de credenciales, marcar ambos campos
      if (error.response?.status === 401) {
        setErrors({
          email: 'Credenciales incorrectas',
          password: 'Credenciales incorrectas'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-100 bg-nexo-mesh px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-elevated ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
        <div className="px-8 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Ingresar a NexoPOS
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Elegí cómo querés entrar. Los permisos reales dependen de tu empresa y rol.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setAccessMode('admin');
              }}
              className={`rounded-xl border-2 p-4 text-left transition ${
                accessMode === 'admin'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <FaBuilding className="text-2xl mb-2" />
              <div className="font-bold">Administrador</div>
              <div className="text-xs mt-1">Panel completo</div>
            </button>
            <button
              type="button"
              onClick={() => setAccessMode('cajero')}
              className={`rounded-xl border-2 p-4 text-left transition ${
                accessMode === 'cajero'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <FaShoppingCart className="text-2xl mb-2" />
              <div className="font-bold">Cajero</div>
              <div className="text-xs mt-1">Mostrador/POS</div>
            </button>
          </div>

          {urlDescargaApk && (
            <div
              className={`mb-6 rounded-xl border p-4 text-center ${
                accessMode === 'cajero'
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <a
                href={urlDescargaApk}
                onClick={handleDescargarApk}
                target={isAndroidWeb ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-700"
              >
                <FaAndroid className="text-xl" />
                Descargar app Caja (APK)
              </a>
              <p className="mt-2 text-xs text-slate-600">
                Para usar el mostrador en el celular. Si ya tenés la app, actualizá cuando publiques una nueva versión.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Correo electrónico */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <FaUser className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`nexo-field pl-10 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="mt-1">
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`nexo-field ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder="••••••••"
                  leftSlot={<FaLock className="h-5 w-5 text-slate-400" />}
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            
            <div>
              <Button
                type="submit"
                color="primary"
                fullWidth
                loading={loading}
                icon={<FaSignInAlt />}
              >
                {accessMode === 'cajero' ? 'Ingresar al mostrador' : 'Ingresar al panel'}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              ¿Olvidaste tu contraseña? Contacta al administrador
            </p>
            <p className="mt-2 text-sm text-slate-600">
              ¿Querés abrir una nueva empresa? <Link to="/signup" className="text-indigo-600 font-semibold">Crear empresa</Link>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              ¿Querés probar antes?{' '}
              <Link
                to="/signup"
                state={{ signupMode: 'demo' }}
                className="font-semibold text-emerald-600"
              >
                Probar demo gratis (48 hs)
              </Link>
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Si sos cajero, tu administrador debe crearte o invitarte dentro de su empresa.
            </p>
          </div>
        </div>
        
        <div className="border-t border-slate-100 bg-slate-50/90 px-8 py-4 text-center backdrop-blur-sm">
          <p className="text-xs text-slate-500">
            © 2026 Sistema de Gestión para Despensa. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;