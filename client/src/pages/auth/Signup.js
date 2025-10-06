import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import { auth } from '../../firebase/config';

const Signup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirm || !empresa) return;
    if (password !== confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password);
      // Enviar verificación de email y pedir confirmación antes de crear empresa
      try { await auth.currentUser?.sendEmailVerification(); } catch {}
      alert('Te enviamos un correo para verificar tu email. Veríficalo y luego inicia sesión para crear tu empresa.');
      navigate('/login', { replace: true });
    } catch (e) {
      alert(e.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="py-10 px-8">
          <h1 className="text-2xl font-bold mb-6">Crear cuenta y empresa</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <input className="input w-full" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="input w-full" type="text" placeholder="Nombre de empresa" value={empresa} onChange={e=>setEmpresa(e.target.value)} />
            <input className="input w-full" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
            <input className="input w-full" type="password" placeholder="Confirmar contraseña" value={confirm} onChange={e=>setConfirm(e.target.value)} />
            <Button type="submit" fullWidth loading={loading}>Registrarme</Button>
          </form>
          <div className="mt-4 text-sm">
            ¿Ya tienes cuenta? <Link to="/login" className="text-indigo-600">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

