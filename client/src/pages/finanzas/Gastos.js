import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaMoneyBillWave, FaPlus, FaTrash } from 'react-icons/fa';
import gastosService from '../../services/gastos.service';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const hoyISO = () => new Date().toISOString().split('T')[0];
const hace30ISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

const MONEDA = (value) => `$${(Number(value) || 0).toFixed(2)}`;

const Gastos = () => {
  const { sucursalSeleccionada } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: hace30ISO(),
    fecha_fin: hoyISO()
  });
  const [lista, setLista] = useState([]);
  const [reporte, setReporte] = useState({
    resumen: {
      total: 0,
      total_caja: 0,
      total_externo: 0,
      total_incluir_costos: 0
    },
    por_categoria: []
  });
  const [form, setForm] = useState({
    fecha: hoyISO(),
    categoria: 'general',
    concepto: '',
    monto: '',
    origen_fondos: 'externo',
    medio_pago: 'efectivo',
    incluir_en_costos: true,
    observaciones: ''
  });

  const categorias = useMemo(() => [
    'alquiler',
    'movil',
    'combustible',
    'servicios',
    'sueldos',
    'impuestos',
    'insumos',
    'general',
    'otros'
  ], []);

  const cargar = async () => {
    try {
      setLoading(true);
      const [gastos, rep] = await Promise.all([
        gastosService.obtenerTodos(filtros),
        gastosService.obtenerReporte(filtros)
      ]);
      setLista(Array.isArray(gastos) ? gastos : []);
      setReporte({
        resumen: rep?.resumen || {
          total: 0,
          total_caja: 0,
          total_externo: 0,
          total_incluir_costos: 0
        },
        por_categoria: Array.isArray(rep?.por_categoria) ? rep.por_categoria : []
      });
    } catch (error) {
      console.error('Error cargando gastos:', error);
      toast.error('No se pudieron cargar los gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.fecha_inicio, filtros.fecha_fin]);

  const onCrear = async (e) => {
    e.preventDefault();
    const monto = Number(form.monto);
    if (!form.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      toast.warning('Completá concepto y monto valido');
      return;
    }
    try {
      setLoading(true);
      await gastosService.crear({
        ...form,
        monto,
        sucursal_id: sucursalSeleccionada?.id || 'principal'
      });
      toast.success(
        form.origen_fondos === 'caja'
          ? 'Gasto registrado y descontado de caja'
          : 'Gasto registrado (pago externo)'
      );
      setForm((prev) => ({
        ...prev,
        concepto: '',
        monto: '',
        observaciones: ''
      }));
      await cargar();
    } catch (error) {
      console.error('Error creando gasto:', error);
      toast.error(error?.message || 'No se pudo registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const onEliminar = async (id) => {
    if (!window.confirm('Eliminar este gasto?')) return;
    try {
      setLoading(true);
      await gastosService.eliminar(id);
      toast.success('Gasto eliminado');
      await cargar();
    } catch (error) {
      console.error('Error eliminando gasto:', error);
      toast.error('No se pudo eliminar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Finanzas · Gastos</h1>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
            <input
              type="date"
              value={filtros.fecha_inicio}
              onChange={(e) => setFiltros((p) => ({ ...p, fecha_inicio: e.target.value }))}
              className="nexo-field sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
            <input
              type="date"
              value={filtros.fecha_fin}
              onChange={(e) => setFiltros((p) => ({ ...p, fecha_fin: e.target.value }))}
              className="nexo-field sm:text-sm"
            />
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <div className="text-xs text-indigo-700">Total gastos</div>
            <div className="text-xl font-bold text-indigo-900">{MONEDA(reporte.resumen.total)}</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">Para costos de productos</div>
            <div className="text-xl font-bold text-emerald-900">{MONEDA(reporte.resumen.total_incluir_costos)}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          Si el origen es <strong>caja</strong>, se genera egreso automatico en caja. Si es <strong>externo</strong>,
          no impacta caja pero si puede impactar el calculo de costos.
        </div>
      </Card>

      <Card title="Nuevo gasto" icon={<FaPlus />}>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onCrear}>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
            className="nexo-field sm:text-sm"
          />
          <select
            value={form.categoria}
            onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
            className="nexo-field sm:text-sm"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto"
            value={form.monto}
            onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
            className="nexo-field sm:text-sm"
          />
          <input
            type="text"
            placeholder="Concepto"
            value={form.concepto}
            onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
            className="nexo-field sm:text-sm md:col-span-2"
          />
          <input
            type="text"
            placeholder="Observaciones (opcional)"
            value={form.observaciones}
            onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
            className="nexo-field sm:text-sm"
          />
          <select
            value={form.origen_fondos}
            onChange={(e) => setForm((p) => ({ ...p, origen_fondos: e.target.value }))}
            className="nexo-field sm:text-sm"
          >
            <option value="externo">Pago externo</option>
            <option value="caja">Sale de caja</option>
          </select>
          <select
            value={form.medio_pago}
            onChange={(e) => setForm((p) => ({ ...p, medio_pago: e.target.value }))}
            className="nexo-field sm:text-sm"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="otros">Otros</option>
          </select>
          <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.incluir_en_costos}
              onChange={(e) => setForm((p) => ({ ...p, incluir_en_costos: e.target.checked }))}
            />
            Incluir en costos de productos
          </label>
          <div className="md:col-span-3">
            <Button type="submit" color="primary" icon={<FaMoneyBillWave />} loading={loading}>
              Guardar gasto
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Informe de gastos">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Categoria</th>
                  <th className="p-2 text-left">Concepto</th>
                  <th className="p-2 text-left">Origen</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-center">Costos</th>
                  <th className="p-2 text-center">Accion</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100">
                    <td className="p-2">{g.fecha || '-'}</td>
                    <td className="p-2">{g.categoria || '-'}</td>
                    <td className="p-2">{g.concepto || '-'}</td>
                    <td className="p-2">{g.origen_fondos === 'caja' ? 'Caja' : 'Externo'}</td>
                    <td className="p-2 text-right font-semibold">{MONEDA(g.monto)}</td>
                    <td className="p-2 text-center">{g.incluir_en_costos !== false ? 'Si' : 'No'}</td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => onEliminar(g.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={7}>
                      No hay gastos para el periodo seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Gastos;
