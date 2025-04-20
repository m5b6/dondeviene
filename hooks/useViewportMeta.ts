import { useEffect } from 'react';

/**
 * Ensures the viewport meta tag includes 'viewport-fit=cover' for proper safe area handling on iOS.
 */
export function useViewportMeta() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    
    if (meta instanceof HTMLMetaElement) {
      // Ensure viewport-fit=cover is included
      if (!meta.content.includes("viewport-fit=cover")) {
        meta.content += ", viewport-fit=cover";
      }
    } else {
      // Or create it if it doesn't exist
      const newMeta = document.createElement("meta");
      newMeta.name = "viewport";
      newMeta.content = "width=device-width, initial-scale=1, viewport-fit=cover";
      document.getElementsByTagName("head")[0].appendChild(newMeta);
    }
    // No cleanup needed for this effect
  }, []); // Empty dependency array ensures this runs only once on mount
} 