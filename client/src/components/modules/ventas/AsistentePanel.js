import React, { useEffect, useState } from 'react';
import { useAsistenteVentas } from '../../../hooks/useAsistenteVentas';

const currency = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const AsistentePanel = ({ cliente, productosCatalogo = [], onLogInteraccion }) => {
  const { getMensaje, getNuevaVariante, calcPresupuesto, openWhatsApp } = useAsistenteVentas();
  const [mensaje, setMensaje] = useState('');
  const [variantes, setVariantes] = useState([]);
  const [items, setItems] = useState([]);
  const [presu, setPresu] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [tono, setTono] = useState('cordial');

  useEffect(() => {
    (async () => {
      setLoadingMsg(true);
      const res = await getMensaje(cliente);
      setMensaje(res?.message || '');
      setVariantes(res?.variants || []);
      setLoadingMsg(false);
    })();
  }, [cliente]);

  const generarOtra = async () => {
    setLoadingMsg(true);
    const res = await getNuevaVariante(cliente, { tono, mencionarVisita: true });
    if (res?.message) {
      setMensaje(res.message);
      setVariantes((prev) => [res.message, ...prev].slice(0, 5));
    }
    setLoadingMsg(false);
  };

  const agregarItem = (productoId) => {
    if (!productoId) return;
    setItems((prev) => {
      const ex = prev.find(p => p.productoId === productoId);
      return ex
        ? prev.map(p => p.productoId === productoId ? { ...p, qty: p.qty + 1 } : p)
        : [...prev, { productoId, qty: 1 }];
    });
  };

  const calcular = async () => {
    setLoadingCalc(true);
    const res = await calcPresupuesto(items, productosCatalogo);
    setPresu(res);
    setLoadingCalc(false);
  };

  const enviarWhats = async () => {
    const texto = presu
      ? `${mensaje}\n\nPresupuesto estimado:\n${presu.detalle.map((d) => `• ${d.nombre} x${d.qty} = ${currency(d.subtotal)}`).join('\n')}\nSubtotal: ${currency(presu.subtotal)}\nDescuentos: -${currency(presu.descuentoTotal)}\nTotal: ${currency(presu.total)}`
      : mensaje;
    if (!cliente?.telefono) return;
    openWhatsApp({ phone: String(cliente.telefono).replace(/[^\d]/g, ''), text: texto });
    try {
      await onLogInteraccion?.({
        clienteId: cliente?.id,
        tipo: presu ? 'presupuesto' : 'contacto',
        fecha: new Date(),
        mensaje: texto,
        totalPresupuestado: presu?.total || null,
        respondio: false,
        canal: 'whatsapp',
      });
    } catch (e) {
      // silencioso
    }
  };

  return (
    <div className="space-y-3 border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Asistente de ventas</h3>
        <span className="text-xs text-gray-500">beta</span>
      </div>

      <div>
        <label className="text-sm font-medium">Mensaje sugerido</label>
        <div className="flex items-center gap-2 mb-2">
          <select className="border rounded p-1 text-sm" value={tono} onChange={(e) => setTono(e.target.value)}>
            <option value="cordial">Cordial</option>
            <option value="directo">Directo</option>
            <option value="entusiasta">Entusiasta</option>
          </select>
          <button className="border rounded px-2 py-1 text-sm" onClick={generarOtra} disabled={loadingMsg}>
            {loadingMsg ? 'Generando…' : 'Otra propuesta'}
          </button>
        </div>
        <textarea
          className="w-full border rounded p-2 min-h-[90px]"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder={loadingMsg ? 'Generando…' : 'Mensaje sugerido'}
        />
        {variantes?.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {variantes.map((v, i) => (
              <button key={i} onClick={() => setMensaje(v)} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">
                Variante {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Presupuesto rápido</label>
        <div className="flex gap-2 items-center">
          <select className="border rounded p-2" onChange={(e) => agregarItem(e.target.value)}>
            <option value="">Agregar producto…</option>
            {productosCatalogo.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button className="border rounded px-3 py-2" onClick={calcular} disabled={loadingCalc || items.length === 0}>
            {loadingCalc ? 'Calculando…' : 'Calcular'}
          </button>
        </div>

        {items.length > 0 && (
          <div className="mt-2 space-y-1 text-sm">
            {items.map((it, idx) => {
              const prod = productosCatalogo.find((p) => p.id === it.productoId);
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span>{prod?.nombre}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setItems((prev) => prev.map(p => p.productoId === it.productoId ? { ...p, qty: Math.max(1, p.qty - 1) } : p))} className="border px-2 rounded">-</button>
                    <span>{it.qty}</span>
                    <button onClick={() => setItems((prev) => prev.map(p => p.productoId === it.productoId ? { ...p, qty: p.qty + 1 } : p))} className="border px-2 rounded">+</button>
                    <button onClick={() => setItems((prev) => prev.filter(p => p.productoId !== it.productoId))} className="text-red-600">Quitar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {presu && (
          <div className="mt-2 border rounded p-2 text-sm">
            <div>Subtotal: <b>{currency(presu.subtotal)}</b></div>
            <div>Descuentos: <b>-{currency(presu.descuentoTotal)}</b></div>
            <div>Total: <b>{currency(presu.total)}</b></div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={enviarWhats} disabled={!cliente?.telefono}>Enviar por WhatsApp</button>
        <button className="border px-4 py-2 rounded" onClick={() => navigator.clipboard.writeText(mensaje)}>Copiar mensaje</button>
      </div>
    </div>
  );
};

export default AsistentePanel;



