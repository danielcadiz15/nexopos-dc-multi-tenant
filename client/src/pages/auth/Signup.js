import React, { useEffect, useState } from 'react';
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
  const signupMode = location.state?.signupMode === 'demo' ? 'demo' : 'standard';
  const isDemoMode = signupMode === 'demo';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDemoMode) sessionStorage.setItem('pendingSignupMode', 'demo');
    else sessionStorage.removeItem('pendingSignupMode');
  }, [isDemoMode]);

  useEffect(() => {
    if (isAuthenticated && orgId) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, orgId, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirm || !empresa) return;
    if (password !== confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, empresa);
      navigate('/verificar-email', {
        replace: true,
        state: {
          empresaNombre: empresa.trim(),
          signupMode
        }
      });
    } catch (e) {
      alert(e.message || 'Error al registrarse');
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
                ? 'Creá tu empresa demo y usá la versión completa durante 48 horas. Después elegís el plan que mejor te cierre.'
                : 'Este usuario quedará como administrador principal. Luego podrá crear cajeros y empleados.'}
            </p>
            {isDemoMode && (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Tu demo es full: módulos premium habilitados para que la pruebes sin límites funcionales.
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              className="nexo-field py-3"
              type="text"
              placeholder="Nombre de empresa"
              value={empresa}
              onChange={e=>setEmpresa(e.target.value)}
            />
            <input
              className="nexo-field py-3"
              type="email"
              placeholder="Email del administrador"
              value={email}
              onChange={e=>setEmail(e.target.value)}
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

