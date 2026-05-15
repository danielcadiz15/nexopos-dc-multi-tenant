const ACCESS_MODE_KEY = 'nexo_access_mode';
const ACCESS_MODE_ADMIN = 'admin';
const ACCESS_MODE_CAJERO = 'cajero';

export const isAdminLikeRole = (user) => {
  const rol = String(user?.rol || user?.role || '').toLowerCase();
  const rolId = String(user?.rolId || user?.roleId || '').toLowerCase();
  return (
    rol.includes('admin') ||
    rol.includes('super') ||
    rolId.includes('admin') ||
    user?.isAdmin === true
  );
};

export const normalizeAccessMode = (raw, fallback = ACCESS_MODE_ADMIN) => {
  const normalized = String(raw || '').trim().toLowerCase();
  if (normalized === ACCESS_MODE_ADMIN || normalized === ACCESS_MODE_CAJERO) {
    return normalized;
  }
  return fallback;
};

export const getStoredAccessMode = (fallback = ACCESS_MODE_ADMIN) => {
  try {
    const saved = localStorage.getItem(ACCESS_MODE_KEY);
    return normalizeAccessMode(saved, fallback);
  } catch {
    return fallback;
  }
};

export const setStoredAccessMode = (mode) => {
  const normalized = normalizeAccessMode(mode, ACCESS_MODE_CAJERO);
  try {
    localStorage.setItem(ACCESS_MODE_KEY, normalized);
  } catch {
    // storage no disponible
  }
  return normalized;
};

export const ACCESS_MODES = {
  ADMIN: ACCESS_MODE_ADMIN,
  CAJERO: ACCESS_MODE_CAJERO
};
