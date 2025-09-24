// Hook simple para el Asistente de Ventas (fallback local, sin backend aún)
import { FEATURES } from '../config/featureFlags';

export function useAsistenteVentas() {
  const buildFallbackMessage = (cliente) => {
    const nombre = (cliente?.nombre || cliente?.apellido) ? `${cliente?.nombre || ''} ${cliente?.apellido || ''}`.trim() : '¡Hola!';
    const principal = `${nombre}, ¿cómo va? Tenemos promos activas esta semana y stock fresco. ¿Querés que te reserve algo?`;
    const variantes = [
      `${nombre}, te escribo para contarte que esta semana hay descuentos. ¿Te paso un presupuesto rápido?`,
      `${nombre}, hoy tenemos oportunidades en combos y packs. Si querés te armo uno y te paso total.`,
      `${nombre}, avisame si necesitás reponer, estoy a disposición y con buenas promos.`
    ];
    return { message: principal, variants: variantes, used: 'fallback-local' };
  };

  const getMensaje = async (cliente) => {
    if (!FEATURES.ASISTENTE_VENTAS_ENABLED) return null;
    // Sin backend: devolver mensaje local inmediato
    return buildFallbackMessage(cliente);
  };

  const calcPresupuesto = async (items, catalogo = []) => {
    // Cálculo local simple
    const byId = Object.fromEntries(catalogo.map(p => [p.id, p]));
    const detalle = (items || []).map(i => {
      const p = byId[i.productoId] || {};
      const precio = parseFloat(p.precio || 0) || 0;
      const qty = parseFloat(i.qty || 0) || 0;
      const subtotal = precio * qty;
      return { ...i, nombre: p.nombre, precio, subtotal };
    });
    const subtotal = detalle.reduce((acc, d) => acc + (d.subtotal || 0), 0);
    const descuentoTotal = 0; // sin reglas aún (se agregarán luego)
    const total = Math.max(0, subtotal - descuentoTotal);
    return { detalle, subtotal, descuentoTotal, total, complementarios: [] };
  };

  const openWhatsApp = ({ phone, text }) => {
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text || '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Generador simple de nuevas variantes con sinónimos y tonos
  const tonos = {
    cordial: [
      '¿Cómo estás?',
      'Espero que estés muy bien.',
      'Buen día, ¿cómo va todo?'
    ],
    directo: [
      'Tengo promos vigentes.',
      'Hoy hay descuentos en varios productos.',
      'Podemos armar tu pedido ahora.'
    ],
    entusiasta: [
      '¡Ofertas fresquitas de hoy! 🎉',
      '¡Súper promos para vos! 💥',
      '¡Stock recién ingresado!'
    ]
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const getNuevaVariante = async (cliente, opciones = {}) => {
    if (!FEATURES.ASISTENTE_VENTAS_ENABLED) return null;
    const nombre = (cliente?.nombre || cliente?.apellido)
      ? `${cliente?.nombre || ''} ${cliente?.apellido || ''}`.trim()
      : null;
    const saludoNombre = nombre ? `${nombre},` : '¡Hola!';
    const tono = opciones.tono || 'cordial';
    const bloques = [];
    bloques.push(`${saludoNombre} ${pick(tonos[tono] || tonos.cordial)}`);
    bloques.push(pick([
      'Tenemos promos activas esta semana y excelente calidad.',
      'Hay combos y packs con precios especiales hoy.',
      'Puedo armarte un presupuesto en minutos.'
    ]));
    if (opciones.mencionarVisita) {
      bloques.push(pick([
        'Si preferís, coordinamos entrega en tu zona.',
        'Podemos pasar hoy por tu zona.',
        'Hacemos reparto en tu área esta semana.'
      ]));
    }
    bloques.push(pick([
      '¿Querés que te reserve algo?',
      '¿Te paso algunas opciones y total?',
      '¿Te armo un pedido sugerido?'
    ]));
    const texto = bloques.join(' ');
    return { message: texto };
  };

  return { getMensaje, getNuevaVariante, calcPresupuesto, openWhatsApp };
}



