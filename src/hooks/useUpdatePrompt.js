import { useEffect, useState } from 'react';
import { acceptUpdate } from '../lib/sw-register.js';

export const useUpdatePrompt = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  const apply = () => {
    acceptUpdate();
    // page will reload from the 'controlling' event
  };

  const dismiss = () => setUpdateAvailable(false);

  return { updateAvailable, apply, dismiss };
};
