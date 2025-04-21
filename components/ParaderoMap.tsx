"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import dynamic from 'next/dynamic'
import { fetchParaderoByCode, ParaderoInfo } from '../lib/fetch-paraderos'

const MapaParaderos = dynamic(() => import('./map'), {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center">Cargando mapa...</div>
});

interface ParaderoMapProps {
    selectedParadero: string | ParaderoInfo;
    userLocation: GeolocationPosition | null;
    onClose: () => void;
    onConfirm: (paradero: string) => void;
    onDirectConfirm?: (paradero: string) => void;
}

export default function ParaderoMap({
    selectedParadero,
    userLocation,
    onClose,
    onConfirm,
    onDirectConfirm
}: ParaderoMapProps) {
    const [selectedParaderoInfo, setSelectedParaderoInfo] = useState<ParaderoInfo | null>(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapUserLocation, setMapUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // Extract user coordinates
    useEffect(() => {
        // Only set user location if the paradero was selected from the location-based list
        if (userLocation && typeof selectedParadero !== 'string' && 'distance' in selectedParadero) {
            setMapUserLocation({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude
            });
        } else {
            setMapUserLocation(null);
        }
    }, [userLocation, selectedParadero]);

    // Fetch paradero info if needed
    useEffect(() => {
        const fetchParaderoInfo = async () => {
            try {
                setMapLoading(true);

                if (typeof selectedParadero !== 'string') {
                    // Even if it's already a ParaderoInfo object, we need to call fetchParaderoByCode
                    // to get the bus data, as the objects from location search don't include buses
                    const paraderoInfo = await fetchParaderoByCode(selectedParadero.cod);
                    setSelectedParaderoInfo(paraderoInfo);
                } else {
                    // For string paradero codes (from manual mode)
                    const paraderoInfo = await fetchParaderoByCode(selectedParadero);
                    setSelectedParaderoInfo(paraderoInfo);
                }
            } catch (error) {
                console.error("Error fetching paradero location:", error);

                // If API call fails but we have a ParaderoInfo object already, use it as fallback
                if (typeof selectedParadero !== 'string') {
                    setSelectedParaderoInfo(selectedParadero);
                }
            } finally {
                setMapLoading(false);
            }
        };

        fetchParaderoInfo();
    }, [selectedParadero]);

    const handleClose = () => {
        if ("vibrate" in navigator) {
            try {
                navigator.vibrate(10);
            } catch (e) {
                // Ignore vibration errors
            }
        }
        onClose();
    };

    const handleConfirm = () => {
        if (selectedParaderoInfo) {
            if ("vibrate" in navigator) {
                try {
                    navigator.vibrate(15);
                } catch (e) {
                    // Ignore vibration errors
                }
            }

            // DIRECT ROUTE: Skip busStops.tsx completely
            // Always go straight to selectBus.tsx
            if (onDirectConfirm) {
                onDirectConfirm(selectedParaderoInfo.cod);
            } else {
                // Fallback
                onConfirm(selectedParaderoInfo.cod);
            }
        }
    };

    // Function to render a color badge for bus services
    const renderColorBadge = (color: string, service: string) => {
        return (
            <div
                className="px-2 py-1 rounded-full text-white text-sm font-mono font-bold shadow-sm"
                style={{ backgroundColor: color }}
            >
                {service}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Map view when a paradero is selected */}
            <div className="h-full flex flex-col">
                <h2 className="text-3xl font-bold text-center mb-3 tracking-tight flex items-center justify-center">
                {selectedParaderoInfo?.name || `Paradero ${selectedParaderoInfo?.cod}`}
                    </h2>

                {/* Map and info layout */}
                <div className="flex-1 relative">
                    {/* Map container - now takes full height */}
                    <div className="h-full relative rounded-xl overflow-hidden">
                        {mapLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <svg
                                    className="animate-spin h-8 w-8 text-gray-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            </div>
                        ) : (
                            <MapaParaderos
                                userLocation={mapUserLocation}
                                selectedParadero={selectedParaderoInfo}
                            />
                        )}
                    </div>

                    {/* Bus chips overlay - floating on top of the map */}
                    <div className="absolute top-2 left-0 right-0 z-10 px-3">
                        <div className="p-2 bg-transparent">
                            {selectedParaderoInfo?.buses && selectedParaderoInfo.buses.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    {/* Use a Set to filter unique service IDs */}
                                    {Array.from(new Set(selectedParaderoInfo?.buses.map(bus => bus.service) || [])).map((serviceId) => {
                                        // Get the first bus with this service ID
                                        const bus = selectedParaderoInfo?.buses?.find(b => b.service === serviceId);
                                        if (!bus) return null;
                                        
                                        return (
                                            <div key={serviceId} className="relative group">
                                                <div 
                                                    className="px-1.5 py-0.5 rounded-full text-white text-xs font-mono font-bold shadow-sm cursor-pointer transition-transform hover:scale-105"
                                                    style={{ backgroundColor: bus.color }}
                                                >
                                                    {bus.service}
                                                </div>
                                                
                                                {/* Tooltip with more info on hover */}
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block bg-black/90 text-white text-xs rounded-lg p-2 whitespace-nowrap z-20">
                                                    <div className="font-medium">{bus.destination}</div>
                                                    <div className="opacity-80">{bus.timeToArrival}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-xs p-1 text-center">
                                    {mapLoading ? 
                                        "Cargando buses..." : 
                                        "No hay buses en este momento"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Confirm button - placed below the map with full width */}
                <div className="mt-4">
                    <button
                        onClick={handleConfirm}
                        className="apple-button w-full py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
} 