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
import { useAuth } from '../../contexts/AuthContext';

const MobileDashboard = () => {
  const { currentUser } = useAuth();
  const esAdmin = ['admin', 'administrador', 'gerente'].includes(
    String(currentUser?.rol || currentUser?.role || '').toLowerCase()
  ) || currentUser?.isAdmin === true;

  const dashboardItems = [
    {
      title: 'Punto de Venta',
      icon: FaShoppingCart,
      path: '/ventas',
      color: 'bg-blue-500',
      description: 'Realizar ventas',
      adminOnly: false
    },
    {
      title: 'Clientes',
      icon: FaUsers,
      path: '/clientes',
      color: 'bg-green-500',
      description: 'Gestionar clientes',
      adminOnly: true
    },
    {
      title: 'Productos',
      icon: FaBoxes,
      path: '/productos',
      color: 'bg-purple-500',
      description: 'Gestionar inventario',
      adminOnly: true
    },
    {
      title: 'Reportes',
      icon: FaChartBar,
      path: '/reportes',
      color: 'bg-orange-500',
      description: 'Ver estadísticas',
      adminOnly: true
    },
    {
      title: 'Compras',
      icon: FaTruck,
      path: '/compras',
      color: 'bg-red-500',
      description: 'Gestionar compras',
      adminOnly: true
    },
    {
      title: 'Stock',
      icon: FaClipboardList,
      path: '/stock',
      color: 'bg-indigo-500',
      description: 'Control de stock',
      adminOnly: true
    },
    {
      title: 'Caja',
      icon: FaMoneyBillWave,
      path: '/caja',
      color: 'bg-yellow-500',
      description: 'Control de caja',
      adminOnly: true
    },
    {
      title: 'Configuración',
      icon: FaCog,
      path: '/configuracion',
      color: 'bg-gray-500',
      description: 'Ajustes del sistema',
      adminOnly: true
    }
  ];

  const itemsVisibles = dashboardItems.filter((item) => esAdmin || !item.adminOnly);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {esAdmin ? 'Sistema de Gestión' : 'Mostrador'}
        </h1>
        <p className="text-gray-600 mt-2">
          {esAdmin ? 'Bienvenido al panel de control' : 'Acceso rápido al punto de venta'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {itemsVisibles.map((item, index) => {
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