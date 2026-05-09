import { useState, useEffect } from 'react';

function computeIsMobile() {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileDevice || isSmallScreen;
}

/** Evita un primer frame en “no móvil” antes del useEffect (evitaba parpadeos / rutas incorrectas). */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(computeIsMobile);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(computeIsMobile());
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

export default useIsMobile; 