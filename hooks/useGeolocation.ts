import { useState, useEffect, useRef } from "react";

type PermissionState = "granted" | "denied" | "prompting" | "unsupported";

interface Result {
  permission: PermissionState;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | Error | null;
}

export function useGeolocation(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  }
): Result {
  const [permission, setPermission] = useState<PermissionState>(
    "prompting"
  );
  const [position, setPosition] = useState<GeolocationPosition | null>(
    null
  );
  const [error, setError] = useState<GeolocationPositionError | Error | null>(
    null
  );
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      setError(new Error("Geolocation API not supported"));
      return;
    }

    // 1) First prompt / fetch once
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission("granted");
        setPosition(pos);
        setError(null);

        // 2) Now start watching
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => setPosition(p),
          (err) => setError(err),
          options
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
        }
        setError(err);
        setPosition(null);
      },
      options
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [options]);

  return { permission, position, error };
} 