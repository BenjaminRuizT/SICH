import { useState } from 'react';

const CAR_ZONES = [
  { id: 'parachoque_frontal',    label: 'Parachoque frontal' },
  { id: 'cofre',                 label: 'Cofre' },
  { id: 'guardafango_del_izq',   label: 'Guardafango delantero izq.' },
  { id: 'guardafango_del_der',   label: 'Guardafango delantero der.' },
  { id: 'parabrisas_frontal',    label: 'Parabrisas frontal' },
  { id: 'espejo_izq',            label: 'Espejo izq.' },
  { id: 'espejo_der',            label: 'Espejo der.' },
  { id: 'puerta_del_izq',        label: 'Puerta delantera izq.' },
  { id: 'techo',                 label: 'Techo' },
  { id: 'puerta_del_der',        label: 'Puerta delantera der.' },
  { id: 'puerta_tra_izq',        label: 'Puerta trasera izq.' },
  { id: 'puerta_tra_der',        label: 'Puerta trasera der.' },
  { id: 'guardafango_tra_izq',   label: 'Guardafango trasero izq.' },
  { id: 'guardafango_tra_der',   label: 'Guardafango trasero der.' },
  { id: 'parabrisas_trasero',    label: 'Parabrisas trasero' },
  { id: 'cajuela',               label: 'Cajuela' },
  { id: 'parachoque_trasero',    label: 'Parachoque trasero' },
];

const LAPTOP_ZONES = [
  { id: 'pantalla', label: 'Pantalla (interior)' },
  { id: 'tapa_exterior', label: 'Tapa exterior' },
  { id: 'teclado', label: 'Teclado' },
  { id: 'touchpad', label: 'Touchpad' },
  { id: 'lado_izq', label: 'Lado izquierdo' },
  { id: 'lado_der', label: 'Lado derecho' },
  { id: 'base', label: 'Base inferior' },
];

// Car zone SVG definitions [x, y, w, h, rx]
const CAR_SVG_ZONES = {
  parachoque_frontal:  [35,  8,   130, 30, 14],
  cofre:               [10,  38,  180, 90,  4],
  guardafango_del_izq: [10,  70,  22,  60,  3],
  guardafango_del_der: [168, 70,  22,  60,  3],
  parabrisas_frontal:  [28,  128, 144, 36,  3],
  espejo_izq:          [-2,  138, 16,  30,  4],
  espejo_der:          [186, 138, 16,  30,  4],
  puerta_del_izq:      [10,  164, 58,  72,  2],
  techo:               [68,  164, 64,  148, 2],
  puerta_del_der:      [132, 164, 58,  72,  2],
  puerta_tra_izq:      [10,  236, 58,  76,  2],
  puerta_tra_der:      [132, 236, 58,  76,  2],
  guardafango_tra_izq: [10,  270, 22,  50,  3],
  guardafango_tra_der: [168, 270, 22,  50,  3],
  parabrisas_trasero:  [28,  312, 144, 36,  3],
  cajuela:             [10,  348, 180, 90,  4],
  parachoque_trasero:  [35,  438, 130, 30, 14],
};

// Laptop zone SVG definitions [x, y, w, h, rx]
const LAPTOP_SVG_ZONES = {
  tapa_exterior: [5, 5, 270, 60, 6],
  pantalla:      [18, 12, 244, 46, 3],
  lado_izq:      [5, 78, 14, 170, 3],
  teclado:       [22, 78, 256, 108, 3],
  lado_der:      [281, 78, 14, 170, 3],
  touchpad:      [100, 193, 100, 52, 5],
  base:          [5, 252, 290, 22, 3],
};

function CarSVG({ active, onToggle }) {
  return (
    <svg viewBox="-8 0 216 475" className="w-full max-w-[180px] mx-auto select-none touch-none">
      {/* Car body background */}
      <rect x="10" y="38" width="180" height="400" rx="35" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5"/>
      {/* Bumpers background */}
      <rect x="35" y="8" width="130" height="30" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
      <rect x="35" y="438" width="130" height="30" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>

      {Object.entries(CAR_SVG_ZONES).map(([id, [x, y, w, h, rx]]) => {
        const isActive = active.some(d => d.zona === id);
        return (
          <rect
            key={id}
            x={x} y={y} width={w} height={h} rx={rx}
            fill={isActive ? '#f97316' : '#cbd5e1'}
            stroke={isActive ? '#ea580c' : '#64748b'}
            strokeWidth={isActive ? 2 : 1}
            opacity={isActive ? 0.85 : 0.5}
            className="cursor-pointer transition-all"
            onClick={() => onToggle(id)}
          />
        );
      })}

      {/* Windshield lines */}
      <line x1="28" y1="128" x2="172" y2="128" stroke="#94a3b8" strokeWidth="1" opacity="0.6"/>
      <line x1="28" y1="312" x2="172" y2="312" stroke="#94a3b8" strokeWidth="1" opacity="0.6"/>
    </svg>
  );
}

function LaptopSVG({ active, onToggle }) {
  return (
    <svg viewBox="0 0 300 285" className="w-full max-w-[280px] mx-auto select-none touch-none">
      {/* Laptop body backgrounds */}
      <rect x="5" y="5" width="290" height="270" rx="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5"/>
      {/* Hinge line */}
      <line x1="5" y1="72" x2="295" y2="72" stroke="#94a3b8" strokeWidth="2" opacity="0.5"/>

      {Object.entries(LAPTOP_SVG_ZONES).map(([id, [x, y, w, h, rx]]) => {
        const isActive = active.some(d => d.zona === id);
        return (
          <rect
            key={id}
            x={x} y={y} width={w} height={h} rx={rx}
            fill={isActive ? '#f97316' : '#cbd5e1'}
            stroke={isActive ? '#ea580c' : '#64748b'}
            strokeWidth={isActive ? 2 : 1}
            opacity={isActive ? 0.85 : 0.5}
            className="cursor-pointer transition-all"
            onClick={() => onToggle(id)}
          />
        );
      })}

      {/* Labels inside SVG */}
      <text x="150" y="40" textAnchor="middle" fontSize="9" fill="#475569" pointerEvents="none">PANTALLA / TAPA</text>
      <text x="150" y="130" textAnchor="middle" fontSize="9" fill="#475569" pointerEvents="none">TECLADO</text>
      <text x="150" y="223" textAnchor="middle" fontSize="8" fill="#475569" pointerEvents="none">TOUCHPAD</text>
    </svg>
  );
}

export default function DamagePanel({ type = 'auto', value = [], onChange }) {
  const [editingZona, setEditingZona] = useState(null);
  const [tempObs, setTempObs] = useState('');

  const zones = type === 'auto' ? CAR_ZONES : LAPTOP_ZONES;

  const toggle = (id) => {
    const exists = value.find(d => d.zona === id);
    if (exists) {
      onChange(value.filter(d => d.zona !== id));
      if (editingZona === id) setEditingZona(null);
    } else {
      const label = zones.find(z => z.id === id)?.label || id;
      const next = [...value, { zona: id, label, observacion: '' }];
      onChange(next);
      setEditingZona(id);
      setTempObs('');
    }
  };

  const saveObs = (id) => {
    onChange(value.map(d => d.zona === id ? { ...d, observacion: tempObs } : d));
    setEditingZona(null);
  };

  const openEdit = (id, currentObs) => {
    setEditingZona(id);
    setTempObs(currentObs);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Toca las zonas con daño para marcarlas (naranja = daño)</p>

      <div className="flex gap-4 flex-col sm:flex-row items-center">
        {/* SVG panel */}
        <div className="w-full sm:w-48 shrink-0">
          {type === 'auto'
            ? <CarSVG active={value} onToggle={toggle} />
            : <LaptopSVG active={value} onToggle={toggle} />
          }
        </div>

        {/* Zone list */}
        <div className="flex-1 w-full space-y-1">
          <p className="text-xs font-medium text-gray-600 mb-2">Zonas disponibles:</p>
          {zones.map(z => {
            const damage = value.find(d => d.zona === z.id);
            return (
              <div key={z.id} className={`rounded-lg border transition-colors ${damage ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(z.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${damage ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'}`}
                  >
                    {damage && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                  <span className={`text-xs flex-1 ${damage ? 'font-semibold text-orange-800' : 'text-gray-600'}`}>{z.label}</span>
                  {damage && editingZona !== z.id && (
                    <button type="button" onClick={() => openEdit(z.id, damage.observacion)}
                      className="text-[10px] text-orange-600 hover:underline shrink-0">
                      {damage.observacion ? '✏ editar' : '+ nota'}
                    </button>
                  )}
                </div>
                {damage && editingZona === z.id && (
                  <div className="px-3 pb-2 flex gap-2">
                    <input
                      type="text"
                      className="input py-1 text-xs flex-1"
                      placeholder="Observación del daño..."
                      value={tempObs}
                      onChange={e => setTempObs(e.target.value)}
                      autoFocus
                    />
                    <button type="button" onClick={() => saveObs(z.id)}
                      className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg">OK</button>
                  </div>
                )}
                {damage && editingZona !== z.id && damage.observacion && (
                  <p className="px-8 pb-1.5 text-[11px] text-orange-700 italic">"{damage.observacion}"</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-center text-gray-400 py-2">Sin daños marcados</p>
      )}
    </div>
  );
}
