/** Único perfil con acceso a licencias centralizadas y módulos globales (Firestore + panel /admin). */
export const SUPER_ADMIN_EMAIL = 'danielcadiz15@gmail.com';

export function isSuperAdminEmail(email) {
  return (email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
