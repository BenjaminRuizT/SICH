import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

// Guarda { version, at } cuando el usuario hace clic en "Actualizar ahora".
// Mientras el cliente siga en esa misma versión Y no hayan pasado 10 min,
// se suprime el banner. Esto cubre el tiempo que Railway tarda en propagar
// los nuevos archivos estáticos tras haber actualizado el backend.
const SNOOZE_KEY = 'sich-update-snooze';
const SNOOZE_MS = 10 * 60 * 1000;

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

function isSnoozed() {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const { version, at } = JSON.parse(raw);
    return version === APP_VERSION && Date.now() - at < SNOOZE_MS;
  } catch { return false; }
}

export function markReload() {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ version: APP_VERSION, at: Date.now() }));
  } catch {}
}

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (isSnoozed()) return;
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
