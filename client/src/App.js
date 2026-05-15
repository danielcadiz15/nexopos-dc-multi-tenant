/**
 * Componente principal de la aplicación
 * 
 * Configura el enrutamiento principal y maneja la autenticación global.
 * 
 * @module App
 * @requires react, react-router-dom, ./contexts/AuthContext, ./components/*, ./pages/*
 */

import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contextos
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Componentes de Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import MercadoPagoReturnHandler from './components/billing/MercadoPagoReturnHandler';

// Páginas públicas
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import VerificarEmailEmpresa from './pages/auth/VerificarEmailEmpresa';
import NotFound from './pages/NotFound';

// Páginas protegidas
import Dashboard from './pages/Dashboard';
// Módulo de clientes
import Clientes from './pages/clientes/Clientes';
import ClienteForm from './pages/clientes/ClienteForm';
import ImportarClientes from './pages/clientes/ImportarClientes';
// Módulo de Productos
import Productos from './pages/productos/Productos';
import ProductoForm from './pages/productos/ProductoForm';
import ProductoDetalle from './pages/productos/ProductoDetalle';
//control de stock
import ControlStock from './pages/stock/ControlStock';
import HistorialControl from './pages/stock/HistorialControl';
import DetalleControl from './pages/stock/DetalleControl';
import SolicitudesAjuste from './pages/stock/SolicitudesAjuste';
// Módulo de Compras
import Compras from './pages/compras/Compras';
import CompraForm from './pages/compras/CompraForm';
import CompraDetalle from './pages/compras/CompraDetalle';

// Módulo de Ventas
import Ventas from './pages/ventas/Ventas';
import VentaForm from './pages/ventas/VentaForm';
import DetalleVenta from './pages/ventas/DetalleVenta';
import PuntoVenta from './pages/ventas/PuntoVenta';

// Módulo de Stock
import Stock from './pages/stock/Stock';
import AjusteStock from './pages/stock/AjusteStock';
import InicializarStock from './pages/stock/InicializarStock';
import TransferenciasStock from './pages/stock/TransferenciasStock';
import NuevaTransferencia from './pages/stock/NuevaTransferencia';
import TransferenciaDetalle from './pages/stock/TransferenciaDetalle';
import MovimientosProducto from './pages/stock/MovimientosProducto';

// Módulo de Reportes
import Reportes from './pages/reportes/Reportes';
import ReporteVentas from './pages/reportes/ReporteVentas';
import ReporteCompras from './pages/reportes/ReporteCompras';
import ReporteGanancias from './pages/reportes/ReporteGanancias';

// Módulo de Promociones
import Promociones from './pages/promociones/Promociones';
import PromocionForm from './pages/promociones/PromocionForm';

// Módulo de Categorías
import Categorias from './pages/categorias/Categorias';
import CategoriaForm from './pages/categorias/CategoriaForm';
import CategoriaDetalle from './pages/categorias/CategoriaDetalle';

// Módulo de Usuarios
import Usuarios from './pages/usuarios/Usuarios';
import UsuarioForm from './pages/usuarios/UsuarioForm';
import Perfil from './pages/usuarios/Perfil';
import PermisosManagement from './pages/usuarios/PermisosManagement';
//materias primas
import MateriasPrimas from './pages/materiasPrimas/MateriasPrimas';
import MateriaPrimaForm from './pages/materiasPrimas/MateriaPrimaForm';
//recetas
import Recetas from './pages/recetas/Recetas';
import RecetaForm from './pages/recetas/RecetaForm';
import RecetaDetalle from './pages/recetas/RecetaDetalle';
//produccion
import Produccion from './pages/produccion/Produccion';
import ProduccionForm from './pages/produccion/ProduccionForm';
import ProduccionDetalle from './pages/produccion/ProduccionDetalle';
//listas de precios
import GestionPrecios from './pages/productos/GestionPrecios';
import Caja from './pages/caja/Caja';
import Gastos from './pages/finanzas/Gastos';
import Devoluciones from './pages/devoluciones/Devoluciones';
import DevolucionForm from './pages/devoluciones/DevolucionForm';
import Transferencias from './pages/transferencias/Transferencias';
import TransferenciaForm from './pages/transferencias/TransferenciaForm';
import VentasEliminadas from './pages/ventas/VentasEliminadas';
import Auditoria from './pages/auditoria/Auditoria';
// ✅ NUEVO: Configuración empresarial
import ConfiguracionEmpresa from './pages/configuracion/configuracionempresa';
// Módulo de Proveedores
import Proveedores from './pages/proveedores/Proveedores';
import ProveedorForm from './pages/proveedores/ProveedorForm';
import Sucursales from './pages/sucursales/Sucursales';
import MobilePuntoVenta from './components/mobile/MobilePuntoVenta';
import AdminPanel from './pages/admin/AdminPanel';
import SuperAdminRoute from './components/common/SuperAdminRoute';
import LicenseBanner from './components/layout/LicenseBanner';
import { useViewportHeight } from './hooks/useViewportHeight';
import tabletLoginBg from './assets/nexopos-tablet-login-bg.png';
import { ACCESS_MODES, getStoredAccessMode, isAdminLikeRole, setStoredAccessMode } from './utils/runtimeAccessMode';

const NATIVE_PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/verificar-email'];

const isNativeCapacitorRuntime = () => {
  try {
    if (typeof window === 'undefined') return false;
    if (window?.NexoAndroid) return true;
    if (
      !!window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    ) {
      return true;
    }
    const ua = String(window?.navigator?.userAgent || '').toLowerCase();
    const isAndroidWebView = ua.includes('android') && (ua.includes('; wv') || ua.includes('version/'));
    return isAndroidWebView;
  } catch {
    return false;
  }
};

const CajeroApp = () => (
  <div className="scrollbar-thin flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-y-contain bg-gray-50 px-2 pt-1 pb-1 sm:px-3">
    <div className="shrink-0">
      <LicenseBanner compact />
    </div>
    <div className="min-h-0 flex flex-1 flex-col">
      <MobilePuntoVenta />
    </div>
  </div>
);

const RootRouteGateway = () => {
  const { currentUser } = useAuth() || {};
  const nativeRuntime = isNativeCapacitorRuntime();
  if (nativeRuntime) {
    const mode = getStoredAccessMode(ACCESS_MODES.CAJERO);
    if (mode === ACCESS_MODES.ADMIN && isAdminLikeRole(currentUser)) {
      return <Dashboard />;
    }
    return <Navigate to="/cajero" replace />;
  }
  return <Dashboard />;
};

const AdminRouteGateway = () => <AdminPanel />;

const NativeRouteEnforcer = () => {
  const nativeRuntime = isNativeCapacitorRuntime();
  const auth = useAuth() || {};
  const { isAuthenticated, currentUser } = auth;
  const location = useLocation();
  const navigate = useNavigate();
  const cleanedLegacyCacheRef = useRef(false);

  useEffect(() => {
    if (!nativeRuntime || cleanedLegacyCacheRef.current) return;
    cleanedLegacyCacheRef.current = true;

    (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        }
      } catch {
        // ignore
      }
      try {
        if (typeof window !== 'undefined' && window.caches?.keys) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        }
      } catch {
        // ignore
      }
    })();
  }, [nativeRuntime]);

  useEffect(() => {
    if (!nativeRuntime) return;
    const path = String(location.pathname || '/').toLowerCase();
    const storedMode = getStoredAccessMode(ACCESS_MODES.CAJERO);
    const adminRole = isAdminLikeRole(currentUser);

    if (!isAuthenticated) return;

    const isPublicPath = NATIVE_PUBLIC_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );
    if (isPublicPath) return;

    if (storedMode === ACCESS_MODES.ADMIN && adminRole) {
      // Admin embebido completo: no restringimos módulos internos.
      return;
    }

    if (storedMode === ACCESS_MODES.ADMIN && !adminRole) {
      setStoredAccessMode(ACCESS_MODES.CAJERO);
    }
    if (!(path === '/cajero' || path.startsWith('/cajero/'))) {
      navigate('/cajero', { replace: true });
    }
  }, [location.pathname, nativeRuntime, navigate, isAuthenticated, currentUser]);

  return null;
};

const AppContent = () => {
  useViewportHeight();
  const auth = useAuth() || {};
  const { loading } = auth;

  if (loading) {
    const splashStyle = {
      backgroundImage: `url(${tabletLoginBg})`,
      backgroundSize: '200% 100%',
      backgroundPosition: 'left center',
      backgroundRepeat: 'no-repeat'
    };
    return (
      <div className="nexo-viewport-root flex flex-1 items-center justify-center" style={splashStyle}>
        <div className="text-center rounded-2xl bg-slate-950/55 px-8 py-6 text-white backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 font-semibold">Iniciando NexoPOS...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="nexo-viewport-root">
    <Router>
      <MercadoPagoReturnHandler />
      <NativeRouteEnforcer />
      <div className="nexo-route-outlet flex min-h-0 flex-1 flex-col overflow-hidden">
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Onboarding sin Layout: autenticado pero aún sin orgId */}
        <Route path="/verificar-email" element={<ProtectedRoute><VerificarEmailEmpresa /></ProtectedRoute>} />
        <Route path="/configuracion/empresa" element={<ProtectedRoute><ConfiguracionEmpresa /></ProtectedRoute>} />
        <Route path="/cajero" element={<ProtectedRoute><CajeroApp /></ProtectedRoute>} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<RootRouteGateway />} />
            <Route path="/admin" element={<SuperAdminRoute><AdminRouteGateway /></SuperAdminRoute>} />
            
            {/* Módulo de Productos */}
            <Route path="/productos" element={<Productos />} />
            <Route path="/productos/nuevo" element={<ProductoForm />} />
            <Route path="/productos/editar/:id" element={<ProductoForm />} />
            <Route path="/productos/:id" element={<ProductoDetalle />} />
			<Route path="/productos/precios" element={<GestionPrecios />} />

           {/* Módulo de Clientes - ORDEN IMPORTANTE */}
			<Route path="/clientes/nuevo" element={<ClienteForm />} />
			<Route path="/clientes/editar/:id" element={<ClienteForm />} />
			<Route path="/clientes/importar" element={<ImportarClientes />} />
			<Route path="/clientes" element={<Clientes />} />
            {/* Módulo de Compras */}
            <Route path="/compras" element={<Compras />} />
            <Route path="/compras/nueva" element={<CompraForm />} />
            <Route path="/compras/:id" element={<CompraDetalle />} />
            
            {/* Módulo de Ventas */}
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/ventas/nueva" element={<VentaForm />} />
            <Route path="/ventas/:id" element={<DetalleVenta />} />
            <Route path="/punto-venta" element={<PuntoVenta />} />
            <Route path="/ventas-eliminadas" element={<VentasEliminadas />} />
            
            {/* Módulo de Stock */}
            <Route path="/stock" element={<Stock />} />
            <Route path="/stock/ajustes" element={<Stock />} />
            <Route path="/stock/inicializar" element={<InicializarStock />} />
            <Route path="/stock/ajuste/:id" element={<AjusteStock />} />
            <Route path="/stock/transferencias" element={<TransferenciasStock />} />
            <Route path="/stock/transferencias/nueva" element={<NuevaTransferencia />} />
            
		    <Route path="/stock/transferencias/:id" element={<TransferenciaDetalle />} />
			{/* Historial de movimientos de producto */}
            <Route path="/stock/movimientos/:productoId" element={<MovimientosProducto />} />

            {/* Módulo de Reportes */}
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/reportes/ventas" element={<ReporteVentas />} />
            <Route path="/reportes/compras" element={<ReporteCompras />} />
            <Route path="/reportes/ganancias" element={<ReporteGanancias />} />
            
            {/* Módulo de Promociones */}
            <Route path="/promociones" element={<Promociones />} />
            <Route path="/promociones/nueva" element={<PromocionForm />} />
            <Route path="/promociones/editar/:id" element={<PromocionForm />} />
            
            {/* Módulo de Categorías */}
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/categorias/nueva" element={<CategoriaForm />} />
            <Route path="/categorias/editar/:id" element={<CategoriaForm />} />
            <Route path="/categorias/:id" element={<CategoriaDetalle />} />
            
            {/* Módulo de Usuarios */}
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/usuarios/nuevo" element={<UsuarioForm />} />
            <Route path="/usuarios/editar/:id" element={<UsuarioForm />} />
            <Route path="/perfil" element={<Perfil />} />
			{/* Módulo de Materias Primas */}
			<Route path="/materias-primas" element={<MateriasPrimas />} />
			<Route path="/materias-primas/nueva" element={<MateriaPrimaForm />} />
			<Route path="/materias-primas/editar/:id" element={<MateriaPrimaForm />} />
			{/* Módulo de Recetas */}
			<Route path="/recetas" element={<Recetas />} />
			<Route path="/recetas/nueva" element={<RecetaForm />} />
			<Route path="/recetas/editar/:id" element={<RecetaForm />} />
			<Route path="/recetas/:id" element={<RecetaDetalle />} />
			{/* Módulo de Producción */}
			<Route path="/produccion" element={<Produccion />} />
			<Route path="/produccion/nueva" element={<ProduccionForm />} />
			<Route path="/produccion/:id" element={<ProduccionDetalle />} />
			{/* Módulo de Proveedores */}
			<Route path="/proveedores" element={<Proveedores />} />
			<Route path="/proveedores/nuevo" element={<ProveedorForm />} />
            <Route path="/proveedores/editar/:id" element={<ProveedorForm />} />
			<Route path="/sucursales" element={<Sucursales />} />
			{/* Nuevos Módulos */}
			<Route path="/caja" element={<Caja />} />
			<Route path="/finanzas/gastos" element={<Gastos />} />
			<Route path="/gastos" element={<Gastos />} />
			<Route path="/gastos/nuevo" element={<Gastos />} />
			<Route path="/devoluciones" element={<Devoluciones />} />
			<Route path="/devoluciones/nueva" element={<DevolucionForm />} />
			<Route path="/listas-precios" element={<Navigate to="/productos/precios" replace />} />
			<Route path="/transferencias" element={<Transferencias />} />
			<Route path="/transferencias/nueva" element={<TransferenciaForm />} />
			<Route path="/auditoria" element={<Auditoria />} />
			<Route path="/usuarios/permisos" element={<PermisosManagement />} />
			
			{/* Control de stock */}
			<Route path="/stock/control" element={<ControlStock />} />
			<Route path="/stock/control/historial" element={<HistorialControl />} />
			<Route path="/stock/control/:id" element={<DetalleControl />} />
			<Route path="/stock/solicitudes-ajuste" element={<SolicitudesAjuste />} />
			
			{/* Nota: la ruta /configuracion/empresa se declara fuera del Layout */}
			
        </Route>

        {/* Ruta 404 para páginas no encontradas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
    </Router>
    </div>
      <ToastContainer
        position="top-center"
        theme="colored"
        autoClose={3800}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="rounded-2xl shadow-xl border-0 font-medium"
        bodyClassName="text-sm px-1"
        limit={4}
      />
    </>
  );
};

/**
 * Componente principal que contiene todas las rutas de la aplicación
 * @returns {JSX.Element} Componente App
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;