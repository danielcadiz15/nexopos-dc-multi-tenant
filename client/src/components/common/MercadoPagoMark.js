import React from 'react';

/** Marca “Mercado Pago” compacta para la UI (estilo marca MP, sin recurso externo). */
export default function MercadoPagoMark({ className = 'h-8 w-auto', ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mercado Pago"
      viewBox="0 0 152 34"
      className={className}
      {...rest}
    >
      <rect width="152" height="34" rx="5" fill="#009ee3" />
      <text
        x="76"
        y="22"
        fill="#fff"
        textAnchor="middle"
        fontFamily="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        fontSize="12"
        fontWeight="700"
        letterSpacing="0.02em"
      >
        Mercado Pago
      </text>
    </svg>
  );
}
