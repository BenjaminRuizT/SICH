import { useRef, useEffect, useState } from 'react';

export default function SignatureCanvas({ onSave, label = 'Firma' }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const start = (e) => { drawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = (e) => { if (!drawing.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setSigned(true); e.preventDefault(); };
    const end = () => { drawing.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onSave(null);
  };

  const save = () => {
    if (!signed) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50">
        <canvas ref={canvasRef} width={500} height={180} className="w-full touch-none" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="flex-1 text-sm border border-gray-300 rounded-lg py-2 hover:bg-gray-50">Limpiar</button>
        <button type="button" onClick={save} disabled={!signed} className="flex-1 text-sm bg-brand-700 text-white rounded-lg py-2 hover:bg-brand-800 disabled:opacity-40">Guardar firma</button>
      </div>
    </div>
  );
}
