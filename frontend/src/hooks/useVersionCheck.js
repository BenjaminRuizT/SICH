import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

const RELOAD_KEY = 'sich-reload-ts';
const COOLDOWN_MS = 90_000; // 90s: tiempo para que Railway propague el nuevo build

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

function inCooldown() {
  const ts = Number(localStorage.getItem(RELOAD_KEY) || 0);
  return Date.now() - ts < COOLDOWN_MS;
}

export function markReload() {
  localStorage.setItem(RELOAD_KEY, String(Date.now()));
}

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (inCooldown()) return;
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
