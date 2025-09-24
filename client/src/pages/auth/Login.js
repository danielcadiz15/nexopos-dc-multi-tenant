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
import { FaLock, FaUser, FaSignInAlt } from 'react-icons/fa';

// Hooks
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

/**
 * Componente de página de inicio de sesión
 * @returns {JSX.Element} Componente Login
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
  
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Bienvenido
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Inicia sesión para continuar
            </p>
          </div>
          
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
            
            {/* Botón de inicio de sesión */}
            <div>
              <Button
                type="submit"
                color="primary"
                fullWidth
                loading={loading}
                icon={<FaSignInAlt />}
              >
                Iniciar Sesión
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Olvidaste tu contraseña? Contacta al administrador
            </p>
            <p className="text-sm text-gray-600 mt-2">
              ¿No tienes cuenta? <Link to="/signup" className="text-indigo-600">Crear cuenta</Link>
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 py-4 px-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            © 2025 Sistema de Gestión para Despensa. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;