import { useRef, useState, useEffect } from 'react';

function compressImage(file, maxPx = 1200, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (!dataUrl) { resolve(null); return; }
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const result = canvas.toDataURL('image/jpeg', quality);
          resolve(result || dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function PhotoCapture({ label, onCapture, value, multiple = false, sublabel = '', maxPhotos = null }) {
  const cameraRef = useRef(null);

  const toArr = (v) => multiple ? (v || []) : (v ? [v] : []);
  const [previews, setPreviews] = useState(() => toArr(value));

  // Sync with external value changes (e.g. form reset, parent state update)
  useEffect(() => {
    setPreviews(toArr(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, multiple]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const compressed = await Promise.all(files.map(f => compressImage(f)));
    const valid = compressed.filter(Boolean);
    if (!valid.length) return;
    if (multiple) {
      const all = [...previews, ...valid];
      const capped = maxPhotos ? all.slice(0, maxPhotos) : all;
      setPreviews(capped);
      onCapture(capped);
    } else {
      setPreviews([valid[0]]);
      onCapture(valid[0]);
    }
    e.target.value = '';
  };

  const remove = (i) => {
    const next = previews.filter((_, idx) => idx !== i);
    setPreviews(next);
    onCapture(multiple ? next : null);
  };

  const maxReached = multiple
    ? (maxPhotos !== null && previews.length >= maxPhotos)
    : previews.length >= 1;

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      {sublabel && <p className="text-xs text-gray-500 -mt-1">{sublabel}</p>}
      {multiple && maxPhotos && <p className="text-xs text-gray-400 -mt-1">{previews.length}/{maxPhotos} fotos</p>}
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => src && (
          <div key={i} className="relative">
            <img src={src} alt="" className="h-24 w-24 object-cover rounded-xl border border-gray-200" />
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
              ×
            </button>
          </div>
        ))}
        {!maxReached && (
          <button type="button"
            onClick={() => cameraRef.current.click()}
            title="Tomar foto"
            className="h-24 w-24 border-2 border-dashed border-brand-400 rounded-xl flex flex-col items-center justify-center text-brand-600 hover:bg-brand-50 transition-colors text-sm">
            <span className="text-2xl">📷</span>
            <span className="text-[10px] mt-1">Cámara</span>
          </button>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        multiple={multiple} className="hidden" onChange={handleFiles} />
    </div>
  );
}
