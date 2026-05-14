/**
 * Componente Sidebar actualizado
 * Muestra el nombre de la empresa desde la configuración
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configuracionService from '../../services/configuracion.service';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import {
  FaHome, FaBox, FaShoppingCart, FaUsers, FaChartBar,
  FaTag, FaCog, FaStore, FaClipboardList, FaTruck,
  FaWarehouse, FaMoneyBillWave, FaExchangeAlt, FaUndo,
  FaDollarSign, FaClipboardCheck, FaUserShield, FaFlask,
  FaBook, FaIndustry, FaChevronDown, FaCar, FaChevronRight,
  FaBuilding, FaTimes
} from 'react-icons/fa';
import NexoPOSLogo from '../common/NexoPOSLogo';
import { isSuperAdminEmail } from '../../config/superAdmin';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { currentUser, hasPermission, orgId, companyModules } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [empresaConfig, setEmpresaConfig] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        // Preferir companies/{orgId}/config/empresa si existe
        if (orgId) {
          const ref = doc(db, `companies/${orgId}/config/empresa`);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setEmpresaConfig(snap.data());
            return;
          }
        }
        const config = await configuracionService.obtener();
        setEmpresaConfig(config);
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      } finally {
        setCargandoConfig(false);
      }
    };
    cargarConfiguracion();
  }, [orgId]);

  const nombreEmpresa = empresaConfig?.nombre_fantasia || empresaConfig?.razon_social || 'NexoPOS DC';

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const menuItems = [
    { 
      path: '/', 
      icon: FaHome, 
      label: 'Dashboard',
      permission: null
    },
    {
      icon: FaBox,
      label: 'Productos',
      permission: 'productos',
      submenu: [
        { path: '/productos', label: 'Lista de Productos', permission: 'productos.ver' },
        { path: '/productos/nuevo', label: 'Nuevo Producto', permission: 'productos.crear' },
        { path: '/categorias', label: 'Categorías', permission: 'categorias.ver' },
        { path: '/productos/precios', label: 'Gestión de Precios', permission: 'listas_precios.ver' }
      ]
    },
    {
      icon: FaFlask,
      label: 'Producción',
      permission: 'produccion',
      submenu: [
        { path: '/materias-primas', label: 'Materias Primas', permission: 'materias_primas.ver' },
        { path: '/recetas', label: 'Recetas', permission: 'recetas.ver' },
        { path: '/produccion', label: 'Órdenes de Producción', permission: 'produccion.ver' }
      ]
    },
    {
      icon: FaShoppingCart,
      label: 'Ventas',
      permission: 'ventas',
      moduleKey: 'ventas',
      submenu: [
        { path: '/punto-venta', label: 'Punto de Venta', module: 'punto_venta', permission: 'ventas.crear' },
        { path: '/ventas', label: 'Lista de Ventas', module: 'ventas', permission: 'ventas.ver' },
        { path: '/devoluciones', label: 'Devoluciones', module: 'devoluciones', permission: 'devoluciones.ver' },
        { path: '/ventas-eliminadas', label: 'Ventas Eliminadas', module: 'ventas', permission: 'ventas.ver', adminOnly: true }
      ]
    },
    {
      icon: FaTruck,
      label: 'Compras',
      permission: 'compras',
      submenu: [
        { path: '/compras', label: 'Lista de Compras', permission: 'compras.ver' },
        { path: '/compras/nueva', label: 'Nueva Compra', permission: 'compras.crear' },
        { path: '/proveedores', label: 'Proveedores', permission: 'proveedores.ver' }
      ]
    },
    {
      icon: FaWarehouse,
      label: 'Inventario',
      permission: 'stock',
      submenu: [
        { path: '/stock', label: 'Stock por Sucursal', permission: 'stock.ver' },
        { path: '/stock/transferencias', label: 'Transferencias', permission: 'transferencias.ver' },
        { path: '/stock/ajustes', label: 'Ajustes de Stock', permission: 'stock.ajustar' },
        { path: '/stock/control', label: 'Control de Stock', permission: null }
      ]
    },
    {
      icon: FaMoneyBillWave,
      label: 'Finanzas',
      permission: 'caja',
      submenu: [{ path: '/caja', label: 'Caja', module: 'caja', permission: 'caja.ver' }]
    },
    {
      icon: FaUsers,
      label: 'Clientes',
      permission: 'clientes',
      submenu: [
        { path: '/clientes', label: 'Lista de Clientes', permission: 'clientes.ver' },
        { path: '/clientes/nuevo', label: 'Nuevo Cliente', permission: 'clientes.crear' }
      ]
    },
    {
      icon: FaTag,
      label: 'Promociones',
      permission: 'promociones',
      submenu: [
        { path: '/promociones', label: 'Lista de Promociones', permission: 'promociones.ver' },
        { path: '/promociones/nueva', label: 'Nueva Promoción', permission: 'promociones.crear' }
      ]
    },
    {
      icon: FaChartBar,
      label: 'Reportes',
      permission: 'reportes',
      submenu: [
        { path: '/reportes/ventas', label: 'Reporte de Ventas', permission: 'reportes.ventas' },
        { path: '/reportes/compras', label: 'Reporte de Compras', permission: 'reportes.compras' },
        { path: '/reportes/ganancias', label: 'Reporte de Ganancias', permission: 'reportes.ganancias' }
      ]
    },
    {
      icon: FaUserShield,
      label: 'Usuarios',
      permission: 'usuarios',
      submenu: [
        { path: '/usuarios', label: 'Lista de Usuarios', permission: 'usuarios.ver' },
        { path: '/usuarios/nuevo', label: 'Nuevo Usuario', permission: 'usuarios.crear' },
        { path: '/usuarios/permisos', label: 'Gestión de Permisos', permission: 'usuarios.editar' }
      ]
    },
    {
      icon: FaCog,
      label: 'Configuración',
      permission: 'configuracion',
      submenu: [
        { path: '/sucursales', label: 'Sucursales', permission: 'sucursales.ver' },
        { path: '/configuracion/empresa', label: 'Datos Empresa', permission: 'configuracion.ver' },
        { path: '/auditoria', label: 'Auditoría', permission: 'auditoria.ver' }
      ]
    }
  ];

  const moduleEnabled = (permOrModule) => {
    if (!permOrModule) return true;
    const key = permOrModule.includes('.') ? permOrModule.split('.')[0] : permOrModule;
    return companyModules?.[key] !== false;
  };

  const superAdmin = isSuperAdminEmail(currentUser?.email);

  const filteredMenuItems = menuItems
    .map(item => {
      // Limpiar entradas WIP o sin implementación declaradas con module==='wip'
      if (item.submenu) {
        item.submenu = item.submenu.filter(sub => sub.module !== 'wip');
      }
      // Filtrar subitems por módulos y permisos
      let submenu = item.submenu?.filter(sub => {
        const modKey = sub.module || (sub.permission ? sub.permission.split('.')[0] : null);
        // Si es superAdmin, ignora módulos y permisos para ver todo
        if (superAdmin) return true;
        const modOk = moduleEnabled(modKey);
        const permOk = !sub.permission || hasPermission(sub.permission.split('.')[0], sub.permission.split('.')[1]);
        // Bloquear gestión de módulos/licencias para no superadmin
        const isConfigRutaSens = ['/admin', '/configuracion/modulos', '/configuracion/licencias'].includes(sub.path);
        if (isConfigRutaSens && !superAdmin) return false;
        return modOk && (currentUser?.rol === 'Administrador' || permOk);
      });
      if (submenu && submenu.length === 0) submenu = undefined;
      return { ...item, submenu };
    })
    .filter(item => {
      // Si es superAdmin, muestra todas las secciones
      if (superAdmin) return true;
      // Filtrar items por módulo y permisos
      const modOk = moduleEnabled(item.permission);
      if (!modOk) return false;
      // Ocultar completamente la sección de Configuración sensible para no superadmin
      if (item.label === 'Configuración' && !superAdmin) {
        if (item.submenu) {
          item.submenu = item.submenu.filter(s => ['/sucursales','/configuracion/empresa','/auditoria'].includes(s.path));
        }
      }
      if (!item.permission) return true;
      if (currentUser?.rol === 'Administrador') return true;
      if (item.submenu) return item.submenu && item.submenu.length > 0;
      return hasPermission(item.permission, 'ver');
    });

  const isActive = (path) => location.pathname === path;
  const isParentActive = (submenu) => submenu?.some(item => location.pathname === item.path);

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800/80 bg-slate-950 text-slate-100 shadow-elevated
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-0
        `}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 px-3 sm:h-16 sm:px-4">
            <div className="flex items-center">
              {empresaConfig?.mostrar_logo && empresaConfig?.logo_url ? (
                <img 
                  src={empresaConfig.logo_url} 
                  alt="Logo" 
                  className="h-6 w-auto mr-2 sm:h-8 sm:mr-3"
                  style={{ maxHeight: '32px', filter: 'brightness(0) invert(1)' }}
                />
              ) : (
                <div className="mr-2 sm:mr-3">
                  <NexoPOSLogo className="h-6 w-auto sm:h-8" showText={false} />
                </div>
              )}
              <span className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                {cargandoConfig ? (
                  <span className="animate-pulse">Cargando...</span>
                ) : (
                  nombreEmpresa
                )}
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <FaTimes size={18} className="sm:w-5" />
            </button>
          </div>

          {/* Menú de navegación */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 scrollbar-thin">
            {filteredMenuItems.map((item, index) => (
              <div key={index}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className={`
                        flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium
                        transition-colors duration-200 hover:bg-slate-800/70
                        ${
                          isParentActive(item.submenu)
                            ? 'bg-gradient-to-r from-indigo-600/35 to-violet-600/25 text-white ring-1 ring-indigo-400/35'
                            : 'text-slate-100'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3" size={20} />
                        <span>{item.label}</span>
                      </div>
                      {expandedMenus[item.label] ? 
                        <FaChevronDown size={12} /> : 
                        <FaChevronRight size={12} />
                      }
                    </button>
                    {expandedMenus[item.label] && (
                      <div className="mx-1 mb-1 mt-0.5 space-y-0.5 rounded-xl bg-slate-900/60 py-1 pl-2">
                        {item.submenu.map((subitem, subindex) => (
                          <Link
                            key={subindex}
                            to={subitem.path}
                            className={`
                              block rounded-lg py-2 pl-9 pr-3 text-sm transition-colors duration-150
                              ${
                                isActive(subitem.path)
                                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 font-medium text-white shadow-md'
                                  : 'text-slate-100 hover:bg-slate-800/70 hover:text-white'
                              }
                            `}
                            onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                          >
                            {subitem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`
                      flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200
                      hover:bg-slate-800/70
                      ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-indigo-600/35 to-violet-600/25 text-white ring-1 ring-indigo-400/35'
                          : 'text-slate-100'
                      }
                    `}
                    onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                  >
                    <item.icon className="mr-3" size={20} />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
            {superAdmin && (
              <div className="mt-2 px-0">
                <Link
                  to="/admin"
                  className={`
                    flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200
                    hover:bg-slate-800/70
                    ${
                      location.pathname === '/admin'
                        ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-100 ring-1 ring-amber-400/30'
                        : 'text-slate-100'
                    }
                  `}
                  onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                >
                  <FaUserShield className="mr-3" size={20} />
                  <span>Admin</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Footer del Sidebar */}
          <div className="border-t border-white/10 p-4">
            <div className="text-center text-xs text-slate-500">
              {empresaConfig?.slogan && (
                <p className="mb-2 italic">{empresaConfig.slogan}</p>
              )}
              <p>© 2024 {nombreEmpresa}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;