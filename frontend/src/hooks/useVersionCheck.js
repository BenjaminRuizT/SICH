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
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return updateAvailable;
}
