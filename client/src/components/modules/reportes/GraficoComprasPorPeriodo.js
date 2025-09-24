/**
 * Gráfico de Compras por Período
 * 
 * Muestra un gráfico de líneas o barras con las compras agrupadas por período
 * 
 * @module components/modules/reportes/GraficoComprasPorPeriodo
 * @requires react, recharts
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

/**
 * Componente de gráfico de compras por período
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.datos - Datos para el gráfico
 * @param {string} props.tipo - Tipo de gráfico ('linea' o 'barra')
 * @returns {JSX.Element} Componente GraficoComprasPorPeriodo
 */
const GraficoComprasPorPeriodo = ({ datos = [], tipo = 'barra' }) => {
  if (!datos || datos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  /**
   * Formatea un valor numérico a formato de moneda
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearMoneda = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };

  /**
   * Formatea una fecha para mostrar
   * @param {string} fecha - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: 'short' 
    });
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
          <p className="font-medium text-gray-900">{formatearFecha(label)}</p>
          <p className="text-indigo-600">
            <span className="font-medium">Total:</span> {formatearMoneda(payload[0].value)}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Compras:</span> {payload[0].payload.cantidad}
          </p>
        </div>
      );
    }
    
    return null;
  };

  const commonProps = {
    data: datos,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {tipo === 'linea' ? (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="fecha" 
            tickFormatter={formatearFecha}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={formatearMoneda}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#8884d8" 
            name="Total Compras"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      ) : (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="fecha" 
            tickFormatter={formatearFecha}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={formatearMoneda}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="total" 
            fill="#8884d8" 
            name="Total Compras"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      )}
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
  ),
  tipo: PropTypes.oneOf(['linea', 'barra'])
};

GraficoComprasPorPeriodo.defaultProps = {
  datos: [],
  tipo: 'barra'
};

export default GraficoComprasPorPeriodo;