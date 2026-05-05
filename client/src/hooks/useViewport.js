import { useState, useEffect } from 'react';

/**
 * Dimensiones actuales de la ventana (útil para compactar UI en pantallas bajas).
 */
export default function useViewport() {
  const [vp, setVp] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 700
  }));

  useEffect(() => {
    const onResize = () => {
      setVp({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return vp;
}
