'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  parseStoredLocale,
  translate,
  type Locale,
  type MessageKey,
} from '@/lib/i18n';

let localeState: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

function readLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }
  return parseStoredLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return localeState;
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function setAppLocale(next: Locale) {
  localeState = next;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next;
  }
  emit();
}

export function useLocale() {
  const [hydrated, setHydrated] = useState(false);
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    localeState = readLocale();
    document.documentElement.lang = localeState;
    emit();
    setHydrated(true);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const setLocale = useCallback((next: Locale) => {
    setAppLocale(next);
  }, []);

  return { locale, setLocale, t, hydrated };
}
