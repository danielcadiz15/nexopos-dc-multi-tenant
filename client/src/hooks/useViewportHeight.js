import { useEffect } from 'react';

/**
 * Sincroniza la altura visible (barra del navegador / teclado) con --app-vh-unit (1% de alto útil).
 */
export function useViewportHeight() {
  useEffect(() => {
    const set = () => {
      const h = typeof window.visualViewport !== 'undefined' && window.visualViewport.height
        ? window.visualViewport.height
        : window.innerHeight;
      document.documentElement.style.setProperty('--app-vh-unit', `${h * 0.01}px`);
    };
    set();
    window.addEventListener('resize', set);
    window.addEventListener('orientationchange', set);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', set);
    }
    return () => {
      window.removeEventListener('resize', set);
      window.removeEventListener('orientationchange', set);
      if (vv) {
        vv.removeEventListener('resize', set);
      }
    };
  }, []);
}
