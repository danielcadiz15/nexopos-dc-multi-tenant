import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import PasswordInput from '../../components/common/PasswordInput';

const Signup = () => {
  const { signUp, isAuthenticated, orgId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const signupMode = useMemo(() => {
    const fromState = location.state?.signupMode;
    const fromQuery = new URLSearchParams(location.search || '').get('mode');
    const fromSession = typeof window !== 'undefined'
      ? sessionStorage.getItem('pendingSignupMode')
      : '';
    if (fromState === 'demo' || fromQuery === 'demo' || fromSession === 'demo') {
      return 'demo';
    }
    return 'standard';
  }, [location.search, location.state]);
  const isDemoMode = signupMode === 'demo';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDemoMode) {
      sessionStorage.setItem('pendingSignupMode', 'demo');
    } else {
      sessionStorage.removeItem('pendingSignupMode');
      sessionStorage.removeItem('pendingDemoPhone');
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isAuthenticated && orgId) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, orgId, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const empresaFinal = empresa.trim();
    const demoPhoneDigits = String(demoPhone || '').replace(/\D/g, '');
    if (!isDemoMode && (!email || !password || !confirm)) return;
    if (!isDemoMode && !empresaFinal) return;
    if (isDemoMode && (demoPhoneDigits.length < 10 || demoPhoneDigits.length > 15)) {
      alert('Ingresá un celular válido (10 a 15 dígitos).');
      return;
    }
    if (!isDemoMode && password !== confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const syntheticEmail = `demo_${demoPhoneDigits}@nexopos.demo.local`;
      const syntheticPassword = demoPhoneDigits;
      await signUp(
        isDemoMode ? syntheticEmail : email,
        isDemoMode ? syntheticPassword : password,
        isDemoMode ? `Demo ${demoPhoneDigits.slice(-4)}` : empresaFinal,
        { skipEmailVerification: isDemoMode }
      );
      if (isDemoMode) sessionStorage.setItem('pendingDemoPhone', demoPhoneDigits);
      navigate(isDemoMode ? '/verificar-email?mode=demo' : '/verificar-email', {
        replace: true,
        state: {
          empresaNombre: isDemoMode ? `Demo ${demoPhoneDigits.slice(-4)}` : empresaFinal,
          signupMode,
          demoPhone: isDemoMode ? demoPhoneDigits : ''
        }
      });
    } catch (e) {
      const code = String(e?.code || '');
      if (isDemoMode && code.includes('email-already-in-use')) {
        alert('Este celular ya tiene un demo activo. Ingresá con usuario = celular y contraseña = celular.');
        navigate('/login', { replace: true, state: { accessMode: 'admin' } });
      } else {
        alert(e.message || 'Error al registrarse');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <div className="mb-6">
            <p className={`text-sm font-semibold ${isDemoMode ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {isDemoMode ? 'Demo de 48 hs' : 'Nueva empresa'}
            </p>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {isDemoMode ? 'Probá NexoPOS gratis' : 'Crear empresa'}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {isDemoMode
                ? 'Entrá al demo express en minutos: cargá tu celular y empezá a probar con datos listos.'
                : 'Este usuario quedará como administrador principal. Luego podrá crear cajeros y empleados.'}
            </p>
            {isDemoMode && (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Demo express: con tu celular dejamos una empresa demo lista, con datos reales de prueba para que veas todo en minutos.
                <br />
                Para volver a ingresar durante las 48 hs: usuario = tu celular, contraseña = tu celular.
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {!isDemoMode ? (
              <input
                className="nexo-field py-3"
                type="text"
                placeholder="Nombre de empresa"
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
              />
            ) : (
              <input
                className="nexo-field py-3"
                type="tel"
                placeholder="Celular para demo express (ej: 3764123456)"
                value={demoPhone}
                onChange={e => setDemoPhone(e.target.value)}
              />
            )}
            {!isDemoMode ? (
              <>
                <input
                  className="nexo-field py-3"
                  type="email"
                  placeholder="Email del administrador"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <PasswordInput
                  className="nexo-field py-3"
                  name="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <PasswordInput
                  className="nexo-field py-3"
                  name="confirm"
                  placeholder="Confirmar contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </>
            ) : null}
            <Button type="submit" fullWidth loading={loading}>
              {isDemoMode ? 'Crear demo gratis' : 'Crear empresa'}
            </Button>
          </form>
          <div className="mt-4 text-sm">
            ¿Ya tienes empresa o sos cajero? <Link to="/login" className="text-indigo-600">Ingresar</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

