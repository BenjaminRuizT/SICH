import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

const PENDING_KEY = 'sich-update-pending';

function parseVer(v) {
  return (v || '0.0.0').split('.').map(Number);
}

function isServerNewer(serverVersion) {
  const s = parseVer(serverVersion);
  const c = parseVer(APP_VERSION);
  for (let i = 0; i < 3; i++) {
    if (s[i] > c[i]) return true;
    if (s[i] < c[i]) return false;
  }
  return false;
}

// Cuando el usuario hace clic en "Actualizar ahora", marcamos pending y recargamos.
// En la recarga, si la versión sigue siendo vieja (Railway aún construyendo),
// mostramos "actualizando..." en lugar del botón — así no confunde al usuario.
// Cuando la versión del cliente ya coincida con el servidor se limpia el flag.
export function markReload() {
  try { localStorage.setItem(PENDING_KEY, '1'); } catch {}
}

// Retorna: 'idle' | 'available' | 'pending'
export default function useVersionCheck() {
  const [state, setState] = useState('idle');

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        const { version } = await r.json();
        if (version && isServerNewer(version)) {
          const pending = localStorage.getItem(PENDING_KEY) === '1';
          setState(pending ? 'pending' : 'available');
        } else {
          // La versión del cliente ya coincide — actualización completa
          try { localStorage.removeItem(PENDING_KEY); } catch {}
          setState('idle');
        }
      } catch {}
    };

    check();
    const id = setInterval(check, 30 * 1000);

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return state;
}
