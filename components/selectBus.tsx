"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import MapPlaceholder from "./mapLoading"
import ReloadIndicator from "./ReloadIndicator"
import BackButton from "./BackButton"
import BusCard, { MicroRoute, Bus, IndividualBus } from "./BusCard"
import { fetchParaderoByCode, ParaderoInfo, BusArrival } from "../lib/fetch-paraderos"

// Define animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1, // Stagger child animations
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
}

// Add slide transition variants
const slideVariants = {
  initial: {
    x: 30,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.25 },
      opacity: { duration: 0.25 }
    }
  },
  exit: {
    x: 30,
    opacity: 0,
    transition: {
      x: { duration: 0.25 },
      opacity: { duration: 0.25 }
    }
  }
}

interface Service {
  id: string
  valid: boolean
  status_description: string
  buses: Bus[]
}

interface BusStop {
  id: string
  name: string
  status_code: number
  status_description: string
  services: Service[]
}

interface SeleccionarDestinoProps {
  onConfirm: (destino: string) => void
  onBack: () => void
  busStopId: string
}

export default function SelectBus({ onConfirm, onBack, busStopId = "PA433" }: SeleccionarDestinoProps) {
  const [destino, setDestino] = useState("")
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [allBuses, setAllBuses] = useState<IndividualBus[]>([])
  const [busStopInfo, setBusStopInfo] = useState<ParaderoInfo | null>(null)
  const [selectedBus, setSelectedBus] = useState<IndividualBus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Fetch real bus data from API
  const fetchBusData = async (prefetchedData?: any) => {
    // If we already have data from a previous fetch, use it and update the UI
    if (prefetchedData) {
      const data: ParaderoInfo = prefetchedData;
      processBusData(data);
      return data;
    }

    // Otherwise, just fetch the data but don't process it yet
    // (The UI update will happen when the circle completes)
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchParaderoByCode(busStopId);
      // Don't process the data here, just return it
      // The ReloadIndicator will pass it back to us when the circle completes
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
  const processBusData = (data: ParaderoInfo) => {
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

    if (data.buses && data.buses.length > 0) {
      data.buses.forEach(bus => {
        // Add previous values for animations
        const busKey = `${bus.service}-${bus.busPlate || 'unknown'}`;
        const prevValues = prevBusesMap[busKey] || {};

        // Extract minutes from timeToArrival
        let minArrivalTime = 0;
        let maxArrivalTime = 0;

        if (bus.timeToArrival === "Llegando") {
          minArrivalTime = 0;
          maxArrivalTime = 0;
        } else {
          const timeMatch = bus.timeToArrival.match(/(\d+)/);
          if (timeMatch) {
            minArrivalTime = parseInt(timeMatch[1]);
            maxArrivalTime = minArrivalTime + 2; // Add some buffer
          }
        }

        // Convert distance from string to number (meters)
        let metersDistance = 0;
        if (bus.distance) {
          const distanceMatch = bus.distance.match(/(\d+(\.\d+)?)/);
          if (distanceMatch) {
            const distanceValue = parseFloat(distanceMatch[1]);
            if (bus.distance.includes("km")) {
              metersDistance = distanceValue * 1000;
            } else {
              metersDistance = distanceValue;
            }
          }
        }

        transformedBuses.push({
          id: bus.busPlate || bus.service,
          serviceId: bus.service,
          name: bus.service,
          licensePlate: bus.busPlate || "",
          metersDistance: metersDistance,
          minArrivalTime: minArrivalTime,
          maxArrivalTime: maxArrivalTime,
          status: "En servicio",
          valid: true,
          estimatedArrival: bus.timeToArrival,
          previousDistance: prevValues.distance,
          previousMinTime: prevValues.minTime,
          color: bus.color
        });
      });
    }

    // Sort buses by arrival time (closest first)
    transformedBuses.sort((a, b) => {
      // Put "Llegando" first
      if (a.estimatedArrival === "Llegando" && b.estimatedArrival !== "Llegando") return -1;
      if (a.estimatedArrival !== "Llegando" && b.estimatedArrival === "Llegando") return 1;
      // Then by arrival time
      return a.minArrivalTime - b.minArrivalTime;
    });

    setAllBuses(transformedBuses);
    setIsLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    // Make sure we fetch data when the component mounts or when busStopId changes
    if (busStopId) {
      fetchBusData().then(data => {
        if (data) {
          processBusData(data);
        }
      });
    }
  }, [busStopId]);

  // Detectar cuando el teclado está visible
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        // En iOS, cuando el teclado aparece, la altura de la ventana se reduce
        const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.8
        setKeyboardVisible(isKeyboardVisible)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Scroll al contenedor cuando el teclado está visible
  useEffect(() => {
    if (keyboardVisible && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [keyboardVisible])

  const handleSelectBus = (bus: IndividualBus | MicroRoute) => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(10)
    }

    // Check if it's an IndividualBus or MicroRoute
    const isIndividualBus = 'serviceId' in bus;

    if (isIndividualBus) {
      const individualBus = bus as IndividualBus;
      setSelectedBus(individualBus)
      setDestino(`${individualBus.name} → ${busStopInfo?.name || ""}`)
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
      setSelectedBus(firstBus)
      setDestino(`${microRoute.name} → ${busStopInfo?.name || ""}`)
    }
  }

  const handleConfirm = () => {
    if (selectedBus) {
      // Vibración táctil
      if ("vibrate" in navigator) {
        navigator.vibrate(15)
      }
      onConfirm(destino)
    }
  }

  // Efecto de parallax para el fondo
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 10
      const y = (e.clientY / window.innerHeight - 0.5) * 10
      setOffset({ x, y })
    }

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta && e.gamma) {
        const x = (e.gamma / 45) * 10
        const y = (e.beta / 45) * 10
        setOffset({ x, y })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("deviceorientation", handleDeviceOrientation)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("deviceorientation", handleDeviceOrientation)
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col relative" ref={containerRef}>
      {/* Fondo con mapa borroso y efecto parallax */}
      <motion.div
        className="absolute inset-0 filter blur-md"
        animate={{
          x: offset.x,
          y: offset.y,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 30,
        }}
      >
        <MapPlaceholder />
      </motion.div>

      {/* Contenido principal */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6 pt-safe pb-safe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 relative"
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Reload indicator */}
          <div className="absolute top-2 right-2">
            <ReloadIndicator onReload={fetchBusData} reloadInterval={5000} fetchData={fetchBusData} />
          </div>

          <motion.div className="mb-6 h-[90px]" variants={itemVariants}>
            <div className="flex items-center mb-2 relative">
              <BackButton onClick={onBack} variant="inside-card" />
              <h2 className="text-2xl font-bold tracking-tight text-center w-full">
                {busStopInfo?.name || "Cargando paradero..."}
              </h2>
            </div>
            {busStopInfo && (
              <p className="text-sm text-center text-gray-500">{busStopInfo.cod}</p>
            )}
          </motion.div>

          {/* Content area */}
          <motion.div variants={itemVariants}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative h-[320px] overflow-y-auto px-1 mb-3 pb-1"
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
            </motion.div>
          </motion.div>

          <motion.button
            onClick={handleConfirm}
            disabled={!selectedBus}
            className={`apple-button w-full py-4 mt-6 font-medium text-lg ${selectedBus
              ? "bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
              } transition-colors`}
            whileTap={{
              scale: selectedBus ? 0.98 : 1,
            }}
          >
            Confirmar
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
