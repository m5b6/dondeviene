"use client";

import * as React from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ParaderoInfo } from "../lib/fetch-paraderos";
import { useEffect } from 'react';

interface MapaParaderosProps {
  userLocation: { latitude: number; longitude: number } | null;
  selectedParadero: ParaderoInfo | null;
  isLoading?: boolean;
}

const PUBLIC_MAPBOX_TOKEN = "pk.eyJ1IjoibTViNiIsImEiOiJjbTlwM2Uwbm8xM2s1Mm1weDVnaHNqZTJ6In0.m7iD67rFYK1cctpN__OV6A";

export default function MapaParaderos({
  userLocation,
  selectedParadero,
  isLoading = false
}: MapaParaderosProps) {
  const mapRef = React.useRef<any>(null);

  // Fit bounds when paradero is selected
  useEffect(() => {
    // Only run when we have both locations and map is ready
    if (!mapRef.current || !userLocation || !selectedParadero) {
      return;
    }
    
    try {
      const bounds = [
        [Math.min(userLocation.longitude, selectedParadero.pos[1]), Math.min(userLocation.latitude, selectedParadero.pos[0])],
        [Math.max(userLocation.longitude, selectedParadero.pos[1]), Math.max(userLocation.latitude, selectedParadero.pos[0])]
      ];
      
      // Add padding to ensure both points are clearly visible
      mapRef.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000
      });
    } catch (err) {
      // Silently handle map errors without console spam
      // Only log in development if needed
      // console.error("Error adjusting map view:", err);
    }
  }, [selectedParadero?.pos[0], selectedParadero?.pos[1], userLocation?.latitude, userLocation?.longitude]);
  
  // Create GeoJSON for the route line
  const routeData = React.useMemo(() => {
    if (!userLocation || !selectedParadero) return null;
    
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [userLocation.longitude, userLocation.latitude],
          [selectedParadero.pos[1], selectedParadero.pos[0]]
        ]
      }
    };
  }, [userLocation, selectedParadero]);

  // Line style
  const lineLayer: LayerProps = {
    id: 'route',
    type: 'line',
    paint: {
      'line-color': '#3b82f6',
      'line-width': 4,
      'line-opacity': 0.8,
      'line-dasharray': [0.5, 1.5]
    }
  };
  
  return (
    <div className="h-full w-full relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: userLocation?.longitude || -70.67,
          latitude: userLocation?.latitude || -33.45,
          zoom: userLocation ? 15 : 12
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        {/* Route line between user and paradero */}
        {routeData && (
          <Source id="route" type="geojson" data={routeData as any}>
            <Layer {...lineLayer} />
          </Source>
        )}

        {userLocation && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
          >
            <div 
              className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg pulse-animation" 
            />
          </Marker>
        )}

        {selectedParadero && (
          <Marker
            longitude={selectedParadero.pos[1]}
            latitude={selectedParadero.pos[0]}
          >
            <div 
              className="flex items-center justify-center w-14 h-14"
              style={{ fontSize: '2.5rem', filter: 'none' }}
            >
              🚌
            </div>
          </Marker>
        )}
      </Map>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-10">
          <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}
