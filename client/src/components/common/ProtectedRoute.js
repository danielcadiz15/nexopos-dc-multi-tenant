// src/components/common/ProtectedRoute.js - VERSIÓN CON SEGURIDAD MEJORADA

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdminEmail } from '../../config/superAdmin';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, orgId, currentUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] min-h-[240px] w-full flex-1 flex-col items-center justify-center bg-gray-100 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
        <p className="mt-4 text-center text-sm text-gray-600">Cargando sesión…</p>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (isSuperAdminEmail(currentUser?.email)) return children;

  const hasVerifiedPhone = Boolean(String(currentUser?.phoneNumber || '').trim());
  const isDemoSyntheticUser = /@nexopos\.demo\.local$/i.test(
    String(currentUser?.email || '').trim()
  );
  if (currentUser && !currentUser.emailVerified && !hasVerifiedPhone && !isDemoSyntheticUser) {
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