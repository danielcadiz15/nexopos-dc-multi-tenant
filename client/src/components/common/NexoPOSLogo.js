import React from 'react';

const NexoPOSLogo = ({ className = "h-8 w-auto", showText = true }) => {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo SVG simple */}
      <svg 
        viewBox="0 0 100 100" 
        className="h-8 w-8 mr-2"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Círculo de fondo */}
        <circle cx="50" cy="50" r="45" fill="#4F46E5" stroke="#3730A3" strokeWidth="2"/>
        
        {/* Letra N */}
        <path 
          d="M25 30 L25 70 L35 70 L35 45 L65 70 L75 70 L75 30 L65 30 L65 55 L35 30 Z" 
          fill="white"
        />
        
        {/* Punto */}
        <circle cx="50" cy="75" r="3" fill="white"/>
      </svg>
      
      {showText && (
        <span className="text-lg font-bold text-gray-800">
          NexoPOS DC
        </span>
      )}
    </div>
  );
};

export default NexoPOSLogo;
