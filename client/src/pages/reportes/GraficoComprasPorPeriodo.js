/**
 * Gráfico de Compras por Período
 * 
 * Muestra un gráfico de líneas con las compras agrupadas por día, semana o mes.
 * 
 * @module components/modules/reportes/GraficoComprasPorPeriodo
 * @requires react, recharts
 * @related_files ../../../pages/reportes/ReporteCompras.js
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';

/**
 * Componente de gráfico de compras por período
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.datos - Datos para el gráfico
 * @returns {JSX.Element} Componente GraficoComprasPorPeriodo
 */
const GraficoComprasPorPeriodo = ({ datos }) => {
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
          <p className="text-blue-600">
            <span className="font-medium">Total:</span> {formatearMoneda(payload[0].value)}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Compras:</span> {payload[1].value}
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={datos}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="fecha" 
          tickMargin={10}
          tick={{ fontSize: 12, fill: '#6B7280' }}
        />
        <YAxis 
          tickFormatter={(value) => `$${value}`}
          tick={{ fontSize: 12, fill: '#6B7280' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="total" 
          name="Total Compra" 
          stroke="#3B82F6" 
          fill="#DBEAFE" 
          activeDot={{ r: 8 }}
          strokeWidth={2} 
        />
        <Line 
          type="monotone" 
          dataKey="cantidad" 
          name="Cantidad Compras" 
          stroke="#F97316" 
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Validación de propiedades
GraficoComprasPorPeriodo.propTypes = {
  datos: PropTypes.arrayOf(
    PropTypes.shape({
      fecha: PropTypes.string.isRequired,
      total: PropTypes.number.isRequired,
      cantidad: PropTypes.number.isRequired
    })
  ).isRequired
};

export default GraficoComprasPorPeriodo;