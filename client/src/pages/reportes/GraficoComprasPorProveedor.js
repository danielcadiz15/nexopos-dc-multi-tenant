/**
 * Gráfico de Compras por Proveedor
 * 
 * Muestra un gráfico circular con la distribución de compras según
 * el proveedor.
 * 
 * @module components/modules/reportes/GraficoComprasPorProveedor
 * @requires react, recharts
 * @related_files ../../../pages/reportes/ReporteCompras.js
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer, PieChart, Pie, Cell, 
  Legend, Tooltip, Sector
} from 'recharts';

// Colores para proveedores
const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F97316', 
  '#EF4444', '#EC4899', '#F59E0B', '#14B8A6', 
  '#6366F1', '#84CC16'
];

/**
 * Componente de gráfico de compras por proveedor
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.datos - Datos para el gráfico
 * @returns {JSX.Element} Componente GraficoComprasPorProveedor
 */
const GraficoComprasPorProveedor = ({ datos }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  
  /**
   * Maneja el hover sobre una sección del gráfico
   * @param {Object} data - Datos del evento
   * @param {number} index - Índice del elemento
   */
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  /**
   * Renderiza una sección activa del gráfico
   * @param {Object} props - Propiedades para renderizar
   * @returns {JSX.Element} Sección personalizada
   */
  const renderActiveShape = (props) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value
    } = props;
    
    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill={fill} className="text-xl font-semibold">
          {payload.proveedor}
        </text>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#333" className="text-sm">
          ${value.toFixed(2)}
        </text>
        <text x={cx} y={cy} dy={25} textAnchor="middle" fill="#666" className="text-xs">
          {(percent * 100).toFixed(2)}%
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 15}
          outerRadius={outerRadius + 20}
          fill={fill}
        />
      </g>
    );
  };
  
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
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{data.proveedor}</p>
          <p style={{ color: payload[0].color }}>
            <span className="font-medium">Total:</span> {formatearMoneda(data.total)}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Cantidad:</span> {data.cantidad} compras
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Porcentaje:</span> {(data.porcentaje * 100).toFixed(2)}%
          </p>
          {data.contacto && (
            <p className="text-gray-600 text-xs mt-1">
              <span className="font-medium">Contacto:</span> {data.contacto}
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  /**
   * Renderiza entradas personalizadas para la leyenda
   * @param {Object} props - Propiedades de la entrada de leyenda
   * @returns {JSX.Element} Entrada de leyenda personalizada
   */
  const renderCustomizedLegend = (props) => {
    const { payload } = props;
    
    return (
      <div className="flex justify-center flex-wrap gap-4 mt-2">
        {payload.map((entry, index) => (
          <div 
            key={`item-${index}`}
            className="flex items-center cursor-pointer"
            onClick={() => setActiveIndex(index)}
          >
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className={`text-sm ${index === activeIndex ? 'font-bold' : 'text-gray-700'}`}>
              {entry.payload.proveedor}: {formatearMoneda(entry.payload.total)}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  // Preprocesar los datos para añadir porcentaje
  const datosConPorcentaje = React.useMemo(() => {
    const total = datos.reduce((sum, item) => sum + item.total, 0);
    return datos.map(item => ({
      ...item,
      porcentaje: total > 0 ? item.total / total : 0
    }));
  }, [datos]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={datosConPorcentaje}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          dataKey="total"
          nameKey="proveedor"
          onMouseEnter={onPieEnter}
        >
          {datosConPorcentaje.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          content={renderCustomizedLegend}
          verticalAlign="bottom"
          align="center"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Validación de propiedades
GraficoComprasPorProveedor.propTypes = {
  datos: PropTypes.arrayOf(
    PropTypes.shape({
      proveedor_id: PropTypes.number.isRequired,
      proveedor: PropTypes.string.isRequired,
      total: PropTypes.number.isRequired,
      cantidad: PropTypes.number.isRequired,
      contacto: PropTypes.string
    })
  ).isRequired
};

export default GraficoComprasPorProveedor;