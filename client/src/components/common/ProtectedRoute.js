// src/components/common/ProtectedRoute.js - VERSIÓN CON SEGURIDAD MEJORADA

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, orgId, currentUser } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Permitir acceso total al admin aunque no tenga orgId
  const isAdminEmail = (currentUser?.email || '').toLowerCase() === 'danielcadiz15@gmail.com';
  if (isAdminEmail) return children;
  // Para el resto, exigir orgId (salvo en la ruta de configuración)
  if (!orgId && location.pathname !== '/configuracion/empresa') {
    return <Navigate to="/configuracion/empresa" replace />;
  }

  return children;
};

export default ProtectedRoute;