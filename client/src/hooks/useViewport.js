import { useState, useEffect } from 'react';

/**
 * Dimensiones actuales de la ventana (útil para compactar UI en pantallas bajas).
 */
export default function useViewport() {
  const readViewport = () => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 700, visualHeight: 700 };
    }
    const vv = window.visualViewport;
    const width = vv && typeof vv.width === 'number' && vv.width > 0
      ? Math.round(vv.width)
      : window.innerWidth;
    const visualHeight = vv && typeof vv.height === 'number' && vv.height > 40
      ? Math.round(vv.height)
      : window.innerHeight;
    return {
      width,
      height: window.innerHeight,
      visualHeight
    };
  };

  const [vp, setVp] = useState(() => ({
    ...readViewport()
  }));

  useEffect(() => {
    const onResize = () => {
      setVp(readViewport());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (vv) vv.removeEventListener('resize', onResize);
    };
  }, []);

  return vp;
}
