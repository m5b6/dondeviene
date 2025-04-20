"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ParaderoInfo, fetchNearbyParaderos } from '../lib/fetch-paraderos'

interface ParaderoListProps {
    userLocation: GeolocationPosition | null;
    forceManualMode: boolean;
    onParaderoSelect: (paradero: string | ParaderoInfo) => void;
    onBack: () => void;
}

// Animation variants for list items
const listItemVariants = {
    hidden: { 
        opacity: 0,
        y: 20
    },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            duration: 0.3,
            ease: "easeOut"
        }
    })
};

export default function ParaderoList({
    userLocation,
    forceManualMode,
    onParaderoSelect,
    onBack
}: ParaderoListProps) {
    // All paraderos list for manual search
    const [paraderos, setParaderos] = useState<string[]>([]);
    // Nearby paraderos from location
    const [nearbyParaderos, setNearbyParaderos] = useState<ParaderoInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nearbyError, setNearbyError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [mapUserLocation, setMapUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // Extract user coordinates
    useEffect(() => {
        if (userLocation) {
            setMapUserLocation({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude
            });
        }
    }, [userLocation]);

    // Fetch nearby paraderos if location is available and not in manual mode
    useEffect(() => {
        if (mapUserLocation && !forceManualMode) {
            const fetchNearby = async () => {
                try {
                    setNearbyLoading(true);
                    setNearbyError(null);

                    const nearby = await fetchNearbyParaderos(
                        mapUserLocation.latitude,
                        mapUserLocation.longitude
                    );
                    setNearbyParaderos(nearby);
                    setNearbyLoading(false);
                } catch (err: any) {
                    console.error("Error fetching nearby paraderos:", err);
                    setNearbyError(err.message || "Error al buscar paraderos cercanos");
                    setNearbyLoading(false);
                }
            };

            fetchNearby();
        }
    }, [mapUserLocation, forceManualMode]);

    // Fetch all paraderos list (only if location is not available or in manual mode)
    useEffect(() => {
        // Skip loading the full list if we have location data and not in manual mode
        if (userLocation && !forceManualMode) return;

        const fetchParaderos = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://www.red.cl/restservice_v2/rest/getparadas/all');

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (Array.isArray(data)) {
                    setParaderos(data);
                } else {
                    setParaderos([]);
                }

                setLoading(false);
            } catch (err) {
                setError('No se pudieron cargar los paraderos. Intenta de nuevo más tarde.');
                setLoading(false);
                console.error('Error fetching paraderos:', err);
            }
        };

        fetchParaderos();
    }, [userLocation, forceManualMode]);

    // Filter paraderos based on search term (only for manual search)
    const filteredParaderos = paraderos.filter(p => {
        const searchLower = search.toLowerCase();
        const plower = p.toLowerCase();

        // Match if paradero starts with the search term
        return plower.startsWith(searchLower);
    });

    // Filter nearby paraderos based on search term
    const filteredNearbyParaderos = nearbyParaderos.filter(p => {
        if (!search) return true;

        const searchLower = search.toLowerCase();
        const codLower = p.cod.toLowerCase();

        return codLower.startsWith(searchLower);
    });

    const handleBack = () => {
        if ("vibrate" in navigator) {
            try {
                navigator.vibrate(10);
            } catch (e) {
                // Ignore vibration errors
            }
        }
        onBack();
    };

    // Format distance
    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    };

    // Determine whether to show location-based or manual search
    const showLocationSearch = !!userLocation && !forceManualMode;

    return (
        <div className="flex flex-col h-full">
            {/* Header area */}
            <div>
                <h1 className="text-3xl font-bold text-center mb-4 tracking-tight flex items-center justify-center whitespace-nowrap">
                    {showLocationSearch ?
                        "Paraderos cercanos" :
                        <><span>Todos los paraderos</span></>
                    }
                </h1>

                <p className="text-xl text-center mb-8 text-gray font-light">
                    Selecciona un paradero
                </p>
            </div>

            {/* Main content and button area */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Content area */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Search input */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={"🔍 PC123, PA111..."}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none focus:ring-0"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Error states */}
                    {error && !loading && !showLocationSearch && (
                        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {nearbyError && showLocationSearch && (
                        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {nearbyError}
                        </div>
                    )}

                    {/* Paradero list container */}
                    <div className="flex-1 overflow-y-auto border-2 border-gray-200 rounded-xl min-h-0">
                        {/* Loading states */}
                        {((loading && !showLocationSearch) || (nearbyLoading && showLocationSearch)) ? (
                            <div className="h-full flex justify-center items-center py-8">
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
                        ) : showLocationSearch ? (
                            // Display nearby paraderos with location info
                            filteredNearbyParaderos.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    <AnimatePresence>
                                        {filteredNearbyParaderos.map((paradero, index) => (
                                            <motion.li
                                                key={paradero.id}
                                                custom={index}
                                                initial="hidden"
                                                animate="visible"
                                                variants={listItemVariants}
                                            >
                                                <button
                                                    onClick={() => onParaderoSelect(paradero)}
                                                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium text-lg flex items-center">
                                                                {paradero.cod}
                                                                {index === 0 && (
                                                                    <span className="ml-2 text-yellow-600 opacity-75 text-sm flex items-center">
                                                                        <span className="mr-1">✨</span>
                                                                        <span className="text-xs">más cercano</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                                                {paradero.name}
                                                            </div>
                                                        </div>
                                                        <div className="text-base text-gray-500 text-xs font-mono font-bold">
                                                            {formatDistance(paradero.distance)}
                                                        </div>
                                                    </div>
                                                </button>
                                            </motion.li>
                                        ))}
                                    </AnimatePresence>
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                                    {search ?
                                        `No se encontraron paraderos con "${search}"` :
                                        "No se encontraron paraderos cercanos"
                                    }
                                </div>
                            )
                        ) : (
                            // Manual paradero search
                            filteredParaderos.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    <AnimatePresence>
                                        {filteredParaderos.slice(0, 100).map((paradero, index) => (
                                            <motion.li
                                                key={paradero}
                                                custom={index}
                                                initial="hidden"
                                                animate="visible"
                                                variants={listItemVariants}
                                            >
                                                <button
                                                    onClick={() => onParaderoSelect(paradero)}
                                                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                                                >
                                                    <span className="font-medium text-lg">{paradero}</span>
                                                </button>
                                            </motion.li>
                                        ))}
                                    </AnimatePresence>
                                </ul>
                            ) : search ? (
                                <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                                    No se encontraron paraderos con "{search}"
                                </div>
                            ) : (
                                <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                                    Escribe para buscar paraderos
                                </div>
                            )
                        )}

                        {search && !showLocationSearch && filteredParaderos.length > 100 && (
                            <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-200">
                                Mostrando 100 de {filteredParaderos.length} resultados
                            </div>
                        )}
                    </div>
                </div>

                {/* Back button - fixed at bottom */}
                <button
                    onClick={handleBack}
                    className="apple-button w-full py-3 text-gray-500 text-sm font-medium hover:text-black transition-colors"
                    style={{ paddingBottom: "0px" }}
                >
                    Volver
                </button>
            </div>
        </div>
    );
} 