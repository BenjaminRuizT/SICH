import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        const { version } = await r.json();
        if (version && version !== APP_VERSION) setUpdateAvailable(true);
      } catch {}
    };

    check();
    const id = setInterval(check, 60 * 1000); // cada 60 segundos

    // También verificar cuando el usuario regresa a la pestaña
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return updateAvailable;
}
