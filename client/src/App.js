/**
 * Componente principal de la aplicación
 * 
 * Configura el enrutamiento principal y maneja la autenticación global.
 * 
 * @module App
 * @requires react, react-router-dom, ./contexts/AuthContext, ./components/*, ./pages/*
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contextos
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Componentes de Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

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
import Gastos from './pages/gastos/Gastos';
import GastoForm from './pages/gastos/GastoForm';
import Devoluciones from './pages/devoluciones/Devoluciones';
import DevolucionForm from './pages/devoluciones/DevolucionForm';
import ListasPrecios from './pages/listas-precios/ListasPrecios';
import Transferencias from './pages/transferencias/Transferencias';
import TransferenciaForm from './pages/transferencias/TransferenciaForm';
import VentasEliminadas from './pages/ventas/VentasEliminadas';
import Auditoria from './pages/auditoria/Auditoria';
// ✅ NUEVO: Configuración empresarial
import ConfiguracionEmpresa from './pages/configuracion/configuracionempresa';
// Módulo de Proveedores
import Proveedores from './pages/proveedores/Proveedores';
import ProveedorForm from './pages/proveedores/ProveedorForm';
import MobilePuntoVenta from './components/mobile/MobilePuntoVenta';
import AdminPanel from './pages/admin/AdminPanel';
import SuperAdminRoute from './components/common/SuperAdminRoute';
import LicenseBanner from './components/layout/LicenseBanner';
import { useViewportHeight } from './hooks/useViewportHeight';

const CajeroApp = () => (
  <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gray-50 px-2 pt-1 pb-1 sm:px-3">
    <div className="shrink-0">
      <LicenseBanner compact />
    </div>
    <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
      <MobilePuntoVenta />
    </div>
  </div>
);

const AppContent = () => {
  useViewportHeight();
  const auth = useAuth() || {};
  const { loading } = auth;

  if (loading) {
    return (
      <div className="nexo-viewport-root flex flex-1 items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="nexo-viewport-root">
    <Router>
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<SuperAdminRoute><AdminPanel /></SuperAdminRoute>} />
            
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
			{/* Nuevos Módulos */}
			<Route path="/caja" element={<Caja />} />
			<Route path="/gastos" element={<Gastos />} />
			<Route path="/gastos/nuevo" element={<GastoForm />} />
			<Route path="/devoluciones" element={<Devoluciones />} />
			<Route path="/devoluciones/nueva" element={<DevolucionForm />} />
			<Route path="/listas-precios" element={<ListasPrecios />} />
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
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
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