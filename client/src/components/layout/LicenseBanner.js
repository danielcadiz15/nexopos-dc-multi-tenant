import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import {
  evaluateLicenseUiState,
  formatGraceCountdown,
  daysUntilPaidUntil
} from '../../utils/licenseUi';
import { normalizeLicensePlan, PLAN_LABELS_ES } from '../../utils/planTiers';
import {
  getNextBillingAmountARS,
  getPreferredCheckoutPlan,
  isOnboardingPaymentPhase
} from '../../utils/billingOnboarding';
import {
  getBillingPublicConfig,
  createLicenseMercadoPagoPreference,
  createLicenseMercadoPagoPreapproval
} from '../../services/billing.service';
import MercadoPagoMark from '../common/MercadoPagoMark';
import { getMercadoPagoCheckoutUrl, goToMercadoPagoCheckout } from '../../utils/mercadopagoCheckout';

/**
 * Barra fija de licencia: plan, vigencia / cortesía sin pago, y pago Mercado Pago sin salir de la app.
 */
const LicenseBanner = ({ compact }) => {
  const { orgId } = useAuth();
  const navigate = useNavigate();
  const [lic, setLic] = useState(null);
  const [ui, setUi] = useState(null);
  const [billingMp, setBillingMp] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [preapprovalLoading, setPreapprovalLoading] = useState(false);
  const [apiBlock, setApiBlock] = useState(null);

  const reload = useCallback(async () => {
    if (!orgId) {
      setLic(null);
      setUi(null);
      return;
    }
    try {
      let data = null;
      const r1 = await getDoc(doc(db, `companies/${orgId}/config/license`));
      if (r1.exists()) data = r1.data();
      if (!data) {
        const r2 = await getDoc(doc(db, 'licenses', orgId));
        if (r2.exists()) data = r2.data();
      }
      setLic(data || {});
      setUi(evaluateLicenseUiState(data || {}));
    } catch {
      setLic({});
      setUi(evaluateLicenseUiState({}));
    }
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onReload = () => {
      reload();
    };
    window.addEventListener('nexo-license-reload', onReload);
    return () => window.removeEventListener('nexo-license-reload', onReload);
  }, [reload]);

  useEffect(() => {
    if (!orgId || !ui || ui.phase !== 'unpaid_needs_anchor') return undefined;
    const t = setInterval(() => {
      reload();
    }, 4000);
    const stop = setTimeout(() => clearInterval(t), 120000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
    // Solo reacciona al cambio de fase (p. ej. cuando Firestore recibe unpaidGraceStartedAt).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, ui?.phase, reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orgId) return;
      try {
        const { data } = await getBillingPublicConfig();
        if (!cancelled && data?.success) setBillingMp(data.data);
      } catch {
        if (!cancelled) setBillingMp(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, lic?.paidUntil, lic?.unpaidGraceStartedAt]);

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

  const abrirPagoMp = async () => {
    const plan = getPreferredCheckoutPlan(lic || {});
    const price = getNextBillingAmountARS(lic || {}, billingMp || {});
    if (!billingMp?.mercadoPagoTokenPresent || price <= 0) {
      toast.warning(
        'El pago con Mercado Pago no está disponible en este momento. Probá más tarde o usá el enlace alternativo si aparece.'
      );
      return;
    }
    setPayLoading(true);
    try {
      const { data, status } = await createLicenseMercadoPagoPreference({ plan });
      const url = getMercadoPagoCheckoutUrl(data);
      if (status === 200 && data?.success && url) {
        toast.info('Te llevamos a Mercado Pago en esta misma ventana. Completá el pago; al volver se actualiza la vigencia.', {
          autoClose: 5000
        });
        goToMercadoPagoCheckout(url);
      } else {
        toast.error(data?.message || data?.detail?.message || 'No se pudo iniciar el pago');
      }
    } catch (e) {
      toast.error(e?.message || 'Error al conectar con el servidor de pagos');
    } finally {
      setPayLoading(false);
    }
  };

  const activarDebitoAutomatico = async () => {
    const plan = getPreferredCheckoutPlan(lic || {});
    if (isOnboardingPaymentPhase(lic || {}, billingMp || {})) {
      toast.info('Primero completá las dos cuotas del kit inicial. Después podés activar débito automático.');
      return;
    }
    if (!billingMp?.mercadoPagoTokenPresent) {
      toast.warning('Mercado Pago no está disponible en este momento.');
      return;
    }
    setPreapprovalLoading(true);
    try {
      const { data, status } = await createLicenseMercadoPagoPreapproval({ plan });
      const url = getMercadoPagoCheckoutUrl(data);
      if (status === 200 && data?.success && url) {
        toast.info('Te llevamos a Mercado Pago para activar el débito automático mensual.', { autoClose: 5000 });
        goToMercadoPagoCheckout(url);
      } else {
        toast.error(data?.message || data?.detail?.message || 'No se pudo iniciar la suscripción');
      }
    } catch (e) {
      toast.error(e?.message || 'Error al conectar con Mercado Pago');
    } finally {
      setPreapprovalLoading(false);
    }
  };

  const irConfigLicencia = () => {
    navigate('/configuracion/empresa?licencia=1');
  };

  if (!orgId) return null;

  const planKey = normalizeLicensePlan(lic?.plan);
  const inOnboarding = isOnboardingPaymentPhase(lic || {}, billingMp || {});
  const slotsTot = Number(billingMp?.onboardingInstallmentsTotal ?? 2);
  const onboardingDone = Number(lic?.onboardingInstallmentsPaid ?? 0);
  const planLabel = inOnboarding
    ? `Instalación · versión completa (${onboardingDone + 1}/${slotsTot})`
    : PLAN_LABELS_ES[planKey] || planKey;
  const pagoUrl = apiBlock?.pagoBilleteraUrl || ui?.pagoUrl;
  const arsNext = getNextBillingAmountARS(lic || {}, billingMp || {});
  const puedePagarMp =
    billingMp?.mercadoPagoTokenPresent && arsNext > 0 && ui?.phase !== 'blocked';

  const graceLike =
    apiBlock?.code === 'LICENSE_GRACE_NO_FACTURACION' || apiBlock?.code === 'LICENSE_NO_PAYMENT_GRACE';
  const apiHard =
    apiBlock?.code === 'LICENSE_EXPIRED' || apiBlock?.code === 'LICENSE_BLOCKED';
  const isDemo = lic?.demo === true;

  let stripClass =
    'border-b border-indigo-200/80 bg-indigo-50/95 text-indigo-950 backdrop-blur-sm';
  if (ui?.phase === 'grace' || ui?.phase === 'unpaid_grace' || graceLike) {
    stripClass = 'border-b border-amber-300/80 bg-amber-50/95 text-amber-950 backdrop-blur-sm';
  }
  if (
    ui?.phase === 'expired' ||
    ui?.phase === 'unpaid_expired' ||
    ui?.phase === 'demo_expired' ||
    ui?.phase === 'blocked' ||
    apiHard
  ) {
    stripClass = 'border-b border-red-300/80 bg-red-50/95 text-red-950 backdrop-blur-sm';
  }

  const daysLeft = ui?.paidUntilMs != null ? daysUntilPaidUntil(ui.paidUntilMs) : null;
  const isImportantPhase =
    ui?.phase === 'demo_expired' ||
    ui?.phase === 'grace' ||
    ui?.phase === 'expired' ||
    ui?.phase === 'unpaid_needs_anchor' ||
    ui?.phase === 'unpaid_grace' ||
    ui?.phase === 'unpaid_expired' ||
    ui?.phase === 'blocked';
  const isNearDue =
    (ui?.phase === 'active' || ui?.phase === 'demo_active') &&
    daysLeft != null &&
    daysLeft <= 7 &&
    daysLeft >= 0;
  const shouldShowBanner = compact || isDemo || inOnboarding || isImportantPhase || isNearDue || !!apiBlock;

  if (!shouldShowBanner) return null;

  let statusLine = '';
  if ((ui?.phase === 'active' || ui?.phase === 'demo_active') && ui.paidUntilMs) {
    const d = daysLeft;
    if (isDemo) {
      statusLine =
        d != null && d >= 0
          ? `Demo activa hasta ${new Date(ui.paidUntilMs).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d} ${d === 1 ? 'día' : 'días'} restantes`
          : 'Demo activa';
    } else {
      statusLine =
        d != null && d >= 0
          ? `Vigente hasta ${new Date(ui.paidUntilMs).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d} ${d === 1 ? 'día' : 'días'} restantes`
          : 'Licencia activa';
    }
    if (inOnboarding && lic?.billingModel === 'onboarding_v2') {
      statusLine +=
        ' · Período de instalación (versión completa): tras las cuotas fijas pasás al plan que elegiste al pagar.';
    }
  } else if (ui?.phase === 'grace') {
    statusLine = `Licencia vencida · período de gracia: ${formatGraceCountdown(ui.graceEndsAt)} restantes (no podés registrar ventas nuevas hasta pagar)`;
  } else if (ui?.phase === 'unpaid_needs_anchor') {
    statusLine =
      'Sin pago registrado · estamos activando 24 horas de cortesía para que puedas pagar desde la app sin quedar bloqueado de inmediato…';
  } else if (ui?.phase === 'unpaid_grace') {
    statusLine = `Sin pago registrado · te quedan ${formatGraceCountdown(ui.graceEndsAt)} de uso (no podés registrar ventas nuevas). Regularizá abajo con Mercado Pago.`;
  } else if (ui?.phase === 'unpaid_expired') {
    statusLine =
      'Sin pago registrado: superaste las 24 horas de cortesía. El sistema queda restringido hasta que pagues.';
  } else if (ui?.phase === 'expired' || ui?.phase === 'demo_expired') {
    statusLine = isDemo
      ? 'Tu demo de 48 hs finalizó. Activá un plan para continuar usando NexoPOS sin interrupciones.'
      : `Licencia vencida: superaste el período de gracia (${formatGraceCountdown(ui.graceEndsAt)} ya finalizó). Regularizá el pago.`;
  } else if (ui?.phase === 'blocked') {
    statusLine = lic?.reason || 'Acceso restringido por licencia. Contactá a quien administra la cuenta de tu negocio.';
  }

  const textSize = compact ? 'text-xs' : 'text-sm';
  const compactPadding = compact ? 'px-2 py-2' : 'px-3 py-2.5';

  let mainMessage = statusLine;
  if (graceLike && apiBlock?.message) {
    mainMessage = apiBlock.message;
  } else if (apiHard && apiBlock?.message) {
    mainMessage = apiBlock.message;
  }

  return (
    <div className="license-banner relative z-20">
      <div className={`${compactPadding} ${stripClass}`}>
        <div
          className={`mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${textSize}`}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">Tu plan: {planLabel}</span>
              {ui?.phase === 'active' && daysLeft != null && daysLeft <= 7 && daysLeft >= 0 ? (
                <span className="rounded-full bg-yellow-200/80 px-2 py-0.5 text-xs font-medium text-yellow-950">
                  Por vencer
                </span>
              ) : null}
            </div>
            <p className="text-opacity-90 leading-snug opacity-95">{mainMessage}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {puedePagarMp ? (
              <button
                type="button"
                disabled={payLoading}
                onClick={abrirPagoMp}
                className="inline-flex items-center gap-2 rounded-lg bg-[#009ee3] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#008dcf] disabled:opacity-50 sm:text-sm"
              >
                <MercadoPagoMark className="h-5 w-auto shrink-0 opacity-95" />
                {payLoading
                  ? 'Abriendo…'
                  : `${inOnboarding ? 'Cuota instalación' : isDemo ? 'Activar plan' : 'Renovar'} · ${arsNext.toLocaleString('es-AR')} ARS`}
              </button>
            ) : null}
            {puedePagarMp && !inOnboarding ? (
              <button
                type="button"
                disabled={preapprovalLoading}
                onClick={activarDebitoAutomatico}
                className="rounded-lg border border-[#009ee3]/50 bg-white/90 px-3 py-2 text-xs font-semibold text-[#007eb5] hover:bg-sky-50 disabled:opacity-50 sm:text-sm"
              >
                {preapprovalLoading ? 'Abriendo…' : 'Activar débito automático'}
              </button>
            ) : null}
            {!compact ? (
              <button
                type="button"
                onClick={irConfigLicencia}
                className="rounded-lg border border-current/30 bg-white/80 px-3 py-2 text-xs font-semibold hover:bg-white sm:text-sm"
              >
                Más opciones / licencia
              </button>
            ) : null}
            {pagoUrl && !puedePagarMp ? (
              <a
                href={pagoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold underline sm:text-sm"
              >
                Enlace de pago alternativo
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseBanner;
