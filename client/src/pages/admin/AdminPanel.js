import React, { useEffect, useState } from 'react';
import ApiService from '../../services/api.service';
import { toast } from 'react-toastify';

const api = new ApiService('/admin');

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState([]);
  const [editLic, setEditLic] = useState(null); // { id, plan, paidUntil, blocked, reason }
  const [editMods, setEditMods] = useState(null); // { id, modules }
  const [saving, setSaving] = useState(false);

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

  useEffect(()=>{ cargar(); },[]);

  const guardarLicencia = async () => {
    try {
      if (!editLic) return;
      setSaving(true);
      const payload = { plan: editLic.plan||'basic', paidUntil: editLic.paidUntil||'', blocked: !!editLic.blocked, reason: editLic.reason||'' };
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
      setEditMods({ id: empresaId, modules: actual });
    } catch {
      setEditMods({ id: empresaId, modules: {} });
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
                  <td className="px-4 py-2">{lic.plan||'basic'}</td>
                  <td className="px-4 py-2">{paid}</td>
                  <td className="px-4 py-2">{e.daysLeft ?? '-'}</td>
                  <td className="px-4 py-2">{lic.blocked? 'Sí':'No'}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="px-2 py-1 bg-indigo-600 text-white rounded" onClick={()=> setEditLic({ id:e.id, plan: lic.plan||'basic', paidUntil: lic.paidUntil||'', blocked: !!lic.blocked, reason: lic.reason||'' })}>Licencia</button>
                    <button className="px-2 py-1 bg-gray-700 text-white rounded" onClick={()=> abrirModulos(e.id)}>Módulos</button>
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
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
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
              {Object.keys({
                productos:true,categorias:true,clientes:true,proveedores:true,compras:true,ventas:true,punto_venta:true,stock:true,listas_precios:true,transferencias:true,reportes:true,promociones:false,caja:true,gastos:true,devoluciones:true,auditoria:false,vehiculos:false,produccion:false,recetas:false,materias_primas:false,configuracion:true
              }).map(key=> (
                <label key={key} className="flex items-center gap-2 p-2 rounded border">
                  <input type="checkbox" checked={!!editMods.modules?.[key]} onChange={e=> setEditMods(prev=> ({...prev, modules: { ...prev.modules, [key]: e.target.checked }}))} />
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
    </div>
  );
};

export default AdminPanel;


