import { useEffect, useState } from 'react';

// Web Share Target lets other apps (Telegram, Files, browser audio download)
// "share to" Extend·Suno. The service worker accepts the POST, stores the
// file in cache, and redirects to /?share=true. We pick it up here.
export const useShareTarget = (onAudioReceived) => {
  const [shareIncoming, setShareIncoming] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('share') !== 'true') return;
    setShareIncoming(true);

    // The SW stashed the file in caches; retrieve via IDB or cache lookup.
    // For simplicity, we use the form-data POST handled by SW that re-posts
    // to a known internal route returning JSON metadata.
    fetch('/share-target-pickup')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.fileUrl) {
          // Convert cached blob URL back to a File for the upload pipeline
          fetch(data.fileUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const file = new File([blob], data.name || 'shared-audio.mp3', {
                type: blob.type || 'audio/mpeg',
              });
              onAudioReceived?.(file);
              setShareIncoming(false);
              // Clean URL
              window.history.replaceState({}, '', '/');
            })
            .catch(() => setShareIncoming(false));
        } else {
          setShareIncoming(false);
        }
      })
      .catch(() => setShareIncoming(false));
  }, [onAudioReceived]);

  return shareIncoming;
};
