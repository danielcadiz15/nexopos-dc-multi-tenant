import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';
import { useAuth } from '../../contexts/AuthContext';
import MobileLayout from './MobileLayout';
import MobileDashboard from './MobileDashboard';
import MobilePuntoVenta from './MobilePuntoVenta';
import MobileTest from './MobileTest';

const MobileApp = () => {
  const isMobile = useIsMobile();
  const { currentUser } = useAuth();
  const esAdmin = ['admin', 'administrador', 'gerente'].includes(
    String(currentUser?.rol || currentUser?.role || '').toLowerCase()
  ) || currentUser?.isAdmin === true;
  const adminOnly = (element) => (esAdmin ? element : <Navigate to="/ventas" replace />);

  // Si no es móvil, mostrar mensaje
  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Vista Móvil
          </h1>
          <p className="text-gray-600">
            Esta vista está optimizada para dispositivos móviles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MobileLayout>
      <Routes>
        <Route path="/" element={<MobileDashboard />} />
        <Route path="/ventas" element={<MobilePuntoVenta />} />
        <Route path="/cajero" element={<MobilePuntoVenta />} />
        <Route path="/test" element={adminOnly(<MobileTest />)} />
        <Route path="/clientes" element={adminOnly(<div className="text-center p-8">Clientes - En desarrollo</div>)} />
        <Route path="/productos" element={adminOnly(<div className="text-center p-8">Productos - En desarrollo</div>)} />
        <Route path="/reportes" element={adminOnly(<div className="text-center p-8">Reportes - En desarrollo</div>)} />
        <Route path="/compras" element={adminOnly(<div className="text-center p-8">Compras - En desarrollo</div>)} />
        <Route path="/stock" element={adminOnly(<div className="text-center p-8">Stock - En desarrollo</div>)} />
        <Route path="/caja" element={adminOnly(<div className="text-center p-8">Caja - En desarrollo</div>)} />
        <Route path="/configuracion" element={adminOnly(<div className="text-center p-8">Configuración - En desarrollo</div>)} />
        <Route path="*" element={<MobileDashboard />} />
      </Routes>
    </MobileLayout>
  );
};

export default MobileApp; 