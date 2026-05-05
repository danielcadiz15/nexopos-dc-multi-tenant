import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';

const Signup = () => {
  const { signUp, isAuthenticated, orgId } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState('');

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
      navigate('/verificar-email', { replace: true, state: { empresaNombre: empresa.trim() } });
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
            <p className="text-sm font-semibold text-indigo-600">Nueva empresa</p>
            <h1 className="text-3xl font-extrabold text-gray-900">Crear empresa</h1>
            <p className="text-sm text-gray-600 mt-2">
              Este usuario quedará como administrador principal. Luego podrá crear cajeros y empleados.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="text"
              placeholder="Nombre de empresa"
              value={empresa}
              onChange={e=>setEmpresa(e.target.value)}
            />
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="email"
              placeholder="Email del administrador"
              value={email}
              onChange={e=>setEmail(e.target.value)}
            />
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e=>setPassword(e.target.value)}
            />
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
            />
            <Button type="submit" fullWidth loading={loading}>
              Crear empresa
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

