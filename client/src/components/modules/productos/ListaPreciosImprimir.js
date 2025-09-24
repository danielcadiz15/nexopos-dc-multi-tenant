import React, { useState, useRef, useEffect } from 'react';
import configuracionService from '../../../services/configuracion.service';

const ListaPreciosImprimir = ({ productos = [], categorias = [], onClose }) => {
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [tipoLista, setTipoLista] = useState('posadas');
  const [incluirStock, setIncluirStock] = useState(false);
  const [mostrarCodigo, setMostrarCodigo] = useState(true);
  const [configEmpresa, setConfigEmpresa] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    configuracionService.obtener().then(setConfigEmpresa);
  }, []);

  // Iconos SVG inline
  const PrintIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  // Filtrar productos
  const productosFiltrados = productos.filter(p => 
    !filtroCategoria || p.categoria_id === filtroCategoria
  );

  // Agrupar por categoría
  const productosAgrupados = productosFiltrados.reduce((acc, producto) => {
    const categoria = categorias.find(c => c.id === producto.categoria_id)?.nombre || 'Sin categoría';
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(producto);
    return acc;
  }, {});

  // Obtener precio según lista seleccionada
  const obtenerPrecio = (producto) => {
    if (tipoLista === 'todas') return null;
    return producto.listas_precios?.[tipoLista] || producto.precio_venta || 0;
  };

  // Formatear precio
  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  };

  // Imprimir
  const handlePrint = () => {
    window.print();
  };

  // Generar CSV para descargar
  const handleDownloadCSV = () => {
    try {
      // Preparar headers
      const headers = ['Categoría', mostrarCodigo ? 'Código' : '', 'Producto'];
      
      if (tipoLista === 'todas') {
        headers.push('Mayorista', 'Interior', 'Posadas');
      } else {
        headers.push('Precio');
      }
      
      if (incluirStock) {
        headers.push('Stock');
      }
      
      // Filtrar headers vacíos
      const finalHeaders = headers.filter(h => h !== '');
      
      // Preparar datos
      const rows = [];
      
      Object.entries(productosAgrupados).forEach(([categoria, prods]) => {
        prods.forEach(producto => {
          const row = [categoria];
          
          if (mostrarCodigo) {
            row.push(producto.codigo || '');
          }
          
          row.push(producto.nombre || '');
          
          if (tipoLista === 'todas') {
            row.push(formatearPrecio(producto.listas_precios?.mayorista || producto.precio_venta));
            row.push(formatearPrecio(producto.listas_precios?.interior || producto.precio_venta));
            row.push(formatearPrecio(producto.listas_precios?.posadas || producto.precio_venta));
          } else {
            row.push(formatearPrecio(obtenerPrecio(producto)));
          }
          
          if (incluirStock) {
            row.push(producto.stock_actual || 0);
          }
          
          rows.push(row);
        });
      });
      
      // Crear CSV
      const csvContent = [
        finalHeaders.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista_precios_${tipoLista}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Notificación simple
      alert('Lista de precios descargada correctamente');
    } catch (error) {
      console.error('Error al generar CSV:', error);
      alert('Error al generar el archivo');
    }
  };

  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    if (printRef.current) {
      html2pdf()
        .from(printRef.current)
        .set({
          margin: 10,
          filename: `ListaPrecios_${new Date().toLocaleDateString()}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .save();
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Controles (no se imprimen) */}
      <div className="print:hidden sticky top-0 bg-white shadow-md p-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Vista Previa - Lista de Precios</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <CloseIcon />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
            
            <select
              value={tipoLista}
              onChange={(e) => setTipoLista(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="mayorista">Mayorista</option>
              <option value="interior">Interior</option>
              <option value="posadas">Posadas</option>
              <option value="todas">Todas las listas</option>
            </select>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={incluirStock}
                onChange={(e) => setIncluirStock(e.target.checked)}
                className="rounded"
              />
              <span>Incluir Stock</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={mostrarCodigo}
                onChange={(e) => setMostrarCodigo(e.target.checked)}
                className="rounded"
              />
              <span>Mostrar Código</span>
            </label>
            
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                <PrintIcon /> Imprimir
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <DownloadIcon /> CSV
              </button>
              <button onClick={handleDownloadPDF} className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido para imprimir */}
      <div ref={printRef} className="max-w-7xl mx-auto p-8 bg-white">
        {/* Header OPTIMIZADO */}
        <div className="print-header mb-4 text-center border-b-2 border-blue-600 pb-3">
          {configEmpresa && (
            <div className="mb-2 text-center">
              {configEmpresa.logo_url && (
                <img src={configEmpresa.logo_url} alt="Logo" style={{ maxHeight: 40, margin: '0 auto' }} />
              )}
              <h2 className="text-lg font-bold">{configEmpresa.nombre_fantasia || configEmpresa.razon_social}</h2>
              <div className="text-xs">
                <span>{configEmpresa.direccion}</span> | <span>CUIT: {configEmpresa.cuit}</span> | <span>Tel: {configEmpresa.telefono}</span>
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{configEmpresa?.nombre_fantasia || configEmpresa?.razon_social}</h1>
          <p className="text-sm text-gray-600">Lista de Precios - {tipoLista === 'todas' ? 'Todas las Listas' : tipoLista.charAt(0).toUpperCase() + tipoLista.slice(1)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Válida desde: {new Date().toLocaleDateString('es-AR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Productos por categoría OPTIMIZADO */}
        {Object.entries(productosAgrupados).map(([categoria, productosCategoria]) => (
          <div key={categoria} className="mb-4">
            <h2 className="categoria-header text-gray-800">
              {categoria}
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full print-table">
                <thead>
                  <tr className="bg-gray-100">
                    {mostrarCodigo && (
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Código</th>
                    )}
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Producto</th>
                    {tipoLista === 'todas' ? (
                      <>
                        <th className="text-right py-2 px-2 font-semibold text-gray-700">Mayorista</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-700">Interior</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-700">Posadas</th>
                      </>
                    ) : (
                      <th className="text-right py-2 px-2 font-semibold text-gray-700">Precio</th>
                    )}
                    {incluirStock && (
                      <th className="text-center py-2 px-2 font-semibold text-gray-700">Stock</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {productosCategoria.map((producto, index) => (
                    <tr key={producto.id} className={`producto-row ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {mostrarCodigo && (
                        <td className="py-1 px-2 text-gray-600">{producto.codigo}</td>
                      )}
                      <td className="py-1 px-2 font-medium text-gray-800">{producto.nombre}</td>
                      {tipoLista === 'todas' ? (
                        <>
                          <td className="text-right py-1 px-2 font-semibold text-green-700">
                            {formatearPrecio(producto.listas_precios?.mayorista || producto.precio_venta)}
                          </td>
                          <td className="text-right py-1 px-2 font-semibold text-blue-700">
                            {formatearPrecio(producto.listas_precios?.interior || producto.precio_venta)}
                          </td>
                          <td className="text-right py-1 px-2 font-semibold text-purple-700">
                            {formatearPrecio(producto.listas_precios?.posadas || producto.precio_venta)}
                          </td>
                        </>
                      ) : (
                        <td className="text-right py-1 px-2 font-semibold text-blue-700">
                          {formatearPrecio(obtenerPrecio(producto))}
                        </td>
                      )}
                      {incluirStock && (
                        <td className="text-center py-1 px-2">
                          <span className={`inline-block px-1 py-0 rounded text-xs font-medium ${
                            producto.stock_actual > 10 
                              ? 'bg-green-100 text-green-800' 
                              : producto.stock_actual > 0 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {producto.stock_actual}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Footer OPTIMIZADO */}
        <div className="print-footer mt-4 pt-2 border-t-1 border-gray-300 text-center text-gray-600">
          <div className="text-center text-xs text-gray-500">
            Esta lista de precios está sujeta a modificaciones sin previo aviso.
          </div>
          <p className="text-xs">
            Los precios están sujetos a cambios sin previo aviso • Precios expresados en pesos argentinos
          </p>
        </div>
      </div>

      {/* Estilos de impresión OPTIMIZADOS */}
      <style>{`
@page {
  size: A4 portrait;
  margin: 8mm 5mm 8mm 5mm;
}
@media print {
  body {
    font-size: 10px !important;
    line-height: 1.2 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .print-table {
    font-size: 9px !important;
    width: 100% !important;
    border-collapse: collapse !important;
  }
  .print-table th, .print-table td {
    font-size: 9px !important;
    padding: 3px 4px !important;
    border: 1px solid #ddd !important;
    vertical-align: top !important;
  }
  .print-table th {
    background-color: #f5f5f5 !important;
    font-weight: bold !important;
  }
  .print-header {
    font-size: 12px !important;
    margin-bottom: 10px !important;
  }
  .print-header h1 {
    font-size: 14px !important;
    margin: 5px 0 !important;
  }
  .print-header h2 {
    font-size: 12px !important;
    margin: 3px 0 !important;
  }
  .print-header p {
    font-size: 10px !important;
    margin: 2px 0 !important;
  }
  /* Optimizar espaciado */
  .mb-8 {
    margin-bottom: 8px !important;
  }
  .mb-4 {
    margin-bottom: 4px !important;
  }
  .py-3 {
    padding-top: 3px !important;
    padding-bottom: 3px !important;
  }
  .px-4 {
    padding-left: 4px !important;
    padding-right: 4px !important;
  }
  /* Evitar cortes de página */
  h1, h2, h3 {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  /* Permitir cortes de tabla pero evitar cortes de filas */
  table {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  /* Optimizar para más productos por página */
  .producto-row {
    height: 12px !important;
    min-height: 12px !important;
  }
  .categoria-header {
    font-size: 10px !important;
    font-weight: bold !important;
    margin: 4px 0 !important;
    padding: 2px 0 !important;
    border-bottom: 1px solid #333 !important;
  }
  /* Footer más compacto */
  .print-footer {
    font-size: 8px !important;
    margin-top: 5px !important;
    padding-top: 3px !important;
  }
}
`}</style>
    </div>
  );
};

export default ListaPreciosImprimir;