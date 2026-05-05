import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import {
  evaluateLicenseUiState,
  formatGraceCountdown,
  LICENSE_GRACE_MS
} from '../../utils/licenseUi';

/**
 * Avisos de licencia: aviso previo, gracia 24 h (sin facturación vía API), vencimiento total.
 */
const LicenseBanner = ({ compact }) => {
  const { orgId } = useAuth();
  const [ui, setUi] = useState(null);
  const [apiBlock, setApiBlock] = useState(null);

  const reload = useCallback(async () => {
    if (!orgId) {
      setUi(null);
      return;
    }
    try {
      let lic = null;
      const r1 = await getDoc(doc(db, `companies/${orgId}/config/license`));
      if (r1.exists()) lic = r1.data();
      if (!lic) {
        const r2 = await getDoc(doc(db, 'licenses', orgId));
        if (r2.exists()) lic = r2.data();
      }
      setUi(evaluateLicenseUiState(lic || {}));
    } catch {
      setUi(null);
    }
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onBlocked = (e) => {
      const d = e?.detail;
      if (d && typeof d === 'object') {
        setApiBlock({
          message: d.message || 'Licencia',
          code: d.code,
          graceEndsAt: d.graceEndsAt,
          pagoBilleteraUrl: d.pagoBilleteraUrl
        });
      } else {
        setApiBlock({ message: typeof d === 'string' ? d : 'Licencia inválida', code: null });
      }
    };
    const onOk = () => setApiBlock(null);
    window.addEventListener('license:blocked', onBlocked);
    window.addEventListener('license:ok', onOk);
    return () => {
      window.removeEventListener('license:blocked', onBlocked);
      window.removeEventListener('license:ok', onOk);
    };
  }, []);

  if (!orgId) return null;

  const pagoUrl = apiBlock?.pagoBilleteraUrl || ui?.pagoUrl;

  if (apiBlock?.code === 'LICENSE_GRACE_NO_FACTURACION') {
    return (
      <div
        className={`border-b border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            <strong>Período de gracia:</strong> la licencia está vencida. Podés seguir operando, pero{' '}
            <strong>no se pueden registrar ventas</strong> hasta que regularices el pago. Tiempo restante
            aproximado:{' '}
            {apiBlock.graceEndsAt
              ? formatGraceCountdown(new Date(apiBlock.graceEndsAt).getTime())
              : formatGraceCountdown(ui?.graceEndsAt)}
            .
          </p>
          {pagoUrl ? (
            <a
              href={pagoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
            >
              Pagar / Billetera
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (apiBlock && (apiBlock.code === 'LICENSE_EXPIRED' || apiBlock.code === 'LICENSE_BLOCKED')) {
    return (
      <div
        className={`border-b border-red-300 bg-red-50 px-3 py-2 text-red-950 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>{apiBlock.message}</p>
          {pagoUrl ? (
            <a
              href={pagoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
            >
              Regularizar pago
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (ui?.phase === 'grace' && !apiBlock) {
    return (
      <div
        className={`border-b border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            <strong>Licencia vencida:</strong> tenés 24 horas de uso extra para regularizar (
            {formatGraceCountdown(ui.graceEndsAt)} restantes). Durante este período{' '}
            <strong>no podés registrar nuevas ventas</strong>. Después el sistema quedará bloqueado hasta pagar.
          </p>
          {ui.pagoUrl ? (
            <a
              href={ui.pagoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
            >
              Pagar con billetera / enlace
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (ui?.phase === 'expired') {
    return (
      <div
        className={`border-b border-red-300 bg-red-50 px-3 py-2 text-red-950 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            <strong>Licencia vencida:</strong> superaste el período de gracia (
            {LICENSE_GRACE_MS / (3600000)} h). El sistema está bloqueado hasta regularizar el pago.
          </p>
          {ui.pagoUrl ? (
            <a
              href={ui.pagoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
            >
              Regularizar pago
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (ui?.phase === 'active' && ui.paidUntilMs) {
    const days = Math.ceil((ui.paidUntilMs - Date.now()) / (24 * 60 * 60 * 1000));
    if (days <= 7 && days >= 0) {
      return (
        <div
          className={`border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-950 ${compact ? 'text-xs' : 'text-sm'}`}
        >
          Tu licencia vence en {days} día(s). Regularizá para evitar cortes y período sin ventas.
          {ui.pagoUrl ? (
            <>
              {' '}
              <a href={ui.pagoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                Ir a pago
              </a>
            </>
          ) : null}
        </div>
      );
    }
  }

  return null;
};

export default LicenseBanner;
