import { useRef, useEffect, useState, useCallback } from 'react';

export default function SignatureCanvas({ onSave, label = 'Firma', signerName = '' }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const autoSaveTimer = useRef(null);
  const dprRef = useRef(1);
  const onSaveRef = useRef(onSave);
  const [signed, setSigned] = useState(false);

  // Keep ref in sync without triggering effect re-runs
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const autoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const ctx2 = tmp.getContext('2d');
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, tmp.width, tmp.height);
      ctx2.drawImage(canvas, 0, 0);
      onSaveRef.current(tmp.toDataURL('image/jpeg', 0.92));
    }, 800);
  }, []); // stable — no deps, uses ref internally

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    dprRef.current = dpr;
    const cssW = canvas.offsetWidth || 500;
    const cssH = 160;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return {
        x: src.clientX - rect.left,
        y: src.clientY - rect.top,
      };
    };

    const start = (e) => { drawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = (e) => {
      if (!drawing.current) return;
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      setSigned(true);
      e.preventDefault();
    };
    const end = () => { if (drawing.current) { drawing.current = false; autoSave(); } };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
      clearTimeout(autoSaveTimer.current);
    };
  }, [autoSave]); // autoSave is now stable — this runs only once on mount

  const clear = () => {
    clearTimeout(autoSaveTimer.current);
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.offsetWidth, 160);
    setSigned(false);
    onSaveRef.current(null);
  };

  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {signerName && <p className="text-xs text-gray-500 -mt-1">{signerName}</p>}
      <div className={`border-2 rounded-xl overflow-hidden bg-gray-50 ${signed ? 'border-brand-400' : 'border-gray-300'}`}>
        <canvas ref={canvasRef} className="w-full touch-none" style={{ height: '160px' }} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">{signed ? '✓ Firma capturada (se guarda automáticamente)' : 'Dibuja la firma arriba'}</p>
        <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline">Limpiar</button>
      </div>
    </div>
  );
}
