import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-toastify';
import { auth } from '../../firebase/config';
import { createTenant, setActiveTenant } from '../../services/firebase.service';
import { useAuth } from '../../contexts/AuthContext';
import { getEmailActionCodeSettings } from '../../utils/emailVerification';
import Button from '../../components/common/Button';
import { PLAN_IDS, PLAN_DEEP_COPY_ES, planLabel } from '../../utils/planDetails';

const VerificarEmailEmpresa = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeCompanyAfterVerification, orgId, currentUser, refreshAuthSession } = useAuth();
  const empresaFromNav = location.state?.empresaNombre;
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [codigoAdministrador, setCodigoAdministrador] = useState('');
  const [chosenPlan, setChosenPlan] = useState(() => sessionStorage.getItem('pendingChosenPlan') || 'basic');
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
      if (!auth.currentUser) {
        navigate('/login', { replace: true });
        return;
      }
      const { emailVerified } = await refreshAuthSession();
      if (!emailVerified) {
        toast.warning(
          'Tu correo sigue sin verificar. Abrí el enlace del último correo «Verificación de correo» o pulsá «Reenviar». Revisá la carpeta de spam.'
        );
        return;
      }
      toast.success('Correo verificado correctamente. Ya podés continuar.');

      if (!modoNuevaEmpresa) {
        navigate('/', { replace: true });
        return;
      }

      const nombre = empresaNombre.trim();
      if (!nombre) {
        toast.warning('Indicá el nombre de tu empresa para crearla.');
        return;
      }
      if (!codigoAdministrador.trim()) {
        toast.warning('Ingresá el código de habilitación que te envió el administrador para tu correo.');
        return;
      }
      const slug = nombre.toLowerCase().replace(/\s+/g, '-');
      const res = await createTenant(nombre, slug, codigoAdministrador.trim(), chosenPlan);
      if (!res?.success || !res.orgId) {
        throw new Error('No se pudo crear la empresa');
      }
      await setActiveTenant(res.orgId);
      await completeCompanyAfterVerification();
      sessionStorage.removeItem('pendingEmpresaNombre');
      sessionStorage.removeItem('pendingChosenPlan');
      sessionStorage.setItem('postVerifyGoConfig', '1');
      navigate('/configuracion/empresa', { replace: true });
    } catch (err) {
      const codigo = err?.code || '';
      let msg = err?.message || 'No se pudo crear la empresa';
      if (codigo === 'functions/failed-precondition' && /verificar|correo/i.test(msg)) {
        msg = 'Tu correo aún no está verificado en el servidor.';
      } else if (codigo === 'functions/permission-denied') {
        msg = err.message?.includes?.('correo') ? err.message : 'Código de habilitación incorrecto o no válido.';
      } else if (codigo === 'functions/invalid-argument' && /administrador/i.test(msg)) {
        msg = err.message;
      }
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
                  className="nexo-field py-3"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  placeholder="Ej: Mi negocio"
                />
                <label className="block text-xs font-semibold text-gray-500 uppercase mt-4">
                  Código de habilitación (solo para este correo)
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  className="nexo-field py-3"
                  value={codigoAdministrador}
                  onChange={(e) => setCodigoAdministrador(e.target.value)}
                  placeholder="Te lo envía el administrador para tu correo — un solo uso"
                />
              </div>

              <div className="mt-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Abono desde el tercer mes
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {PLAN_IDS.map((id) => (
                    <label
                      key={id}
                      className={[
                        'cursor-pointer rounded-xl border p-3 text-sm transition',
                        chosenPlan === id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-100'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="chosenPlan"
                        value={id}
                        checked={chosenPlan === id}
                        onChange={(e) => {
                          setChosenPlan(e.target.value);
                          sessionStorage.setItem('pendingChosenPlan', e.target.value);
                        }}
                        className="mr-2"
                      />
                      <strong>{planLabel(id)}</strong>
                      <span className="ml-2 text-xs text-gray-500">{PLAN_DEEP_COPY_ES[id]?.tagline}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                El administrador debe generar el código asociando <strong>este mismo correo</strong>. Una vez activa la empresa,
                se cobran dos cuotas de kit inicial de <strong>$250.000</strong> con versión completa. Desde el tercer pago
                se aplica el abono que elijas acá.
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
