/** Debe coincidir con client/src/config/superAdmin.js (email del generador de códigos de alta y panel /admin). */
const SUPER_ADMIN_EMAIL = 'danielcadiz15@gmail.com';

function isSuperAdminEmail(email) {
  return (email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

module.exports = { SUPER_ADMIN_EMAIL, isSuperAdminEmail };
