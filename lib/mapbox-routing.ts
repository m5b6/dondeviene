import type { LayerProps } from 'react-map-gl/mapbox';

// Mapbox token
const MAPBOX_TOKEN = "pk.eyJ1IjoibTViNiIsImEiOiJjbTlwM2Uwbm8xM2s1Mm1weDVnaHNqZTJ6In0.m7iD67rFYK1cctpN__OV6A";

// Interface for route points
export interface RoutePoint {
  longitude: number;
  latitude: number;
}

// Route data structure
export interface RouteData {
  type: string;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

// Styled line layer for routes
export const getRouteLineLayer = (): LayerProps => ({
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 5,
    'line-opacity': 0.9,
    // Add gradient effect for more fluid appearance
    'line-gradient': [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0, '#60a5fa',  // Lighter blue at start
      0.5, '#3b82f6', // Primary blue in middle
      1, '#2563eb'    // Darker blue at end
    ]
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round'
  }
});

/**
 * Creates a GeoJSON source with lineMetrics enabled for use with line gradients
 */
export const getRouteSource = (routeData: RouteData | null) => ({
  type: 'geojson' as const,
  data: routeData || {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  },
  lineMetrics: true
});

/**
 * Fetches a walking route between two points using Mapbox Directions API
 */
export async function fetchWalkingRoute(
  start: RoutePoint,
  end: RoutePoint
): Promise<RouteData | null> {
  try {
    // Format coordinates as "lng,lat" for Mapbox API
    const startCoord = `${start.longitude},${start.latitude}`;
    const endCoord = `${end.longitude},${end.latitude}`;
    
    // Call Mapbox Directions API with walking profile
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoord};${endCoord}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch route');
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      return {
        type: 'Feature',
        properties: {
          // Add properties for animation if needed
          duration: data.routes[0].duration,
          distance: data.routes[0].distance
        },
        geometry: data.routes[0].geometry
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching walking route:', error);
    return null;
  }
} 