import React from 'react';
import { Routes, Route } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';
import MobileLayout from './MobileLayout';
import MobileDashboard from './MobileDashboard';
import MobilePuntoVenta from './MobilePuntoVenta';
import MobileTest from './MobileTest';

const MobileApp = () => {
  const isMobile = useIsMobile();

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
        <Route path="/test" element={<MobileTest />} />
        <Route path="/clientes" element={<div className="text-center p-8">Clientes - En desarrollo</div>} />
        <Route path="/productos" element={<div className="text-center p-8">Productos - En desarrollo</div>} />
        <Route path="/reportes" element={<div className="text-center p-8">Reportes - En desarrollo</div>} />
        <Route path="/configuracion" element={<div className="text-center p-8">Configuración - En desarrollo</div>} />
        <Route path="*" element={<MobileDashboard />} />
      </Routes>
    </MobileLayout>
  );
};

export default MobileApp; 