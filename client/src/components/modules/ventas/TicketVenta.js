/**
 * Componente para generar y mostrar tickets de venta
 * Optimizado para impresora térmica Nictom IT03 80mm
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

/**
 * Componente de ticket de venta optimizado para Nictom IT03
 */
const TicketVenta = ({ venta, onClose }) => {
  const ticketTermicoRef = useRef();
  const ticketA4Ref = useRef();
  
  // Estado para configuración de empresa
  const [empresaConfig, setEmpresaConfig] = useState({
    razon_social: 'LA FABRICA',
    nombre_fantasia: 'LA FABRICA',
    slogan: '',
    cuit: '20-12345678-9',
    direccion_calle: '123 Calle Principal',
    direccion_localidad: 'Ciudad',
    direccion_provincia: 'Provincia',
    telefono_principal: '(123) 456-7890',
    email: 'info@lafabrica.com',
    logo_url: '',
    mostrar_logo: true
  });
  
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
      
    const ventanaImpresion = window.open('', '_blank');
    
    // Estilos MEJORADOS para Nictom IT03 - Letras más grandes y mejor formato
    const estilos = formatoSeleccionado === 'termico' ? `
      @page { 
        size: 80mm auto; 
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
        font-size: 18px !important; /* AUMENTADO de 16px a 18px */
        font-weight: 800;
        line-height: 1.5; /* MEJORADO de 1.4 a 1.5 */
        margin: 0;
        padding: 5mm; /* AUMENTADO de 3mm a 5mm */
        width: 70mm; /* REDUCIDO de 74mm a 70mm para más margen */
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
        margin-bottom: 15px; /* AUMENTADO de 10px a 15px */
        font-weight: 900;
      }
      .titulo-principal {
        font-size: 28px !important; /* AUMENTADO de 24px a 28px */
        font-weight: 900 !important;
        letter-spacing: 1px;
        margin: 8px 0; /* AUMENTADO de 5px a 8px */
        text-transform: uppercase;
        line-height: 1.2;
      }
      .subtitulo {
        font-size: 16px !important; /* AUMENTADO de 14px a 16px */
        margin: 4px 0; /* AUMENTADO de 3px a 4px */
        line-height: 1.3;
      }
      .separador {
        border: none;
        border-top: 3px solid #000;
        margin: 12px 0; /* AUMENTADO de 10px a 12px */
        height: 0;
      }
      .separador-doble {
        border: none;
        border-top: 5px double #000;
        margin: 12px 0; /* AUMENTADO de 10px a 12px */
        height: 0;
      }
      .seccion {
        margin: 12px 0; /* AUMENTADO de 10px a 12px */
      }
      .fila {
        display: flex;
        justify-content: space-between;
        margin: 6px 0; /* AUMENTADO de 5px a 6px */
        align-items: center;
        min-height: 20px; /* ALTURA MÍNIMA para evitar cortes */
      }
      .col-izq {
        font-weight: 800;
        font-size: 16px !important; /* AUMENTADO */
        flex: 1;
        text-align: left;
      }
      .col-der {
        font-weight: 900;
        text-align: right;
        font-size: 16px !important; /* AUMENTADO */
        flex: 1;
        word-break: break-word;
      }
      .tabla-productos {
        width: 100%;
        margin: 12px 0; /* AUMENTADO de 10px a 12px */
        border-collapse: collapse;
      }
      .tabla-productos td {
        padding: 6px 3px; /* AUMENTADO de 5px 2px a 6px 3px */
        font-weight: 800;
        vertical-align: top;
        font-size: 15px !important; /* AUMENTADO */
        line-height: 1.3;
        word-wrap: break-word;
        max-width: 0; /* Permite que el texto se ajuste */
      }
      .tabla-productos th {
        font-size: 16px !important; /* AUMENTADO */
        font-weight: 900;
        padding: 6px 3px;
        text-align: center;
      }
      .producto-nombre {
        font-weight: 900 !important;
        font-size: 17px !important; /* AUMENTADO de 15px a 17px */
        line-height: 1.2;
        word-wrap: break-word;
        max-width: 0;
      }
      .producto-detalle {
        font-size: 16px !important; /* AUMENTADO de 14px a 16px */
        padding-left: 12px; /* AUMENTADO de 10px a 12px */
        line-height: 1.3;
      }
      .producto-separador {
        border-bottom: 2px dashed #000;
        margin: 6px 0; /* AUMENTADO de 5px a 6px */
      }
      .total-seccion {
        background: #000;
        color: #FFF !important;
        padding: 10px; /* AUMENTADO de 8px a 10px */
        margin: 12px -5mm; /* AUMENTADO de 10px -3mm a 12px -5mm */
        text-align: center;
        border-radius: 3px;
      }
      .total-texto {
        font-size: 22px !important; /* AUMENTADO de 20px a 22px */
        font-weight: 900 !important;
        color: #FFF !important;
        margin-bottom: 5px;
      }
      .total-monto {
        font-size: 26px !important; /* AUMENTADO de 24px a 26px */
        font-weight: 900 !important;
        color: #FFF !important;
      }
      .footer {
        text-align: center;
        margin-top: 18px; /* AUMENTADO de 15px a 18px */
        font-size: 16px !important; /* AUMENTADO de 14px a 16px */
        line-height: 1.4;
      }
      .footer-importante {
        font-weight: 900;
        font-size: 18px !important; /* AUMENTADO de 16px a 18px */
        margin: 12px 0; /* AUMENTADO de 10px a 12px */
        text-transform: uppercase;
      }
      img {
        max-width: 100px !important; /* REDUCIDO de 120px a 100px */
        height: auto !important;
        filter: contrast(2) brightness(0.8);
        margin: 12px auto; /* AUMENTADO de 10px a 12px */
        display: block;
      }
      /* NUEVO: Mejoras para evitar cortes */
      .ticket-content {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .ticket-header {
        flex-shrink: 0;
      }
      .ticket-body {
        flex: 1;
        min-height: 0;
      }
      .ticket-footer {
        flex-shrink: 0;
        margin-top: auto;
      }
      /* NUEVO: Mejoras para texto largo */
      .texto-largo {
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        max-width: 100%;
      }
      /* NUEVO: Mejoras para números */
      .numero {
        font-family: 'Consolas', 'Courier New', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
    ` : `
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
    
    ventanaImpresion.document.write(htmlOptimizado);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
      toast.success('Ticket enviado a la impresora');
    }, 500);
  };

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
            <div style="text-align: center; font-size: 24px; font-weight: 900;">TICKET DE VENTA</div>
            <div style="text-align: center; font-size: 26px; font-weight: 900; margin: 8px 0;">${venta.numero || 'S/N'}</div>
          </div>
          <hr class="separador">
          <div class="seccion">
            <div class="fila"><span class="col-izq">FECHA:</span><span class="col-der numero">${fecha}</span></div>
            <div class="fila"><span class="col-izq">HORA:</span><span class="col-der numero">${hora}</span></div>
            <div class="fila"><span class="col-izq">VENDEDOR:</span><span class="col-der texto-largo">${venta.usuario_nombre || venta.vendedor || 'Sistema'}</span></div>
            ${venta.cliente_nombre && venta.cliente_nombre !== 'Cliente General' ? `
            <div style="text-align: center; margin: 15px 0; padding: 10px; border: 4px double #000;">
              <div style="font-size: 20px; font-weight: 900; margin-bottom: 5px;">CLIENTE:</div>
              <div style="font-size: 28px !important; font-weight: 900 !important; line-height: 1.2;">${venta.cliente_nombre}</div>
            </div>` : ''}
          </div>
          <hr class="separador-doble">
        </div>
        
        <div class="ticket-body">
          <div class="seccion">
            <table class="tabla-productos">
              <thead>
                <tr>
                  <th style="font-weight:900; font-size: 16px;">Producto</th>
                  <th style="font-weight:900; text-align:center; font-size: 16px;">P.Unit</th>
                  <th style="font-weight:900; text-align:center; font-size: 16px;">Cant</th>
                  <th style="font-weight:900; text-align:right; font-size: 16px;">Total</th>
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
                    <td style="text-align:center; font-size: 15px;">${formatMoneda(item.precio_unitario)}</td>
                    <td style="text-align:center; font-size: 15px;">${cantidadTotal}${unidadesGratis > 0 ? ` (${cantidadOriginal}+${unidadesGratis} gratis)` : ''}</td>
                    <td style="text-align:right; font-weight:900; font-size: 15px;">${formatMoneda(item.precio_total)}</td>
                  </tr>
                `;
                }).join('') : `
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; font-size: 16px;">No hay productos en esta venta</td>
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
          <div style="background: #000; margin: 20px -5mm; padding: 15px 5px; text-align: center; border: 3px double #fff;">
            <div style="color: #FFF !important; font-size: 26px !important; font-weight: 900 !important; margin-bottom: 8px;">TOTAL A PAGAR</div>
            <div style="color: #FFF !important; font-size: 36px !important; font-weight: 900 !important; letter-spacing: 1px;">${formatMoneda(venta.total || 0)}</div>
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
            ${empresaConfig.cuit ? `<div style="margin-top: 10px; font-size: 14px;">CUIT: ${empresaConfig.cuit}</div>` : ''}
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

  const { fecha, hora } = formatFechaHora(venta.fecha);

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
              <button
                onClick={descargarPDF}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none"
              >
                <FaDownload className="mr-1" /> Descargar PDF
              </button>
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
                // Template Térmico 80mm - Vista previa
                <div 
                  ref={ticketTermicoRef}
                  className="ticket-container bg-white p-4 border-2 border-gray-300"
                  style={{ 
                    fontFamily: 'Consolas, Courier New, monospace', 
                    fontSize: '14px',
                    fontWeight: '700',
                    width: '320px',
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