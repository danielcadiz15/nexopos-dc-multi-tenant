import { useEffect } from 'react';

/**
 * Sincroniza la altura visible (barra del navegador / teclado) con --app-vh-unit (1% de alto útil).
 */
export function useViewportHeight() {
  useEffect(() => {
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const set = () => {
      const h = typeof window.visualViewport !== 'undefined' && window.visualViewport.height
        ? window.visualViewport.height
        : window.innerHeight;

      const w = window.innerWidth || 1024;
      document.documentElement.style.setProperty('--app-vh-unit', `${h * 0.01}px`);

      // Escala tipográfica global: en pantallas bajas/angostas reduce fuentes para evitar overflow.
      const heightScale = clamp((h - 560) / (900 - 560), 0, 1); // 0..1
      const widthScale = clamp((w - 320) / (430 - 320), 0, 1); // 0..1
      const compactScale = Math.min(heightScale, widthScale);
      const fontScale = 0.82 + compactScale * 0.18; // 0.82..1
      const rootFontSize = clamp(16 * fontScale, 13, 16);

      document.documentElement.style.setProperty('--app-font-scale', fontScale.toFixed(3));
      document.documentElement.style.fontSize = `${rootFontSize.toFixed(2)}px`;
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
