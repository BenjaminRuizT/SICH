import { useRef, useEffect, useState, useCallback } from 'react';

export default function SignatureCanvas({ onSave, label = 'Firma', signerName = '' }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const autoSaveTimer = useRef(null);
  const [signed, setSigned] = useState(false);

  const autoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/jpeg', 0.85));
    }, 800);
  }, [onSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top) * scaleY,
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
  }, [autoSave]);

  const clear = () => {
    clearTimeout(autoSaveTimer.current);
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onSave(null);
  };

  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {signerName && <p className="text-xs text-gray-500 -mt-1">{signerName}</p>}
      <div className={`border-2 rounded-xl overflow-hidden bg-gray-50 ${signed ? 'border-brand-400' : 'border-gray-300'}`}>
        <canvas ref={canvasRef} width={500} height={160} className="w-full touch-none" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">{signed ? '✓ Firma capturada (se guarda automáticamente)' : 'Dibuja la firma arriba'}</p>
        <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline">Limpiar</button>
      </div>
    </div>
  );
}
