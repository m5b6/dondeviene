import { useState, useEffect } from 'react';

type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'checking' | 'unsupported';

interface GeolocationCheckResult {
  permission: GeolocationPermissionState;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | Error | null;
}

export function useGeolocationPermissionCheck(): GeolocationCheckResult {
  const [permission, setPermission] = useState<GeolocationPermissionState>('checking');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | Error | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    let watchId: number | null = null;

    const checkPermissions = async () => {
      if (!navigator.permissions || !navigator.geolocation) {
        if (isMounted) setPermission('unsupported');
        return;
      }

      try {
        const permissionStatus = await navigator.permissions.query({ name: "geolocation" });
        
        if (!isMounted) return; // Check mount status after async operation

        setPermission(permissionStatus.state);

        if (permissionStatus.state === "granted") {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (isMounted) {
                setPosition(pos);
                setError(null);
              }
            },
            (err) => {
              // Only update error state on first error, don't spam the console
              if (isMounted && (!error || error.message !== err.message)) {
                setError(err);
                // Only log in development and avoid repeated logging
                if (process.env.NODE_ENV === 'development') {
                  console.error("Error getting location even with permission:", err);
                }
              }
              // Keep last known position even if update fails
            },
            { 
              enableHighAccuracy: true, 
              timeout: 15000, 
              maximumAge: 60000 // Accept positions up to a minute old
            }
          );
        } else {
          // If prompt or denied, position remains null
          setPosition(null);
        }

        permissionStatus.onchange = () => {
          // Update permission state if it changes while component is mounted
          if (isMounted) {
             setPermission(permissionStatus.state);
             // If permission is granted later, we might want to refetch location,
             // but for the initial check, this is sufficient.
             if (permissionStatus.state !== 'granted') {
                setPosition(null);
             }
          }
        };

      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error checking geolocation permission:", err);
        }
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Permission query failed"));
          setPermission('denied'); // Treat query error as denied for simplicity
          setPosition(null);
        }
      }
    };

    checkPermissions();

    // Cleanup function
    return () => {
      isMounted = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return { permission, position, error };
} 