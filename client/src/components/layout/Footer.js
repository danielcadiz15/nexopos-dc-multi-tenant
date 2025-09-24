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
    <footer className="py-3 px-4 bg-white border-t border-gray-200 text-center text-gray-500 text-sm">
      <p>
        &copy; {currentYear} Sistema de Gestión para Despensa. Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;