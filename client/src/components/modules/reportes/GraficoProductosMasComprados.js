/**
 * Gráfico de Productos Más Comprados
 * 
 * Muestra un gráfico de barras horizontales con los productos
 * más comprados y su costo correspondiente.
 * 
 * @module components/modules/reportes/GraficoProductosMasComprados
 * @requires react, recharts
 * @related_files ../../../pages/reportes/ReporteCompras.js
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';

/**
 * Componente de gráfico de productos más comprados
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.datos - Datos para el gráfico
 * @returns {JSX.Element} Componente GraficoProductosMasComprados
 */
const GraficoProductosMasComprados = ({ datos }) => {
  // Ordenar datos por cantidad comprada (descendente)
  const datosOrdenados = [...datos]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10); // Mostrar solo los 10 más comprados
  
  /**
   * Formatea un valor numérico a formato de moneda
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearMoneda = (valor) => {
    return `$${parseFloat(valor).toFixed(2)}`;
  };
  
  /**
   * Personaliza el tooltip del gráfico
   * @param {Object} props - Propiedades del tooltip
   * @returns {JSX.Element} Tooltip personalizado
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-indigo-600">
            <span className="font-medium">Cantidad:</span> {payload[0].value} unidades
          </p>
          <p className="text-blue-600">
            <span className="font-medium">Total:</span> {formatearMoneda(payload[1].value)}
          </p>
          <p className="text-gray-600 text-xs">
            <span className="font-medium">Código:</span> {payload[0].payload.codigo}
          </p>
          {payload[0].payload.proveedor && (
            <p className="text-gray-600 text-xs">
              <span className="font-medium">Proveedor:</span> {payload[0].payload.proveedor}
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  /**
   * Formatea nombres largos de productos
   * @param {string} nombre - Nombre completo del producto
   * @returns {string} Nombre formateado
   */
  const formatearNombre = (nombre) => {
    if (nombre.length > 25) {
      return nombre.substring(0, 22) + '...';
    }
    return nombre;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={datosOrdenados}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis 
          type="number"
          tickFormatter={(value) => value}
          domain={[0, 'dataMax + 5']}
          tick={{ fontSize: 12, fill: '#6B7280' }}
        />
        <YAxis 
          dataKey="nombre" 
          type="category"
          tickFormatter={formatearNombre}
          width={100}
          tick={{ fontSize: 12, fill: '#4B5563' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar 
          dataKey="cantidad" 
          name="Cantidad Comprada" 
          fill="#93C5FD"
        >
          <LabelList 
            dataKey="cantidad" 
            position="right" 
            style={{ fill: '#3B82F6', fontWeight: 'bold', fontSize: 12 }} 
          />
        </Bar>
        <Bar 
          dataKey="total" 
          name="Total Compras" 
          fill="#60A5FA"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Validación de propiedades
GraficoProductosMasComprados.propTypes = {
  datos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      nombre: PropTypes.string.isRequired,
      codigo: PropTypes.string.isRequired,
      cantidad: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired,
      proveedor: PropTypes.string
    })
  ).isRequired
};

export default GraficoProductosMasComprados;