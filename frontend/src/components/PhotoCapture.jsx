import { useRef, useState } from 'react';

function compressImage(file, maxPx = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoCapture({ label, onCapture, value, multiple = false, sublabel = '' }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [previews, setPreviews] = useState(multiple ? (value || []) : (value ? [value] : []));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    const compressed = await Promise.all(files.map(f => compressImage(f)));
    if (multiple) {
      const all = [...previews, ...compressed];
      setPreviews(all);
      onCapture(all);
    } else {
      setPreviews([compressed[0]]);
      onCapture(compressed[0]);
    }
    e.target.value = '';
  };

  const remove = (i) => {
    const next = previews.filter((_, idx) => idx !== i);
    setPreviews(next);
    onCapture(multiple ? next : null);
  };

  const maxReached = !multiple && previews.length >= 1;

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      {sublabel && <p className="text-xs text-gray-500 -mt-1">{sublabel}</p>}
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div key={i} className="relative">
            <img src={src} alt="" className="h-24 w-24 object-cover rounded-xl border border-gray-200" />
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
              ×
            </button>
          </div>
        ))}
        {!maxReached && (
          <div className="flex gap-1">
            <button type="button"
              onClick={() => cameraRef.current.click()}
              title="Tomar foto con cámara"
              className="h-24 w-20 border-2 border-dashed border-brand-400 rounded-xl flex flex-col items-center justify-center text-brand-600 hover:bg-brand-50 transition-colors text-sm">
              <span className="text-2xl">📷</span>
              <span className="text-[10px] mt-1">Cámara</span>
            </button>
            <button type="button"
              onClick={() => galleryRef.current.click()}
              title="Seleccionar de galería"
              className="h-24 w-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">
              <span className="text-2xl">🖼</span>
              <span className="text-[10px] mt-1">Galería</span>
            </button>
          </div>
        )}
      </div>
      {/* Camera input */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        multiple={multiple} className="hidden" onChange={handleFiles} />
      {/* Gallery input (no capture) */}
      <input ref={galleryRef} type="file" accept="image/*"
        multiple={multiple} className="hidden" onChange={handleFiles} />
    </div>
  );
}
