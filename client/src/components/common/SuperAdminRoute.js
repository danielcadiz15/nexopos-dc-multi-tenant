import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdminEmail } from '../../config/superAdmin';

/**
 * Solo permite ver el panel /admin (empresas, licencias) al correo autorizado.
 */
const SuperAdminRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!isSuperAdminEmail(currentUser?.email)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default SuperAdminRoute;
