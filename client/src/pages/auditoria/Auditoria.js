import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import auditoriaService from '../../services/auditoria.service';
import { FaExclamationTriangle, FaFilter, FaHistory, FaSyncAlt, FaUserShield } from 'react-icons/fa';

const MODULOS = [
  ['', 'Todos los módulos'],
  ['ventas', 'Ventas'],
  ['compras', 'Compras'],
  ['stock', 'Stock'],
  ['caja', 'Caja'],
  ['usuarios', 'Usuarios'],
  ['configuracion', 'Configuración'],
  ['sistema', 'Sistema']
];

const ACCIONES = [
  ['', 'Todas las acciones'],
  ['crear', 'Crear'],
  ['editar', 'Editar'],
  ['eliminar', 'Eliminar'],
  ['cambiar_estado', 'Cambiar estado'],
  ['registrar_pago', 'Registrar pago'],
  ['ajustar_stock', 'Ajustar stock']
];

const severityClass = {
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  critical: 'bg-red-50 text-red-700 ring-red-200',
  alta: 'bg-red-50 text-red-700 ring-red-200',
  media: 'bg-amber-50 text-amber-700 ring-amber-200'
};

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function StatCard({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700'
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

const Auditoria = () => {
  const [eventos, setEventos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    modulo: '',
    accion: '',
    usuario: '',
    fecha_inicio: daysAgoISO(30),
    fecha_fin: todayISO(),
    limit: 200
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { eventos: rows, resumen: summary } = await auditoriaService.obtenerHistorial(filtros);
      setEventos(rows);
      setResumen(summary);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const topModules = useMemo(() => {
    const entries = Object.entries(resumen?.byModule || {});
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [resumen]);

  const updateFiltro = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <FaHistory className="text-indigo-600" />
            Auditoría del Sistema
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Trazabilidad de operaciones críticas: ventas, compras, stock, caja y cambios administrativos.
          </p>
        </div>
        <Button onClick={cargar} disabled={loading}>
          <span className="inline-flex items-center gap-2">
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            Actualizar
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={<FaHistory />} label="Eventos filtrados" value={resumen?.total || 0} tone="indigo" />
        <StatCard icon={<FaExclamationTriangle />} label="Alertas" value={resumen?.warnings || 0} tone="amber" />
        <StatCard icon={<FaUserShield />} label="Críticos" value={resumen?.critical || 0} tone="red" />
        <StatCard icon={<FaFilter />} label="Módulos activos" value={topModules.length} />
      </div>

      <Card title="Filtros" icon={<FaFilter />}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <select className="input" value={filtros.modulo} onChange={(e) => updateFiltro('modulo', e.target.value)}>
            {MODULOS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="input" value={filtros.accion} onChange={(e) => updateFiltro('accion', e.target.value)}>
            {ACCIONES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Usuario o email"
            value={filtros.usuario}
            onChange={(e) => updateFiltro('usuario', e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={filtros.fecha_inicio}
            onChange={(e) => updateFiltro('fecha_inicio', e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={filtros.fecha_fin}
            onChange={(e) => updateFiltro('fecha_fin', e.target.value)}
          />
          <select className="input" value={filtros.limit} onChange={(e) => updateFiltro('limit', Number(e.target.value))}>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
            <option value={500}>Últimos 500</option>
          </select>
        </div>
      </Card>

      {topModules.length > 0 ? (
        <Card title="Actividad por módulo">
          <div className="space-y-3">
            {topModules.map(([modulo, total]) => {
              const pct = resumen?.total ? Math.round((total / resumen.total) * 100) : 0;
              return (
                <div key={modulo}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">{modulo.replace('_', ' ')}</span>
                    <span className="text-slate-500">{total} eventos</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card title="Historial de eventos" noPadding>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Evento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Módulo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Importancia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">Cargando auditoría...</td>
                </tr>
              ) : eventos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">
                    No hay eventos de auditoría para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                eventos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDate(item.fecha)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.titulo || item.accion}</p>
                      <p className="mt-0.5 max-w-xl text-sm text-slate-500">{item.descripcion || item.entidad_id || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <p>{item.usuario_nombre || 'Sistema'}</p>
                      <p className="text-xs text-slate-400">{item.usuario_email || item.usuario_id || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-slate-600">{String(item.modulo || 'sistema').replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${severityClass[item.severidad] || severityClass.info}`}>
                        {item.severidad || 'info'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Auditoria;