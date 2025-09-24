/**
 * Componente de debug para verificar permisos y funcionalidad
 * SOLO para desarrollo y testing
 * 
 * @module pages/usuarios/DebugPermisos
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/common/Card';
import { FaCog, FaCheck, FaTimes, FaUser, FaShield } from 'react-icons/fa';

/**
 * Componente para debugging de permisos (solo en desarrollo)
 */
const DebugPermisos = () => {
  const { 
    currentUser, 
    permisosEfectivos, 
    hasPermission, 
    sucursalSeleccionada,
    sucursalesDisponibles,
    getUserInfo 
  } = useAuth();

  const MODULOS_TEST = [
    'productos', 'categorias', 'compras', 'ventas', 
    'stock', 'reportes', 'promociones', 'usuarios', 'sucursales'
  ];

  const ACCIONES_TEST = ['ver', 'crear', 'editar', 'eliminar'];

  const userInfo = getUserInfo();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Debug - Verificación de Permisos
        </h1>
        <div className="text-sm text-red-600 font-medium">
          ⚠️ SOLO PARA DESARROLLO
        </div>
      </div>

      {/* Información del Usuario */}
      <Card title="Información del Usuario Actual" icon={<FaUser />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Datos Básicos</h3>
            <div className="space-y-1 text-sm">
              <div><strong>ID:</strong> {currentUser?.id}</div>
              <div><strong>Email:</strong> {currentUser?.email}</div>
              <div><strong>Nombre:</strong> {currentUser?.nombre} {currentUser?.apellido}</div>
              <div><strong>Rol:</strong> {currentUser?.rol}</div>
              <div><strong>Rol ID:</strong> {currentUser?.rolId}</div>
              <div><strong>Activo:</strong> {currentUser?.activo ? '✅' : '❌'}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Sucursales</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Sucursal Actual:</strong> {sucursalSeleccionada?.nombre || 'Ninguna'}</div>
              <div><strong>Sucursales Disponibles:</strong> {sucursalesDisponibles?.length || 0}</div>
              <div className="mt-2">
                {sucursalesDisponibles?.map(s => (
                  <div key={s.id} className="text-xs text-gray-600">
                    • {s.nombre} {s.id === sucursalSeleccionada?.id && '(Actual)'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Matriz de Permisos */}
      <Card title="Matriz de Permisos Efectivos" icon={<FaShield />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Módulo
                </th>
                {ACCIONES_TEST.map(accion => (
                  <th key={accion} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {accion}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {MODULOS_TEST.map(modulo => (
                <tr key={modulo}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {modulo}
                  </td>
                  {ACCIONES_TEST.map(accion => {
                    const tienePermiso = hasPermission(modulo, accion);
                    const permisoDirecto = permisosEfectivos?.[modulo]?.[accion];
                    
                    return (
                      <td key={accion} className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            tienePermiso 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tienePermiso ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                          </span>
                          <span className="text-xs text-gray-500">
                            {permisoDirecto !== undefined ? `(${permisoDirecto})` : '(inherit)'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Información Técnica */}
      <Card title="Información Técnica (JSON)" icon={<FaCog />}>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Permisos Efectivos</h3>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
              {JSON.stringify(permisosEfectivos, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Custom Claims</h3>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
              {JSON.stringify(currentUser?.customClaims, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Información Completa</h3>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
        </div>
      </Card>

      {/* Tests de Funcionalidad */}
      <Card title="Tests de Funcionalidad" icon={<FaCheck />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Acceso a Módulos</h3>
            <div className="space-y-2">
              {MODULOS_TEST.map(modulo => {
                const puedeVer = hasPermission(modulo, 'ver');
                return (
                  <div key={modulo} className="flex justify-between items-center text-sm">
                    <span className="capitalize">{modulo}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      puedeVer 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {puedeVer ? 'Acceso' : 'Bloqueado'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Capacidades de Administración</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Crear usuarios</span>
                <span className={hasPermission('usuarios', 'crear') ? 'text-green-600' : 'text-red-600'}>
                  {hasPermission('usuarios', 'crear') ? '✅' : '❌'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Editar usuarios</span>
                <span className={hasPermission('usuarios', 'editar') ? 'text-green-600' : 'text-red-600'}>
                  {hasPermission('usuarios', 'editar') ? '✅' : '❌'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ver reportes</span>
                <span className={hasPermission('reportes', 'ver') ? 'text-green-600' : 'text-red-600'}>
                  {hasPermission('reportes', 'ver') ? '✅' : '❌'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gestionar stock</span>
                <span className={hasPermission('stock', 'crear') ? 'text-green-600' : 'text-red-600'}>
                  {hasPermission('stock', 'crear') ? '✅' : '❌'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DebugPermisos;