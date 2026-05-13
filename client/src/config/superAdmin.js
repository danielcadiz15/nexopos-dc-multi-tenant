/** Debe coincidir con functions/utils/superAdmin.js — único perfil con licencias centralizadas, módulos globales y generador de códigos de alta. */
export const SUPER_ADMIN_EMAIL = 'danielcadiz15@gmail.com';

export function isSuperAdminEmail(email) {
  return (email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
