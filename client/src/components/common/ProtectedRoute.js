// src/components/common/ProtectedRoute.js - VERSIÓN CON SEGURIDAD MEJORADA

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdminEmail } from '../../config/superAdmin';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, orgId, currentUser } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (isSuperAdminEmail(currentUser?.email)) return children;

  if (currentUser && !currentUser.emailVerified) {
    if (location.pathname !== '/verificar-email') {
      return <Navigate to="/verificar-email" replace state={{ from: location }} />;
    }
    return children;
  }

  const rutasSinOrg = ['/configuracion/empresa', '/verificar-email'];
  if (!orgId && !rutasSinOrg.includes(location.pathname)) {
    return <Navigate to="/configuracion/empresa" replace />;
  }

  return children;
};

export default ProtectedRoute;