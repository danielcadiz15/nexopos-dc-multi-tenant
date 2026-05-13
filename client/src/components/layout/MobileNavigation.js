/**
 * Componente de navegación móvil inferior
 * 
 * Barra de navegación fija en la parte inferior para dispositivos móviles
 * 
 * @module components/layout/MobileNavigation
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaBoxes, 
  FaUsers,
  FaChartBar 
} from 'react-icons/fa';

const MobileNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    { 
      to: '/', 
      icon: FaHome, 
      label: 'Inicio',
      exact: true 
    },
    { 
      to: '/punto-venta', 
      icon: FaShoppingCart, 
      label: 'Vender',
      exact: false 
    },
    { 
      to: '/productos', 
      icon: FaBoxes, 
      label: 'Stock',
      exact: false 
    },
    { 
      to: '/clientes', 
      icon: FaUsers, 
      label: 'Clientes',
      exact: false 
    },
    { 
      to: '/reportes', 
      icon: FaChartBar, 
      label: 'Reportes',
      exact: false 
    }
  ];

  return (
    <nav className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-md">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const isActive = item.exact 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);
            
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`
                flex flex-col items-center justify-center py-2 px-3 flex-1
                transition-colors duration-200 relative
                ${isActive
                  ? 'text-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
                }
              `}
            >
              <item.icon 
                size={20} 
                className={`mb-1 ${isActive ? 'transform scale-110' : ''}`}
              />
              <span className="text-xs font-medium">{item.label}</span>
              
              {/* Indicador activo */}
              {isActive && (
                <div className="absolute left-1/2 top-0 h-0.5 w-10 -translate-x-1/2 rounded-b-full bg-gradient-to-r from-indigo-600 to-violet-600" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;