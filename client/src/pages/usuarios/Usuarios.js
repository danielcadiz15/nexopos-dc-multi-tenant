/**
 * Página de gestión de usuarios - CORREGIDA
 * 
 * Muestra el listado de usuarios y permite realizar búsquedas,
 * crear, editar y cambiar el estado de usuarios.
 * 
 * @module pages/usuarios/Usuarios
 * @requires react, react-router-dom, ../../services/usuarios.service
 * @related_files ./UsuarioForm.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import usuariosService from '../../services/usuarios.service';

// Contexto de autenticación
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaUsers, FaUserPlus, FaSearch, FaEdit, 
  FaToggleOn, FaToggleOff, FaKey, FaShieldAlt,
  FaUserTie, FaCalendarAlt, FaClock
} from 'react-icons/fa';

/**
 * Componente de página para gestión de usuarios - CORREGIDO
 * @returns {JSX.Element} Componente Usuarios
 */
const Usuarios = () => {
  const navigate = useNavigate();
  const { currentUser, hasPermission } = useAuth();
 
  // Estado
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarioACambiar, setUsuarioACambiar] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarUsuarios();
  }, []);
  
  /**
   * Carga todos los usuarios
   */
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      console.log('🔄 [USUARIOS UI] Cargando usuarios...');
      
      const data = await usuariosService.obtenerTodos();
      console.log('✅ [USUARIOS UI] Usuarios recibidos:', data);
      
      setUsuarios(data || []);
    } catch (error) {
      console.error('❌ [USUARIOS UI] Error al cargar usuarios:', error);
      toast.error('Error al cargar los usuarios');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Busca usuarios por término
   */
  const buscarUsuarios = async () => {
    try {
      setLoading(true);
      
      if (!searchTerm.trim()) {
        // Si el término está vacío, cargar todos los usuarios
        await cargarUsuarios();
        return;
      }
      
      console.log('🔍 [USUARIOS UI] Buscando:', searchTerm);
      const data = await usuariosService.buscar(searchTerm);
      setUsuarios(data || []);
    } catch (error) {
      console.error('❌ [USUARIOS UI] Error al buscar usuarios:', error);
      toast.error('Error en la búsqueda');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Prepara el cambio de estado de un usuario
   */
  const prepararCambiarEstado = (usuario) => {
    setUsuarioACambiar(usuario);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma el cambio de estado del usuario
   */
  const confirmarCambiarEstado = async () => {
    if (!usuarioACambiar) return;
    
    try {
      const nuevoEstado = !usuarioACambiar.activo;
      
      await usuariosService.cambiarEstado(usuarioACambiar.id, nuevoEstado);
      
      // Actualizar la lista local
      setUsuarios(usuarios.map(u => 
        u.id === usuarioACambiar.id 
          ? { ...u, activo: nuevoEstado }
          : u
      ));
      
      toast.success(
        `Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`
      );
      
      setShowConfirmDialog(false);
      setUsuarioACambiar(null);
      
    } catch (error) {
      console.error('❌ [USUARIOS UI] Error al cambiar estado:', error);
      toast.error('Error al cambiar el estado del usuario');
    }
  };
  
  /**
   * Cancela el cambio de estado
   */
  const cancelarCambiarEstado = () => {
    setShowConfirmDialog(false);
    setUsuarioACambiar(null);
  };
  
  /**
   * Función para verificar permisos de forma segura
   * @param {string} modulo - Módulo
   * @param {string} accion - Acción
   * @returns {boolean} Tiene permiso
   */
  const tienePermiso = (modulo, accion) => {
    try {
      console.log(`🔐 [USUARIOS] Verificando permiso: ${modulo}.${accion}`);
      console.log(`🔐 [USUARIOS] Usuario actual:`, {
        id: currentUser?.id,
        email: currentUser?.email,
        rol: currentUser?.rol,
        rolId: currentUser?.rolId
      });
      
      if (hasPermission && typeof hasPermission === 'function') {
        const resultado = hasPermission(modulo, accion);
        console.log(`🔐 [USUARIOS] Resultado de hasPermission: ${resultado}`);
        return resultado;
      }
      
      const esAdmin = currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin';
      console.log(`🔐 [USUARIOS] Fallback a verificación de rol: ${esAdmin}`);
      return esAdmin;
    } catch (error) {
      console.warn('⚠️ [USUARIOS] Error al verificar permisos:', error);
      return false;
    }
  };
  
  /**
   * Función para formatear rol de forma segura
   * @param {any} rol - Rol del usuario
   * @returns {string} Rol formateado
   */
  const formatearRol = (rol) => {
    try {
      // Si rol es un objeto, extraer la propiedad nombre
      if (rol && typeof rol === 'object') {
        return rol.nombre || rol.id || 'Sin rol';
      }
      
      // Si es string, mapear a nombre legible
      const rolesMap = {
        'admin': 'Administrador',
        'empleado': 'Empleado', 
        'gerente': 'Gerente',
        'Administrador': 'Administrador',
        'Empleado': 'Empleado',
        'Gerente': 'Gerente'
      };
      
      return rolesMap[rol] || rol || 'Sin rol';
    } catch (error) {
      console.warn('⚠️ Error al formatear rol:', error);
      return 'Sin rol';
    }
  };
  
  /**
   * Función para formatear fecha de forma segura
   * @param {any} fecha - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  const formatearFecha = (fecha) => {
    try {
      if (!fecha) return 'Nunca';
      
      // Si es un Timestamp de Firebase
      if (fecha && fecha.toDate && typeof fecha.toDate === 'function') {
        return fecha.toDate().toLocaleString();
      }
      
      // Si es string o Date
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleString();
    } catch (error) {
      console.warn('⚠️ Error al formatear fecha:', error);
      return 'Fecha inválida';
    }
  };
  
  /**
   * Columnas para la tabla de usuarios - CORREGIDAS
   */
  const columns = [
    {
      header: 'Usuario',
      accessor: 'nombre',
      cell: (row) => (
        <div>
          <div className="font-medium">
            {String(row.nombre || '')} {String(row.apellido || '')}
          </div>
          <div className="text-sm text-gray-500">
            {String(row.email || '')}
          </div>
        </div>
      )
    },
    {
      header: 'Rol',
      accessor: 'rol',
      cell: (row) => (
        <div className="flex items-center">
          <FaUserTie className="mr-2 text-gray-500" />
          <span>{formatearRol(row.rol)}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'activo',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.activo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      header: 'Última Sesión',
      accessor: 'ultima_sesion',
      cell: (row) => (
        <div className="flex items-center text-sm">
          <FaClock className="mr-2 text-gray-500" />
          <span>{formatearFecha(row.ultima_sesion)}</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          {/* Botón Editar */}
          {tienePermiso('usuarios', 'editar') && (
            <button
              onClick={() => navigate(`/usuarios/editar/${row.id}`)}
              className="text-blue-600 hover:text-blue-800"
              title="Editar usuario"
            >
              <FaEdit />
            </button>
          )}
          
          {/* Botón Cambiar Contraseña */}
          {(tienePermiso('usuarios', 'editar') || currentUser?.id === row.id) && (
            <button
              onClick={() => navigate(`/usuarios/${row.id}/password`)}
              className="text-orange-600 hover:text-orange-800"
              title="Cambiar contraseña"
            >
              <FaKey />
            </button>
          )}
          
          {/* Botón Cambiar Estado - Solo si no es el usuario actual */}
          {row.id !== currentUser?.id && tienePermiso('usuarios', 'editar') && (
            <button
              onClick={() => prepararCambiarEstado(row)}
              className={`${
                row.activo
                  ? 'text-red-600 hover:text-red-800'
                  : 'text-green-600 hover:text-green-800'
              }`}
              title={row.activo ? 'Desactivar usuario' : 'Activar usuario'}
            >
              {row.activo ? <FaToggleOff /> : <FaToggleOn />}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
		  <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
		  
		  <div className="flex gap-2">
			{tienePermiso('usuarios', 'crear') && (
			  <Link to="/usuarios/nuevo">
				<Button color="primary" icon={<FaUserPlus />}>
				  Nuevo Usuario
				</Button>
			  </Link>
			)}
			
			{/* AGREGA ESTE BOTÓN */}
			{tienePermiso('usuarios', 'editar') && (
			  <Link to="/usuarios/permisos">
				<Button color="secondary" icon={<FaShieldAlt />}>
				  Gestión de Permisos
				</Button>
			  </Link>
			)}
		  </div>
		</div>
      
      <Card>
        <SearchBar
          placeholder="Buscar por nombre, apellido o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={buscarUsuarios}
          onClear={() => {
            setSearchTerm('');
            cargarUsuarios();
          }}
        />
      </Card>
      
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {usuarios.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay usuarios disponibles
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? 'No se encontraron resultados para tu búsqueda'
                    : 'Comienza creando nuevos usuarios del sistema'
                  }
                </p>
                
                {tienePermiso('usuarios', 'crear') && (
                  <div className="mt-4">
                    <Link to="/usuarios/nuevo">
                      <Button
                        color="primary"
                        icon={<FaUserPlus />}
                      >
                        Agregar Usuario
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Table
                columns={columns}
                data={usuarios}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación para cambiar estado */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={usuarioACambiar?.activo ? "Desactivar Usuario" : "Activar Usuario"}
        message={
          usuarioACambiar
            ? `¿Estás seguro de que deseas ${
                usuarioACambiar.activo ? 'desactivar' : 'activar'
              } al usuario "${usuarioACambiar.nombre} ${usuarioACambiar.apellido}"?`
            : ''
        }
        confirmText={usuarioACambiar?.activo ? "Desactivar" : "Activar"}
        cancelText="Cancelar"
        onConfirm={confirmarCambiarEstado}
        onCancel={cancelarCambiarEstado}
      />
    </div>
  );
};

export default Usuarios;