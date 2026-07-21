/**
 * Recibe un dataURL de firma (JPEG con posible fondo negro) y devuelve
 * un nuevo dataURL con fondo blanco. Funciona reemplazando píxeles
 * casi-negros (fondo transparente convertido a negro por JPEG) con blanco.
 * Los píxeles de la tinta (color ~#1e293b, R≈30) no se alteran.
 */
export function fixSignatureBg(dataUrl) {
  if (!dataUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 500;
      canvas.height = img.naturalHeight || 160;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Píxeles con R,G,B < 20 son fondo negro; tinta (#1e293b) tiene R≈30
        if (d[i] < 20 && d[i + 1] < 20 && d[i + 2] < 20) {
          d[i] = d[i + 1] = d[i + 2] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
