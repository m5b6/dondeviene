"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import MapPlaceholder from "./mapLoading"
import ReloadIndicator from "./ReloadIndicator"
import BackButton from "./BackButton"
import BusCard, { MicroRoute, Bus } from "./BusCard"

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

export default function SeleccionarDestino({ onConfirm, onBack, busStopId = "PA433" }: SeleccionarDestinoProps) {
  const [destino, setDestino] = useState("")
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [microRoutes, setMicroRoutes] = useState<MicroRoute[]>([])
  const [busStopInfo, setBusStopInfo] = useState<BusStop | null>(null)
  const [selectedMicro, setSelectedMicro] = useState<MicroRoute | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch real bus data from API
  const fetchBusData = async (prefetchedData?: any) => {
    // If we already have data from a previous fetch, use it and update the UI
    if (prefetchedData) {
      const data: BusStop = prefetchedData;
      processBusData(data);
      return data;
    }
    
    // Otherwise, just fetch the data but don't process it yet
    // (The UI update will happen when the circle completes)
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.xor.cl/red/bus-stop/${busStopId}`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const data: BusStop = await response.json();
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
  const processBusData = (data: BusStop) => {
    setBusStopInfo(data);

    // Keep track of previous values for animation
    const prevRoutesMap = microRoutes.reduce((acc, route) => {
      acc[route.id] = {
        distance: route.buses[0]?.meters_distance,
        minTime: route.buses[0]?.min_arrival_time
      };
      return acc;
    }, {} as Record<string, { distance?: number, minTime?: number }>);

    // Transform the API data to our component structure
    const transformedRoutes: MicroRoute[] = data.services.map(service => {
      // Extract the first bus arrival time (if any)
      const firstBus = service.buses[0];
      let estimatedArrival = "No disponible";

      if (service.valid && firstBus) {
        if (firstBus.min_arrival_time === 0) {
          estimatedArrival = "Llegando";
        } else {
          estimatedArrival = `${firstBus.min_arrival_time}-${firstBus.max_arrival_time} min`;
        }
      }

      // Add previous values for animations
      const prevValues = prevRoutesMap[service.id] || {};

      return {
        id: service.id,
        name: service.id,
        destination: service.valid ? "En servicio" : "Fuera de servicio",
        estimatedArrival,
        valid: service.valid,
        status: service.status_description,
        buses: service.buses,
        previousDistance: prevValues.distance,
        previousMinTime: prevValues.minTime
      };
    });

    transformedRoutes.sort((a, b) => {
      if (a.valid !== b.valid) return a.valid ? -1 : 1;

      if (a.valid && b.valid) {
        const aTime = a.buses[0]?.min_arrival_time ?? Infinity;
        const bTime = b.buses[0]?.min_arrival_time ?? Infinity;
        return aTime - bTime;
      }

      return 0;
    });

    setMicroRoutes(transformedRoutes);
    setIsLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchBusData()
  }, [busStopId])

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

  const handleSelectMicro = (micro: MicroRoute) => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(10)
    }
    setSelectedMicro(micro)
    setDestino(`${micro.name} → ${busStopInfo?.name || ""}`)
  }

  const handleConfirm = () => {
    if (selectedMicro) {
      // Vibración táctil
      if ("vibrate" in navigator) {
        navigator.vibrate(15)
      }
      onConfirm(destino)
    }
  }

  // Efecto de parallax para el fondo
  const [offset, setOffset] = useState({ x: 0, y: 0 })

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
    <div className="h-screen w-full flex flex-col relative" ref={containerRef}>
      {/* Botón de Volver */}
      <BackButton onClick={onBack} />

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
          className="w-full max-w-md vision-card p-6 relative"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Reload indicator */}
          <div className="absolute top-2 right-2">
            <ReloadIndicator onReload={fetchBusData} reloadInterval={5000} fetchData={fetchBusData} />
          </div>

          <motion.div className="mb-6 h-[90px]" variants={itemVariants}>
            <h2 className="text-2xl font-bold mb-1 text-center tracking-tight">
              <span className="mr-2 text-2xl">🚏</span> {busStopInfo?.name || "Cargando paradero..."}
            </h2>
            {busStopInfo && (
              <p className="text-sm text-center text-gray-500">{busStopInfo.id}</p>
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
              {isLoading && microRoutes.length === 0 ? (
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
              ) : microRoutes.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-center">
                  <span className="text-3xl mb-3">🚫</span>
                  <p className="text-gray-700">No hay buses disponibles en este momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {microRoutes.map((micro, index) => (
                    <BusCard
                      key={micro.id}
                      micro={micro}
                      index={index}
                      isSelected={selectedMicro?.id === micro.id}
                      onSelect={handleSelectMicro}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>

          <motion.button
            onClick={handleConfirm}
            disabled={!selectedMicro}
            className={`apple-button w-full py-4 mt-6 font-medium text-lg ${selectedMicro
              ? "bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
              } transition-colors`}
            whileTap={{
              scale: selectedMicro ? 0.98 : 1,
            }}
          >
            Confirmar
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
