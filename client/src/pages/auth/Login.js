/**
 * Página de inicio de sesión
 * 
 * Permite a los usuarios autenticarse para acceder al sistema.
 * 
 * @module pages/auth/Login
 * @requires react, react-router-dom, ../../contexts/AuthContext
 * @related_files ../../services/auth.service.js
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaAndroid, FaBuilding, FaLock, FaShoppingCart, FaSignInAlt, FaUser } from 'react-icons/fa';

// Hooks
import { useAuth } from '../../contexts/AuthContext';
import configuracionService from '../../services/configuracion.service';

// Componentes
import Button from '../../components/common/Button';

/**
 * Componente de página de inicio de sesión
 * @returns {JSX.Element} Componente Login
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, currentUser } = useAuth();
  const initialAccessMode = location.state?.accessMode ||
    (location.state?.from?.pathname === '/cajero' ? 'cajero' : 'admin');
  const [accessMode, setAccessMode] = useState(initialAccessMode);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [cajaApkUrlServidor, setCajaApkUrlServidor] = useState('');

  const envCajaApkUrl = (process.env.REACT_APP_CAJA_APK_URL || '').trim();
  const urlDescargaApk = (cajaApkUrlServidor || envCajaApkUrl).trim();

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
    if (isAuthenticated) {
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
  }, [accessMode, currentUser, isAuthenticated, navigate, location]);
  
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
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-100 px-4 py-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Ingresar a NexoPOS
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Elegí cómo querés entrar. Los permisos reales dependen de tu empresa y rol.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setAccessMode('admin')}
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
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-700"
              >
                <FaAndroid className="text-xl" />
                Descargar app Caja (APK)
              </a>
              <p className="mt-2 text-xs text-gray-600">
                Para usar el mostrador en el celular. Si ya tenés la app, actualizá cuando publiques una nueva versión.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Correo electrónico */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`
                    block w-full pl-10 pr-3 py-2 border 
                    ${errors.email ? 'border-red-300' : 'border-gray-300'} 
                    rounded-md shadow-sm placeholder-gray-400
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                  `}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`
                    block w-full pl-10 pr-3 py-2 border 
                    ${errors.password ? 'border-red-300' : 'border-gray-300'} 
                    rounded-md shadow-sm placeholder-gray-400
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                  `}
                  placeholder="••••••••"
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
            <p className="text-sm text-gray-600">
              ¿Olvidaste tu contraseña? Contacta al administrador
            </p>
            <p className="text-sm text-gray-600 mt-2">
              ¿Querés abrir una nueva empresa? <Link to="/signup" className="text-indigo-600 font-semibold">Crear empresa</Link>
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Si sos cajero, tu administrador debe crearte o invitarte dentro de su empresa.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 py-4 px-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            © 2026 Sistema de Gestión para Despensa. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;