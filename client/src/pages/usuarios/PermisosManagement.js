// src/pages/usuarios/PermisosManagement.js - VERSIÓN CON TODOS LOS MÓDULOS
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import usuariosService from '../../services/usuarios.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaCheck, FaTimes, FaSave, FaEdit, FaUserCog
} from 'react-icons/fa';

/**
 * Lista completa de módulos del sistema
 */
const MODULOS_SISTEMA = [
  // Módulos existentes
  { id: 'productos', nombre: 'Productos', icono: 'FaBox' },
  { id: 'categorias', nombre: 'Categorías', icono: 'FaTag' },
  { id: 'compras', nombre: 'Compras', icono: 'FaShoppingCart' },
  { id: 'ventas', nombre: 'Ventas', icono: 'FaShoppingBag' },
  { id: 'stock', nombre: 'Stock', icono: 'FaWarehouse' },
  { id: 'reportes', nombre: 'Reportes', icono: 'FaChartBar' },
  { id: 'promociones', nombre: 'Promociones', icono: 'FaPercent' },
  { id: 'usuarios', nombre: 'Usuarios', icono: 'FaUsers' },
  { id: 'sucursales', nombre: 'Sucursales', icono: 'FaStore' },
  
  // Módulos nuevos agregados
  { id: 'clientes', nombre: 'Clientes', icono: 'FaUserTie' },
  { id: 'materias_primas', nombre: 'Materias Primas', icono: 'FaCubes' },
  { id: 'recetas', nombre: 'Recetas', icono: 'FaClipboardList' },
  { id: 'produccion', nombre: 'Producción', icono: 'FaIndustry' },
  { id: 'caja', nombre: 'Caja', icono: 'FaCashRegister' },
  { id: 'gastos', nombre: 'Gastos', icono: 'FaMoneyBillWave' },
  { id: 'devoluciones', nombre: 'Devoluciones', icono: 'FaUndo' },
  { id: 'listas_precios', nombre: 'Listas de Precios', icono: 'FaTags' },
  { id: 'transferencias', nombre: 'Transferencias', icono: 'FaExchangeAlt' },
  { id: 'auditoria', nombre: 'Auditoría', icono: 'FaHistory' }
];

/**
 * Acciones disponibles por módulo
 */
const ACCIONES_CRUD = ['ver', 'crear', 'editar', 'eliminar'];

/**
 * Plantillas de roles predefinidas
 */
const PLANTILLAS_ROLES = {
  vendedor: {
    nombre: 'Vendedor',
    permisos: {
      productos: { ver: true, crear: false, editar: false, eliminar: false },
      clientes: { ver: true, crear: true, editar: true, eliminar: false },
      ventas: { ver: true, crear: true, editar: false, eliminar: false },
      stock: { ver: true, crear: false, editar: false, eliminar: false },
      caja: { ver: true, crear: true, editar: false, eliminar: false }
    }
  },
  supervisor: {
    nombre: 'Supervisor',
    permisos: {
      productos: { ver: true, crear: true, editar: true, eliminar: false },
      categorias: { ver: true, crear: true, editar: true, eliminar: false },
      clientes: { ver: true, crear: true, editar: true, eliminar: true },
      ventas: { ver: true, crear: true, editar: true, eliminar: false },
      compras: { ver: true, crear: false, editar: false, eliminar: false },
      stock: { ver: true, crear: true, editar: true, eliminar: false },
      reportes: { ver: true, crear: false, editar: false, eliminar: false },
      caja: { ver: true, crear: true, editar: true, eliminar: false },
      devoluciones: { ver: true, crear: true, editar: true, eliminar: false }
    }
  },
  gerente: {
    nombre: 'Gerente',
    permisos: {
      // Todos los módulos con casi todos los permisos
      ...Object.fromEntries(
        MODULOS_SISTEMA.map(mod => [
          mod.id,
          { ver: true, crear: true, editar: true, eliminar: mod.id !== 'auditoria' }
        ])
      )
    }
  }
};

const PermisosManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [permisos, setPermisos] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (usuarioSeleccionado) {
      cargarPermisosUsuario(usuarioSeleccionado.id);
    }
  }, [usuarioSeleccionado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const usuariosData = await usuariosService.obtenerTodos();
      setUsuarios(usuariosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarPermisosUsuario = async (userId) => {
    try {
      // Por ahora usar los permisos del usuario seleccionado
      const permisosUsuario = usuarioSeleccionado.permisos || {};
      
      // Inicializar todos los módulos con permisos por defecto
      const permisosCompletos = {};
      MODULOS_SISTEMA.forEach(modulo => {
        permisosCompletos[modulo.id] = permisosUsuario[modulo.id] || {
          ver: false,
          crear: false,
          editar: false,
          eliminar: false
        };
      });
      
      setPermisos(permisosCompletos);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
      toast.error('Error al cargar permisos del usuario');
    }
  };

  const handleTogglePermiso = (modulo, accion) => {
    if (!modoEdicion) return;
    
    setPermisos(prev => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [accion]: !prev[modulo][accion]
      }
    }));
  };

  const aplicarPlantilla = (plantillaKey) => {
    if (!modoEdicion) return;
    
    const plantilla = PLANTILLAS_ROLES[plantillaKey];
    if (!plantilla) return;
    
    // Aplicar permisos de la plantilla
    const nuevosPermisos = {};
    MODULOS_SISTEMA.forEach(modulo => {
      nuevosPermisos[modulo.id] = plantilla.permisos[modulo.id] || {
        ver: false,
        crear: false,
        editar: false,
        eliminar: false
      };
    });
    
    setPermisos(nuevosPermisos);
    toast.success(`Plantilla "${plantilla.nombre}" aplicada`);
  };

  const guardarPermisos = async () => {
    if (!usuarioSeleccionado) return;
    
    try {
      setGuardando(true);
      
      // Actualizar permisos del usuario
      await usuariosService.actualizar(usuarioSeleccionado.id, {
          nombre: usuarioSeleccionado.nombre,
		  email: usuarioSeleccionado.email,
		  permisos: permisos
		});
      
      toast.success('Permisos guardados correctamente');
      setModoEdicion(false);
      
      // Recargar usuarios para reflejar cambios
      await cargarDatos();
      
    } catch (error) {
      console.error('Error al guardar permisos:', error);
      toast.error('Error al guardar permisos');
    } finally {
      setGuardando(false);
    }
  };

  const marcarTodos = (modulo, valor) => {
    if (!modoEdicion) return;
    
    setPermisos(prev => ({
      ...prev,
      [modulo]: {
        ver: valor,
        crear: valor,
        editar: valor,
        eliminar: valor
      }
    }));
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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Gestión de Permisos
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Configure permisos detallados por usuario
          </p>
        </div>
      </div>

      {/* Selector de usuario */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Seleccionar Usuario</h3>
          {usuarioSeleccionado && (
            <div className="flex gap-2">
              {!modoEdicion ? (
                <Button
                  size="sm"
                  color="primary"
                  onClick={() => setModoEdicion(true)}
                  icon={<FaEdit />}
                >
                  Editar Permisos
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    color="secondary"
                    onClick={() => {
                      setModoEdicion(false);
                      cargarPermisosUsuario(usuarioSeleccionado.id);
                    }}
                    icon={<FaTimes />}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    color="success"
                    onClick={guardarPermisos}
                    loading={guardando}
                    icon={<FaSave />}
                  >
                    Guardar Cambios
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {usuarios.map(usuario => (
            <button
              key={usuario.id}
              onClick={() => setUsuarioSeleccionado(usuario)}
              className={`p-3 border rounded-lg text-left transition-colors ${
                usuarioSeleccionado?.id === usuario.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">
                {usuario.nombre} {usuario.apellido}
              </div>
              <div className="text-xs text-gray-500">{usuario.email}</div>
              <div className="text-xs text-indigo-600 mt-1">
			  {typeof usuario.rol === 'object' ? usuario.rol.nombre : usuario.rol}
			</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Tabla de permisos */}
      {usuarioSeleccionado && (
        <>
          {/* Plantillas rápidas */}
          {modoEdicion && (
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Aplicar Plantilla Rápida:</h3>
                <div className="flex gap-2">
                  {Object.entries(PLANTILLAS_ROLES).map(([key, plantilla]) => (
                    <Button
                      key={key}
                      size="sm"
                      color="secondary"
                      onClick={() => aplicarPlantilla(key)}
                      icon={<FaUserCog />}
                    >
                      {plantilla.nombre}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Módulo
                    </th>
                    {ACCIONES_CRUD.map(accion => (
                      <th key={accion} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {accion}
                      </th>
                    ))}
                    {modoEdicion && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {MODULOS_SISTEMA.map(modulo => (
                    <tr key={modulo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {modulo.nombre}
                        </div>
                      </td>
                      {ACCIONES_CRUD.map(accion => (
                        <td key={accion} className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleTogglePermiso(modulo.id, accion)}
                            disabled={!modoEdicion}
                            className={`${
                              modoEdicion ? 'cursor-pointer' : 'cursor-not-allowed'
                            }`}
                          >
                            {permisos[modulo.id]?.[accion] ? (
                              <FaCheck className="text-green-600 mx-auto" />
                            ) : (
                              <FaTimes className="text-red-600 mx-auto" />
                            )}
                          </button>
                        </td>
                      ))}
                      {modoEdicion && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => marcarTodos(modulo.id, true)}
                              className="text-xs text-green-600 hover:text-green-800"
                              title="Marcar todos"
                            >
                              Todos
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => marcarTodos(modulo.id, false)}
                              className="text-xs text-red-600 hover:text-red-800"
                              title="Desmarcar todos"
                            >
                              Ninguno
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default PermisosManagement;