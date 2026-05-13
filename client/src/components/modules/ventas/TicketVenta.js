/**
 * Componente para generar y mostrar tickets de venta.
 * Térmico: rollo 80mm (POS web) o 58mm (app caja / `thermalRollWidth="58mm"`).
 *
 * @module components/modules/ventas/TicketVenta
 * @requires react, ../../services/configuracion.service
 */

import React, { useState, useRef, useEffect } from 'react';
import { FaPrint, FaDownload, FaReceipt, FaStore, FaFileAlt, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import configuracionService from '../../../services/configuracion.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printHtmlDocument } from '../../../utils/print.utils';

/** Layout térmico: 80mm (POS web) vs 58mm (app caja / rollo estrecho) */
const THERMAL_LAYOUT = {
  '80mm': {
    page: '80mm auto',
    bodyFont: '18px',
    bodyWidth: '70mm',
    bodyPad: '5mm',
    lineHeight: '1.5',
    tituloPrincipal: '28px',
    subtitulo: '16px',
    imgMax: '100px',
    encabezadoMb: '15px',
    separadorMargin: '12px 0',
    seccionMargin: '12px 0',
    filaMargin: '6px 0',
    colFont: '16px',
    tablaTh: '16px',
    tablaTd: '15px',
    productoNombre: '17px',
    productoDetalle: '16px',
    totalSeccionMargin: '12px -5mm',
    totalTexto: '22px',
    totalMonto: '26px',
    footerFont: '16px',
    footerImportante: '18px',
    previewWidthPx: 320,
    htmlTicketLabel: '24px',
    htmlTicketNumero: '26px',
    htmlClienteTitle: '20px',
    htmlClienteNombre: '28px',
    htmlTotalPagarTitle: '26px',
    htmlTotalPagarMonto: '36px',
    htmlNoProductos: '16px',
    htmlTotalBannerPad: '15px 5px',
    htmlTotalBannerMargin: '20px -5mm'
  },
  '58mm': {
    page: '58mm auto',
    bodyFont: '12px',
    bodyWidth: '48mm',
    bodyPad: '2mm',
    lineHeight: '1.35',
    tituloPrincipal: '17px',
    subtitulo: '11px',
    imgMax: '72px',
    encabezadoMb: '8px',
    separadorMargin: '8px 0',
    seccionMargin: '8px 0',
    filaMargin: '4px 0',
    colFont: '11px',
    tablaTh: '11px',
    tablaTd: '10px',
    productoNombre: '12px',
    productoDetalle: '10px',
    totalSeccionMargin: '8px -2mm',
    totalTexto: '15px',
    totalMonto: '18px',
    footerFont: '11px',
    footerImportante: '12px',
    previewWidthPx: 220,
    htmlTicketLabel: '14px',
    htmlTicketNumero: '16px',
    htmlClienteTitle: '12px',
    htmlClienteNombre: '15px',
    htmlTotalPagarTitle: '16px',
    htmlTotalPagarMonto: '22px',
    htmlNoProductos: '12px',
    htmlTotalBannerPad: '10px 3px',
    htmlTotalBannerMargin: '12px -2mm'
  }
};

const autoPrintSessionKeys = new Set();

function buildThermalPrintStyles(L) {
  const filaMin = L.previewWidthPx <= 240 ? '14px' : '20px';
  return `
      @page {
        size: ${L.page};
        margin: 0;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
      body {
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: ${L.bodyFont} !important;
        font-weight: 800;
        line-height: ${L.lineHeight};
        margin: 0;
        padding: ${L.bodyPad};
        width: ${L.bodyWidth};
        background: white;
        color: #000000;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      * {
        font-weight: 800 !important;
        color: #000000 !important;
        box-sizing: border-box;
      }
      .encabezado {
        text-align: center;
        margin-bottom: ${L.encabezadoMb};
        font-weight: 900;
      }
      .titulo-principal {
        font-size: ${L.tituloPrincipal} !important;
        font-weight: 900 !important;
        letter-spacing: 1px;
        margin: 8px 0;
        text-transform: uppercase;
        line-height: 1.2;
      }
      .subtitulo {
        font-size: ${L.subtitulo} !important;
        margin: 4px 0;
        line-height: 1.3;
      }
      .separador {
        border: none;
        border-top: 3px solid #000;
        margin: ${L.separadorMargin};
        height: 0;
      }
      .separador-doble {
        border: none;
        border-top: 5px double #000;
        margin: ${L.separadorMargin};
        height: 0;
      }
      .seccion {
        margin: ${L.seccionMargin};
      }
      .fila {
        display: flex;
        justify-content: space-between;
        margin: ${L.filaMargin};
        align-items: center;
        min-height: ${filaMin};
      }
      .col-izq {
        font-weight: 800;
        font-size: ${L.colFont} !important;
        flex: 1;
        text-align: left;
      }
      .col-der {
        font-weight: 900;
        text-align: right;
        font-size: ${L.colFont} !important;
        flex: 1;
        word-break: break-word;
      }
      .tabla-productos {
        width: 100%;
        margin: ${L.seccionMargin};
        border-collapse: collapse;
      }
      .tabla-productos td {
        padding: 6px 3px;
        font-weight: 800;
        vertical-align: top;
        font-size: ${L.tablaTd} !important;
        line-height: 1.3;
        word-wrap: break-word;
        max-width: 0;
      }
      .tabla-productos th {
        font-size: ${L.tablaTh} !important;
        font-weight: 900;
        padding: 6px 3px;
        text-align: center;
      }
      .producto-nombre {
        font-weight: 900 !important;
        font-size: ${L.productoNombre} !important;
        line-height: 1.2;
        word-wrap: break-word;
        max-width: 0;
      }
      .producto-detalle {
        font-size: ${L.productoDetalle} !important;
        padding-left: 12px;
        line-height: 1.3;
      }
      .producto-separador {
        border-bottom: 2px dashed #000;
        margin: ${L.filaMargin};
      }
      .total-seccion {
        background: #000;
        color: #FFF !important;
        padding: 10px;
        margin: ${L.totalSeccionMargin};
        text-align: center;
        border-radius: 3px;
      }
      .total-texto {
        font-size: ${L.totalTexto} !important;
        font-weight: 900 !important;
        color: #FFF !important;
        margin-bottom: 5px;
      }
      .total-monto {
        font-size: ${L.totalMonto} !important;
        font-weight: 900 !important;
        color: #FFF !important;
      }
      .footer {
        text-align: center;
        margin-top: 18px;
        font-size: ${L.footerFont} !important;
        line-height: 1.4;
      }
      .footer-importante {
        font-weight: 900;
        font-size: ${L.footerImportante} !important;
        margin: ${L.separadorMargin};
        text-transform: uppercase;
      }
      img {
        max-width: ${L.imgMax} !important;
        height: auto !important;
        filter: contrast(2) brightness(0.8);
        margin: ${L.separadorMargin};
        display: block;
      }
      .ticket-content {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .ticket-header { flex-shrink: 0; }
      .ticket-body { flex: 1; min-height: 0; }
      .ticket-footer {
        flex-shrink: 0;
        margin-top: auto;
      }
      .texto-largo {
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        max-width: 100%;
      }
      .numero {
        font-family: 'Consolas', 'Courier New', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
    `;
}

/**
 * @param {Object} props
 * @param {Object} props.venta
 * @param {Function} props.onClose
 * @param {'80mm'|'58mm'} [props.thermalRollWidth='80mm']
 * @param {boolean} [props.autoPrintAfterLoad=false] Impresión inmediata al cargar config (caja)
 * @param {boolean} [props.hidePdfButton=false] Oculta descarga PDF (caja)
 */
const TicketVenta = ({
  venta,
  onClose,
  thermalRollWidth = '80mm',
  autoPrintAfterLoad = false,
  hidePdfButton = false
}) => {
  const thermalKey = thermalRollWidth === '58mm' ? '58mm' : '80mm';
  const L = THERMAL_LAYOUT[thermalKey];

  const ticketTermicoRef = useRef();
  const ticketA4Ref = useRef();
  
  // Estado para configuración de empresa
  const [empresaConfig, setEmpresaConfig] = useState(() => configuracionService.obtenerConfiguracionPorDefecto());
  
  // Estado para formato seleccionado
  const [formatoSeleccionado, setFormatoSeleccionado] = useState('termico');
  const [cargandoConfig, setCargandoConfig] = useState(true);
  
  // Cargar configuración de empresa
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const config = await configuracionService.obtener();
        if (config) {
          setEmpresaConfig(config);
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        toast.error('Error al cargar datos de empresa');
      } finally {
        setCargandoConfig(false);
      }
    };
    
    cargarConfiguracion();
  }, []);
  
  /**
   * Formatea un número como moneda
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatMoneda = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };
  
  /**
   * Formatea fecha y hora
   */
  const formatFechaHora = (fecha) => {
    const date = new Date(fecha || new Date());
    return {
      fecha: date.toLocaleDateString('es-AR'),
      hora: date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };
  };
  
  /**
   * Imprime el ticket directamente
   * Optimizado para Nictom IT03
   */
  const imprimirTicket = () => {
    const contenido = formatoSeleccionado === 'termico' 
      ? ticketTermicoRef.current 
      : ticketA4Ref.current;
      
    const estilos = formatoSeleccionado === 'termico' ? buildThermalPrintStyles(L) : `
      @page { size: A4; margin: 20mm; }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        margin: 0;
        padding: 0;
      }
    `;
    
    // HTML optimizado para mejor legibilidad
    const htmlOptimizado = `
      <html>
        <head>
          <title>Ticket - ${venta.numero}</title>
          <meta charset="utf-8">
          <style>${estilos}</style>
        </head>
        <body>
          ${formatoSeleccionado === 'termico' ? generarHTMLTermico() : contenido.innerHTML}
        </body>
      </html>
    `;
    
    try {
      printHtmlDocument({ title: `Ticket - ${venta.numero || 'SN'}`, bodyHtml: htmlOptimizado });
      toast.success('Ticket enviado a la impresora');
    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      toast.error('No se pudo abrir la impresión');
    }
  };

  useEffect(() => {
    if (!autoPrintAfterLoad || cargandoConfig || !venta) return undefined;
    const key = `ap:${String(venta.id)}:${String(venta.numero || '')}`;
    if (autoPrintSessionKeys.has(key)) return undefined;
    autoPrintSessionKeys.add(key);
    const id = window.setTimeout(() => {
      try {
        imprimirTicket();
      } catch (e) {
        console.error('[TicketVenta] autoPrint:', e);
      }
      if (typeof onClose === 'function') onClose();
    }, 120);
    return () => {
      window.clearTimeout(id);
      autoPrintSessionKeys.delete(key);
    };
    // imprimirTicket depende de estado local estable al disparar (config ya cargada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrintAfterLoad, cargandoConfig, venta]);

  const descargarPDF = async () => {
    const input = formatoSeleccionado === 'termico' ? ticketTermicoRef.current : ticketA4Ref.current;
    if (!input) return;
    try {
      const canvas = await html2canvas(input);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`ticket-venta-${venta.numero || 'SN'}.pdf`);
    } catch (error) {
      toast.error('Error al generar el PDF');
      console.error(error);
    }
  };
  
  /**
   * Genera HTML optimizado para impresión térmica
   */
  const generarHTMLTermico = () => {
    const { fecha, hora } = formatFechaHora(venta.fecha);
    return `
      <div class="ticket-content">
        <div class="ticket-header">
          <div class="encabezado">
            ${empresaConfig.mostrar_logo && empresaConfig.logo_url ? `<img src="${empresaConfig.logo_url}" alt="Logo">` : ''}
            <div class="titulo-principal">${empresaConfig.nombre_fantasia || empresaConfig.razon_social}</div>
            ${empresaConfig.slogan ? `<div class="subtitulo">${empresaConfig.slogan}</div>` : ''}
            <div class="subtitulo">${empresaConfig.direccion_calle}</div>
            <div class="subtitulo">${empresaConfig.direccion_localidad}, ${empresaConfig.direccion_provincia}</div>
            <div class="subtitulo">Tel: ${empresaConfig.telefono_principal}</div>
          </div>
          <hr class="separador-doble">
          <div class="seccion">
            <div style="text-align: center; font-size: ${L.htmlTicketLabel}; font-weight: 900;">TICKET DE VENTA</div>
            <div style="text-align: center; font-size: ${L.htmlTicketNumero}; font-weight: 900; margin: 8px 0;">${venta.numero || 'S/N'}</div>
          </div>
          <hr class="separador">
          <div class="seccion">
            <div class="fila"><span class="col-izq">FECHA:</span><span class="col-der numero">${fecha}</span></div>
            <div class="fila"><span class="col-izq">HORA:</span><span class="col-der numero">${hora}</span></div>
            <div class="fila"><span class="col-izq">VENDEDOR:</span><span class="col-der texto-largo">${venta.usuario_nombre || venta.vendedor || 'Sistema'}</span></div>
            ${venta.cliente_nombre && venta.cliente_nombre !== 'Cliente General' ? `
            <div style="text-align: center; margin: 15px 0; padding: 10px; border: 4px double #000;">
              <div style="font-size: ${L.htmlClienteTitle}; font-weight: 900; margin-bottom: 5px;">CLIENTE:</div>
              <div style="font-size: ${L.htmlClienteNombre} !important; font-weight: 900 !important; line-height: 1.2;">${venta.cliente_nombre}</div>
            </div>` : ''}
          </div>
          <hr class="separador-doble">
        </div>
        
        <div class="ticket-body">
          <div class="seccion">
            <table class="tabla-productos">
              <thead>
                <tr>
                  <th style="font-weight:900; font-size: ${L.tablaTh};">Producto</th>
                  <th style="font-weight:900; text-align:center; font-size: ${L.tablaTh};">P.Unit</th>
                  <th style="font-weight:900; text-align:center; font-size: ${L.tablaTh};">Cant</th>
                  <th style="font-weight:900; text-align:right; font-size: ${L.tablaTh};">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(venta.detalles && venta.detalles.length > 0) ? venta.detalles.map(item => {
                  // Calcular cantidad total para promociones
                  const cantidadTotal = item.cantidadTotal || item.cantidad;
                  const unidadesGratis = item.unidadesGratis || 0;
                  const cantidadOriginal = item.cantidadOriginal || item.cantidad;
                  
                  return `
                  <tr>
                    <td class="producto-nombre texto-largo">${item.producto_info?.nombre || item.nombre_producto || item.producto || 'Producto'}</td>
                    <td style="text-align:center; font-size: ${L.tablaTd};">${formatMoneda(item.precio_unitario)}</td>
                    <td style="text-align:center; font-size: ${L.tablaTd};">${cantidadTotal}${unidadesGratis > 0 ? ` (${cantidadOriginal}+${unidadesGratis} gratis)` : ''}</td>
                    <td style="text-align:right; font-weight:900; font-size: ${L.tablaTd};">${formatMoneda(item.precio_total)}</td>
                  </tr>
                `;
                }).join('') : `
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; font-size: ${L.htmlNoProductos};">No hay productos en esta venta</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
          <hr class="separador-doble">
          <div class="seccion">
            <div class="fila"><span class="col-izq">SUBTOTAL:</span><span class="col-der numero">${formatMoneda(venta.subtotal || 0)}</span></div>
            ${(venta.descuento || 0) > 0 ? `<div class="fila"><span class="col-izq">DESCUENTO:</span><span class="col-der numero">-${formatMoneda(venta.descuento)}</span></div>` : ''}
          </div>
          <div style="background: #000; margin: ${L.htmlTotalBannerMargin}; padding: ${L.htmlTotalBannerPad}; text-align: center; border: 3px double #fff;">
            <div style="color: #FFF !important; font-size: ${L.htmlTotalPagarTitle} !important; font-weight: 900 !important; margin-bottom: 8px;">TOTAL A PAGAR</div>
            <div style="color: #FFF !important; font-size: ${L.htmlTotalPagarMonto} !important; font-weight: 900 !important; letter-spacing: 1px;">${formatMoneda(venta.total || 0)}</div>
          </div>
          <div class="seccion">
            <div class="fila"><span class="col-izq">FORMA DE PAGO:</span><span class="col-der">${(venta.metodo_pago || 'efectivo').toUpperCase()}</span></div>
            <div class="fila"><span class="col-izq">ESTADO:</span><span class="col-der">${(venta.estado || 'completada').toUpperCase()}</span></div>
          </div>
        </div>
        
        <div class="ticket-footer">
          <hr class="separador-doble">
          <div class="footer">
            <div class="footer-importante">¡GRACIAS POR SU COMPRA!</div>
            <div>Conserve este ticket como comprobante</div>
            ${empresaConfig.cuit ? `<div style="margin-top: 10px; font-size: ${L.subtitulo};">CUIT: ${empresaConfig.cuit}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  };
  
  // Verificar que venta existe antes de procesarla
  if (!venta) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-500">Error: No se encontraron datos de la venta</p>
          <button
            onClick={onClose}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (cargandoConfig) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-center">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (autoPrintAfterLoad) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header con botones */}
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FaReceipt className="mr-2" />
              Ticket de Venta - {venta.numero}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={imprimirTicket}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
              >
                <FaPrint className="mr-1" /> Imprimir
              </button>
              {!hidePdfButton && (
              <button
                onClick={descargarPDF}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none"
              >
                <FaDownload className="mr-1" /> Descargar PDF
              </button>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 focus:outline-none"
              >
                <FaTimes className="mr-1" /> Cerrar
              </button>
            </div>
          </div>
          {/* Contenido del ticket con scroll */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            <div className="flex justify-center">
              {formatoSeleccionado === 'termico' ? (
                // Vista previa térmica (ancho según rollo 80 / 58 mm)
                <div 
                  ref={ticketTermicoRef}
                  className="ticket-container bg-white p-4 border-2 border-gray-300"
                  style={{ 
                    fontFamily: 'Consolas, Courier New, monospace', 
                    fontSize: '14px',
                    fontWeight: '700',
                    width: `${L.previewWidthPx}px`,
                    margin: '0 auto',
                    backgroundColor: 'white',
                    color: '#000'
                  }}
                >
                  {/* Vista previa del ticket con estilos inline para simular impresión */}
                  <div dangerouslySetInnerHTML={{ __html: generarHTMLTermico() }} />
                </div>
              ) : (
                // Template A4
                <div 
                  ref={ticketA4Ref}
                  className="bg-white p-8"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '12px',
                    width: '210mm',
                    minHeight: '297mm',
                    margin: '0 auto'
                  }}
                >
                  {/* Contenido A4 - mantener el original */}
                  {/* ... código A4 existente ... */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketVenta;