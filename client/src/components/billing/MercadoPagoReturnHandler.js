import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaInfoCircle } from 'react-icons/fa';

/**
 * Tras Checkout Pro / suscripción MP, Mercado Pago redirige con ?mp=approved|failure|pending.
 * Muestra un modal moderno y limpia la URL (sin depender de Configuración → empresa).
 */
export default function MercadoPagoReturnHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(null);

  const close = useCallback(() => {
    setOpen(false);
    setKind(null);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search || '');
    const mp = q.get('mp');
    if (!mp) return;

    if (mp === 'approved' || mp === 'failure' || mp === 'pending' || mp === 'sub_return') {
      setKind(mp);
      setOpen(true);
    }

    navigate({ pathname: location.pathname, search: '' }, { replace: true });

    if (mp === 'approved' || mp === 'pending' || mp === 'sub_return') {
      window.dispatchEvent(new CustomEvent('nexo-license-reload'));
      const t = setTimeout(() => window.dispatchEvent(new CustomEvent('nexo-license-reload')), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [location.search, location.pathname, navigate]);

  if (!open || !kind) return null;

  const panels = {
    approved: {
      icon: <FaCheckCircle className="h-14 w-14 text-emerald-400 drop-shadow" aria-hidden />,
      title: '¡Felicitaciones, pago listo!',
      subtitle: 'Gracias por renovar y por confiar en NexoPOS',
      body: 'Tu licencia suma 30 días de vigencia desde la acreditación. En unos segundos verás la nueva fecha en la barra superior; si no, cerrá este aviso y esperá un momento.',
      gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      ring: 'ring-emerald-400/30'
    },
    failure: {
      icon: <FaExclamationTriangle className="h-12 w-12 text-amber-300" aria-hidden />,
      title: 'No se completó el pago',
      subtitle: 'No te preocupés',
      body: 'Podés intentar de nuevo cuando quieras desde la barra de licencia o Configuración → Licencia.',
      gradient: 'from-slate-700 via-slate-800 to-zinc-900',
      ring: 'ring-white/10'
    },
    pending: {
      icon: <FaHourglassHalf className="h-12 w-12 text-sky-300" aria-hidden />,
      title: 'Pago pendiente',
      subtitle: 'Estamos a la espera de Mercado Pago',
      body: 'Cuando se acredite, tu vigencia se extiende sola. Podés cerrar este aviso y seguir usando la app.',
      gradient: 'from-sky-700 via-indigo-700 to-violet-800',
      ring: 'ring-sky-400/30'
    },
    sub_return: {
      icon: <FaInfoCircle className="h-12 w-12 text-indigo-200" aria-hidden />,
      title: 'Volviste desde Mercado Pago',
      subtitle: 'Suscripción',
      body: 'Si completaste los pasos, la licencia se actualizará automáticamente. Si no, podés reintentar cuando quieras.',
      gradient: 'from-indigo-700 via-violet-700 to-fuchsia-800',
      ring: 'ring-indigo-400/25'
    }
  };

  const p = panels[kind] || panels.pending;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-return-title"
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-2 ${p.ring} animate-[slideUp_0.28s_cubic-bezier(0.16,1,0.3,1)]`}
      >
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
        <div className={`bg-gradient-to-br ${p.gradient} px-6 pb-10 pt-8 text-center text-white`}>
          <div className="mx-auto mb-4 flex justify-center">{p.icon}</div>
          <h2 id="mp-return-title" className="text-2xl font-bold tracking-tight">
            {p.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-white/85">{p.subtitle}</p>
        </div>
        <div className="bg-white px-6 py-6 text-center">
          <p className="text-[15px] leading-relaxed text-slate-600">{p.body}</p>
          <button
            type="button"
            onClick={close}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            {kind === 'approved' ? '¡Genial, continuar!' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
}
