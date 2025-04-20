import { useState, useEffect, useRef, useCallback } from "react";

type PermissionState = "granted" | "denied" | "prompting" | "unsupported" | "idle";

interface Result {
  permission: PermissionState;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | Error | null;
  requestPermission: () => void;
}

export function useGeolocation(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 60000,
  }
): Result {
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | Error | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const clearWatcher = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const startWatching = useCallback((opts: PositionOptions) => {
    clearWatcher();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setPosition(p);
        setError(null);
      },
      (err) => {
        setError(err);
        // If unavailable, retry with lower accuracy once
        if (err.code === err.POSITION_UNAVAILABLE && opts.enableHighAccuracy) {
          console.warn("High accuracy failed, retrying with low accuracy");
          startWatching({ 
            ...opts, 
            enableHighAccuracy: false, 
            timeout: opts.timeout ? opts.timeout * 2 : 10000 
          });
        }
      },
      opts
    );
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      setError(new Error("Geolocation API not supported"));
      return;
    }

    setPermission("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission("granted");
        setPosition(pos);
        setError(null);
        startWatching(options);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          // Try a direct fallback getCurrentPosition with lower accuracy
          console.warn("Position unavailable, retrying with low accuracy");
          const fallbackOptions = {
            ...options, 
            enableHighAccuracy: false, 
            timeout: options.timeout ? options.timeout * 2 : 10000
          };
          
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              setPermission("granted");
              setPosition(pos2);
              setError(null);
              startWatching(fallbackOptions);
            },
            (err2) => {
              setError(err2);
            },
            fallbackOptions
          );
        } else {
          setError(err);
        }
        setPosition(null);
      },
      options
    );
  }, [options, startWatching]);

  useEffect(() => {
    return () => {
      clearWatcher();
    };
  }, []);

  return { permission, position, error, requestPermission };
} 