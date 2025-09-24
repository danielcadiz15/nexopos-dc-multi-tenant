import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaUsers, 
  FaBoxes, 
  FaChartBar,
  FaCog,
  FaMoneyBillWave,
  FaClipboardList,
  FaTruck
} from 'react-icons/fa';

const MobileDashboard = () => {
  const dashboardItems = [
    {
      title: 'Punto de Venta',
      icon: FaShoppingCart,
      path: '/ventas',
      color: 'bg-blue-500',
      description: 'Realizar ventas'
    },
    {
      title: 'Clientes',
      icon: FaUsers,
      path: '/clientes',
      color: 'bg-green-500',
      description: 'Gestionar clientes'
    },
    {
      title: 'Productos',
      icon: FaBoxes,
      path: '/productos',
      color: 'bg-purple-500',
      description: 'Gestionar inventario'
    },
    {
      title: 'Reportes',
      icon: FaChartBar,
      path: '/reportes',
      color: 'bg-orange-500',
      description: 'Ver estadísticas'
    },
    {
      title: 'Compras',
      icon: FaTruck,
      path: '/compras',
      color: 'bg-red-500',
      description: 'Gestionar compras'
    },
    {
      title: 'Stock',
      icon: FaClipboardList,
      path: '/stock',
      color: 'bg-indigo-500',
      description: 'Control de stock'
    },
    {
      title: 'Caja',
      icon: FaMoneyBillWave,
      path: '/caja',
      color: 'bg-yellow-500',
      description: 'Control de caja'
    },
    {
      title: 'Configuración',
      icon: FaCog,
      path: '/configuracion',
      color: 'bg-gray-500',
      description: 'Ajustes del sistema'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sistema de Gestión</h1>
        <p className="text-gray-600 mt-2">Bienvenido al panel de control</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {dashboardItems.map((item, index) => {
          const Icon = item.icon;
          
          return (
            <Link
              key={index}
              to={item.path}
              className="block"
            >
              <div className={`${item.color} rounded-lg p-4 text-white shadow-lg transition-transform duration-200 hover:scale-105`}>
                <div className="flex flex-col items-center text-center">
                  <Icon className="text-3xl mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs opacity-90">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Resumen rápido */}
      <div className="mt-8 bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Resumen del Día</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$0</div>
            <div className="text-sm text-gray-600">Ventas Hoy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Transacciones</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard; 