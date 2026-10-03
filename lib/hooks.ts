'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArrivalsResult } from '@/server/red/service';
import { api } from './api';

export const REFRESH_MS = 15_000;

export const useNow = (intervalMs = 1000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

export interface ArrivalsState {
  data: ArrivalsResult | null;
  error: unknown;
  loading: boolean;
  ageSeconds: number;
  failing: boolean;
}

export const useArrivals = (code: string | null, service?: string, intervalMs = REFRESH_MS): ArrivalsState => {
  const [data, setData] = useState<ArrivalsResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const now = useNow();

  useEffect(() => {
    if (!code) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let run = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') void load();
        else schedule();
      }, intervalMs);
    };

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const mine = ++run;
      try {
        const result = await api.arrivals(code, service, controller.signal);
        if (cancelled || mine !== run) return;
        setData(result);
        setError(null);
      } catch (caught) {
        if ((caught as { name?: string }).name === 'AbortError' || cancelled || mine !== run) return;
        setError(caught);
      }
      if (cancelled || mine !== run) return;
      setLoading(false);
      schedule();
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      void load();
    };

    setData(null);
    setError(null);
    setLoading(true);
    void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code, service, intervalMs]);

  const observed = data ? Date.parse(data.observedAt) : null;
  const ageSeconds = observed === null ? 0 : Math.max(0, Math.round((now - observed) / 1000));
  return { data, error, loading, ageSeconds, failing: error !== null };
};

export interface SavedStop {
  code: string;
  name: string;
}

const SAVED_KEY = 'dv.saved.v1';

const readSaved = (): SavedStop[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is SavedStop =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as SavedStop).code === 'string' &&
            typeof (item as SavedStop).name === 'string',
        )
      : [];
  } catch {
    return [];
  }
};

export const useSavedStops = () => {
  const [saved, setSaved] = useState<SavedStop[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(readSaved());
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVED_KEY) setSaved(readSaved());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: SavedStop[]) => {
    setSaved(next);
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: keep the in-memory list */
    }
  }, []);

  const isSaved = useCallback((code: string) => saved.some((stop) => stop.code === code), [saved]);
  const toggle = useCallback(
    (stop: SavedStop) =>
      persist(saved.some((item) => item.code === stop.code) ? saved.filter((item) => item.code !== stop.code) : [stop, ...saved].slice(0, 20)),
    [saved, persist],
  );

  return { saved, ready, isSaved, toggle };
};

export type GeoStatus = 'idle' | 'asking' | 'ready' | 'denied' | 'unavailable';

export const useGeolocation = () => {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const asked = useRef(false);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude });
        setStatus('ready');
      },
      (failure) => setStatus(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }, []);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    if (!('permissions' in navigator)) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((permission) => {
        if (permission.state === 'granted') request();
        if (permission.state === 'denied') setStatus('denied');
      })
      .catch(() => undefined);
  }, [request]);

  return { status, position, request };
};

export const useIsDesktop = (): boolean => {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop;
};
