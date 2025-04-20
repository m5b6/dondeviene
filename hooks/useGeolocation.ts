import { useState, useEffect, useRef } from "react";

type PermissionState =
  | "granted"
  | "denied"
  | "prompting"
  | "unsupported"
  | "idle";

interface Result {
  permission: PermissionState;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | Error | null;
  requestPermission: () => void;
}

export function usePreciseGeolocation(
  watchTimeoutMs = 5000, // Time to watch position before clearing
  maxRetries = 3
): Result {
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | Error | null>(
    null
  );
  const retriesRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing watchers and timeouts
  const clearWatcherAndTimeout = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Start watching with a timeout to get accurate position
  const startWatchWithTimeout = () => {
    clearWatcherAndTimeout();
    
    const options = {
      enableHighAccuracy: true,
      maximumAge: 100,
      timeout: 50000
    };
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        setError(null);
      },
      (err) => {
        console.log("Error al obtener la ubicación:", err);
        setError(err);
      },
      options
    );
    
    // Set timeout to clear the watch after specified time
    timeoutRef.current = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }, watchTimeoutMs);
  };

  // Core request+retry logic
  const requestPermission = () => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      setError(new Error("Geolocation API not supported"));
      return;
    }

    setError(null);
    setPermission("prompting");
    retriesRef.current = 0;

    const attempt = () => {
      clearWatcherAndTimeout();
      
      const options = {
        enableHighAccuracy: true,
        maximumAge: 100,
        timeout: 50000
      };
      
      setPermission("granted"); // Optimistically set permission
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setPermission("granted"); // Confirm permission
          setPosition(pos);
          setError(null);
        },
        (err) => {
          console.log("Error al obtener la ubicación:", err);
          setError(err);
          
          if (err.code === err.PERMISSION_DENIED) {
            setPermission("denied");
            clearWatcherAndTimeout();
          } else if (
            (err.code === err.POSITION_UNAVAILABLE || 
             err.code === err.TIMEOUT) &&
            retriesRef.current < maxRetries
          ) {
            retriesRef.current++;
            // Wait 1s before retrying
            setTimeout(() => attempt(), 1000);
          }
        },
        options
      );
      
      // Set timeout to clear the watch after specified time
      timeoutRef.current = setTimeout(() => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }, watchTimeoutMs);
    };
    
    attempt();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => clearWatcherAndTimeout();
  }, []);

  return { permission, position, error, requestPermission };
}
