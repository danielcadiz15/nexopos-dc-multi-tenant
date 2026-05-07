import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { reload, sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-toastify';
import { auth } from '../../firebase/config';
import { createTenant, setActiveTenant } from '../../services/firebase.service';
import { useAuth } from '../../contexts/AuthContext';
import { getEmailActionCodeSettings } from '../../utils/emailVerification';
import Button from '../../components/common/Button';

const VerificarEmailEmpresa = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeCompanyAfterVerification, orgId, currentUser } = useAuth();
  const empresaFromNav = location.state?.empresaNombre;
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const pendienteNombreEmpresa =
    !!(sessionStorage.getItem('pendingEmpresaNombre') || '').trim() || !!(empresaFromNav || '').trim();

  /** Flujo nueva empresa vs usuario invitado con organización ya asignada */
  const modoNuevaEmpresa = useMemo(
    () => !orgId || pendienteNombreEmpresa,
    [orgId, pendienteNombreEmpresa]
  );

  useEffect(() => {
    if (empresaFromNav) {
      const t = empresaFromNav.trim();
      setEmpresaNombre(t);
      sessionStorage.setItem('pendingEmpresaNombre', t);
    } else {
      const pend = sessionStorage.getItem('pendingEmpresaNombre') || '';
      setEmpresaNombre(pend);
    }
  }, [empresaFromNav]);

  useEffect(() => {
    if (
      location.pathname !== '/verificar-email' ||
      !orgId ||
      !currentUser?.emailVerified
    ) {
      return;
    }
    if ((sessionStorage.getItem('pendingEmpresaNombre') || '').trim()) {
      return;
    }
    if (sessionStorage.getItem('postVerifyGoConfig')) {
      return;
    }
    navigate('/', { replace: true });
  }, [orgId, currentUser?.emailVerified, location.pathname, navigate]);

  const reenviar = async () => {
    try {
      setReenviando(true);
      const user = auth.currentUser;
      if (!user?.email) {
        navigate('/login', { replace: true });
        return;
      }
      await sendEmailVerification(user, getEmailActionCodeSettings());
      toast.success(
        `Listo: reenviamos el correo a ${user.email}. Abrí «Verificación de correo electrónico», tocá Verificar el correo y revisá también spam o promociones.`,
        { autoClose: 8000 }
      );
    } catch (err) {
      toast.error(err.message || 'No se pudo reenviar el correo. Probá dentro de unos minutos.');
    } finally {
      setReenviando(false);
    }
  };

  const continuarYaVerificado = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      await reload(user);
      if (!auth.currentUser?.emailVerified) {
        toast.warning(
          'Tu correo sigue sin verificar. Abrí el enlace del último correo «Verificación de correo» o pulsá «Reenviar». Revisá la carpeta de spam.'
        );
        return;
      }
      toast.success('Correo verificado correctamente. Continuemos…');

      if (!modoNuevaEmpresa) {
        navigate('/', { replace: true });
        return;
      }

      const nombre = empresaNombre.trim();
      if (!nombre) {
        toast.warning('Indicá el nombre de tu empresa para crearla.');
        return;
      }
      const slug = nombre.toLowerCase().replace(/\s+/g, '-');
      const res = await createTenant(nombre, slug);
      if (!res?.success || !res.orgId) {
        throw new Error('No se pudo crear la empresa');
      }
      await setActiveTenant(res.orgId);
      await completeCompanyAfterVerification();
      sessionStorage.removeItem('pendingEmpresaNombre');
      sessionStorage.setItem('postVerifyGoConfig', '1');
      navigate('/configuracion/empresa', { replace: true });
    } catch (err) {
      const codigo = err?.code || '';
      const msg =
        err?.message ||
        (codigo === 'functions/failed-precondition'
          ? 'Tu correo aún no está verificado en el servidor.'
          : 'No se pudo crear la empresa');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <p className="text-sm font-semibold text-indigo-600">{modoNuevaEmpresa ? 'Nueva empresa' : 'Tu cuenta NexoPOS'}</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Verificá tu correo electrónico</h1>

          <p className="text-sm text-gray-700 mt-3 leading-relaxed">
            Enviamos un mensaje desde el servicio seguro de Firebase (remitente <strong>noreply</strong> o similar) al correo{' '}
            <strong>{currentUser?.email || auth.currentUser?.email}</strong>.
          </p>
          <ul className="mt-4 text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>Abrí el asunto típico <strong>«Verificación de correo electrónico»</strong> o similar.</li>
            <li>Pulsá el botón o enlace <strong>Verificar el correo</strong>.</li>
            <li>Si no aparece en la bandeja principal, revisá <strong>spam</strong>, <strong>promociones</strong> y el filtro «Otros».</li>
            <li>Una vez hecho eso, volvé aquí y pulsá «Ya verifiqué».</li>
          </ul>

          {modoNuevaEmpresa && (
            <>
              <div className="mt-8 space-y-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Nombre de la empresa</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  placeholder="Ej: Mi negocio"
                />
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Solamente después de confirmar tu correo se puede crear la organización NexoPOS.
              </p>
            </>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" fullWidth loading={loading} onClick={continuarYaVerificado}>
              Ya verifiqué el correo — continuar
            </Button>
            <button
              type="button"
              disabled={reenviando}
              onClick={reenviar}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {reenviando ? 'Reenviando…' : 'Reenviar correo de verificación'}
            </button>
            <div className="text-center text-sm text-gray-600">
              ¿Problemas? <Link to="/login" className="text-indigo-600 font-semibold">Volver al inicio de sesión</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificarEmailEmpresa;
