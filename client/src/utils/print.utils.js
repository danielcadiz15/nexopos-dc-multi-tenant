export const printHtmlDocument = ({ title = 'Ticket', styles = '', bodyHtml = '', onAfterPrint } = {}) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo abrir la impresión');
  }

  const hasFullHtml = typeof bodyHtml === 'string' && /<html[\s>]/i.test(bodyHtml);
  const html = hasFullHtml
    ? bodyHtml
    : `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>${styles}</style>
    </head>
    <body>${bodyHtml}</body>
  </html>`;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (typeof onAfterPrint === 'function') onAfterPrint();
      document.body.removeChild(iframe);
    }, 900);
  }, 300);
};

