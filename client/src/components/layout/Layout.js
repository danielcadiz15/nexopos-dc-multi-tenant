/**
 * Componente de layout principal - VERSIÓN RESPONSIVE
 * 
 * Estructura básica de la aplicación con sidebar, header y contenido.
 * Incluye soporte completo para móviles y navegación inferior.
 * 
 * @module components/layout/Layout
 * @requires react, react-router-dom, ../contexts/AuthContext
 * @related_files ./Sidebar.js, ./Header.js, ./Footer.js, ./MobileNavigation.js
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileNavigation from './MobileNavigation';

/**
 * Hook personalizado para detectar si es dispositivo móvil
 */
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Verificar al montar

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};

/**
 * Componente de layout principal que contiene la estructura de la aplicación
 * @returns {JSX.Element} Componente Layout
 */
const Layout = () => {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // En móvil, cerrar sidebar por defecto
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);
  
  /**
   * Alterna el estado de apertura de la sidebar
   */
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Cerrar sidebar al hacer click fuera en móvil
  const handleOverlayClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Overlay para móvil cuando sidebar está abierta */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}
      
      {/* Sidebar - Oculta en móvil por defecto */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        transition-transform duration-300 ease-in-out
        z-30 h-full
        ${!isMobile && !sidebarOpen ? 'w-0' : ''}
      `}>
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          user={currentUser}
          isMobile={isMobile}
        />
      </div>
      
      {/* Contenido principal */}
      <div className={`
        flex flex-col flex-1 overflow-hidden
        ${!isMobile && sidebarOpen ? 'ml-0' : 'ml-0'}
        ${isMobile ? 'w-full' : ''}
        transition-all duration-300
      `}>
        {/* Header */}
        <Header 
          toggleSidebar={toggleSidebar} 
          user={currentUser}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
        />
        
        {/* Contenido de la página */}
        <main className={`
          flex-1 overflow-y-auto bg-gray-100
          ${isMobile ? 'p-2 pb-20' : 'p-4 pb-4'}
        `}>
          <div className="container mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        
        {/* Navegación móvil - Solo visible en móviles */}
        {isMobile && <MobileNavigation />}
        
        {/* Footer - Solo en desktop */}
        {!isMobile && <Footer />}
      </div>
    </div>
  );
};

export default Layout;