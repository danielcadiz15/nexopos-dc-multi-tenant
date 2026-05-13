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

import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaCog } from 'react-icons/fa';
import NexoPOSLogo from '../common/NexoPOSLogo';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const { currentUser, logout, orgId } = useAuth();
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

        if ((ui.phase === 'active' || ui.phase === 'demo_active') && ui.paidUntilMs) {
          const diff = daysUntilPaidUntil(ui.paidUntilMs);
          setLicDaysLeft(diff != null && Number.isFinite(diff) ? diff : null);
          setLicChip(
            diff != null && diff >= 0
              ? `${lic?.demo ? 'Demo' : planLabel} · ${diff} ${diff === 1 ? 'día' : 'días'}`
              : `${planLabel}`
          );
          return;
        }
        setLicDaysLeft(null);
        if (ui.phase === 'unpaid_grace' || ui.phase === 'grace') {
          setLicChip(`${planLabel} · gracia ${formatGraceCountdown(ui.graceEndsAt)}`);
        } else if (ui.phase === 'demo_expired') {
          setLicChip('Demo finalizada · activar plan');
        } else if (ui.phase === 'demo_active' && ui.paidUntilMs) {
          setLicChip('Demo activa');
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
    <header className="relative z-40 border-b border-slate-200/90 bg-white/85 shadow-sm shadow-slate-900/5 backdrop-blur-md">
      <div className="px-2 sm:px-4 lg:px-8">
        <div className="flex h-14 items-center justify-between sm:h-16">
          {/* Botón de menú y logo/nombre */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/40 lg:hidden"
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
				<span className="max-w-[150px] truncate text-lg font-semibold tracking-tight text-slate-900 sm:max-w-none sm:text-xl">
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
				  className={`hidden max-w-[220px] truncate rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm sm:inline-flex ${
				    showDemo
				      ? 'border-amber-300/80 bg-amber-50/95 text-amber-950 hover:bg-amber-100'
				      : 'border-indigo-200/80 bg-indigo-50/95 text-indigo-950 hover:bg-indigo-100'
				  }`}
				  title="Ver licencia y pagar"
				>
				  Licencia: {licChip}
				</Link>
			  )}
              {blockedMsg && (
                <div className="hidden rounded-full border border-red-200/90 bg-red-50/95 px-2.5 py-1 text-xs font-medium text-red-900 backdrop-blur-sm sm:block">
                  {blockedMsg}
                </div>
              )}
			  {/* Selector de sucursal */}
			  <SucursalSelector />

            {/* Menú de usuario */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                className="flex items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/25">
                  {currentUser?.nombre ? currentUser.nombre[0].toUpperCase() : 'U'}
                </div>
                <span className="ml-3 hidden text-sm font-medium text-slate-700 lg:block">
                  {currentUser?.nombre || currentUser?.email}
                </span>
              </button>

              {/* Dropdown del usuario */}
              {showUserMenu && (
                <div className="user-menu-dropdown absolute right-0 z-[80] mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 py-1 shadow-elevated backdrop-blur-md ring-1 ring-slate-900/5">
                  <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                    {currentUser?.email}
                  </div>
                  
                  <Link
                    to="/perfil"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FaUser className="inline mr-2" />
                    Mi Perfil
                  </Link>
                  
                  <Link
                    to="/configuracion/empresa"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FaCog className="inline mr-2" />
                    Configuración
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
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