/**
 * Configuración del enlace que Firebase incluye en el correo de verificación.
 * - url: página a la que vuelve el usuario después de hacer clic en "Continuar".
 * - Mejora entregabilidad si REACT_APP_PUBLIC_APP_URL coincide con el dominio del proyecto en Firebase Console.
 *
 * Spam: el cuerpo del mail lo define Firebase Console → Authentication → Plantillas (y dominio/remitente allí).
 * Recomendado: SPF/DKIM del dominio, remitente noreply@tudominio.com, texto claro como el de nuestra UI.
 */
export function getEmailActionCodeSettings() {
  const raw = (process.env.REACT_APP_PUBLIC_APP_URL || 'https://nexopos-dc.web.app').trim();
  const base = raw.replace(/\/$/, '');
  return {
    handleCodeInApp: false,
    url: `${base}/verificar-email`
  };
}
