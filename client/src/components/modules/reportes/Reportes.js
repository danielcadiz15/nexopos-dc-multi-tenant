/**
 * Página principal de reportes
 * 
 * Muestra las diferentes opciones de reportes disponibles en el sistema.
 * 
 * @module pages/reportes/Reportes
 * @requires react, react-router-dom
 * @related_files ./ReporteVentas.js, ./ReporteCompras.js, ./ReporteGanancias.js
 */

import React from 'react';
import { Link } from 'react-router-dom';

// Componentes
import Card from '../../components/common/Card';

// Iconos
import { 
  FaChartBar, FaChartLine, FaChartPie, FaShoppingBag,
  FaShoppingCart, FaDollarSign, FaCalendarAlt, FaFileAlt
} from 'react-icons/fa';

/**
 * Componente de página principal de reportes
 * @returns {JSX.Element} Componente Reportes
 */
const Reportes = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Reportes e Informes</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjeta: Reporte de Ventas */}
        <Link to="/reportes/ventas" className="block transition transform hover:scale-105">
          <Card
            title="Ventas"
            icon={<FaShoppingBag />}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Análisis detallado de ventas por períodos, productos y clientes.
                </p>
                <div className="flex space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FaCalendarAlt className="mr-1" /> Diario
                  </span>
                  <span className="flex items-center">
                    <FaCalendarAlt className="mr-1" /> Mensual
                  </span>
                  <span className="flex items-center">
                    <FaCalendarAlt className="mr-1" /> Anual
                  </span>
                </div>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                <FaChartLine className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
        
        {/* Tarjeta: Reporte de Compras */}
        <Link to="/reportes/compras" className="block transition transform hover:scale-105">
          <Card
            title="Compras"
            icon={<FaShoppingCart />}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Registro de compras a proveedores, gastos e inventario adquirido.
                </p>
                <div className="flex space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FaCalendarAlt className="mr-1" /> Por Período
                  </span>
                  <span className="flex items-center">
                    <FaFileAlt className="mr-1" /> Por Proveedor
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 text-green-600 rounded-full">
                <FaChartBar className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
        
        {/* Tarjeta: Reporte de Ganancias */}
        <Link to="/reportes/ganancias" className="block transition transform hover:scale-105">
          <Card
            title="Ganancias"
            icon={<FaDollarSign />}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Análisis de márgenes, rentabilidad y proyecciones financieras.
                </p>
                <div className="flex space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FaCalendarAlt className="mr-1" /> Por Período
                  </span>
                  <span className="flex items-center">
                    <FaChartLine className="mr-1" /> Tendencias
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                <FaChartPie className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
        
        {/* Tarjeta: Productos Más Vendidos */}
        <Link to="/reportes/productos-vendidos" className="block transition transform hover:scale-105">
          <Card
            title="Productos Más Vendidos"
            icon={<FaChartBar />}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Ranking de productos por volumen de ventas y rentabilidad.
                </p>
                <div className="flex space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FaCalendarAlt className="mr-1" /> Top 10
                  </span>
                  <span className="flex items-center">
                    <FaChartLine className="mr-1" /> Comparativas
                  </span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
                <FaChartBar className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
        
        {/* Tarjeta: Stock y Movimientos */}
        <Link to="/reportes/stock" className="block transition transform hover:scale-105">
          <Card
            title="Stock y Movimientos"
            icon={<FaChartBar />}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Análisis de rotación de inventario y movimientos de productos.
                </p>
                <div className="flex space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FaChartLine className="mr-1" /> Rotación
                  </span>
                  <span className="flex items-center">
                    <FaFileAlt className="mr-1" /> Movimientos
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <FaChartBar className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
        
        {/* Tarjeta: Personalizado */}
        <Link to="/reportes/personalizado" className="block transition transform hover:scale-105">
          <Card
            title="Reporte Personalizado"
            icon={<FaFileAlt />}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Crea reportes con parámetros y criterios personalizados.
                </p>
                <div className="flex space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FaFileAlt className="mr-1" /> Configurable
                  </span>
                  <span className="flex items-center">
                    <FaChartLine className="mr-1" /> Exportable
                  </span>
                </div>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <FaFileAlt className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
      </div>
      
      {/* Sección de KPIs */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Indicadores Clave de Rendimiento (KPIs)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">$14,359.25</div>
              <div className="text-sm text-gray-500">Ventas del Mes</div>
              <div className="text-xs text-green-600 mt-1 flex items-center justify-center">
                <FaChartLine className="mr-1" /> +15% respecto al mes anterior
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$5,832.10</div>
              <div className="text-sm text-gray-500">Ganancias del Mes</div>
              <div className="text-xs text-green-600 mt-1 flex items-center justify-center">
                <FaChartLine className="mr-1" /> +8% respecto al mes anterior
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">45</div>
              <div className="text-sm text-gray-500">Productos con Stock Bajo</div>
              <div className="text-xs text-red-600 mt-1 flex items-center justify-center">
                <FaChartLine className="mr-1" /> +12% respecto al mes anterior
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reportes;