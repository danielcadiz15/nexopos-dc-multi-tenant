/**
 * Formulario para crear o editar usuarios con permisos personalizables
 * 
 * @module pages/usuarios/UsuarioForm
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import usuariosService from '../../services/usuarios.service';
import sucursalesService from '../../services/sucursales.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaUser, FaArrowLeft, FaSave, FaTimes, FaKey, FaUserTag,
  FaShieldAlt, FaCheck, FaStore, FaToggleOn, FaToggleOff
} from 'react-icons/fa';

/**
 * Componente de formulario para usuario con permisos
 */
const UsuarioForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = !!id;
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmar_password: '',
    rol_id: '',
    activo: true,
    sucursales: [],
    permisos_personalizados: {}
  });
  
  const [roles, setRoles] = useState([]);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [showPermisos, setShowPermisos] = useState(false);
  
  // Módulos y permisos disponibles
  const MODULOS_DISPONIBLES = {
    productos: {
      nombre: 'Productos',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    },
    categorias: {
      nombre: 'Categorías',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    },
    compras: {
      nombre: 'Compras',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    },
    ventas: {
      nombre: 'Ventas',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    },
    stock: {
      nombre: 'Stock',
      acciones: { ver: 'Ver', crear: 'Ajustar', editar: 'Modificar', eliminar: 'Eliminar' }
    },
    reportes: {
      nombre: 'Reportes',
      acciones: { ver: 'Ver', crear: 'Generar', editar: 'Modificar', eliminar: 'Eliminar' }
    },
    promociones: {
      nombre: 'Promociones',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    },
    usuarios: {
      nombre: 'Usuarios',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    },
    sucursales: {
      nombre: 'Sucursales',
      acciones: { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
    }
  };

  /**
   * Carga datos iniciales
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar roles y sucursales
        const [rolesData, sucursalesData] = await Promise.all([
          usuariosService.obtenerRoles(),
          sucursalesService.obtenerActivas()
        ]);
        
        setRoles(rolesData);
        setSucursalesDisponibles(sucursalesData);
        
        // Si es edición, cargar datos del usuario
        if (esEdicion) {
          const usuario = await usuariosService.obtenerPorId(id);
          setFormData({
            nombre: usuario.nombre || '',
            apellido: usuario.apellido || '',
            email: usuario.email || '',
            password: '',
            confirmar_password: '',
            rol_id: usuario.rol_id || '',
            activo: usuario.activo,
            sucursales: usuario.sucursales || [],
            permisos_personalizados: usuario.permisos || {}
          });
        } else {
          // Si es nuevo usuario, seleccionar primer rol por defecto
          if (rolesData.length > 0) {
            setFormData(prev => ({
              ...prev,
              rol_id: rolesData[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        toast.error('Error al cargar datos necesarios');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [id, esEdicion]);

  /**
   * Maneja cambios en los campos del formulario
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: val
    }));
    
    // Limpiar error del campo
    if (errores[name]) {
      setErrores((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Verificar contraseñas coincidentes
    if (name === 'password' || name === 'confirmar_password') {
      const otherField = name === 'password' ? 'confirmar_password' : 'password';
      
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
   * Maneja cambios en sucursales
   */
  const handleSucursalChange = (sucursalId, checked) => {
    setFormData(prev => ({
      ...prev,
      sucursales: checked
        ? [...prev.sucursales, sucursalId]
        : prev.sucursales.filter(id => id !== sucursalId)
    }));
  };

  /**
   * Maneja cambios en permisos personalizados
   */
  const handlePermisoChange = (modulo, accion, valor) => {
    setFormData(prev => ({
      ...prev,
      permisos_personalizados: {
        ...prev.permisos_personalizados,
        [modulo]: {
          ...prev.permisos_personalizados[modulo],
          [accion]: valor
        }
      }
    }));
  };

  /**
   * Copia permisos del rol seleccionado
   */
  const copiarPermisosRol = () => {
    const rolSeleccionado = roles.find(r => r.id === formData.rol_id);
    if (rolSeleccionado && rolSeleccionado.permisos) {
      setFormData(prev => ({
        ...prev,
        permisos_personalizados: { ...rolSeleccionado.permisos }
      }));
      toast.info('Permisos del rol copiados');
    }
  };

  /**
   * Resetea permisos personalizados
   */
  const resetearPermisos = () => {
    setFormData(prev => ({
      ...prev,
      permisos_personalizados: {}
    }));
    toast.info('Permisos personalizados eliminados');
  };

  /**
   * Valida el formulario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    }
    
    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'Formato de email inválido';
    }
    
    if (!esEdicion && !formData.password) {
      nuevosErrores.password = 'La contraseña es obligatoria';
    }
    
    if (formData.password && formData.password.length < 6) {
      nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (formData.password !== formData.confirmar_password) {
      nuevosErrores.confirmar_password = 'Las contraseñas no coinciden';
    }
    
    if (!formData.rol_id) {
      nuevosErrores.rol_id = 'El rol es obligatorio';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Envía el formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    setGuardando(true);
    
    const { confirmar_password, ...usuarioData } = formData;
    usuarioData.rol = usuarioData.rol_id;
    usuarioData.permisos = usuarioData.permisos_personalizados;
    delete usuarioData.permisos_personalizados;
    
    // Si se está editando y no se proporciona contraseña, eliminarla
    if (esEdicion && !usuarioData.password) {
      delete usuarioData.password;
    }
    
    try {
      if (esEdicion) {
        await usuariosService.actualizar(id, usuarioData);
        toast.success('Usuario actualizado correctamente');
      } else {
        await usuariosService.crear(usuarioData);
        toast.success('Usuario creado correctamente');
      }
      
      navigate('/usuarios');
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      
      let errorMessage = esEdicion ? 'Error al actualizar el usuario' : 'Error al crear el usuario';
      
      if (error.message?.includes('already-exists')) {
        errorMessage = 'El email ya está registrado';
      } else if (error.message?.includes('permission-denied')) {
        errorMessage = 'No tienes permisos para realizar esta acción';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/usuarios')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <Card title="Información Personal" icon={<FaUser />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errores.nombre ? 'border-red-500' : ''
                }`}
                placeholder="Nombre del usuario"
              />
              {errores.nombre && (
                <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>
              )}
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Apellido del usuario"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errores.email ? 'border-red-500' : ''
                }`}
                placeholder="correo@ejemplo.com"
              />
              {errores.email && (
                <p className="mt-1 text-sm text-red-600">{errores.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <div className="relative">
                <FaUserTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  name="rol_id"
                  value={formData.rol_id}
                  onChange={handleChange}
                  className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    errores.rol_id ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Selecciona un rol</option>
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre} {rol.descripcion && `- ${rol.descripcion}`}
                    </option>
                  ))}
                </select>
              </div>
              {errores.rol_id && (
                <p className="mt-1 text-sm text-red-600">{errores.rol_id}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {esEdicion ? 'Contraseña (dejar en blanco para mantener)' : 'Contraseña *'}
              </label>
              <div className="relative">
                <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    errores.password ? 'border-red-500' : ''
                  }`}
                  placeholder="Contraseña"
                />
              </div>
              {errores.password && (
                <p className="mt-1 text-sm text-red-600">{errores.password}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña
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
                  placeholder="Confirmar contraseña"
                />
              </div>
              {errores.confirmar_password && (
                <p className="mt-1 text-sm text-red-600">{errores.confirmar_password}</p>
              )}
            </div>
          </div>
          
          {esEdicion && (
            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Usuario activo</span>
              </label>
            </div>
          )}
        </Card>

        {/* Asignación de Sucursales */}
        <Card title="Sucursales Asignadas" icon={<FaStore />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sucursalesDisponibles.map(sucursal => (
              <div key={sucursal.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`sucursal-${sucursal.id}`}
                  checked={formData.sucursales.includes(sucursal.id)}
                  onChange={(e) => handleSucursalChange(sucursal.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`sucursal-${sucursal.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">{sucursal.nombre}</div>
                  <div className="text-xs text-gray-500">{sucursal.direccion}</div>
                  {sucursal.tipo === 'principal' && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Principal
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* Permisos Personalizados */}
        <Card 
          title="Permisos Personalizados" 
          icon={<FaShieldAlt />}
          actions={
            <div className="flex space-x-2">
              <Button
                type="button"
                size="sm"
                color="secondary"
                onClick={() => setShowPermisos(!showPermisos)}
                icon={showPermisos ? <FaToggleOn /> : <FaToggleOff />}
              >
                {showPermisos ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
          }
        >
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Los permisos aquí configurados sobrescriben los del rol base.
              Si no se especifica un permiso, se utilizará el del rol.
            </p>
          </div>

          {showPermisos && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">Configuración de Permisos</h4>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    color="secondary"
                    onClick={copiarPermisosRol}
                    disabled={!formData.rol_id}
                  >
                    Copiar del Rol
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    color="secondary"
                    onClick={resetearPermisos}
                  >
                    Resetear
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(MODULOS_DISPONIBLES).map(([moduloId, modulo]) => (
                  <div key={moduloId} className="border rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">{modulo.nombre}</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(modulo.acciones).map(([accionId, accionNombre]) => {
                        const tienePermiso = formData.permisos_personalizados?.[moduloId]?.[accionId] || false;
                        return (
                          <label key={accionId} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tienePermiso}
                              onChange={(e) => handlePermisoChange(moduloId, accionId, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">{accionNombre}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        
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
            {esEdicion ? 'Actualizar Usuario' : 'Guardar Usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UsuarioForm;