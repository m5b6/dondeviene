"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import MapPlaceholder from "./mapLoading"

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

interface MicroRoute {
  id: string
  name: string
  destination: string
  estimatedArrival: string
}

interface SeleccionarDestinoProps {
  onConfirm: (destino: string) => void
  onBack: () => void
}

export default function SeleccionarDestino({ onConfirm, onBack }: SeleccionarDestinoProps) {
  const [destino, setDestino] = useState("")
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [mode, setMode] = useState<"input" | "micro">("micro")
  const [microRoutes, setMicroRoutes] = useState<MicroRoute[]>([])
  const [selectedMicro, setSelectedMicro] = useState<MicroRoute | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Simulación de búsqueda de destinos
  useEffect(() => {
    if (destino.length > 2 && mode === "input") {
      // Aquí se conectaría con una API real para obtener sugerencias
      const mockSugerencias = [
        "Mercado Central",
        "Metro Universidad de Chile",
        "Plaza de Armas",
        "Parque Forestal",
        "Costanera Center",
      ].filter((s) => s.toLowerCase().includes(destino.toLowerCase()))

      setSugerencias(mockSugerencias)

      // Vibración táctil sutil al mostrar sugerencias
      if ("vibrate" in navigator) {
        navigator.vibrate(5)
      }
    } else {
      setSugerencias([])
    }
  }, [destino, mode])

  // Simulación de rutas de micro
  useEffect(() => {
    setIsLoading(true)
    // Aquí se conectaría con una API real para obtener rutas de micro
    setTimeout(() => {
      const mockMicroRoutes: MicroRoute[] = [
        {
          id: "506",
          name: "506",
          destination: "Maipú",
          estimatedArrival: "5 min",
        },
        {
          id: "210",
          name: "210",
          destination: "Estación Central",
          estimatedArrival: "8 min",
        },
        {
          id: "D18",
          name: "D18",
          destination: "Las Condes",
          estimatedArrival: "12 min",
        },
        {
          id: "401",
          name: "401",
          destination: "Providencia",
          estimatedArrival: "15 min",
        },
        {
          id: "106",
          name: "106",
          destination: "Peñalolén",
          estimatedArrival: "18 min",
        },
        {
          id: "B02",
          name: "B02",
          destination: "Mapocho",
          estimatedArrival: "20 min",
        },
        {
          id: "303",
          name: "303",
          destination: "Quilicura",
          estimatedArrival: "25 min",
        },
      ]
      setMicroRoutes(mockMicroRoutes)
      setIsLoading(false)
    }, 1000)
  }, [])

  // Auto-focus en el input al cargar
  useEffect(() => {
    if (inputRef.current && mode === "input") {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 500)
    }
  }, [mode])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDestino(e.target.value)
  }

  const handleSelectSugerencia = (sugerencia: string) => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(10)
    }
    setDestino(sugerencia)
    setSugerencias([])
  }

  const handleSelectMicro = (micro: MicroRoute) => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(10)
    }
    setSelectedMicro(micro)
    setDestino(`${micro.name} → ${micro.destination}`)
  }

  const handleConfirm = () => {
    if ((mode === "input" && destino.trim()) || (mode === "micro" && selectedMicro)) {
      // Vibración táctil
      if ("vibrate" in navigator) {
        navigator.vibrate(15)
      }
      onConfirm(destino)
    }
  }

  const handleModeChange = (newMode: "input" | "micro") => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(8)
    }
    setMode(newMode)
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
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors flex items-center justify-center w-10 h-10"
        aria-label="Volver"
      >
        <span className="text-black text-xl font-bold">&lt;</span>
      </button>

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
          className="w-full max-w-md vision-card p-6"
          variants={cardVariants} // Apply card variants
          initial="hidden"
          animate="visible"
        >
          <motion.h2
            className="text-2xl font-bold mb-6 text-center tracking-tight flex items-center justify-center"
            variants={itemVariants} // Apply item variants
          >
            <span className="mr-2 text-2xl">🔍</span> Seleccionar Destino
          </motion.h2>

          <motion.div
            className="segmented-control mb-6 border-radius-lg"
            style={{
              borderRadius: "18px",
            }}
            variants={itemVariants} // Apply item variants
          >
            <button
              className={`segmented-control-option ${mode === "micro" ? "active" : ""}`}
              onClick={() => handleModeChange("micro")}
            >
              Seleccionar micro
            </button>
            <button
              className={`segmented-control-option ${mode === "input" ? "active" : ""}`}
              onClick={() => handleModeChange("input")}
            >
              Buscar destino
            </button>
          </motion.div>

          {/* Wrap content area for variant application */}
          <motion.div variants={itemVariants}>
            <AnimatePresence mode="wait">
              {mode === "input" ? (
                <motion.div
                  key="input-mode"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative h-[360px] overflow-y-auto pr-1"
                >
                  <div
                    className={`relative transition-all duration-300 scale-[0.97] ${isFocused ? "scale-[1]" : ""}`}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={destino}
                      onChange={handleInputChange}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="¿A dónde vas?"
                      className="apple-input"
                      aria-label="Destino"
                    />
                  </div>

                  <AnimatePresence>
                    {sugerencias.length > 0 && (
                      <motion.ul
                        className="mt-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-vision overflow-hidden"
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          border: "1px solid rgba(255, 255, 255, 0.5)",
                        }}
                      >
                        {sugerencias.map((sugerencia, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleSelectSugerencia(sugerencia)}
                            className="apple-list-item hover:bg-accent/10"
                            whileTap={{ scale: 0.98 }}
                          >
                            {sugerencia}
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="micro-mode"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative h-[360px] overflow-y-auto pr-1"
                >
                  {isLoading ? (
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
                  ) : (
                    <div className="space-y-3">
                      {microRoutes.map((micro, index) => {
                        const isSelected = selectedMicro?.id === micro.id
                        return (
                          <motion.div
                            key={micro.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors duration-150 ${isSelected
                                ? "bg-black text-white"
                                : "bg-white/50 hover:bg-gray-100 shadow-md"
                              }`}
                            onClick={() => handleSelectMicro(micro)}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-xl mr-2">🚌</span>
                                <span className={`font-semibold text-lg ${isSelected ? "text-white" : ""}`}>
                                  {micro.name}
                                </span>
                              </div>
                              <div className={`text-sm mt-1 ${isSelected ? "text-gray-300" : "text-gray"}`}>
                                → {micro.destination}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${isSelected ? "text-white" : "text-accent"}`}>
                                {micro.estimatedArrival}
                              </div>
                              <div className="flex items-center justify-end mt-1">
                                <span className="relative flex h-2 w-2 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className={`text-xs font-medium ${isSelected ? "text-green-300" : "text-green-600"}`}>
                                  en vivo
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.button
            onClick={handleConfirm}
            disabled={(mode === "input" && !destino.trim()) || (mode === "micro" && !selectedMicro)}
            className={`apple-button w-full py-4 mt-6 font-medium text-lg ${(mode === "input" && destino.trim()) || (mode === "micro" && selectedMicro)
              ? "bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
              } transition-colors`}
            whileTap={{
              scale: (mode === "input" && destino.trim()) || (mode === "micro" && selectedMicro) ? 0.98 : 1,
            }}
          >
            Confirmar
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
