import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

function parseVer(v) {
  return (v || '0.0.0').split('.').map(Number);
}

// Solo muestra el banner si el servidor tiene una versión MÁS NUEVA que el cliente.
// Evita falsos positivos durante el deploy de Railway (backend aún en versión anterior).
function isServerNewer(serverVersion) {
  const s = parseVer(serverVersion);
  const c = parseVer(APP_VERSION);
  for (let i = 0; i < 3; i++) {
    if (s[i] > c[i]) return true;
    if (s[i] < c[i]) return false;
  }
  return false;
}

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        const { version } = await r.json();
        if (version && isServerNewer(version)) setUpdateAvailable(true);
      } catch {}
    };

    check();
    const id = setInterval(check, 60 * 1000);

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return updateAvailable;
}
