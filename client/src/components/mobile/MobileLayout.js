import React from 'react';
import MobileNavigation from './MobileNavigation';
import LicenseBanner from '../layout/LicenseBanner';

const MobileLayout = ({ children }) => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gray-50 pb-16">
      <div className="shrink-0">
        <LicenseBanner compact />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
        {children}
      </div>
      <MobileNavigation />
    </div>
  );
};

export default MobileLayout; 