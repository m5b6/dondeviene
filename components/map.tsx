"use client";

import * as React from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ParaderoInfo } from "../lib/fetch-paraderos";
import { useEffect, useState } from 'react';
import { fetchWalkingRoute, getRouteLineLayer, getRouteSource, RouteData } from '../lib/mapbox-routing';
import type { GeoJSON } from 'geojson';

interface MapaParaderosProps {
  userLocation: { latitude: number; longitude: number } | null;
  selectedParadero: ParaderoInfo | null;
  isLoading?: boolean;
}

const PUBLIC_MAPBOX_TOKEN = "pk.eyJ1IjoibTViNiIsImEiOiJjbTlwM2Uwbm8xM2s1Mm1weDVnaHNqZTJ6In0.m7iD67rFYK1cctpN__OV6A";

/**
 * Calculate distance between two points using the Haversine formula
 */
function calculateDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // distance in meters
}

/**
 * Find the midpoint of a LineString by distance
 */
function findCenterPointByDistance(coordinates: number[][]): [number, number] {
  if (coordinates.length <= 1) {
    return coordinates[0] as [number, number];
  }
  
  // Calculate cumulative distances along the line
  const cumulativeDistances: number[] = [0];
  let totalDistance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const prevCoord = coordinates[i-1];
    const currCoord = coordinates[i];
    
    const segmentDistance = calculateDistance(
      prevCoord[0], prevCoord[1], 
      currCoord[0], currCoord[1]
    );
    
    totalDistance += segmentDistance;
    cumulativeDistances.push(totalDistance);
  }
  
  // Find the segment that contains the midpoint
  const halfDistance = totalDistance / 2;
  let segmentIndex = 0;
  
  for (let i = 0; i < cumulativeDistances.length - 1; i++) {
    if (cumulativeDistances[i] <= halfDistance && halfDistance <= cumulativeDistances[i+1]) {
      segmentIndex = i;
      break;
    }
  }
  
  // Calculate the exact point along the segment
  const startCoord = coordinates[segmentIndex];
  const endCoord = coordinates[segmentIndex + 1];
  
  const segmentLength = cumulativeDistances[segmentIndex + 1] - cumulativeDistances[segmentIndex];
  const segmentFraction = (halfDistance - cumulativeDistances[segmentIndex]) / segmentLength;
  
  // Linearly interpolate between the two segment points
  const lon = startCoord[0] + segmentFraction * (endCoord[0] - startCoord[0]);
  const lat = startCoord[1] + segmentFraction * (endCoord[1] - startCoord[1]);
  
  return [lon, lat];
}

export default function MapaParaderos({
  userLocation,
  selectedParadero,
  isLoading = false
}: MapaParaderosProps) {
  const mapRef = React.useRef<any>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isRouteFetching, setIsRouteFetching] = useState(false);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number] | null>(null);
  const [formattedDistance, setFormattedDistance] = useState<string>('');

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
      mapRef.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000
      });
    } catch (err) {
 
    }
  }, [selectedParadero?.pos[0], selectedParadero?.pos[1], userLocation?.latitude, userLocation?.longitude]);
  
  useEffect(() => {
    if (!userLocation || !selectedParadero) {
      setRouteData(null);
      return;
    }
    
    const getRoute = async () => {
      setIsRouteFetching(true);
      try {
        const start = {
          longitude: userLocation.longitude,
          latitude: userLocation.latitude
        };
        
        const end = {
          longitude: selectedParadero.pos[1],
          latitude: selectedParadero.pos[0]
        };
        
        const routeResult = await fetchWalkingRoute(start, end);
        setRouteData(routeResult);
      } catch (error) {
        console.error('Error fetching route:', error);
      } finally {
        setIsRouteFetching(false);
      }
    };
    
    getRoute();
  }, [userLocation, selectedParadero]);

  useEffect(() => {
    if (!routeData || !routeData.geometry || routeData.geometry.coordinates.length === 0) {
      setCenterCoordinates(null);
      setFormattedDistance('');
      return;
    }

    // Find the true center point of the route using distance-based interpolation
    const coordinates = routeData.geometry.coordinates;
    const centerPoint = findCenterPointByDistance(coordinates);
    setCenterCoordinates(centerPoint);
    
    // Format the distance (convert from meters)
    const distanceInMeters = routeData.properties.distance;
    let formatted = '';
    
    if (distanceInMeters < 1000) {
      formatted = `${Math.round(distanceInMeters)}m`;
    } else {
      formatted = `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
    
    setFormattedDistance(formatted);
  }, [routeData]);

  // Get the line layer styling from our utility
  const lineLayer = getRouteLineLayer();
  
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
        {/* Route line between user and paradero using actual streets */}
        {routeData && (
          <Source 
            id="route" 
            type="geojson" 
            data={routeData as unknown as GeoJSON.Feature}
            lineMetrics={true}
          >
            <Layer {...lineLayer} />
          </Source>
        )}

        {/* Distance marker at the center of the route */}
        {centerCoordinates && formattedDistance && (
          <Marker
            longitude={centerCoordinates[0]}
            latitude={centerCoordinates[1]}
            anchor="center"
          >
            <div className="bg-blue-900 text-white px-2 py-1 rounded shadow-lg font-mono text-sm">
              {formattedDistance}
            </div>
          </Marker>
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

      {/* Loading overlay - show when map is loading or route is fetching */}
      {(isLoading || isRouteFetching) && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-10">
          <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}
