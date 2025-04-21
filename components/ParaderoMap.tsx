"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from 'next/dynamic'
import { fetchParaderoByCode, ParaderoInfo } from '../lib/fetch-paraderos'
import BackButton from "./BackButton"
import SeleccionarDestino from "./selectBus"
import ReloadIndicator from "./ReloadIndicator"
import BusCard from "./BusCard"
import { Bus, IndividualBus, MicroRoute } from "./BusCard"

const MapaParaderos = dynamic(() => import('./map'), {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center">Cargando mapa...</div>
});

// Animation variants for transitions
const contentVariants = {
    initial: { 
        x: 0,
        opacity: 1,
    },
    exit: { 
        x: -30, 
        opacity: 0,
        transition: {
            x: { duration: 0.25 },
            opacity: { duration: 0.25 }
        }
    }
};

const busSelectVariants = {
    initial: { 
        x: 30, 
        opacity: 0 
    },
    animate: { 
        x: 0, 
        opacity: 1,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 }
        }
    }
};

// Simplified version of the bus selection UI 
interface BusSelectionProps {
    busStopId: string;
    onBack: () => void;
    onConfirm: (destino: string) => void;
}

// Define service and bus stop interfaces
interface Service {
    id: string;
    valid: boolean;
    status_description: string;
    buses: Bus[];
}

interface BusStop {
    id: string;
    name: string;
    status_code: number;
    status_description: string;
    services: Service[];
}

function SimpleBusSelection({ busStopId, onBack, onConfirm }: BusSelectionProps) {
    const [destino, setDestino] = useState("");
    const [allBuses, setAllBuses] = useState<IndividualBus[]>([]);
    const [busStopInfo, setBusStopInfo] = useState<BusStop | null>(null);
    const [selectedBus, setSelectedBus] = useState<IndividualBus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch real bus data from API
    const fetchBusData = async (prefetchedData?: any) => {
        // If we already have data from a previous fetch, use it and update the UI
        if (prefetchedData) {
            const data: BusStop = prefetchedData;
            processBusData(data);
            return data;
        }
        
        // Otherwise, just fetch the data but don't process it yet
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://api.xor.cl/red/bus-stop/${busStopId}`);

            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }

            const data: BusStop = await response.json();
            setIsLoading(false);
            return data;
        } catch (err) {
            console.error("Error fetching bus data:", err);
            setError("No se pudo obtener información de buses. Intente nuevamente.");
            setIsLoading(false);
            return null;
        }
    };

    // Process the bus data and update state
    const processBusData = (data: BusStop) => {
        setBusStopInfo(data);

        // Keep track of previous values for animation
        const prevBusesMap = allBuses.reduce((acc, bus) => {
            acc[`${bus.serviceId}-${bus.id}`] = {
                distance: bus.metersDistance,
                minTime: bus.minArrivalTime
            };
            return acc;
        }, {} as Record<string, { distance: number, minTime: number }>);

        // Transform the API data to a flat list of all buses
        const transformedBuses: IndividualBus[] = [];
        
        data.services.forEach(service => {
            if (service.valid && service.buses.length > 0) {
                service.buses.forEach(bus => {
                    // Add previous values for animations
                    const busKey = `${service.id}-${bus.id}`;
                    const prevValues = prevBusesMap[busKey] || {};

                    transformedBuses.push({
                        id: bus.id,
                        serviceId: service.id,
                        name: service.id,
                        licensePlate: bus.id,
                        metersDistance: bus.meters_distance,
                        minArrivalTime: bus.min_arrival_time,
                        maxArrivalTime: bus.max_arrival_time,
                        status: service.status_description,
                        valid: service.valid,
                        estimatedArrival: bus.min_arrival_time === 0 
                            ? "Llegando" 
                            : `${bus.min_arrival_time}-${bus.max_arrival_time} min`,
                        previousDistance: prevValues.distance,
                        previousMinTime: prevValues.minTime
                    });
                });
            }
        });

        // Sort buses by distance (closest first)
        transformedBuses.sort((a, b) => a.metersDistance - b.metersDistance);

        setAllBuses(transformedBuses);
        setIsLoading(false);
    };

    // Initial fetch
    useEffect(() => {
        fetchBusData();
    }, [busStopId]);

    const handleSelectBus = (bus: IndividualBus | MicroRoute) => {
        // Vibración táctil
        if ("vibrate" in navigator) {
            navigator.vibrate(10);
        }
        
        // Check if it's an IndividualBus or MicroRoute
        const isIndividualBus = 'serviceId' in bus;
        
        if (isIndividualBus) {
            const individualBus = bus as IndividualBus;
            setSelectedBus(individualBus);
            setDestino(`${individualBus.name} → ${busStopInfo?.name || ""}`);
        } else {
            // This case shouldn't happen with current implementation but needed for type compatibility
            const microRoute = bus as MicroRoute;
            const firstBus: IndividualBus = {
                id: microRoute.buses[0]?.id || "",
                serviceId: microRoute.id,
                name: microRoute.name,
                licensePlate: microRoute.buses[0]?.id || "",
                metersDistance: microRoute.buses[0]?.meters_distance || 0,
                minArrivalTime: microRoute.buses[0]?.min_arrival_time || 0,
                maxArrivalTime: microRoute.buses[0]?.max_arrival_time || 0,
                status: microRoute.status,
                valid: microRoute.valid,
                estimatedArrival: microRoute.estimatedArrival
            };
            setSelectedBus(firstBus);
            setDestino(`${microRoute.name} → ${busStopInfo?.name || ""}`);
        }
    };

    const handleConfirm = () => {
        if (selectedBus) {
            // Vibración táctil
            if ("vibrate" in navigator) {
                navigator.vibrate(15);
            }
            onConfirm(destino);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center mb-2 relative">
                    <BackButton onClick={onBack} variant="inside-card" />
                    <h2 className="text-2xl font-bold tracking-tight text-center w-full">
                        <span className="mr-2 text-2xl">🚏</span> {busStopInfo?.name || "Cargando paradero..."}
                    </h2>
                </div>
                {busStopInfo && (
                    <p className="text-sm text-center text-gray-500">{busStopInfo.id}</p>
                )}
            </div>

            {/* Reload indicator */}
            <div className="absolute top-2 right-2">
                <ReloadIndicator onReload={fetchBusData} reloadInterval={5000} fetchData={fetchBusData} />
            </div>

            {/* Bus list */}
            <div 
                className="relative flex-1 overflow-y-auto px-1 mb-3 pb-1" 
                style={{ height: "calc(100% - 180px)" }}
            >
                {isLoading && allBuses.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <svg
                            className="animate-spin h-8 w-8 text-black"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center h-full text-center">
                        <span className="text-3xl mb-3">⚠️</span>
                        <p className="text-gray-700">{error}</p>
                    </div>
                ) : allBuses.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-full text-center">
                        <span className="text-3xl mb-3">🚫</span>
                        <p className="text-gray-700">No hay buses disponibles en este momento.</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        <div className="space-y-3">
                            {allBuses.map((bus, index) => (
                                <motion.div
                                    key={`${bus.serviceId}-${bus.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ 
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30,
                                        duration: 0.5 
                                    }}
                                    layout
                                >
                                    <BusCard
                                        bus={bus}
                                        index={index}
                                        isSelected={selectedBus?.id === bus.id && selectedBus?.serviceId === bus.serviceId}
                                        onSelect={handleSelectBus}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>
                )}
            </div>

            {/* Confirm button */}
            <div className="mt-auto">
                <button
                    onClick={handleConfirm}
                    disabled={!selectedBus}
                    className={`apple-button w-full py-3 ${selectedBus
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        } transition-colors text-sm font-medium rounded-xl`}
                >
                    Confirmar
                </button>
            </div>
        </div>
    );
}

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
    const [showBusSelect, setShowBusSelect] = useState(false);
    const [transitioning, setTransitioning] = useState(false);

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

            // Instead of immediately calling the callback, set a flag to show bus selection
            if (onDirectConfirm) {
                setTransitioning(true);
                // Small delay to allow animation to start
                setTimeout(() => {
                    setShowBusSelect(true);
                    setTransitioning(false);
                }, 50);
            } else {
                // Fallback
                onConfirm(selectedParaderoInfo.cod);
            }
        }
    };

    const handleBusSelectBack = () => {
        setTransitioning(true);
        setTimeout(() => {
            setShowBusSelect(false);
            setTransitioning(false);
        }, 50);
    };

    const handleBusSelectConfirm = (destino: string) => {
        if (onDirectConfirm && selectedParaderoInfo) {
            // Now we need to pass the selected bus destination to the parent
            // This will go directly to step 3 in the workflow
            if ("vibrate" in navigator) {
                try {
                    navigator.vibrate(15);
                } catch (e) {
                    // Ignore vibration errors
                }
            }
            onDirectConfirm(selectedParaderoInfo.cod);
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
            <AnimatePresence mode="wait" initial={false}>
                {!showBusSelect ? (
                    <motion.div
                        key="paradero-map"
                        initial="initial"
                        animate="initial"
                        exit="exit"
                        variants={contentVariants}
                        className="flex flex-col h-full"
                    >
                        {/* Map view when a paradero is selected */}
                        <BackButton onClick={handleClose} variant="inside-card" />

                        <div className="h-full flex flex-col">
                            <div className="flex items-center mb-3 relative">
                                <h2 className="text-3xl font-bold tracking-tight w-full text-center">
                                    {selectedParaderoInfo?.name || `Paradero ${selectedParaderoInfo?.cod}`}
                                </h2>
                            </div>

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
                    </motion.div>
                ) : (
                    <motion.div
                        key="bus-select"
                        variants={busSelectVariants}
                        initial="initial"
                        animate="animate"
                        className="flex flex-col h-full"
                    >
                        <SimpleBusSelection 
                            onConfirm={handleBusSelectConfirm} 
                            onBack={handleBusSelectBack} 
                            busStopId={selectedParaderoInfo?.cod || ""} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 