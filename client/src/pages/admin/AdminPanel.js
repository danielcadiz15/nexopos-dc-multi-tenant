import React, { useEffect, useState } from 'react';
import ApiService from '../../services/api.service';
import { generateTenantBootstrapCode } from '../../services/firebase.service';
import { toast } from 'react-toastify';
import { normalizeLicensePlan, PLAN_LABELS_ES } from '../../utils/planTiers';
import MercadoPagoMark from '../../components/common/MercadoPagoMark';
import PlanesAbonoExplainerModal from '../../components/configuracion/PlanesAbonoExplainerModal';
import { FaLayerGroup } from 'react-icons/fa';
import { MODULE_KEYS, buildModulosDefaultIntermediate } from '../../config/modulesCatalog';

const api = new ApiService('/admin');

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState([]);
  const [editLic, setEditLic] = useState(null); // { id, plan, paidUntil, blocked, reason }
  const [editMods, setEditMods] = useState(null); // { id, modules }
  const [saving, setSaving] = useState(false);
  const [planPricesForm, setPlanPricesForm] = useState({ basic: '80000', intermediate: '120000', premium: '180000' });
  const [onboardingForm, setOnboardingForm] = useState({
    onboardingInstallmentAmountARS: '250000',
    onboardingInstallmentsTotal: '2'
  });
  const [savingPrecio, setSavingPrecio] = useState(false);

  /** Códigos de habilitación al crear empresa (Firestore + callable; vinculados al correo del dueño) */
  const [habEmail, setHabEmail] = useState('');
  const [habDias, setHabDias] = useState(90);
  const [habNota, setHabNota] = useState('');
  const [habResultado, setHabResultado] = useState(null);
  const [generandoHab, setGenerandoHab] = useState(false);
  const [showPlanesExplainer, setShowPlanesExplainer] = useState(false);

  const cargarPrecioPlataforma = async () => {
    try {
      const { data, status } = await api.get('/platform/billing');
      if (status === 200 && data?.success && data?.data) {
        const d = data.data;
        const pp = d.planPrices || {};
        setPlanPricesForm({
          basic: String(pp.basic ?? d.monthlyPriceARS ?? '80000'),
          intermediate: String(pp.intermediate ?? '120000'),
          premium: String(pp.premium ?? '180000')
        });
        setOnboardingForm({
          onboardingInstallmentAmountARS: String(
            d.onboardingInstallmentAmountARS ?? '250000'
          ),
          onboardingInstallmentsTotal: String(d.onboardingInstallmentsTotal ?? '2')
        });
      }
    } catch {
      /* ignorar */
    }
  };

  const guardarPrecioPlataforma = async () => {
    try {
      const planPrices = {
        basic: Number(planPricesForm.basic),
        intermediate: Number(planPricesForm.intermediate),
        premium: Number(planPricesForm.premium)
      };
      for (const k of ['basic', 'intermediate', 'premium']) {
        if (Number.isNaN(planPrices[k]) || planPrices[k] < 0) {
          toast.error(`Precio inválido (${k})`);
          return;
        }
      }
      const obAmt = Number(onboardingForm.onboardingInstallmentAmountARS);
      const obTot = Math.floor(Number(onboardingForm.onboardingInstallmentsTotal));
      if (Number.isNaN(obAmt) || obAmt <= 0) {
        toast.error('Monto cuota instalación inválido');
        return;
      }
      if (Number.isNaN(obTot) || obTot < 1 || obTot > 24) {
        toast.error('Cantidad de cuotas instalación: entre 1 y 24');
        return;
      }
      setSavingPrecio(true);
      const { status } = await api.put('/platform/billing', {
        planPrices,
        onboardingInstallmentAmountARS: obAmt,
        onboardingInstallmentsTotal: obTot
      });
      if (status === 200) toast.success('Facturación (planes + instalación) guardada');
      else toast.error('No se pudo guardar');
    } catch {
      toast.error('Error al guardar precios');
    } finally {
      setSavingPrecio(false);
    }
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const { data, status } = await api.get('/empresas');
      if (status === 200 && data?.success) {
        setEmpresas(data.data || []);
      } else if (status === 403) {
        toast.error('Solo administradores');
      } else {
        toast.error('No se pudo cargar');
      }
    } catch (e) {
      toast.error('Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    cargarPrecioPlataforma();
  }, []);

  const guardarLicencia = async () => {
    try {
      if (!editLic) return;
      setSaving(true);
      const payload = { plan: normalizeLicensePlan(editLic.plan), paidUntil: editLic.paidUntil||'', blocked: !!editLic.blocked, reason: editLic.reason||'' };
      const { status } = await api.put(`/empresas/${editLic.id}/licencia`, payload);
      if (status === 200) { toast.success('Licencia actualizada'); setEditLic(null); await cargar(); }
      else toast.error('No se pudo actualizar licencia');
    } catch(e){ toast.error('Error al actualizar licencia'); }
    finally{ setSaving(false); }
  };

  const guardarModulos = async () => {
    try {
      if (!editMods) return;
      setSaving(true);
      const { status } = await api.put(`/empresas/${editMods.id}/modulos`, editMods.modules || {});
      if (status === 200) { toast.success('Módulos actualizados'); setEditMods(null); await cargar(); }
      else toast.error('No se pudieron actualizar módulos');
    } catch(e){ toast.error('Error al actualizar módulos'); }
    finally{ setSaving(false); }
  };

  const abrirModulos = async (empresaId) => {
    try {
      const { data, status } = await api.get(`/empresas/${empresaId}/modulos`);
      const actual = (status === 200 && data?.data) ? data.data : {};
      setEditMods({
        id: empresaId,
        modules: { ...buildModulosDefaultIntermediate(), ...actual }
      });
    } catch {
      setEditMods({
        id: empresaId,
        modules: { ...buildModulosDefaultIntermediate() }
      });
    }
  };

  const eliminarEmpresa = async (empresaId) => {
    try {
      if (!window.confirm('¿Seguro que deseas eliminar esta empresa? Esta acción es irreversible.')) return;
      const { status, data } = await api.delete(`/empresas/${empresaId}`);
      if (status === 200 && data?.success) {
        toast.success('Empresa eliminada');
        await cargar();
      } else if (status === 403) {
        toast.error('Solo administradores');
      } else {
        toast.error(data?.message || 'No se pudo eliminar');
      }
    } catch (e) {
      toast.error('Error al eliminar empresa');
    }
  };

  const generarCodigoHabilitacion = async () => {
    const mail = habEmail.trim();
    if (!mail) {
      toast.error('Ingresá el correo exacto que usará el cliente para registrarse y crear la empresa.');
      return;
    }
    try {
      setGenerandoHab(true);
      const dias = Math.min(365, Math.max(1, Number(habDias) || 90));
      const data = await generateTenantBootstrapCode({
        targetEmail: mail,
        expiresInDays: dias,
        note: habNota.trim().slice(0, 200)
      });
      if (!data?.success || !data?.code) {
        throw new Error(data?.message || 'Respuesta inválida');
      }
      setHabResultado({
        code: data.code,
        allowedEmail: data.allowedEmail || mail.toLowerCase(),
        expiresAt: data.expiresAt
      });
      toast.success('Código generado. Compartilo por un canal seguro; solo funciona con ese correo y un solo uso.');
    } catch (e) {
      const c = e?.code || '';
      let m = e?.message || 'No se pudo generar el código';
      if (c === 'functions/failed-precondition') m = e.message || m;
      toast.error(m);
    } finally {
      setGenerandoHab(false);
    }
  };

  const copiarCodigoHabilitacion = async () => {
    if (!habResultado?.code) return;
    try {
      await navigator.clipboard.writeText(habResultado.code);
      toast.info('Código copiado');
    } catch {
      toast.warning('No se pudo copiar; seleccioná el texto manualmente.');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <button className="px-3 py-2 rounded bg-gray-200" onClick={cargar}>Refrescar</button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 flex flex-wrap items-center gap-2">
          <MercadoPagoMark className="h-7 w-auto" />
          Precios mensuales por plan (ARS)
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Planes <strong>Básica</strong>, <strong>Intermedia</strong>, <strong>Premium</strong>. El cobro vía Checkout
          toma el plan de cada empresa en el momento del pago. Secretos backend y webhook:{' '}
          <code className="bg-gray-100 px-1 rounded">MERCADOPAGO_ACCESS_TOKEN</code>{' '}
          <span className="whitespace-nowrap">
            (<code className="bg-gray-100 px-1 rounded">docs/billing-mercadopago.md</code>).
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPlanesExplainer(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 shadow-sm transition hover:bg-indigo-100"
          >
            <FaLayerGroup className="h-4 w-4" />
            Guía: qué incluye cada plan
          </button>
          <span className="text-xs text-gray-500">Módulos, ventajas y diferencias entre abonos.</span>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'basic', label: 'Básica' },
            { key: 'intermediate', label: 'Intermedia' },
            { key: 'premium', label: 'Premium' }
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="border rounded px-3 py-2 w-full max-w-[11rem]"
                value={planPricesForm[key]}
                onChange={(e) => setPlanPricesForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/90 p-3 max-w-3xl space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Cuotas de instalación (modelo alta nueva)</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Primeros pagos al monto indicado → <strong>30 días</strong> cada uno y <strong>módulos completos</strong>.
            Después cobra según los precios Básica / Intermedia / Premium. Las empresas sin{' '}
            <code className="bg-gray-100 px-1 rounded text-[11px]">billingModel: onboarding_v2</code> siguen el modelo
            anterior (solo precio por plan).
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ARS por cuota de instalación</label>
              <input
                type="number"
                min="1"
                step="1000"
                className="border rounded px-3 py-2 w-40"
                value={onboardingForm.onboardingInstallmentAmountARS}
                onChange={(e) =>
                  setOnboardingForm((p) => ({ ...p, onboardingInstallmentAmountARS: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nº de cuotas a ese monto</label>
              <input
                type="number"
                min={1}
                max={24}
                className="border rounded px-3 py-2 w-24"
                value={onboardingForm.onboardingInstallmentsTotal}
                onChange={(e) =>
                  setOnboardingForm((p) => ({ ...p, onboardingInstallmentsTotal: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={savingPrecio}
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
            onClick={guardarPrecioPlataforma}
          >
            {savingPrecio ? 'Guardando…' : 'Guardar planes e instalación'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Gestión de correos — código de habilitación (alta de empresa)</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          Generá un código <strong>de un solo uso</strong> asociado al <strong>correo del futuro dueño</strong>. Esa persona
          debe registrarse e iniciar sesión con <strong>exactamente ese correo</strong> (verificado) e ingresar el código
          al crear la organización. Sin código válido no puede completar el alta. La vigencia comercial (prueba y luego
          pago con Mercado Pago) sigue igual para la empresa ya creada.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Correo del cliente (debe coincidir con su cuenta)</label>
            <input
              type="email"
              className="border rounded px-3 py-2 w-full"
              value={habEmail}
              onChange={(e) => setHabEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Válido (días, máx. 365)</label>
            <input
              type="number"
              min={1}
              max={365}
              className="border rounded px-3 py-2 w-28"
              value={habDias}
              onChange={(e) => setHabDias(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota interna (opcional)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={habNota}
              onChange={(e) => setHabNota(e.target.value)}
              placeholder="Ej.: presupuesto aprobado / contacto"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={generandoHab}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
            onClick={generarCodigoHabilitacion}
          >
            {generandoHab ? 'Generando…' : 'Generar código de habilitación'}
          </button>
        </div>
        {habResultado ? (
          <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50/80 p-3 max-w-3xl space-y-2">
            <p className="text-xs text-gray-700">
              <strong>Correo vinculado:</strong> {habResultado.allowedEmail}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-sm font-mono break-all flex-1 min-w-0">{habResultado.code}</code>
              <button
                type="button"
                onClick={copiarCodigoHabilitacion}
                className="shrink-0 px-3 py-1 rounded border border-indigo-600 text-indigo-900 text-sm font-medium hover:bg-white"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Vence:{' '}
              {habResultado.expiresAt
                ? new Date(habResultado.expiresAt).toLocaleString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '—'}
            </p>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Empresa</th>
              <th className="text-left px-4 py-2">Email dueño</th>
              <th className="text-left px-4 py-2">Plan</th>
              <th className="text-left px-4 py-2">Vence</th>
              <th className="text-left px-4 py-2">Días</th>
              <th className="text-left px-4 py-2">Bloqueada</th>
              <th className="text-left px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e)=>{
              const lic = e.license || {};
              const paid = lic.paidUntil ? new Date(lic.paidUntil).toISOString().substring(0,10) : '';
              return (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-2">{e.name||'(sin nombre)'}</td>
                  <td className="px-4 py-2">{e.ownerEmail || '(sin email)'}</td>
                  <td className="px-4 py-2">{PLAN_LABELS_ES[normalizeLicensePlan(lic.plan)] || normalizeLicensePlan(lic.plan)}</td>
                  <td className="px-4 py-2">{paid}</td>
                  <td className="px-4 py-2">{e.daysLeft ?? '-'}</td>
                  <td className="px-4 py-2">{lic.blocked? 'Sí':'No'}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="px-2 py-1 bg-indigo-600 text-white rounded" onClick={()=> setEditLic({ id:e.id, plan: normalizeLicensePlan(lic.plan), paidUntil: lic.paidUntil||'', blocked: !!lic.blocked, reason: lic.reason||'' })}>Licencia</button>
                    <button className="px-2 py-1 bg-gray-700 text-white rounded" onClick={()=> abrirModulos(e.id)}>Módulos</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=> eliminarEmpresa(e.id)}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editLic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-3">Editar Licencia: {editLic.id}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Plan</label>
                <select className="input w-full" value={editLic.plan} onChange={e=> setEditLic(prev=>({...prev, plan:e.target.value}))}>
                  <option value="basic">Básica</option>
                  <option value="intermediate">Intermedia</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Válida hasta</label>
                <input className="input w-full" type="date" value={editLic.paidUntil? editLic.paidUntil.substring(0,10): ''} onChange={e=> setEditLic(prev=> ({...prev, paidUntil: e.target.value? new Date(e.target.value).toISOString(): ''}))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!editLic.blocked} onChange={e=> setEditLic(prev=> ({...prev, blocked: e.target.checked}))} />
                <span>Bloquear</span>
              </div>
              <div>
                <label className="text-sm">Motivo</label>
                <input className="input w-full" value={editLic.reason||''} onChange={e=> setEditLic(prev=> ({...prev, reason: e.target.value}))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={()=> setEditLic(null)}>Cancelar</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60" disabled={saving} onClick={guardarLicencia}>{saving? 'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {editMods && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-3">Editar Módulos: {editMods.id}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {MODULE_KEYS.map(key=> (
                <label key={key} className="flex items-center gap-2 p-2 rounded border">
                  <input type="checkbox" checked={editMods.modules?.[key] !== false} onChange={e=> setEditMods(prev=> ({...prev, modules: { ...prev.modules, [key]: e.target.checked }}))} />
                  <span className="capitalize">{key.replaceAll('_',' ')}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={()=> setEditMods(null)}>Cancelar</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60" disabled={saving} onClick={guardarModulos}>{saving? 'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <PlanesAbonoExplainerModal
        open={showPlanesExplainer}
        onClose={() => setShowPlanesExplainer(false)}
        initialPlan="intermediate"
      />
    </div>
  );
};

export default AdminPanel;


