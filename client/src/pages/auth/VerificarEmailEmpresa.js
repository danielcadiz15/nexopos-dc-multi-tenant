import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-toastify';
import { auth } from '../../firebase/config';
import { createTenant, setActiveTenant } from '../../services/firebase.service';
import { useAuth } from '../../contexts/AuthContext';
import { getEmailActionCodeSettings } from '../../utils/emailVerification';
import Button from '../../components/common/Button';
import {
  PLAN_IDS,
  PLAN_DEEP_COPY_ES,
  PLAN_COMMERCIAL_META_ES,
  planLabel
} from '../../utils/planDetails';

const VerificarEmailEmpresa = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeCompanyAfterVerification, orgId, currentUser, refreshAuthSession, logout } = useAuth();
  const empresaFromNav = location.state?.empresaNombre;
  const modeFromNav = location.state?.signupMode;
  const demoPhoneFromNav = location.state?.demoPhone;
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [codigoAdministrador, setCodigoAdministrador] = useState('');
  const [chosenPlan, setChosenPlan] = useState(() => sessionStorage.getItem('pendingChosenPlan') || 'basic');
  const [demoPhone, setDemoPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const pendienteNombreEmpresa =
    !!(sessionStorage.getItem('pendingEmpresaNombre') || '').trim() || !!(empresaFromNav || '').trim();

  const signupMode = useMemo(() => {
    const fromState = modeFromNav;
    const fromQuery = new URLSearchParams(location.search || '').get('mode');
    const fromSession = sessionStorage.getItem('pendingSignupMode') || '';
    const pendingDemoPhone = sessionStorage.getItem('pendingDemoPhone') || '';
    const linkedPhone = String(auth.currentUser?.phoneNumber || '').trim();
    const looksLikeDemoEmail = /@nexopos\.demo\.local$/i.test(
      String(auth.currentUser?.email || currentUser?.email || '').trim()
    );
    if (
      fromState === 'demo' ||
      fromQuery === 'demo' ||
      fromSession === 'demo' ||
      Boolean(String(pendingDemoPhone || '').trim()) ||
      Boolean(linkedPhone) ||
      looksLikeDemoEmail
    ) {
      return 'demo';
    }
    return 'standard';
  }, [currentUser?.email, location.search, modeFromNav]);
  const isDemoMode = signupMode === 'demo';
  /** Flujo nueva empresa vs usuario invitado con organización ya asignada */
  const modoNuevaEmpresa = useMemo(
    () => isDemoMode || !orgId || pendienteNombreEmpresa,
    [isDemoMode, orgId, pendienteNombreEmpresa]
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
    if (isDemoMode) {
      sessionStorage.setItem('pendingSignupMode', 'demo');
    }
  }, [isDemoMode]);

  useEffect(() => {
    const fromSession = sessionStorage.getItem('pendingDemoPhone') || '';
    const normalized = String(demoPhoneFromNav || fromSession || '').replace(/\D/g, '');
    setDemoPhone(normalized);
    if (normalized) {
      sessionStorage.setItem('pendingDemoPhone', normalized);
    }
  }, [demoPhoneFromNav]);

  const normalizeDemoPhone = (raw) => String(raw || '').replace(/\D/g, '');

  useEffect(() => {
    const canContinueByVerification =
      Boolean(currentUser?.emailVerified) ||
      Boolean(String(currentUser?.phoneNumber || '').trim()) ||
      isDemoMode;
    if (
      location.pathname !== '/verificar-email' ||
      !orgId ||
      !canContinueByVerification
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
  }, [orgId, currentUser?.emailVerified, currentUser?.phoneNumber, isDemoMode, location.pathname, navigate]);

  const reenviar = async () => {
    try {
      setReenviando(true);
      const user = auth.currentUser;
      if (!user?.email) {
        navigate('/login', { replace: true });
        return;
      }
      auth.languageCode = 'es';
      await sendEmailVerification(user, getEmailActionCodeSettings());
      toast.success(
        `Listo: reenviamos el correo de seguridad a ${user.email}. Buscá "Verificación de correo electrónico", abrilo y confirmá para proteger la cuenta de tu negocio.`,
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
      if (!isDemoMode && !emailVerified) {
        toast.warning(
          'Tu correo todavía no está verificado. Este paso de seguridad evita accesos no autorizados y protege datos de clientes y ventas.'
        );
        return;
      }
      toast.success(
        isDemoMode
          ? 'Listo. Estamos preparando tu demo express.'
          : 'Correo verificado correctamente. Ya podés continuar.'
      );

      if (!modoNuevaEmpresa) {
        navigate('/', { replace: true });
        return;
      }

      const nombreDemo = `Demo ${String(demoPhone || '').slice(-4) || 'express'}`;
      const nombre = isDemoMode ? nombreDemo : empresaNombre.trim();
      if (!nombre) {
        toast.warning('Indicá el nombre de tu empresa para crearla.');
        return;
      }
      if (isDemoMode && (normalizeDemoPhone(demoPhone).length < 10 || normalizeDemoPhone(demoPhone).length > 15)) {
        toast.warning('Necesitamos un número de celular válido para activar la demo express.');
        return;
      }
      if (!isDemoMode && !codigoAdministrador.trim()) {
        toast.warning('Ingresá el código de habilitación que te envió el administrador para tu correo.');
        return;
      }
      const slug = nombre.toLowerCase().replace(/\s+/g, '-');
      const res = await createTenant(
        nombre,
        slug,
        codigoAdministrador.trim(),
        chosenPlan,
        {
          creationMode: isDemoMode ? 'demo_express' : 'standard',
          demoPhone: isDemoMode ? normalizeDemoPhone(demoPhone) : ''
        }
      );
      if (!res?.success || !res.orgId) {
        throw new Error('No se pudo crear la empresa');
      }
      try {
        await setActiveTenant(res.orgId);
      } catch (setActiveErr) {
        const setActiveCode = String(setActiveErr?.code || '');
        // En demo por teléfono el backend puede rechazar por email no verificado.
        // La relación usuariosOrg ya quedó creada en createTenant, así que no bloqueamos el alta.
        if (!(isDemoMode && setActiveCode.includes('failed-precondition'))) {
          throw setActiveErr;
        }
      }
      await completeCompanyAfterVerification();
      sessionStorage.removeItem('pendingEmpresaNombre');
      sessionStorage.removeItem('pendingChosenPlan');
      sessionStorage.removeItem('pendingSignupMode');
      sessionStorage.removeItem('pendingDemoPhone');
      if (isDemoMode) {
        toast.success(
          'Gracias por probar NexoPOS. Tu demo full está activa por 48 hs: recorré todo y cuando quieras seguís con un plan pago.',
          { autoClose: 7000 }
        );
        navigate('/', { replace: true });
      } else {
        sessionStorage.setItem('postVerifyGoConfig', '1');
        navigate('/configuracion/empresa', {
          replace: true,
          state: {
            openWizardModal: true,
            onboardingSource: 'standard'
          }
        });
      }
    } catch (err) {
      const codigo = err?.code || '';
      let msg = err?.message || 'No se pudo crear la empresa';
      if (codigo === 'functions/failed-precondition' && /verificar|correo/i.test(msg)) {
        msg = 'Tu correo aún no está verificado en el servidor.';
      } else if (codigo === 'functions/permission-denied') {
        msg = isDemoMode
          ? (err.message || 'No se pudo activar la demo.')
          : (err.message?.includes?.('correo') ? err.message : 'Código de habilitación incorrecto o no válido.');
      } else if (codigo === 'functions/invalid-argument' && /administrador/i.test(msg)) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const volverAlInicioSesion = async () => {
    try {
      await logout();
    } catch {
      // Ignorar error de cierre para permitir navegación al login.
    } finally {
      sessionStorage.removeItem('pendingEmpresaNombre');
      sessionStorage.removeItem('postVerifyGoConfig');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <p className={`text-sm font-semibold ${isDemoMode ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {modoNuevaEmpresa ? (isDemoMode ? 'Demo express 48 hs' : 'Nueva empresa') : 'Tu cuenta NexoPOS'}
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            {isDemoMode ? 'Confirmá tu demo y entrá al sistema' : 'Verificá tu correo para activar tu cuenta segura'}
          </h1>

          {!isDemoMode ? (
            <>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                Enviamos un mensaje en español desde un servicio seguro (remitente <strong>noreply</strong> o similar) al correo{' '}
                <strong>{currentUser?.email || auth.currentUser?.email}</strong>.
              </p>
              <ul className="mt-4 text-sm text-gray-600 space-y-2 list-disc pl-5">
                <li>Buscá el correo con asunto <strong>«Verificación de correo electrónico»</strong> (o similar).</li>
                <li>Presioná el botón <strong>Verificar el correo</strong>.</li>
                <li>Si no aparece en la bandeja principal, revisá <strong>spam</strong>, <strong>promociones</strong> y el filtro «Otros».</li>
                <li>Cuando termines, volvé aquí y presioná <strong>Ya verifiqué el correo</strong>.</li>
              </ul>
              <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                ¿Por qué te lo pedimos? Porque esta validación protege el acceso al sistema y resguarda la información comercial de tus clientes.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              En demo express simplificamos todo: cargás tu celular, confirmás y entrás directo al sistema con datos de prueba cargados.
            </p>
          )}

          {modoNuevaEmpresa && (
            <>
              {isDemoMode && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <p className="font-semibold">Vas a arrancar con una demo express full por 48 horas.</p>
                  <p className="mt-1">
                    Te dejamos datos reales de ejemplo cargados (clientes, ventas, compras, gastos y reportes) para que pruebes todo sin perder tiempo.
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Reingreso demo (48 hs): usuario = tu celular, contraseña = tu celular.
                  </p>
                  {demoPhone ? (
                    <p className="mt-1 text-xs text-emerald-700">
                      Celular demo: {demoPhone}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="mt-8 space-y-3">
                {!isDemoMode ? (
                  <>
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Nombre de la empresa</label>
                    <input
                      type="text"
                      className="nexo-field py-3"
                      value={empresaNombre}
                      onChange={(e) => setEmpresaNombre(e.target.value)}
                      placeholder="Ej: Mi negocio"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-semibold text-gray-500 uppercase">
                      Celular para activar demo
                    </label>
                    <input
                      type="tel"
                      className="nexo-field py-3"
                      value={demoPhone}
                      onChange={(e) => setDemoPhone(String(e.target.value || '').replace(/\D/g, ''))}
                      placeholder="Ej: 3764123456"
                    />
                    <p className="text-xs text-gray-500">
                      Solo para demo: usamos este número para habilitar una sola prueba por 48 hs.
                    </p>
                  </>
                )}
                {!isDemoMode && (
                  <>
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
                  </>
                )}
              </div>

              {!isDemoMode ? (
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
                        <p className="mt-1 text-xs text-gray-600">
                          Incluye {PLAN_COMMERCIAL_META_ES[id]?.includedUsers} usuarios y {PLAN_COMMERCIAL_META_ES[id]?.includedBranches} sucursales.
                        </p>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-gray-500 mt-3">
                {isDemoMode ? (
                  <>
                    Al confirmar, se crea tu empresa demo por <strong>48 hs</strong> con versión completa para que la pruebes a fondo.
                    Después podés activar el plan que elegiste acá sin volver a cargar todo.
                  </>
                ) : (
                  <>
                    El administrador debe generar el código asociando <strong>este mismo correo</strong>. Una vez activa la empresa,
                    se cobran dos cuotas de kit inicial de <strong>$250.000</strong> con versión completa. Desde el tercer pago
                    se aplica el abono que elijas acá.
                  </>
                )}
              </p>
            </>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" fullWidth loading={loading} onClick={continuarYaVerificado}>
              {isDemoMode ? 'Activar demo express' : 'Ya verifiqué el correo — continuar'}
            </Button>
            {!isDemoMode ? (
              <button
                type="button"
                disabled={reenviando}
                onClick={reenviar}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {reenviando ? 'Reenviando…' : 'Reenviar correo de verificación'}
              </button>
            ) : null}
            <div className="text-center text-sm text-gray-600">
              ¿Problemas?{' '}
              <button
                type="button"
                onClick={volverAlInicioSesion}
                className="font-semibold text-indigo-600"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificarEmailEmpresa;
