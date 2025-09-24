// src/pages/configuracion/ConfiguracionEmpresa.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Servicios
import configuracionService from '../../services/configuracion.service';
import { createTenant, joinTenant, setActiveTenant } from '../../services/firebase.service';
import { useAuth } from '../../contexts/AuthContext';

// Firebase
import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// Iconos
import { 
  FaBuilding, FaSave, FaUpload, FaTimes,
  FaPhone, FaMapMarkerAlt, FaFileInvoice,
  FaImage, FaCog, FaCogs
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

/**
 * Página de configuración de datos empresariales
 * Permite configurar todos los datos que aparecerán en las facturas
 */
const ConfiguracionEmpresa = () => {
  const { orgId, currentUser } = useAuth();
  const navigate = useNavigate();

  const getCompanyId = useCallback(async () => {
    if (orgId) return orgId;
    try {
      const token = await auth.currentUser?.getIdTokenResult();
      const cid = token?.claims?.companyId || localStorage.getItem('companyId') || null;
      return cid;
    } catch { return localStorage.getItem('companyId') || null; }
  }, [orgId]);

  // =================== MÓDULOS ===================
  const [showModulos, setShowModulos] = useState(false);
  const [savingModulos, setSavingModulos] = useState(false);
  const MODULOS_DEFAULT = {
    productos: true,
    categorias: true,
    clientes: true,
    proveedores: true,
    compras: true,
    ventas: true,
    punto_venta: true,
    stock: true,
    listas_precios: true,
    transferencias: true,
    reportes: true,
    promociones: false,
    caja: true,
    gastos: true,
    devoluciones: true,
    auditoria: false,
    vehiculos: false,
    produccion: false,
    recetas: false,
    materias_primas: false,
    configuracion: true
  };
  const [modulos, setModulos] = useState(MODULOS_DEFAULT);

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
      setModulos({ ...MODULOS_DEFAULT, ...(data || {}) });
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
    }catch(e){ console.error('Error guardando módulos:', e); toast.error('No se pudieron guardar los módulos'); }
    finally{ setSavingModulos(false); }
  };

  // =================== LICENCIA ===================
  const [showLic, setShowLic] = useState(false);
  const [savingLic, setSavingLic] = useState(false);
  const [lic, setLic] = useState({ paidUntil: '', blocked: false, reason: '', plan: 'basic' });
  const [licDaysLeft, setLicDaysLeft] = useState(null);

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
      const merged = { paidUntil: '', blocked: false, reason: '', plan: 'basic', ...(data||{}) };
      setLic(merged);
      // calcular días restantes
      if (merged.paidUntil) {
        const diff = Math.ceil((new Date(merged.paidUntil).getTime() - Date.now())/(1000*60*60*24));
        setLicDaysLeft(diff);
      } else { setLicDaysLeft(null); }
    }catch(e){ console.warn('No se pudo cargar licencia:', e.message); }
  },[getCompanyId]);

  const guardarLicencia = async ()=>{
    try{
      const cid = await getCompanyId();
      if(!cid) { toast.error('OrgId no disponible'); return; }
      setSavingLic(true);
      const payload = { ...lic, updatedAt: new Date().toISOString() };
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
    nombre_fantasia: 'NexoPOS DC',
    slogan: 'Especialistas en especias, condimentos e insumos para carnicerias e industria alimentaria',
    cuit: '',
    condicion_iva: 'Responsable Inscripto',
    ingresos_brutos: '',
    punto_venta: '0001',
    direccion_calle: '',
    direccion_localidad: 'Posadas',
    direccion_provincia: 'Misiones',
    direccion_codigo_postal: '',
    direccion_pais: 'Argentina',
    telefono_principal: '',
    telefono_secundario: '',
    email: '',
    website: '',
    numeracion_inicial: 1,
    serie_actual: 'A',
    formato_predeterminado: 'termico',
    mostrar_logo: true,
    tamaño_logo: 'mediano',
    posicion_logo: 'centro'
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaSlug, setEmpresaSlug] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creandoOrg, setCreandoOrg] = useState(false);
  const [uniendoOrg, setUniendoOrg] = useState(false);

  // ========= REGISTRO + CREACIÓN UNIFICADO =========
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regEmpresa, setRegEmpresa] = useState('');
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
      await createUserWithEmailAndPassword(auth, regEmail.trim(), regPass);
      // 2) Crear empresa como OWNER (reutiliza flujo existente)
      setEmpresaNombre(regEmpresa.trim());
      setEmpresaSlug(regEmpresa.trim().toLowerCase().replace(/\s+/g,'-'));
      await handleCrearEmpresa();
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
    try {
      setCreandoOrg(true);
      const res = await createTenant(empresaNombre.trim(), empresaSlug.trim() || null);
      await setActiveTenant(res.orgId);
      toast.success('Empresa creada y activada');
      await postOnboardingRedirect();
    } catch (err) {
      console.error('Error creando empresa:', err);
      toast.error(err.message || 'Error creando empresa');
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
    } catch (error) { console.error('Error al guardar configuración:', error); toast.error('Error al guardar la configuración'); }
    finally { setGuardando(false); }
  };

  const warnBanner = licDaysLeft !== null && licDaysLeft <= 7 && licDaysLeft >= 0;

  if (loading) {
    return (<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>);
  }

  return (
    <div className="space-y-6">
      {!auth.currentUser && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Crear cuenta y empresa (Demo 7 días)</h3>
          <form onSubmit={handleRegistroYCreacion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input" type="email" placeholder="Email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} />
            <input className="input" type="text" placeholder="Nombre de empresa" value={regEmpresa} onChange={e=>setRegEmpresa(e.target.value)} />
            <input className="input" type="password" placeholder="Contraseña" value={regPass} onChange={e=>setRegPass(e.target.value)} />
            <input className="input" type="password" placeholder="Confirmar contraseña" value={regPass2} onChange={e=>setRegPass2(e.target.value)} />
            <div className="md:col-span-2">
              <Button type="submit" disabled={creandoCuentaEmpresa}>{creandoCuentaEmpresa ? 'Creando...' : 'Crear cuenta y empresa'}</Button>
            </div>
          </form>
        </Card>
      )}

      {!orgId && auth.currentUser && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configurar Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleCrearEmpresa} className="space-y-3">
              <h4 className="font-semibold">Crear nueva empresa</h4>
              <input className="input" placeholder="Nombre" value={empresaNombre} onChange={e=>setEmpresaNombre(e.target.value)} />
              <input className="input" placeholder="Slug (opcional)" value={empresaSlug} onChange={e=>setEmpresaSlug(e.target.value)} />
              <Button type="submit" disabled={creandoOrg}>{creandoOrg ? 'Creando...' : 'Crear'}</Button>
            </form>
            <form onSubmit={handleUnirme} className="space-y-3">
              <h4 className="font-semibold">Unirme con código (orgId)</h4>
              <input className="input" placeholder="Código" value={joinCode} onChange={e=>setJoinCode(e.target.value)} />
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
          { (currentUser?.email||'').toLowerCase() === 'danielcadiz15@gmail.com' && (
            <>
              <Button color="secondary" onClick={()=>{ cargarLicencia(); setShowLic(true); }}>Licencia</Button>
              <Button color="primary" icon={<FaCogs/>} onClick={()=>{ cargarModulos(); setShowModulos(true); }}>Gestionar Módulos</Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Configuración única:</strong> Estos datos aparecerán en todas las facturas y comprobantes. 
              Puedes modificarlos en cualquier momento.
            </p>
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Ej: NexoPOS DC S.A."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Fantasía *
                </label>
                <input
                  type="text"
                  name="nombre_fantasia"
                  value={formData.nombre_fantasia}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slogan
                </label>
                <textarea
                  name="slogan"
                  value={formData.slogan}
                  onChange={handleInputChange}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text sm font-medium text-gray-700 mb-1">
                  Punto de Venta
                </label>
                <input
                  type="text"
                  name="punto_venta"
                  value={formData.punto_venta}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="h-24 w-24 object-contain border-2 border-gray-300 rounded-lg"
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
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="www.empresa.com"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Configuración de Facturas */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FaCog className="mr-2 text-indigo-600" />
          Configuración de Facturas
        </h3>
        
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="termico">Térmico (80mm)</option>
              <option value="a4">A4</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Card de Módulos del Sistema */}
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
            //onClick={() => setShowModulosModal(true)}
            icon={<FaCogs />}
          >
            Gestionar Módulos
          </Button>
        </div>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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

      
          // Aquí podrías recargar la configuración si es necesario
        }}
      />

      {/* Modal Gestión de Módulos */}
      <Modal open={showModulos} title="Gestionar Módulos" onClose={()=> setShowModulos(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(MODULOS_DEFAULT).map(key=> (
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
      <Modal open={showLic} title="Licencia" onClose={()=> setShowLic(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Plan</label>
            <select className="input" value={lic.plan} onChange={e=> setLic(prev=> ({ ...prev, plan: e.target.value }))}>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Válida hasta</label>
            <input type="date" className="input" value={lic.paidUntil ? lic.paidUntil.substring(0,10): ''} onChange={e=> setLic(prev=> ({ ...prev, paidUntil: e.target.value ? new Date(e.target.value).toISOString(): '' }))} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={lic.blocked} onChange={e=> setLic(prev=> ({ ...prev, blocked: e.target.checked }))} />
            <span>Bloquear empresa</span>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Motivo</label>
            <input className="input" placeholder="Motivo del bloqueo o nota" value={lic.reason||''} onChange={e=> setLic(prev=> ({ ...prev, reason: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button className="px-3 py-2 border rounded" onClick={()=> setShowLic(false)}>Cerrar</button>
          <button className="px-3 py-2 rounded text-white bg-indigo-600 disabled:opacity-60" disabled={savingLic} onClick={guardarLicencia}>{savingLic? 'Guardando...' : 'Guardar'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default ConfiguracionEmpresa;