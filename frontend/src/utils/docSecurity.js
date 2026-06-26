import QRCode from 'qrcode';

export async function generateDocHash(rev) {
  const data = `${rev.id}|${rev.nombre_completo || ''}|${rev.fecha_revision || ''}|${rev.auditor_nombre || ''}`;
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateQR(url) {
  return QRCode.toDataURL(url, { width: 100, margin: 1, color: { dark: '#000', light: '#fff' } });
}

export function fmtFolio(id) {
  return `SICH-${String(id).padStart(6, '0')}`;
}
