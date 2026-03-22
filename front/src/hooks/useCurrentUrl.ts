/**
 * useCurrentUrl.ts
 * Returns the current browser URL and updates it whenever the browser URL changes
 * (history.pushState / history.replaceState / popstate events).
 *
 * Used by NavBar so it always shows the live URL without requiring callers to pass a prop.
 */
import { useState, useEffect } from 'react';

export function useCurrentUrl(): string {
  const [url, setUrl] = useState<string>(
    typeof window !== 'undefined' ? window.location.href : '',
  );

  useEffect(() => {
    // Sync whenever the URL changes via browser navigation
    const handleUrlChange = () => setUrl(window.location.href);

    window.addEventListener('popstate', handleUrlChange);

    // Patch history methods to fire our listener when the URL changes
    // without a full navigation (replaceState / pushState).
    const originalReplace = history.replaceState.bind(history);
    const originalPush = history.pushState.bind(history);

    history.replaceState = (...args) => {
      originalReplace(...args);
      handleUrlChange();
    };
    history.pushState = (...args) => {
      originalPush(...args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      history.replaceState = originalReplace;
      history.pushState = originalPush;
    };
  }, []);

  return url;
}
