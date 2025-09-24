/**
 * Gráfico de Compras por Proveedor
 * 
 * Muestra un gráfico de pastel con la distribución de compras por proveedor
 * 
 * @module components/modules/reportes/GraficoComprasPorProveedor
 * @requires react, recharts
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

/**
 * Componente de gráfico de compras por proveedor
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.datos - Datos para el gráfico
 * @returns {JSX.Element} Componente GraficoComprasPorProveedor
 */
const GraficoComprasPorProveedor = ({ datos = [] }) => {
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
   * Personaliza el tooltip del gráfico
   * @param {Object} props - Propiedades del tooltip
   * @returns {JSX.Element} Tooltip personalizado
   */
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && payload[0].value) {
      const data = payload[0];
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-indigo-600">
            <span className="font-medium">Total:</span> {formatearMoneda(data.value)}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Porcentaje:</span> {(data.payload.porcentaje || 0).toFixed(1)}%
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Compras:</span> {data.payload.cantidad} órdenes
          </p>
        </div>
      );
    }
    
    return null;
  };

  /**
   * Renderiza la etiqueta personalizada
   * @param {Object} props - Propiedades de la etiqueta
   * @returns {JSX.Element} Etiqueta personalizada
   */
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // No mostrar etiquetas para valores muy pequeños

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={datos}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="total"
          nameKey="nombre"
        >
          {datos.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Validación de propiedades
GraficoComprasPorProveedor.propTypes = {
  datos: PropTypes.arrayOf(
    PropTypes.shape({
      proveedor_id: PropTypes.string,
      nombre: PropTypes.string.isRequired,
      total: PropTypes.number.isRequired,
      cantidad: PropTypes.number.isRequired,
      porcentaje: PropTypes.number
    })
  )
};

GraficoComprasPorProveedor.defaultProps = {
  datos: []
};

export default GraficoComprasPorProveedor;