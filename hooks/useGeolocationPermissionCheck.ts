import { useState, useEffect } from 'react';

type PermissionState = PermissionState | 'checking' | 'unsupported';

interface GeolocationCheckResult {
  permission: PermissionState;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | Error | null;
}

/**
 * Checks geolocation permission status on mount and attempts to get the 
 * initial position if permission is already granted.
 */
export function useGeolocationPermissionCheck(): GeolocationCheckResult {
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | Error | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

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
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (isMounted) {
                setPosition(pos);
                setError(null);
              }
            },
            (err) => {
              console.error("Error getting location even with permission:", err);
              if (isMounted) {
                setError(err);
                setPosition(null);
              }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
        console.error("Error checking geolocation permission:", err);
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
      // We could potentially remove the onchange listener here if needed,
      // but it's often cleaned up automatically when the component unmounts.
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return { permission, position, error };
} 