/**
 * Bloquea el contenido principal si la ruta pertenece a un módulo desactivado en licencia/config.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRequiredModuleForPath } from '../../config/modulesCatalog';
import { isSuperAdminEmail } from '../../config/superAdmin';

export default function ModuleOutletGuard({ children }) {
  const location = useLocation();
  const { currentUser, companyModules, loading } = useAuth();
  const required = getRequiredModuleForPath(location.pathname);

  if (loading) {
    return children;
  }

  if (isSuperAdminEmail(currentUser?.email)) {
    return children;
  }

  if (!required) {
    return children;
  }

  const enabled = companyModules?.[required] !== false;
  if (enabled) {
    return children;
  }

  return <Navigate to="/" replace state={{ moduleBlocked: required }} />;
}
