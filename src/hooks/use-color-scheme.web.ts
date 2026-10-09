import { useSyncExternalStore } from 'react';

const colorSchemeQuery = '(prefers-color-scheme: dark)';

function getSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia(colorSchemeQuery).matches ? 'dark' : 'light';
}

function getServerSnapshot() {
  return 'light';
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia(colorSchemeQuery);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
