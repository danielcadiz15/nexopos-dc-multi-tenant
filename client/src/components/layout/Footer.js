/**
 * Componente de pie de página
 * 
 * Muestra el pie de página con información de copyright.
 * 
 * @module components/layout/Footer
 * @requires react
 */

import React from 'react';

/**
 * Componente de pie de página
 * @returns {JSX.Element} Componente Footer
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-slate-200/90 bg-white/90 px-4 py-3 text-center text-sm text-slate-500 backdrop-blur-sm">
      <p>
        &copy; {currentYear} Sistema de Gestión para Despensa. Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;