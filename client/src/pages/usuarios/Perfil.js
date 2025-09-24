/**
 * Página de perfil de usuario
 * 
 * Permite al usuario ver y editar su perfil personal.
 * 
 * @module pages/usuarios/Perfil
 * @requires react, react-router-dom, ../../services/auth.service
 * @related_files ../../contexts/AuthContext.js
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Servicios
import authService from '../../services/auth.service'; // ✅ Usar authService en lugar de usuariosService

// Contexto de autenticación
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaUser, FaSave, FaKey, FaUserCircle, 
  FaEnvelope, FaIdCard, FaCalendarAlt
} from 'react-icons/fa';

/**
 * Componente de página para el perfil del usuario
 * @returns {JSX.Element} Componente Perfil
 */
const Perfil = () => {
  const { currentUser, updateUserData } = useAuth();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: ''
  });
  
  // Estado de contraseñas
  const [passwordData, setPasswordData] = useState({
    password_actual: '',
    password_nueva: '',
    password_confirmacion: ''
  });
  
  // Estado de control
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    if (currentUser) {
      setFormData({
        nombre: currentUser.nombre || '',
        apellido: currentUser.apellido || '',
        email: currentUser.email || ''
      });
    }
  }, [currentUser]);
  
  /**
   * Maneja el cambio en los campos del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  /**
   * Maneja el cambio en los campos de contraseña
   * @param {Event} e - Evento de cambio
   */
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    
    setPasswordData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  /**
   * Envía el formulario para actualizar perfil
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      console.log('🔧 Actualizando perfil para usuario ID:', currentUser.id);
      
      // ✅ USAR RUTA DE AUTH CORRECTA
      const response = await authService.actualizarPerfil(currentUser.id, formData);
      
      console.log('✅ Perfil actualizado:', response);
      
      // Actualizar datos del usuario en el contexto
      if (response.data && response.data.data) {
        updateUserData(response.data.data);
      }
      
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('❌ Error al actualizar perfil:', error);
      
      const errorMessage = error.response?.data?.message || 'Error al actualizar el perfil';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Envía el formulario para cambiar contraseña
   * @param {Event} e - Evento de envío
   */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que las contraseñas coincidan
    if (passwordData.password_nueva !== passwordData.password_confirmacion) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    // Validar longitud de nueva contraseña
    if (passwordData.password_nueva.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      setPasswordLoading(true);
      
      console.log('🔐 Cambiando contraseña para usuario ID:', currentUser.id);
      
      // ✅ USAR RUTA DE AUTH CORRECTA CON NOMBRES CORRECTOS
      await authService.cambiarPassword(
        currentUser.id, 
        passwordData.password_actual, 
        passwordData.password_nueva
      );
      
      // Limpiar formulario
      setPasswordData({
        password_actual: '',
        password_nueva: '',
        password_confirmacion: ''
      });
      
      // Desactivar modo de cambio de contraseña
      setPasswordMode(false);
      
      toast.success('Contraseña actualizada correctamente');
      
    } catch (error) {
      console.error('❌ Error al cambiar contraseña:', error);
      
      const errorMessage = error.response?.data?.message || 'Error al cambiar la contraseña';
      toast.error(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Información de usuario */}
        <Card
          title="Información del Usuario"
          icon={<FaUserCircle />}
        >
          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 text-4xl font-bold">
                {currentUser?.nombre?.charAt(0)?.toUpperCase()}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <FaUser className="text-gray-500 mr-2" />
                <span className="text-gray-900 font-medium">
                  {currentUser?.nombre} {currentUser?.apellido}
                </span>
              </div>
              
              <div className="flex items-center">
                <FaEnvelope className="text-gray-500 mr-2" />
                <span className="text-gray-700">
                  {currentUser?.email}
                </span>
              </div>
              
              <div className="flex items-center">
                <FaIdCard className="text-gray-500 mr-2" />
                <span className="text-gray-700">
                  Rol: {currentUser?.rol}
                </span>
              </div>
              
              {currentUser?.fecha_creacion && (
                <div className="flex items-center">
                  <FaCalendarAlt className="text-gray-500 mr-2" />
                  <span className="text-gray-700">
                    Miembro desde: {new Date(currentUser.fecha_creacion).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <Button
                color="secondary"
                onClick={() => setPasswordMode(!passwordMode)}
                icon={<FaKey />}
                fullWidth
              >
                {passwordMode ? 'Cancelar' : 'Cambiar Contraseña'}
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Panel central: Formulario de perfil */}
        <div className="lg:col-span-2">
          {!passwordMode ? (
            <Card
              title="Editar Perfil"
              icon={<FaUser />}
            >
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre
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
                        Apellido
                      </label>
                      <input
                        type="text"
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleChange}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      color="primary"
                      loading={loading}
                      icon={<FaSave />}
                    >
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          ) : (
            <Card
              title="Cambiar Contraseña"
              icon={<FaKey />}
            >
              <form onSubmit={handlePasswordSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña Actual
                    </label>
                    <input
                      type="password"
                      name="password_actual"
                      value={passwordData.password_actual}
                      onChange={handlePasswordChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      name="password_nueva"
                      value={passwordData.password_nueva}
                      onChange={handlePasswordChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      La contraseña debe tener al menos 6 caracteres
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Contraseña
                    </label>
                    <input
                      type="password"
                      name="password_confirmacion"
                      value={passwordData.password_confirmacion}
                      onChange={handlePasswordChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      color="secondary"
                      onClick={() => setPasswordMode(false)}
                    >
                      Cancelar
                    </Button>
                    
                    <Button
                      type="submit"
                      color="primary"
                      loading={passwordLoading}
                      icon={<FaSave />}
                    >
                      Actualizar Contraseña
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Perfil;