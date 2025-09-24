/**
 * Página de error 404 - Página no encontrada
 * 
 * Se muestra cuando el usuario navega a una ruta que no existe en la aplicación.
 * 
 * @module pages/NotFound
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaHome } from 'react-icons/fa';

// Componentes
import Card from '../components/common/Card';
import Button from '../components/common/Button';

/**
 * Componente de página no encontrada (error 404)
 * @returns {JSX.Element} Componente NotFound
 */
const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="max-w-md w-full">
        <div className="text-center py-8 px-4">
          <FaExclamationTriangle className="mx-auto text-6xl text-yellow-500 mb-4" />
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-medium text-gray-700 mb-4">Página no encontrada</h2>
          
          <p className="text-gray-600 mb-6">
            La página que estás buscando no existe o ha sido movida.
          </p>
          
          <Link to="/">
            <Button
              color="primary"
              icon={<FaHome />}
              className="px-6"
            >
              Volver al inicio
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;