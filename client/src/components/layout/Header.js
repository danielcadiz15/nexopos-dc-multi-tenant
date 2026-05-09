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
import { evaluateLicenseUiState, formatGraceCountdown, daysUntilPaidUntil } from '../../utils/licenseUi';
import { normalizeLicensePlan, PLAN_LABELS_ES } from '../../utils/planTiers';

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
  const [licChip, setLicChip] = useState(null);
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

  // Licencia: días / cortesía sin pago (misma lógica que la barra principal)
  useEffect(() => {
    const cargarLicencia = async () => {
      try {
        if (!orgId) {
          setLicDaysLeft(null);
          setLicChip(null);
          return;
        }
        let lic = null;
        const r1 = await getDoc(doc(db, `companies/${orgId}/config/license`));
        if (r1.exists()) lic = r1.data();
        if (!lic) {
          const r2 = await getDoc(doc(db, 'licenses', orgId));
          if (r2.exists()) lic = r2.data();
        }
        const ui = evaluateLicenseUiState(lic || {});
        const planLabel = PLAN_LABELS_ES[normalizeLicensePlan(lic?.plan)] || 'Básica';

        if (ui.phase === 'active' && ui.paidUntilMs) {
          const diff = daysUntilPaidUntil(ui.paidUntilMs);
          setLicDaysLeft(diff != null && Number.isFinite(diff) ? diff : null);
          setLicChip(
            diff != null && diff >= 0
              ? `${planLabel} · ${diff} ${diff === 1 ? 'día' : 'días'}`
              : `${planLabel}`
          );
          return;
        }
        setLicDaysLeft(null);
        if (ui.phase === 'unpaid_grace' || ui.phase === 'grace') {
          setLicChip(`${planLabel} · gracia ${formatGraceCountdown(ui.graceEndsAt)}`);
        } else if (ui.phase === 'unpaid_needs_anchor') {
          setLicChip(`${planLabel} · sin pago (activando cortesía…)`);
        } else if (ui.phase === 'unpaid_expired' || ui.phase === 'expired' || ui.phase === 'blocked') {
          setLicChip(`${planLabel} · requiere pago`);
        } else {
          setLicChip(`${planLabel}`);
        }
      } catch {
        setLicDaysLeft(null);
        setLicChip(null);
      }
    };
    cargarLicencia();
  }, [orgId]);

  // Escuchar eventos de licencia bloqueada desde ApiService
  useEffect(() => {
    const onBlocked = (e) => {
      const d = e?.detail;
      setBlockedMsg(typeof d === 'string' ? d : (d?.message || 'Licencia inválida'));
    };
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
  const showLicChip = Boolean(orgId && licChip);
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
			  {showLicChip && (
				<Link
				  to="/configuracion/empresa?licencia=1"
				  className={`hidden sm:inline-flex text-xs px-2 py-1 rounded border max-w-[220px] truncate ${
				    showDemo
				      ? 'text-yellow-900 bg-yellow-100 border-yellow-300 hover:bg-yellow-200'
				      : 'text-indigo-900 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
				  }`}
				  title="Ver licencia y pagar"
				>
				  Licencia: {licChip}
				</Link>
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