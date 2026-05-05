import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { reload, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { createTenant, setActiveTenant } from '../../services/firebase.service';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';

const VerificarEmailEmpresa = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeCompanyAfterVerification, orgId, currentUser } = useAuth();
  const empresaFromNav = location.state?.empresaNombre;
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);

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
    if (orgId) {
      navigate('/configuracion/empresa', { replace: true });
    }
  }, [orgId, navigate]);

  const reenviar = async () => {
    try {
      setReenviando(true);
      const user = auth.currentUser;
      if (!user?.email) {
        navigate('/login', { replace: true });
        return;
      }
      await sendEmailVerification(user);
      alert('Enviamos de nuevo el correo de verificación.');
    } catch (err) {
      alert(err.message || 'No se pudo reenviar el correo');
    } finally {
      setReenviando(false);
    }
  };

  const crearEmpresaCuandoListe = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      await reload(user);
      if (!auth.currentUser?.emailVerified) {
        alert('Tu correo aún no está verificado. Abrí el enlace del mail y volvé a intentar.');
        return;
      }
      const nombre = empresaNombre.trim();
      if (!nombre) {
        alert('Indicá el nombre de tu empresa.');
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
      navigate('/configuracion/empresa', { replace: true });
    } catch (err) {
      const codigo = err?.code || '';
      const msg =
        err?.message ||
        (codigo === 'functions/failed-precondition'
          ? 'Tu correo aún no está verificado.'
          : 'No se pudo crear la empresa');
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <p className="text-sm font-semibold text-indigo-600">Nueva empresa</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Verificá tu correo</h1>
          <p className="text-sm text-gray-600 mt-2">
            Te enviamos un enlace a <strong>{currentUser?.email || auth.currentUser?.email}</strong>.
            Solo después de confirmarlo se crea la empresa en el sistema (las empresas ya existentes no cambian).
          </p>

          <div className="mt-6 space-y-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase">Nombre de la empresa</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={empresaNombre}
              onChange={(e) => setEmpresaNombre(e.target.value)}
              placeholder="Ej: Mi negocio"
            />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" fullWidth loading={loading} onClick={crearEmpresaCuandoListe}>
              Ya verifiqué el correo — crear empresa
            </Button>
            <button
              type="button"
              disabled={reenviando}
              onClick={reenviar}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {reenviando ? 'Reenviando…' : 'Reenviar correo'}
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
