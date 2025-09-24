/**
 * Gráfico de Ventas por Período
 * 
 * Muestra un gráfico de líneas con las ventas agrupadas por día, semana o mes.
 * 
 * @module components/modules/reportes/GraficoVentasPorPeriodo
 * @requires react, recharts
 * @related_files ../../../pages/reportes/ReporteVentas.js
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';

/**
 * Componente de gráfico de ventas por período
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.datos - Datos para el gráfico
 * @returns {JSX.Element} Componente GraficoVentasPorPeriodo
 */
const GraficoVentasPorPeriodo = ({ datos = [] }) => {
  // Validar que haya datos
  if (!datos || datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos disponibles para mostrar
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
   * Personaliza el tooltip del gráfico
   * @param {Object} props - Propiedades del tooltip
   * @returns {JSX.Element} Tooltip personalizado
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      // Buscar los valores por dataKey en lugar de asumir índices
      const totalData = payload.find(p => p.dataKey === 'total');
      const gananciaData = payload.find(p => p.dataKey === 'ganancia');
      const cantidadData = payload.find(p => p.dataKey === 'cantidad');
      
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{label}</p>
          {totalData && totalData.value !== undefined && (
            <p className="text-indigo-600">
              <span className="font-medium">Total:</span> {formatearMoneda(totalData.value)}
            </p>
          )}
          {gananciaData && gananciaData.value !== undefined && (
            <p className="text-green-600">
              <span className="font-medium">Ganancia:</span> {formatearMoneda(gananciaData.value)}
            </p>
          )}
          {cantidadData && cantidadData.value !== undefined && (
            <p className="text-gray-600">
              <span className="font-medium">Ventas:</span> {cantidadData.value}
            </p>
          )}
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
          name="Total Venta" 
          stroke="#4F46E5" 
          fill="#E0E7FF" 
          activeDot={{ r: 8 }}
          strokeWidth={2} 
        />
        <Area 
          type="monotone" 
          dataKey="ganancia" 
          name="Ganancia" 
          stroke="#10B981" 
          fill="#D1FAE5"
          strokeWidth={2} 
        />
        <Line 
          type="monotone" 
          dataKey="cantidad" 
          name="Cantidad Ventas" 
          stroke="#F59E0B" 
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Validación de propiedades
GraficoVentasPorPeriodo.propTypes = {
  datos: PropTypes.arrayOf(
    PropTypes.shape({
      fecha: PropTypes.string.isRequired,
      total: PropTypes.number.isRequired,
      ganancia: PropTypes.number.isRequired,
      cantidad: PropTypes.number.isRequired
    })
  )
};

// Valores por defecto
GraficoVentasPorPeriodo.defaultProps = {
  datos: []
};

export default GraficoVentasPorPeriodo;