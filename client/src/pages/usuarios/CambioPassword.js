/**
 * Formulario para cambiar contraseña de usuario
 * 
 * Permite a un usuario cambiar su propia contraseña o a un administrador
 * cambiar la contraseña de otro usuario
 * 
 * @module pages/usuarios/CambioPassword
 * @requires react, react-router-dom, ../../services/usuarios.service
 * @related_files ./Usuarios.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import usuariosService from '../../services/usuarios.service';

// Contexto de autenticación
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaKey, FaArrowLeft, FaSave, FaTimes, FaUser
} from 'react-icons/fa';

/**
 * Componente para cambio de contraseña
 * @returns {JSX.Element} Componente CambioPassword
 */
const CambioPassword = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Estado
  const [formData, setFormData] = useState({
    password_actual: '',
    password_nueva: '',
    confirmar_password: ''
  });
  
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  
  // Determinar si es cambio propio o admin cambiando a otro
  const esPropio = parseInt(id) === parseInt(currentUser.id);
  const esAdmin = currentUser.rol === 'Administrador';
  
  /**
   * Carga datos del usuario
   */
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const data = await usuariosService.obtenerPorId(id);
        setUsuario(data);
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        toast.error('Error al cargar datos del usuario');
        navigate('/usuarios');
      } finally {
        setLoading(false);
      }
    };
    
    cargarUsuario();
  }, [id, navigate]);
  
  /**
   * Maneja cambios en los campos del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario lo modifica
    if (errores[name]) {
      setErrores((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Verificar coincidencia para contraseñas
    if (name === 'password_nueva' || name === 'confirmar_password') {
      const otherField = name === 'password_nueva' ? 'confirmar_password' : 'password_nueva';
      
      if (value !== formData[otherField] && formData[otherField]) {
        setErrores((prev) => ({
          ...prev,
          confirmar_password: 'Las contraseñas no coinciden'
        }));
      } else {
        setErrores((prev) => ({
          ...prev,
          confirmar_password: ''
        }));
      }
    }
  };
  
  /**
   * Valida el formulario antes de enviar
   * @returns {boolean} True si el formulario es válido
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    // Si es cambio propio, requerir contraseña actual
    if (esPropio && !formData.password_actual) {
      nuevosErrores.password_actual = 'La contraseña actual es obligatoria';
    }
    
    if (!formData.password_nueva) {
      nuevosErrores.password_nueva = 'La nueva contraseña es obligatoria';
    } else if (formData.password_nueva.length < 6) {
      nuevosErrores.password_nueva = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (formData.password_nueva !== formData.confirmar_password) {
      nuevosErrores.confirmar_password = 'Las contraseñas no coinciden';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };
  
  /**
   * Envía el formulario
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    setGuardando(true);
    
    try {
      await usuariosService.cambiarPassword(id, {
        password_actual: formData.password_actual,
        password_nueva: formData.password_nueva
      });
      
      toast.success('Contraseña cambiada correctamente');
      
      // Redirigir según caso
      if (esPropio) {
        navigate('/');
      } else {
        navigate('/usuarios');
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error al cambiar la contraseña');
      }
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
  
  // Verificar permisos
  if (!esPropio && !esAdmin) {
    return (
      <Card>
        <div className="text-center py-8">
          <FaKey className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            Acceso denegado
          </h3>
          <p className="text-gray-500 mb-4">
            No tienes permisos para cambiar la contraseña de este usuario.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/usuarios')}
            icon={<FaArrowLeft />}
          >
            Volver a Usuarios
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Cambiar Contraseña
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/usuarios')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <Card>
        {usuario && (
          <div className="mb-6">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <FaUser className="text-gray-500" size={24} />
              <div>
                <h3 className="font-medium text-gray-800">
                  {usuario.nombre} {usuario.apellido}
                </h3>
                <p className="text-sm text-gray-600">{usuario.email}</p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contraseña actual (solo para cambio propio) */}
          {esPropio && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Actual *
              </label>
              <div className="relative">
                <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="password_actual"
                  value={formData.password_actual}
                  onChange={handleChange}
                  className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    errores.password_actual ? 'border-red-500' : ''
                  }`}
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>
              {errores.password_actual && (
                <p className="mt-1 text-sm text-red-600">{errores.password_actual}</p>
              )}
            </div>
          )}
          
          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password_nueva"
                value={formData.password_nueva}
                onChange={handleChange}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errores.password_nueva ? 'border-red-500' : ''
                }`}
                placeholder="Ingresa la nueva contraseña"
              />
            </div>
            {errores.password_nueva && (
              <p className="mt-1 text-sm text-red-600">{errores.password_nueva}</p>
            )}
          </div>
          
          {/* Confirmar nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="confirmar_password"
                value={formData.confirmar_password}
                onChange={handleChange}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errores.confirmar_password ? 'border-red-500' : ''
                }`}
                placeholder="Confirma la nueva contraseña"
              />
            </div>
            {errores.confirmar_password && (
              <p className="mt-1 text-sm text-red-600">{errores.confirmar_password}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              color="secondary"
              onClick={() => navigate('/usuarios')}
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
              Cambiar Contraseña
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CambioPassword;