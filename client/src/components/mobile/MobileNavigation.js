import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaUsers, 
  FaBoxes, 
  FaChartBar,
  FaCog
} from 'react-icons/fa';

const MobileNavigation = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: FaHome,
      path: '/'
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: FaShoppingCart,
      path: '/ventas'
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: FaUsers,
      path: '/clientes'
    },
    {
      id: 'productos',
      label: 'Productos',
      icon: FaBoxes,
      path: '/productos'
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: FaChartBar,
      path: '/reportes'
    },
    {
      id: 'configuracion',
      label: 'Config',
      icon: FaCog,
      path: '/configuracion'
    }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              <Icon className="text-xl mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation; 