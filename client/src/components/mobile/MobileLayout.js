import React from 'react';
import MobileNavigation from './MobileNavigation';

const MobileLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="px-4 py-6">
        {children}
      </div>
      <MobileNavigation />
    </div>
  );
};

export default MobileLayout; 