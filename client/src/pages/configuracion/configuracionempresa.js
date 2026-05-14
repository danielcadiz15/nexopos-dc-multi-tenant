// src/pages/configuracion/ConfiguracionEmpresa.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

// Servicios
import configuracionService from '../../services/configuracion.service';
import { getEmailActionCodeSettings } from '../../utils/emailVerification';
import { createTenant, joinTenant, setActiveTenant, migrateOrgCatalogDefaults } from '../../services/firebase.service';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdminEmail } from '../../config/superAdmin';
import { MODULE_KEYS, buildModulosDefaultIntermediate } from '../../config/modulesCatalog';

// Firebase
import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getBillingPublicConfig, createLicenseMercadoPagoPreference } from '../../services/billing.service';
import { normalizeLicensePlan, PLAN_LABELS_ES } from '../../utils/planTiers';
import {
  getNextBillingAmountARS,
  getPreferredCheckoutPlan,
  isOnboardingPaymentPhase
} from '../../utils/billingOnboarding';
import MercadoPagoMark from '../../components/common/MercadoPagoMark';
import PlanesAbonoExplainerModal from '../../components/configuracion/PlanesAbonoExplainerModal';
import { PLAN_IDS } from '../../utils/planDetails';
import { getMercadoPagoCheckoutUrl, goToMercadoPagoCheckout } from '../../utils/mercadopagoCheckout';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import PasswordInput from '../../components/common/PasswordInput';

// Iconos
import { 
  FaBuilding, FaSave, FaUpload, FaTimes,
  FaPhone, FaMapMarkerAlt, FaFileInvoice,
  FaImage, FaCog, FaCogs, FaDatabase, FaLayerGroup, FaArrowLeft
} from 'react-icons/fa';

/** Modal simple */
function Modal({ open, title, children, onClose }){
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-3">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FaTimes/></button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

const storageSafeGet = (storage, key, fallback = '') => {
  try {
    const value = storage?.getItem?.(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const storageSafeSet = (storage, key, value) => {
  try {
    storage?.setItem?.(key, value);
  } catch {
    // Ignore unavailable storage (private mode/restricted webviews).
  }
};

const storageSafeRemove = (storage, key) => {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Ignore unavailable storage (private mode/restricted webviews).
  }
};

/**
 * Página de configuración de datos empresariales
 * Permite configurar todos los datos que aparecerán en las facturas
 */
const ConfiguracionEmpresa = () => {
  const { orgId, currentUser, refreshAuthSession, syncEffectivePermissions } = useAuth();
  const [migrandoCatalogoSugerido, setMigrandoCatalogoSugerido] = useState(false);
  const [showPlanesExplainer, setShowPlanesExplainer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pendingWizardFromVerify = Boolean(location.state?.openWizardModal);
  const onboardingSource = location.state?.onboardingSource || 'standard';
  const handleVolver = useCallback(() => {
    if (!orgId) {
      navigate('/login', { replace: true });
      return;
    }
    navigate(-1);
  }, [navigate, orgId]);

  const getCompanyId = useCallback(async () => {
    if (orgId) return orgId;
    try {
      const token = await auth.currentUser?.getIdTokenResult();
      const cid = token?.claims?.companyId || storageSafeGet(window.localStorage, 'companyId', null);
      return cid;
    } catch {
      return storageSafeGet(window.localStorage, 'companyId', null);
    }
  }, [orgId]);

  const aplicarCatalogoSugerido = useCallback(async () => {
    try {
      setMigrandoCatalogoSugerido(true);
      const cid = await getCompanyId();
      if (!cid) {
        toast.error('No hay empresa activa.');
        return;
      }
      const superA = isSuperAdminEmail(currentUser?.email);
      const res = await migrateOrgCatalogDefaults(superA ? cid : undefined);
      const creadas = res?.categoriasCreadas ?? 0;
      const prov = res?.proveedorCreado ? 'Se creó Proveedor general.' : 'El proveedor general ya existía.';
      const emp = (res?.empresaCamposAplicados || []).length
        ? `Configuración de listas: ${(res.empresaCamposAplicados || []).join(', ')}.`
        : 'Datos de empresa de listas ya estaban definidos.';
      toast.success(`Catálogo sugerido aplicado. +${creadas} categorías nuevas. ${prov} ${emp}`);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'No se pudo aplicar el catálogo sugerido.');
    } finally {
      setMigrandoCatalogoSugerido(false);
    }
  }, [getCompanyId, currentUser?.email]);

  // =================== MÓDULOS ===================
  const [showModulos, setShowModulos] = useState(false);
  const [savingModulos, setSavingModulos] = useState(false);
  const [modulos, setModulos] = useState(() => ({ ...buildModulosDefaultIntermediate() }));

  const cargarModulos = useCallback(async ()=>{
    try{
      const cid = await getCompanyId();
      if(!cid) return;
      const refCompany = doc(db, `companies/${cid}/config/modules`);
      const snapCompany = await getDoc(refCompany);
      let data = snapCompany.exists() ? snapCompany.data() : null;
      if(!data){
        const refTenant = doc(db, `tenants/${cid}/config/modules`);
        const snapTenant = await getDoc(refTenant);
        if (snapTenant.exists()) data = snapTenant.data();
      }
      setModulos({ ...buildModulosDefaultIntermediate(), ...(data || {}) });
    }catch(e){ console.warn('No se pudieron cargar módulos:', e.message); }
  },[getCompanyId]);

  const guardarModulos = async ()=>{
    try{
      const cid = await getCompanyId();
      if(!cid) { toast.error('OrgId no disponible'); return; }
      setSavingModulos(true);
      const payload = { ...modulos, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, `companies/${cid}/config/modules`), payload, { merge: true });
      await setDoc(doc(db, `tenants/${cid}/config/modules`), payload, { merge: true });
      toast.success('Módulos guardados');
      setShowModulos(false);
      await syncEffectivePermissions();
    }catch(e){ console.error('Error guardando módulos:', e); toast.error('No se pudieron guardar los módulos'); }
    finally{ setSavingModulos(false); }
  };

  // =================== LICENCIA ===================
  const [showLic, setShowLic] = useState(false);
  const [savingLic, setSavingLic] = useState(false);
  const [lic, setLic] = useState({ paidUntil: '', blocked: false, reason: '', plan: 'basic', pagoBilleteraUrl: '' });
  const [licDaysLeft, setLicDaysLeft] = useState(null);
  const [billingMp, setBillingMp] = useState(null);
  const [billingMpLoading, setBillingMpLoading] = useState(false);

  useEffect(() => {
    if (!showLic) return;
    let cancelled = false;
    (async () => {
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
  }, [showLic]);

  const abrirPagoMercadoPagoMes = async () => {
    const plan = getPreferredCheckoutPlan(lic);
    const precio = getNextBillingAmountARS(lic, billingMp);
    if (!billingMp?.mercadoPagoTokenPresent || precio <= 0) {
      toast.warning('El cobro con Mercado Pago no está disponible o falta configurar el monto.');
      return;
    }
    setBillingMpLoading(true);
    try {
      const { data, status } = await createLicenseMercadoPagoPreference({
        plan
      });
      const url = getMercadoPagoCheckoutUrl(data);
      if (status === 200 && data?.success && url) {
        toast.info(
          'Te llevamos a Mercado Pago en esta misma ventana. Con tarjeta: elegí cuotas y completá titular y DNI. Al volver, la vigencia se actualiza sola.',
          { autoClose: 7000 }
        );
        goToMercadoPagoCheckout(url);
      } else {
        toast.error(data?.message || data?.detail?.message || 'No se pudo iniciar el pago');
      }
    } catch (e) {
      toast.error(e?.message || 'Error al conectar con el servidor de pagos');
    } finally {
      setBillingMpLoading(false);
    }
  };

  const cargarLicencia = useCallback(async ()=>{
    try{
      const cid = await getCompanyId();
      if(!cid) return;
      const ref = doc(db, `companies/${cid}/config/license`);
      const snap = await getDoc(ref);
      let data = snap.exists()? snap.data(): null;
      if(!data){
        const ref2 = doc(db, `licenses/${cid}`);
        const s2 = await getDoc(ref2);
        if(s2.exists()) data = s2.data();
      }
      const merged = {
        paidUntil: '',
        blocked: false,
        reason: '',
        plan: 'basic',
        chosenPlan: 'basic',
        pagoBilleteraUrl: '',
        ...(data || {})
      };
      merged.plan = normalizeLicensePlan(merged.plan);
      merged.chosenPlan = normalizeLicensePlan(merged.chosenPlan || merged.plan);
      setLic(merged);
      // calcular días restantes
      if (merged.paidUntil) {
        const diff = Math.ceil((new Date(merged.paidUntil).getTime() - Date.now())/(1000*60*60*24));
        setLicDaysLeft(diff);
      } else { setLicDaysLeft(null); }
    }catch(e){ console.warn('No se pudo cargar licencia:', e.message); }
  },[getCompanyId]);

  useEffect(() => {
    const q = new URLSearchParams(location.search || '');
    if (q.get('licencia') !== '1') return;
    setShowLic(true);
    navigate({ pathname: location.pathname, search: '' }, { replace: true });
  }, [location.search, location.pathname, navigate]);

  const guardarLicencia = async ()=>{
    try{
      if (!isSuperAdminEmail(currentUser?.email)) {
        toast.error('No tenés permiso para guardar estos datos. La vigencia se actualiza al completar el pago en Mercado Pago.');
        return;
      }
      const cid = await getCompanyId();
      if(!cid) { toast.error('OrgId no disponible'); return; }
      setSavingLic(true);
      const payload = { ...lic, plan: normalizeLicensePlan(lic.plan), updatedAt: new Date().toISOString() };
      await setDoc(doc(db, `licenses/${cid}`), payload, { merge: true });
      await setDoc(doc(db, `companies/${cid}/config/license`), payload, { merge: true });
      toast.success('Licencia actualizada');
      setShowLic(false);
      await cargarLicencia();
    }catch(e){ console.error('Error guardando licencia:', e); toast.error('No se pudo guardar la licencia'); }
    finally{ setSavingLic(false); }
  };

  // =================== FORM EMPRESA ===================
  const [formData, setFormData] = useState({
    razon_social: '',
    nombre_fantasia: '',
    slogan: '',
    cuit: '',
    condicion_iva: 'Responsable Inscripto',
    ingresos_brutos: '',
    punto_venta: '',
    direccion_calle: '',
    direccion_localidad: '',
    direccion_provincia: '',
    direccion_codigo_postal: '',
    direccion_pais: '',
    telefono_principal: '',
    telefono_secundario: '',
    email: '',
    website: '',
    numeracion_inicial: 1,
    serie_actual: 'A',
    formato_predeterminado: 'termico',
    imprimir_ticket_automaticamente: false,
    mostrar_logo: true,
    tamaño_logo: 'mediano',
    posicion_logo: 'centro',
    caja_modulos: {
      clientes: true,
      alerta_deudas: true,
      pago_deudas: true,
      ver_comprobante_deuda: true
    },
    caja_apk_url: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaSlug, setEmpresaSlug] = useState('');
  const [codigoAdministrador, setCodigoAdministrador] = useState('');
  const [empresaChosenPlan, setEmpresaChosenPlan] = useState(
    () => storageSafeGet(window.sessionStorage, 'pendingChosenPlan', 'basic') || 'basic'
  );
  const [joinCode, setJoinCode] = useState('');
  const [creandoOrg, setCreandoOrg] = useState(false);
  const [uniendoOrg, setUniendoOrg] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardModalOpen, setWizardModalOpen] = useState(false);

  // ========= REGISTRO + CREACIÓN UNIFICADO =========
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regEmpresa, setRegEmpresa] = useState('');
  const [regChosenPlan, setRegChosenPlan] = useState('basic');
  const [creandoCuentaEmpresa, setCreandoCuentaEmpresa] = useState(false);

  const handleRegistroYCreacion = async (e) => {
    e?.preventDefault?.();
    try {
      if (!regEmail || !regPass || !regPass2 || !regEmpresa) {
        toast.error('Completa email, contraseña y nombre de empresa');
        return;
      }
      if (regPass !== regPass2) { toast.error('Las contraseñas no coinciden'); return; }
      setCreandoCuentaEmpresa(true);
      // 1) Crear usuario
      const cred = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPass);
      await sendEmailVerification(cred.user, getEmailActionCodeSettings());
      const empresaTrim = regEmpresa.trim();
      storageSafeSet(window.sessionStorage, 'pendingEmpresaNombre', empresaTrim);
      storageSafeSet(window.sessionStorage, 'pendingChosenPlan', regChosenPlan);
      toast.success(
        'Correo enviado: revisá tu bandeja para «Verificación de correo electrónico», tocá el enlace y si no ves el mensaje, revisá spam. Volvé a la pantalla «Verificá tu correo» del sistema para crear la empresa.',
        { autoClose: 7000 }
      );
      navigate('/verificar-email', { replace: true, state: { empresaNombre: empresaTrim } });
    } catch (err) {
      console.error('Error en registro+creación:', err);
      toast.error(err.message || 'No se pudo crear la cuenta/empresa');
    } finally {
      setCreandoCuentaEmpresa(false);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
    cargarModulos();
    cargarLicencia();
  }, [cargarModulos, cargarLicencia]);

  const postOnboardingRedirect = async () => {
    try { await new Promise(r => setTimeout(r, 600)); navigate('/', { replace: true }); } catch { navigate('/', { replace: true }); }
  };

  const handleCrearEmpresa = async (e) => {
    e?.preventDefault?.();
    if (!empresaNombre.trim()) { toast.error('Nombre de empresa requerido'); return; }
    if (!codigoAdministrador.trim()) {
      toast.error('Ingresá el código de habilitación que tu administrador generó para tu correo.');
      return;
    }
    try {
      const { emailVerified } = await refreshAuthSession();
      if (!emailVerified) {
        toast.error(
          'Tenés que verificar tu correo antes de crear la empresa. Revisá el mail o usá el botón Ya verifiqué en la pantalla Verificá tu correo.'
        );
        navigate('/verificar-email', { replace: false, state: { empresaNombre: empresaNombre.trim() } });
        return;
      }
      setCreandoOrg(true);
      const selectedPlan =
        empresaChosenPlan || storageSafeGet(window.sessionStorage, 'pendingChosenPlan', 'basic') || 'basic';
      const res = await createTenant(empresaNombre.trim(), empresaSlug.trim() || null, codigoAdministrador.trim(), selectedPlan);
      if (!res?.success || !res.orgId) {
        throw new Error(res?.message || 'No se pudo crear la empresa');
      }
      await setActiveTenant(res.orgId);
      toast.success('Empresa creada y activada');
      await postOnboardingRedirect();
    } catch (err) {
      console.error('Error creando empresa:', err);
      const c = err?.code || '';
      let m = err?.message || 'Error creando empresa';
      if (c === 'functions/permission-denied') {
        m = err.message?.includes?.('correo') ? err.message : 'Código de habilitación incorrecto o no válido.';
      }
      toast.error(m);
    } finally { setCreandoOrg(false); }
  };

  const handleUnirme = async (e) => {
    e?.preventDefault?.();
    if (!joinCode.trim()) { toast.error('Código de empresa requerido'); return; }
    try {
      setUniendoOrg(true);
      const res = await joinTenant(joinCode.trim());
      await setActiveTenant(res.orgId);
      toast.success('Unido a empresa');
      await postOnboardingRedirect();
    } catch (err) {
      console.error('Error uniéndose a empresa:', err);
      toast.error(err.message || 'Error al unirse');
    } finally { setUniendoOrg(false); }
  };

  const cargarConfiguracion = async () => {
    try { setLoading(true); const config = await configuracionService.obtener(); if (config) { setFormData(config); setLogoUrl(config.logo_url || ''); } }
    catch (error) { console.error('Error al cargar configuración:', error); toast.error('Error al cargar la configuración'); }
    finally { setLoading(false); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCajaModuloChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      caja_modulos: {
        ...(prev.caja_modulos || {}),
        [name]: checked
      }
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/svg+xml'];
      if (!tiposPermitidos.includes(file.type)) { toast.error('Solo se permiten archivos JPG, PNG o SVG'); return; }
      if (file.size > 2 * 1024 * 1024) { toast.error('El archivo debe ser menor a 2MB'); return; }
      setLogoFile(file);
      const reader = new FileReader(); reader.onload = (ev) => { setLogoPreview(ev.target.result); }; reader.readAsDataURL(file);
    }
  };

  const eliminarLogo = () => { setLogoFile(null); setLogoPreview(null); const el = document.getElementById('logo-upload'); if (el) el.value = ''; };

  const subirLogo = async () => {
    if (!logoFile) return logoUrl;
    try { setSubiendoLogo(true); const url = await configuracionService.subirLogo(logoFile); toast.success('Logo subido correctamente'); return url; }
    catch (error) { console.error('Error al subir logo:', error); toast.error('Error al subir el logo'); return logoUrl; }
    finally { setSubiendoLogo(false); }
  };

  const validarFormulario = () => {
    const camposRequeridos = ['razon_social','cuit','direccion_calle','direccion_localidad','telefono_principal','email'];
    for (const campo of camposRequeridos) { if (!formData[campo] || formData[campo].trim() === '') { toast.error(`El campo ${campo.replace('_', ' ')} es requerido`); return false; } }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!emailRegex.test(formData.email)) { toast.error('El formato del email no es válido'); return false; }
    return true;
  };

  const handleGuardar = async () => {
    if (!validarFormulario()) return;
    try {
      setGuardando(true);
      const logoUrlFinal = await subirLogo();
      const datosCompletos = { ...formData, logo_url: logoUrlFinal, fecha_actualizacion: new Date().toISOString() };
      try { const configExistente = await configuracionService.obtener(); if (configExistente && configExistente.razon_social) { await configuracionService.actualizar(datosCompletos); } else { await configuracionService.guardar(datosCompletos); } }
      catch { await configuracionService.guardar(datosCompletos); }
      toast.success('Configuración guardada correctamente'); setLogoUrl(logoUrlFinal); setLogoFile(null); setLogoPreview(null);
      setWizardModalOpen(false);
      setWizardMode(false);
      navigate('/', { replace: true });
    } catch (error) { console.error('Error al guardar configuración:', error); toast.error('Error al guardar la configuración'); }
    finally { setGuardando(false); }
  };

  const warnBanner = licDaysLeft !== null && licDaysLeft <= 7 && licDaysLeft >= 0;
  const isFirstSetup =
    !formData.razon_social?.trim() &&
    !formData.cuit?.trim() &&
    !formData.direccion_calle?.trim() &&
    !formData.telefono_principal?.trim() &&
    !formData.email?.trim();
  const showWizard = !!orgId && wizardMode;
  const showWizardAsModal = showWizard && wizardModalOpen;
  const wizardSteps = [
    { title: 'Identidad de la empresa', hint: 'Cómo se va a ver tu negocio en comprobantes.' },
    { title: 'Datos fiscales', hint: 'Datos legales/fiscales para facturación.' },
    { title: 'Dirección y contacto', hint: 'Datos obligatorios para completar la configuración.' },
    { title: 'Facturación y logo', hint: 'Ajustes finales antes de guardar.' }
  ];

  const validateWizardStep = () => {
    if (wizardStep === 0) {
      if (!formData.razon_social?.trim()) { toast.error('Completá la razón social para continuar'); return false; }
      if (!formData.nombre_fantasia?.trim()) { toast.error('Completá el nombre de fantasía para continuar'); return false; }
      return true;
    }
    if (wizardStep === 1) {
      if (!formData.cuit?.trim()) { toast.error('Completá el CUIT/CUIL para continuar'); return false; }
      return true;
    }
    if (wizardStep === 2) {
      if (!formData.direccion_calle?.trim()) { toast.error('Completá la dirección para continuar'); return false; }
      if (!formData.direccion_localidad?.trim()) { toast.error('Completá la localidad para continuar'); return false; }
      if (!formData.telefono_principal?.trim()) { toast.error('Completá el teléfono principal para continuar'); return false; }
      if (!formData.email?.trim()) { toast.error('Completá el email para continuar'); return false; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) { toast.error('El formato del email no es válido'); return false; }
      return true;
    }
    return true;
  };

  const nextWizardStep = () => {
    if (!validateWizardStep()) return;
    setWizardStep(prev => Math.min(prev + 1, wizardSteps.length - 1));
  };

  const wizardProgress = Math.round(((wizardStep + 1) / wizardSteps.length) * 100);

  useEffect(() => {
    if (!loading && orgId && isFirstSetup) {
      setWizardMode(true);
      setWizardStep(0);
      if (
        pendingWizardFromVerify ||
        storageSafeGet(window.sessionStorage, 'postVerifyGoConfig', '') === '1'
      ) {
        setWizardModalOpen(true);
        storageSafeRemove(window.sessionStorage, 'postVerifyGoConfig');
        navigate(location.pathname, { replace: true, state: null });
        if (onboardingSource === 'demo') {
          toast.info('Bienvenido a la demo. Te guiamos paso a paso para dejar tu empresa lista en minutos.', {
            autoClose: 5500
          });
        }
      }
    }
  }, [
    loading,
    orgId,
    isFirstSetup,
    pendingWizardFromVerify,
    navigate,
    location.pathname,
    onboardingSource
  ]);

  if (loading) {
    return (<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>);
  }

  return (
    <div className="space-y-6">
      {!auth.currentUser && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Crear cuenta y empresa</h3>
          <p className="mb-4 text-sm text-gray-600">
            Alta con kit inicial: dos pagos de <strong>$250.000</strong> con sistema completo. Desde el tercer mes se cobra
            el abono que elijas.
          </p>
          <form onSubmit={handleRegistroYCreacion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input" type="email" placeholder="tu@correo.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)} />
            <input className="input" type="text" placeholder="Nombre de empresa (Ej: Mi kiosco SRL)" value={regEmpresa} onChange={e=>setRegEmpresa(e.target.value)} />
            <PasswordInput className="input" name="regPass" placeholder="Contraseña" value={regPass} onChange={(e) => setRegPass(e.target.value)} autoComplete="new-password" />
            <PasswordInput className="input" name="regPass2" placeholder="Confirmar contraseña" value={regPass2} onChange={(e) => setRegPass2(e.target.value)} autoComplete="new-password" />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Abono desde el tercer mes</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PLAN_IDS.map((id) => (
                  <label
                    key={id}
                    className={`rounded-lg border p-3 text-sm cursor-pointer ${regChosenPlan === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                  >
                    <input
                      type="radio"
                      name="regChosenPlan"
                      value={id}
                      checked={regChosenPlan === id}
                      onChange={(e) => setRegChosenPlan(e.target.value)}
                      className="mr-2"
                    />
                    <strong>{PLAN_LABELS_ES[id]}</strong>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={creandoCuentaEmpresa}>{creandoCuentaEmpresa ? 'Creando...' : 'Crear cuenta y empresa'}</Button>
            </div>
          </form>
        </Card>
      )}

      {!orgId && auth.currentUser && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar empresa</h3>
          <p className="text-sm text-gray-600 mb-4">
            Acá vas a crear el espacio de trabajo (<strong>organización</strong>) y, más abajo, los datos que salen en facturas y comprobantes.
            Los cuadros de texto vacíos muestran <strong>ejemplos en gris</strong>: escribí tus datos reales encima de esa referencia.
          </p>
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50/90 p-4">
            <h4 className="text-sm font-semibold text-indigo-900 mb-3">Guía rápida (paso a paso)</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800">
              <li>
                <span className="font-medium text-gray-900">Creá tu organización</span>{' '}
                o unite con un código si tu administrador ya te lo pasó. El nombre suele coincidir con la razón social o el nombre comercial del negocio.
              </li>
              <li>
                <span className="font-medium text-gray-900">Completá la sección Información básica</span>{' '}
                más abajo: razón social (legal), nombre de fantasía y, si querés, un slogan opcional para tickets y documentos.
              </li>
              <li>
                <span className="font-medium text-gray-900">Datos fiscales</span>: CUIT/CUIL tal como figurará en AFIP; condición IVA; punto de venta habitual (muchas PYME empiezan en 0001); ingresos brutos provincial si corresponde.
              </li>
              <li>
                <span className="font-medium text-gray-900">Dirección y contacto</span>: igual que aparece en comprobantes. Email y teléfono también son obligatorios para guardar.
              </li>
              <li>
                <span className="font-medium text-gray-900">Logo</span>{' '}
                (opcional): subí después una imagen clara para que imprima bien en térmico o A4.
              </li>
              <li>
                <span className="font-medium text-gray-900">Facturas</span>{' '}
                podés revisar número inicial de comprobantes, formato de impresión (térmico o A4) y si querés disparar impresión al cerrar la venta.
              </li>
              <li>
                Al terminar tocá{' '}
                <span className="font-semibold text-indigo-800">Guardar configuración</span>{' '}
                al pie de la página. Si algo falta o el formato del correo es inválido, el sistema te avisará.
              </li>
            </ol>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 pt-6">
            <form onSubmit={handleCrearEmpresa} className="space-y-3">
              <h4 className="font-semibold text-gray-900">Crear nueva empresa</h4>
              <p className="text-xs text-gray-500">Ej.: el nombre público del comercio; podés igualarlo a la razón social del bloque siguiente.</p>
              <input
                className="input"
                placeholder="Ej: Distribuidora Los Alamos SA"
                value={empresaNombre}
                onChange={e=>setEmpresaNombre(e.target.value)}
              />
              <input
                className="input"
                placeholder="Slug corto opcional para URL personalizada"
                value={empresaSlug}
                onChange={e=>setEmpresaSlug(e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                  Abono desde el tercer mes
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {PLAN_IDS.map((id) => (
                    <label
                      key={id}
                      className={`rounded-lg border p-3 text-sm cursor-pointer ${empresaChosenPlan === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                    >
                      <input
                        type="radio"
                        name="empresaChosenPlan"
                        value={id}
                        checked={empresaChosenPlan === id}
                        onChange={(e) => {
                          setEmpresaChosenPlan(e.target.value);
                          storageSafeSet(window.sessionStorage, 'pendingChosenPlan', e.target.value);
                        }}
                        className="mr-2"
                      />
                      <strong>{PLAN_LABELS_ES[id]}</strong>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Primero se cobran 2 cuotas de kit de $250.000; después este abono.
                </p>
              </div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Código de habilitación (tu correo)</label>
              <input
                type="password"
                autoComplete="off"
                className="input"
                placeholder="Te lo pasan desde el panel admin, vinculado a este correo."
                value={codigoAdministrador}
                onChange={e => setCodigoAdministrador(e.target.value)}
              />
              <Button type="submit" disabled={creandoOrg}>{creandoOrg ? 'Creando...' : 'Crear'}</Button>
            </form>
            <form onSubmit={handleUnirme} className="space-y-3">
              <h4 className="font-semibold text-gray-900">Unirme con código (orgId)</h4>
              <p className="text-xs text-gray-500">Si ya existe una empresa, pegá aquí el identificador o código que te compartieron.</p>
              <input
                className="input"
                placeholder="Ej: abc123XYZ (orgId)"
                value={joinCode}
                onChange={e=>setJoinCode(e.target.value)}
              />
              <Button type="submit" disabled={uniendoOrg}>{uniendoOrg ? 'Uniéndose...' : 'Unirme'}</Button>
            </form>
          </div>
        </Card>
      )}

      {warnBanner && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-yellow-800">Tu licencia vence en {licDaysLeft} días. Renueva para evitar bloqueos.</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <FaBuilding className="mr-3 text-indigo-600" />
          Configuración Empresarial
        </h1>
        <div className="flex gap-2">
          <Button color="secondary" icon={<FaArrowLeft />} onClick={handleVolver}>
            Volver
          </Button>
          {!!orgId && !showWizard && (
            <Button
              color="secondary"
              onClick={() => {
                setWizardStep(0);
                setWizardModalOpen(false);
                setWizardMode(true);
              }}
            >
              Abrir asistente
            </Button>
          )}
          { isSuperAdminEmail(currentUser?.email) && (
            <>
              <Button color="secondary" onClick={()=>{ cargarLicencia(); setShowLic(true); }}>Licencia</Button>
              <Button color="primary" icon={<FaCogs/>} onClick={()=>{ cargarModulos(); setShowModulos(true); }}>Gestionar Módulos</Button>
            </>
          )}
        </div>
      </div>

      {showWizard && (
        <div className={showWizardAsModal ? 'fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3' : ''}>
          <div className={showWizardAsModal ? 'w-full max-w-4xl max-h-[92vh] overflow-y-auto' : ''}>
            <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold tracking-wide uppercase ${showWizardAsModal ? 'text-fuchsia-600' : 'text-indigo-600'}`}>
                  {showWizardAsModal ? 'Setup guiado NexoPOS' : 'Asistente interactivo'}
                </p>
                <h3 className="text-lg font-semibold text-gray-900">
                  Paso {wizardStep + 1} de {wizardSteps.length}: {wizardSteps[wizardStep].title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{wizardSteps[wizardStep].hint}</p>
              </div>
              <button
                type="button"
                className={`text-xs ${showWizardAsModal ? 'text-slate-500 hover:text-slate-700' : 'text-indigo-600 hover:text-indigo-800'}`}
                onClick={() => {
                  if (showWizardAsModal) {
                    setWizardModalOpen(false);
                  }
                  setWizardMode(false);
                }}
              >
                {showWizardAsModal ? 'Completar después' : 'Prefiero formulario completo'}
              </button>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-2 transition-all duration-300 ${showWizardAsModal ? 'bg-fuchsia-600' : 'bg-indigo-600'}`}
                style={{ width: `${wizardProgress}%` }}
              />
            </div>

            {wizardStep === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón social *</label>
                  <input
                    type="text"
                    name="razon_social"
                    value={formData.razon_social}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Nombre legal registrado ante AFIP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de fantasía *</label>
                  <input
                    type="text"
                    name="nombre_fantasia"
                    value={formData.nombre_fantasia}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Almacén del Centro"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slogan (opcional)</label>
                  <textarea
                    name="slogan"
                    value={formData.slogan}
                    onChange={handleInputChange}
                    rows={2}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Calidad y precio desde 1998"
                  />
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT/CUIL *</label>
                  <input
                    type="text"
                    name="cuit"
                    value={formData.cuit}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="20-12345678-9"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condición IVA</label>
                  <select
                    name="condicion_iva"
                    value={formData.condicion_iva}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributo">Monotributo</option>
                    <option value="Exento">Exento</option>
                    <option value="Consumidor Final">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ingresos Brutos</label>
                  <input
                    type="text"
                    name="ingresos_brutos"
                    value={formData.ingresos_brutos}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Número o exención provincial (si aplica)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punto de venta</label>
                  <input
                    type="text"
                    name="punto_venta"
                    value={formData.punto_venta}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="0001"
                  />
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calle y número *</label>
                  <input
                    type="text"
                    name="direccion_calle"
                    value={formData.direccion_calle}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Av. Principal 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localidad *</label>
                  <input
                    type="text"
                    name="direccion_localidad"
                    value={formData.direccion_localidad}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Rosario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provincia/Estado</label>
                  <input
                    type="text"
                    name="direccion_provincia"
                    value={formData.direccion_provincia}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Santa Fe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono principal *</label>
                  <input
                    type="tel"
                    name="telefono_principal"
                    value={formData.telefono_principal}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="+54 376 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato predeterminado</label>
                  <select
                    name="formato_predeterminado"
                    value={formData.formato_predeterminado}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                  >
                    <option value="termico">Térmico (80mm)</option>
                    <option value="a4">A4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serie</label>
                  <select
                    name="serie_actual"
                    value={formData.serie_actual}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="X">X</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numeración inicial</label>
                  <input
                    type="number"
                    min="1"
                    name="numeracion_inicial"
                    value={formData.numeracion_inicial}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                  />
                </div>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 mt-6">
                  <input
                    type="checkbox"
                    name="imprimir_ticket_automaticamente"
                    checked={formData.imprimir_ticket_automaticamente}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <label className="ml-2 text-sm text-gray-800">Imprimir automáticamente al cerrar venta</label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo (opcional)</label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml"
                    onChange={handleLogoChange}
                    className="nexo-field text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG o SVG de hasta 2MB.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setWizardStep(prev => Math.max(prev - 1, 0))}
                disabled={wizardStep === 0}
              >
                Anterior
              </button>
              {wizardStep < wizardSteps.length - 1 ? (
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  onClick={nextWizardStep}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  onClick={handleGuardar}
                  disabled={guardando || subiendoLogo}
                >
                  {guardando || subiendoLogo ? 'Guardando...' : 'Finalizar y guardar'}
                </button>
              )}
            </div>
          </div>
            </Card>
          </div>
        </div>
      )}

      {!showWizard && (
      <div className="max-h-[78vh] overflow-y-auto pr-2">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="ml-3 space-y-1">
            <p className="text-sm text-blue-700">
              <strong>Configuración única:</strong> estos datos aparecerán en todas las facturas y comprobantes y podés cambiarlos cuando quieras.
            </p>
            {!orgId && auth.currentUser && (
              <p className="text-xs text-blue-800/90">
                Si todavía no tenés empresa en el sistema, primero usá la tarjeta de arriba; después completá cada bloque y guardá una sola vez o por partes antes de usar el punto de venta.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Información básica y fiscal */}
        <div className="space-y-6">
          {/* Información Básica */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaBuilding className="mr-2 text-indigo-600" />
              Información Básica
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social *
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="Nombre legal registrado ante AFIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de fantasía *
                </label>
                <p className="text-xs text-gray-500 mb-1">Cómo se ve el negocio al público en tickets y documentos (puede diferir de la razón legal).</p>
                <input
                  type="text"
                  name="nombre_fantasia"
                  value={formData.nombre_fantasia}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="Ej: Almacén del Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slogan
                </label>
                <p className="text-xs text-gray-500 mb-1">Frase opcional debajo del nombre en comprobantes (podés dejarlo vacío).</p>
                <textarea
                  name="slogan"
                  value={formData.slogan}
                  onChange={handleInputChange}
                  rows={2}
                  className="nexo-field sm:text-sm"
                  placeholder="Ej: Calidad y precio desde 1998"
                />
              </div>
            </div>
          </Card>

          {/* Datos Fiscales */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaFileInvoice className="mr-2 text-indigo-600" />
              Datos Fiscales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT/CUIL *
                </label>
                <input
                  type="text"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="20-12345678-9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición IVA
                </label>
                <select
                  name="condicion_iva"
                  value={formData.condicion_iva}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                >
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributo">Monotributo</option>
                  <option value="Exento">Exento</option>
                  <option value="Consumidor Final">Consumidor Final</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingresos Brutos
                </label>
                <input
                  type="text"
                  name="ingresos_brutos"
                  value={formData.ingresos_brutos}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="Número o exención provincial (si aplica)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Punto de venta
                </label>
                <input
                  type="text"
                  name="punto_venta"
                  value={formData.punto_venta}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="0001"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Panel derecho: Logo, dirección y contacto */}
        <div className="space-y-6">
          {/* Logo */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaImage className="mr-2 text-indigo-600" />
              Logo de la Empresa
            </h3>
            
            <div className="space-y-4">
              {/* Preview del logo */}
              {(logoPreview || logoUrl) && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={logoPreview || logoUrl}
                      alt="Logo preview"
                      className="h-24 w-24 rounded-xl border-2 border-slate-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={eliminarLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subir Logo
                </label>
                <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 pb-6 pt-5">
                  <div className="space-y-1 text-center">
                    <FaUpload className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                      <label className="relative cursor-pointer rounded-lg bg-white font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                        <span>Subir archivo</span>
                        <input
                          id="logo-upload"
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/png,image/svg+xml"
                          onChange={handleLogoChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, SVG hasta 2MB</p>
                  </div>
                </div>
              </div>

              {/* Configuración del logo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño
                  </label>
                  <select
                    name="tamaño_logo"
                    value={formData.tamaño_logo}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                  >
                    <option value="pequeño">Pequeño</option>
                    <option value="mediano">Mediano</option>
                    <option value="grande">Grande</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición
                  </label>
                  <select
                    name="posicion_logo"
                    value={formData.posicion_logo}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                  >
                    <option value="izquierda">Izquierda</option>
                    <option value="centro">Centro</option>
                    <option value="derecha">Derecha</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="mostrar_logo"
                  checked={formData.mostrar_logo}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Mostrar logo en las facturas
                </label>
              </div>
            </div>
          </Card>

          {/* Dirección */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaMapMarkerAlt className="mr-2 text-indigo-600" />
              Dirección
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calle y Número *
                </label>
                <input
                  type="text"
                  name="direccion_calle"
                  value={formData.direccion_calle}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="Av. Principal 123"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localidad *
                  </label>
                  <input
                    type="text"
                    name="direccion_localidad"
                    value={formData.direccion_localidad}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Rosario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia/Estado
                  </label>
                  <input
                    type="text"
                    name="direccion_provincia"
                    value={formData.direccion_provincia}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Santa Fe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    name="direccion_codigo_postal"
                    value={formData.direccion_codigo_postal}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: S2000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    name="direccion_pais"
                    value={formData.direccion_pais}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="Ej: Argentina"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Contacto */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaPhone className="mr-2 text-indigo-600" />
              Información de Contacto
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Principal *
                  </label>
                  <input
                    type="tel"
                    name="telefono_principal"
                    value={formData.telefono_principal}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="+54 376 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Secundario
                  </label>
                  <input
                    type="tel"
                    name="telefono_secundario"
                    value={formData.telefono_secundario}
                    onChange={handleInputChange}
                    className="nexo-field sm:text-sm"
                    placeholder="WhatsApp u otro teléfono (opcional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sitio Web
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="nexo-field sm:text-sm"
                  placeholder="www.empresa.com"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <FaDatabase className="mr-2 text-indigo-600" />
          Catálogo y listas (empresas anteriores)
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Si tu empresa se creó antes de las mejoras por defecto, podés crear de un solo uso lo que falte: categorías
          Bebidas, Comestibles, Limpieza, Accesorios y Otros; el proveedor <strong>Proveedor general</strong>; y en
          datos de empresa las etiquetas <strong>Lista 1 / 2 / 3</strong> y la lista por defecto del punto de venta. No se
          borra nada ni se duplica: solo se agrega lo ausente.
        </p>
        <Button
          type="button"
          color="secondary"
          onClick={aplicarCatalogoSugerido}
          disabled={migrandoCatalogoSugerido}
          icon={migrandoCatalogoSugerido ? undefined : <FaCogs />}
        >
          {migrandoCatalogoSugerido ? 'Aplicando…' : 'Aplicar catálogo sugerido'}
        </Button>
      </Card>

      {/* Configuración de Facturas */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FaCog className="mr-2 text-indigo-600" />
          Configuración de Facturas
        </h3>
        
        <p className="mb-4 text-xs text-gray-600">
          Valores de referencia típicos: primer comprobante en <strong>1</strong>, punto de venta fiscal <strong>0001</strong> (completarlo arriba en Datos fiscales) y formato <strong>térmico</strong> si usás rollo de 80&nbsp;mm.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numeración Inicial
            </label>
            <input
              type="number"
              name="numeracion_inicial"
              value={formData.numeracion_inicial}
              onChange={handleInputChange}
              min="1"
              className="nexo-field sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serie Actual
            </label>
            <select
              name="serie_actual"
              value={formData.serie_actual}
              onChange={handleInputChange}
              className="nexo-field sm:text-sm"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="X">X</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formato Predeterminado
            </label>
            <select
              name="formato_predeterminado"
              value={formData.formato_predeterminado}
              onChange={handleInputChange}
              className="nexo-field sm:text-sm"
            >
              <option value="termico">Térmico (80mm)</option>
              <option value="a4">A4</option>
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="flex items-start gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="imprimir_ticket_automaticamente"
                checked={formData.imprimir_ticket_automaticamente}
                onChange={handleInputChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
              />
              <span>
                Imprimir automáticamente al cerrar venta
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  Si está desactivado, el cajero verá una pregunta antes de imprimir.
                </span>
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Configuración de Caja */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FaCog className="mr-2 text-indigo-600" />
          App de Caja
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Definí qué funciones adicionales aparecen en el mostrador. Si todo queda activo, la caja muestra cliente,
          aviso de deudas y acciones para comprobantes pendientes.
        </p>
        <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <label htmlFor="caja_apk_url" className="block text-sm font-medium text-gray-800">
            Enlace de descarga del APK (Android)
          </label>
          <p className="mt-1 mb-2 text-xs text-gray-600">
            Subí el archivo <code className="rounded bg-white px-1">app-release.apk</code> a Firebase Storage, Drive con enlace
            directo, tu servidor u otro hosting HTTPS y pegá aquí la URL. Esa dirección se usará en la pantalla de inicio de sesión
            para que los cajeros instalen la app. Si dejás el campo vacío, podés usar la variable de entorno{' '}
            <code className="rounded bg-white px-1">REACT_APP_CAJA_APK_URL</code> al compilar el panel web.
          </p>
          <input
            id="caja_apk_url"
            name="caja_apk_url"
            type="url"
            autoComplete="off"
            placeholder="https://…"
            value={formData.caja_apk_url || ''}
            onChange={handleInputChange}
            className="nexo-field mt-1"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['clientes', 'Seleccionar cliente', 'Permite cambiar Consumidor final por un cliente registrado.'],
            ['alerta_deudas', 'Avisar deuda del cliente', 'Muestra un aviso discreto y una ventana con comprobantes pendientes.'],
            ['pago_deudas', 'Pagar deuda desde caja', 'Permite registrar pagos sobre comprobantes adeudados.'],
            ['ver_comprobante_deuda', 'Ver comprobante adeudado', 'Permite consultar el detalle básico antes de continuar.']
          ].map(([key, label, description]) => (
            <label key={key} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={formData.caja_modulos?.[key] !== false}
                onChange={(event) => handleCajaModuloChange(key, event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
              />
              <span>
                <span className="font-semibold text-gray-800">{label}</span>
                <span className="mt-1 block text-xs text-gray-500">{description}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Card de Módulos del Sistema (solo super admin) */}
      {isSuperAdminEmail(currentUser?.email) && (
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <FaCogs className="mr-2 text-indigo-600" />
              Módulos del Sistema
            </h3>
            <p className="text-sm text-gray-600">
              Activa o desactiva funcionalidades según las necesidades de tu empresa
            </p>
          </div>
          <Button
            color="primary"
            onClick={()=>{ cargarModulos(); setShowModulos(true); }}
            icon={<FaCogs />}
          >
            Gestionar Módulos
          </Button>
        </div>
      </Card>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleVolver}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:ring-offset-2"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando || subiendoLogo}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {guardando || subiendoLogo ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {subiendoLogo ? 'Subiendo logo...' : 'Guardando...'}
            </>
          ) : (
            <>
              <FaSave className="mr-2" />
              Guardar Configuración
            </>
          )}
        </button>
      </div>
      </div>
      )}

      {/* Modal Gestión de Módulos */}
      <Modal open={showModulos} title="Gestionar Módulos" onClose={()=> setShowModulos(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULE_KEYS.map(key=> (
            <label key={key} className="flex items-center gap-2 p-2 rounded border">
              <input type="checkbox" checked={!!modulos[key]} onChange={e=> setModulos(prev=> ({ ...prev, [key]: e.target.checked }))} />
              <span className="capitalize">{key.replaceAll('_',' ')}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button className="px-3 py-2 border rounded" onClick={()=> setShowModulos(false)}>Cancelar</button>
          <button className="px-3 py-2 rounded text-white bg-indigo-600 disabled:opacity-60" disabled={savingModulos} onClick={guardarModulos}>{savingModulos? 'Guardando...' : 'Guardar'}</button>
        </div>
      </Modal>

      {/* Modal Licencia */}
      <Modal
        open={showLic}
        title={
          <span className="flex items-center gap-2">
            <MercadoPagoMark className="h-6 w-auto" />
            Licencia y abono
          </span>
        }
        onClose={()=> setShowLic(false)}
      >
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Tipos de planes</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Compará módulos y ventajas de Básica, Intermedia y Premium en una guía visual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPlanesExplainer(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            <FaLayerGroup className="h-4 w-4" />
            Guía de planes
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isSuperAdminEmail(currentUser?.email) ? (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Plan</label>
                <select
                  className="input"
                  value={lic.plan}
                  onChange={(e) => {
                    const p = normalizeLicensePlan(e.target.value);
                    setLic((prev) => ({ ...prev, plan: p, chosenPlan: p }));
                  }}
                >
                  <option value="basic">{PLAN_LABELS_ES.basic}</option>
                  <option value="intermediate">{PLAN_LABELS_ES.intermediate}</option>
                  <option value="premium">{PLAN_LABELS_ES.premium}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Válida hasta</label>
                <input
                  type="date"
                  className="input"
                  value={lic.paidUntil ? lic.paidUntil.substring(0, 10) : ''}
                  onChange={(e) =>
                    setLic((prev) => ({
                      ...prev,
                      paidUntil: e.target.value ? new Date(e.target.value).toISOString() : ''
                    }))
                  }
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lic.blocked}
                  onChange={(e) => setLic((prev) => ({ ...prev, blocked: e.target.checked }))}
                />
                <span>Bloquear empresa</span>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Motivo</label>
                <input
                  className="input"
                  placeholder="Motivo del bloqueo o nota"
                  value={lic.reason || ''}
                  onChange={(e) => setLic((prev) => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Enlace de pago manual (opcional)</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={lic.pagoBilleteraUrl || ''}
                  onChange={(e) => setLic((prev) => ({ ...prev, pagoBilleteraUrl: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Link opcional cuando el cobro MP no está activo en la empresa.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Plan contratado</label>
                <div className="input bg-gray-50 text-gray-800">
                  {isOnboardingPaymentPhase(lic, billingMp)
                    ? `Kit inicial activo · luego ${PLAN_LABELS_ES[normalizeLicensePlan(lic.chosenPlan || lic.plan)]}`
                    : PLAN_LABELS_ES[normalizeLicensePlan(lic.plan)]}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Vigencia</label>
                <div className="input bg-gray-50 text-gray-800 leading-relaxed">
                  {lic.paidUntil
                    ? new Date(lic.paidUntil).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Aún sin abono acreditado'}
                </div>
              </div>
              <div className="col-span-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                La vigencia <strong>no se elige manualmente</strong>: al acreditarse un pago en{' '}
                <span className="inline-flex align-middle mx-0.5">
                  <MercadoPagoMark className="h-4 w-auto" />
                </span>{' '}
                Mercado Pago, el sistema suma <strong>30 días</strong> de uso desde la fecha en que MP confirma el
                cobro. Las primeras cuotas de instalación pueden ser a monto fijo; después corre el precio del plan
                elegido.
              </div>
            </>
          )}
          <div className="col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex items-center gap-2">
              <MercadoPagoMark className="h-6 w-auto" />
              <p className="text-sm font-semibold text-indigo-900">Renovar abono por Mercado Pago</p>
            </div>
            {(() => {
              const planKey = normalizeLicensePlan(lic.plan);
              const prefPlan = getPreferredCheckoutPlan(lic);
              const onboarding = isOnboardingPaymentPhase(lic, billingMp);
              const slots = Number(billingMp?.onboardingInstallmentsTotal ?? 2);
              const paidObs = Number(lic.onboardingInstallmentsPaid ?? 0);
              const arsNext = getNextBillingAmountARS(lic, billingMp);
              const tokenOk = billingMp?.mercadoPagoTokenPresent;
              const puedeEstePlan = tokenOk && arsNext > 0;
              return (
                <>
                  {billingMp?.mercadoPagoConfigured ? (
                    <div className="mt-2 space-y-1 text-sm text-gray-800">
                      {onboarding ? (
                        <p>
                          <strong>Cuota instalación</strong> ({paidObs + 1}/{slots}) — versión completa:{' '}
                          <strong>${arsNext.toLocaleString('es-AR')} ARS</strong>. Plan que quedará después:{' '}
                          <strong>{PLAN_LABELS_ES[normalizeLicensePlan(prefPlan)]}</strong>.
                        </p>
                      ) : (
                        <p>
                          Abono según plan elegido (<strong>{PLAN_LABELS_ES[planKey]}</strong>):{' '}
                          <strong>${arsNext.toLocaleString('es-AR')} ARS</strong>{' '}
                          <span className="text-gray-600">cada 30 días al acreditarse en MP</span>.
                        </p>
                      )}
                      {!puedeEstePlan && tokenOk ? (
                        <p className="text-xs text-amber-800">
                          Falta monto de instalación o precio de plan en la plataforma. Contactá al administrador.
                        </p>
                      ) : null}
                      {isSuperAdminEmail(currentUser?.email) ? (
                        <ul className="text-xs text-gray-600 list-disc list-inside pt-2 border-t border-indigo-100">
                          <li>
                            Básica: ${Number(billingMp?.planPrices?.basic ?? 0).toLocaleString('es-AR')} ARS
                          </li>
                          <li>
                            Intermedia: ${Number(billingMp?.planPrices?.intermediate ?? 0).toLocaleString('es-AR')}{' '}
                            ARS
                          </li>
                          <li>
                            Premium: ${Number(billingMp?.planPrices?.premium ?? 0).toLocaleString('es-AR')} ARS
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-800">
                      Por el momento los pagos con Mercado Pago no están habilitados. Si ya abonás por otro canal, esperá la actualización automática cuando acredite tu pago en el sistema.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={billingMpLoading || !puedeEstePlan}
                      onClick={abrirPagoMercadoPagoMes}
                      className="inline-flex items-center gap-2 rounded-md bg-[#009ee3] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#008dcf]"
                    >
                      <MercadoPagoMark className="h-5 w-auto" />
                      {billingMpLoading
                        ? 'Abriendo…'
                        : puedeEstePlan
                          ? `${onboarding ? 'Cuota instalación' : 'Pagar / Renovar'} (${arsNext.toLocaleString('es-AR')} ARS)`
                          : 'Abrir cobro Mercado Pago'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button className="px-3 py-2 border rounded" onClick={()=> setShowLic(false)}>Cerrar</button>
          {isSuperAdminEmail(currentUser?.email) ? (
            <button
              type="button"
              className="px-3 py-2 rounded text-white bg-indigo-600 disabled:opacity-60"
              disabled={savingLic}
              onClick={guardarLicencia}
            >
              {savingLic ? 'Guardando...' : 'Guardar cambios'}
            </button>
          ) : null}
        </div>
      </Modal>

      <PlanesAbonoExplainerModal
        open={showPlanesExplainer}
        onClose={() => setShowPlanesExplainer(false)}
        initialPlan={
          PLAN_IDS.includes(normalizeLicensePlan(lic?.plan))
            ? normalizeLicensePlan(lic.plan)
            : 'intermediate'
        }
      />
    </div>
  );
};

export default ConfiguracionEmpresa;