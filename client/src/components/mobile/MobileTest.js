import React, { useState, useEffect } from 'react';
import { FaMobile, FaTablet, FaDesktop, FaCheck, FaTimes } from 'react-icons/fa';
import useIsMobile from '../../hooks/useIsMobile';

const MobileTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const isMobile = useIsMobile();

  const runTests = async () => {
    setIsRunning(true);
    const results = {};

    // Test 1: Detección de dispositivo móvil
    results.deviceDetection = {
      name: 'Detección de Dispositivo',
      passed: isMobile,
      details: isMobile ? 'Dispositivo móvil detectado correctamente' : 'No se detectó dispositivo móvil'
    };

    // Test 2: Tamaño de pantalla
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    results.screenSize = {
      name: 'Tamaño de Pantalla',
      passed: screenWidth <= 768,
      details: `${screenWidth}x${screenHeight} - ${screenWidth <= 768 ? 'Tamaño móvil' : 'Tamaño desktop'}`
    };

    // Test 3: Capacidades táctiles
    results.touchCapabilities = {
      name: 'Capacidades Táctiles',
      passed: 'ontouchstart' in window,
      details: 'ontouchstart' in window ? 'Soporte táctil disponible' : 'Soporte táctil no disponible'
    };

    // Test 4: User Agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    results.userAgent = {
      name: 'User Agent',
      passed: isMobileDevice,
      details: isMobileDevice ? 'User Agent móvil detectado' : 'User Agent desktop detectado'
    };

    // Test 5: Capacidades de red
    results.networkCapabilities = {
      name: 'Capacidades de Red',
      passed: navigator.onLine,
      details: navigator.onLine ? 'Conexión a internet disponible' : 'Sin conexión a internet'
    };

    // Test 6: Almacenamiento local
    try {
      localStorage.setItem('mobile-test', 'test');
      localStorage.removeItem('mobile-test');
      results.localStorage = {
        name: 'Almacenamiento Local',
        passed: true,
        details: 'localStorage disponible'
      };
    } catch (error) {
      results.localStorage = {
        name: 'Almacenamiento Local',
        passed: false,
        details: 'localStorage no disponible'
      };
    }

    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getDeviceIcon = () => {
    if (window.innerWidth <= 480) return <FaMobile className="text-2xl" />;
    if (window.innerWidth <= 768) return <FaTablet className="text-2xl" />;
    return <FaDesktop className="text-2xl" />;
  };

  const getDeviceType = () => {
    if (window.innerWidth <= 480) return 'Móvil';
    if (window.innerWidth <= 768) return 'Tablet';
    return 'Desktop';
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Prueba de App Móvil</h1>
        <p className="text-gray-600">Verificando funcionalidades móviles</p>
      </div>

      {/* Información del dispositivo */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {getDeviceIcon()}
          <div>
            <h3 className="font-semibold text-lg">{getDeviceType()}</h3>
            <p className="text-sm text-gray-600">
              {window.innerWidth} x {window.innerHeight} px
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">User Agent:</span>
            <p className="text-gray-600 truncate">{navigator.userAgent}</p>
          </div>
          <div>
            <span className="font-medium">Plataforma:</span>
            <p className="text-gray-600">{navigator.platform}</p>
          </div>
        </div>
      </div>

      {/* Resultados de pruebas */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Resultados de Pruebas</h3>
          <button
            onClick={runTests}
            disabled={isRunning}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
          >
            {isRunning ? 'Ejecutando...' : 'Ejecutar Pruebas'}
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(testResults).map(([key, test]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-gray-600">{test.details}</p>
              </div>
              <div className="ml-4">
                {test.passed ? (
                  <FaCheck className="text-green-500 text-xl" />
                ) : (
                  <FaTimes className="text-red-500 text-xl" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-lg mb-4">Estadísticas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(testResults).filter(test => test.passed).length}
            </div>
            <div className="text-sm text-gray-600">Pruebas Exitosas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {Object.values(testResults).filter(test => !test.passed).length}
            </div>
            <div className="text-sm text-gray-600">Pruebas Fallidas</div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-lg mb-4">Recomendaciones</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start space-x-2">
            <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
            <p>Para probar la app móvil, usa las herramientas de desarrollador y simula un dispositivo móvil</p>
          </div>
          <div className="flex items-start space-x-2">
            <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
            <p>La app se adaptará automáticamente al tamaño de pantalla</p>
          </div>
          <div className="flex items-start space-x-2">
            <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
            <p>Usa gestos táctiles para navegar por la aplicación</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTest; 