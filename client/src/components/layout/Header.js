/**
 * Componente Header mejorado
 * Muestra el nombre de la empresa desde la configuración
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configuracionService from '../../services/configuracion.service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import SucursalSelector from '../common/SucursalSelector';

import { 
  FaBars, FaTimes, FaUser, FaSignOutAlt, FaStore,
  FaCog, FaBuilding
} from 'react-icons/fa';
import NexoPOSLogo from '../common/NexoPOSLogo';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const { currentUser, logout, sucursalSeleccionada, orgId } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [tenantName, setTenantName] = useState('');
  const [licDaysLeft, setLicDaysLeft] = useState(null);
  const [blockedMsg, setBlockedMsg] = useState(null);

  // Cargar configuración de empresa
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const config = await configuracionService.obtener();
        setEmpresaConfig(config);
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      } finally {
        setCargandoConfig(false);
      }
    };

    cargarConfiguracion();
  }, []);

  // Fallback: leer nombre del tenant si no hay configuracion
  useEffect(() => {
    const leerTenant = async () => {
      try {
        if (!orgId) return;
        const snap = await getDoc(doc(db, 'tenants', orgId));
        if (snap.exists()) {
          setTenantName(snap.data()?.nombre || '');
        }
      } catch (e) {
        console.warn('No se pudo leer tenant:', e.message);
      }
    };
    leerTenant();
  }, [orgId]);

  // Leer licencia para días restantes
  useEffect(() => {
    const cargarLicencia = async () => {
      try {
        if (!orgId) { setLicDaysLeft(null); return; }
        const ref = doc(db, `companies/${orgId}/config/license`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const lic = snap.data() || {};
          if (lic.paidUntil) {
            const diff = Math.ceil((new Date(lic.paidUntil).getTime() - Date.now())/(1000*60*60*24));
            setLicDaysLeft(Number.isFinite(diff) ? diff : null);
            return;
          }
        }
        setLicDaysLeft(null);
      } catch { setLicDaysLeft(null); }
    };
    cargarLicencia();
  }, [orgId]);

  // Escuchar eventos de licencia bloqueada desde ApiService
  useEffect(() => {
    const onBlocked = (e) => setBlockedMsg(e?.detail || 'Licencia inválida');
    const onOk = () => setBlockedMsg(null);
    window.addEventListener('license:blocked', onBlocked);
    window.addEventListener('license:ok', onOk);
    return () => {
      window.removeEventListener('license:blocked', onBlocked);
      window.removeEventListener('license:ok', onOk);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Determinar qué nombre mostrar
  const nombreEmpresa = empresaConfig?.nombre_fantasia || 
                       empresaConfig?.razon_social || 
                       tenantName ||
                       'Sistema de Gestión';

  const showDemo = licDaysLeft !== null && licDaysLeft >= 0;
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Botón de menú y logo/nombre */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            >
              {isSidebarOpen ? <FaTimes size={20} className="sm:w-6" /> : <FaBars size={20} className="sm:w-6" />}
            </button>
            
            <div className="flex items-center ml-2 sm:ml-4">
              {/* Logo si existe */}
              {empresaConfig?.mostrar_logo && empresaConfig?.logo_url ? (
                <img 
                  src={empresaConfig.logo_url} 
                  alt="Logo" 
                  className="h-6 w-auto mr-2 sm:h-8 sm:mr-3"
                  style={{ maxHeight: '32px' }}
                />
              ) : (
                <NexoPOSLogo className="h-6 w-auto mr-2 sm:h-8 sm:mr-3" showText={false} />
              )}
              
              {/* Nombre de la empresa */}
              <Link to="/" className="flex items-center">
				<span className="text-lg sm:text-xl font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-none">
                  {cargandoConfig ? (
                    <span className="animate-pulse">Cargando...</span>
                  ) : (
                    nombreEmpresa
                  )}
                </span>
              </Link>
            </div>
          </div>

          {/* Información de usuario y sucursal */}
			<div className="flex items-center space-x-4">
			  {showDemo && (
				<div className="hidden sm:block text-xs text-yellow-800 bg-yellow-100 border border-yellow-300 px-2 py-1 rounded">
				  Demo: {licDaysLeft} {licDaysLeft === 1 ? 'día' : 'días'} restantes
				</div>
			  )}
              {blockedMsg && (
                <div className="hidden sm:block text-xs text-red-800 bg-red-100 border border-red-300 px-2 py-1 rounded">
                  {blockedMsg}
                </div>
              )}
			  {/* Selector de sucursal */}
			  <SucursalSelector />

            {/* Menú de usuario */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  {currentUser?.nombre ? currentUser.nombre[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden ml-3 text-gray-700 text-sm font-medium lg:block">
                  {currentUser?.nombre || currentUser?.email}
                </span>
              </button>

              {/* Dropdown del usuario */}
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b">
                    {currentUser?.email}
                  </div>
                  
                  <Link
                    to="/perfil"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FaUser className="inline mr-2" />
                    Mi Perfil
                  </Link>
                  
                  <Link
                    to="/configuracion/empresa"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FaCog className="inline mr-2" />
                    Configuración
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FaSignOutAlt className="inline mr-2" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;