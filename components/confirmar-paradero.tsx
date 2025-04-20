"use client"

import { useState, useEffect } from "react"
import MapPlaceholder from "./map-placeholder"
import { motion, AnimatePresence } from "framer-motion"

interface ParaderoInfo {
  id: string
  distance: number
}

interface ConfirmarParaderoProps {
  location: GeolocationPosition | null
  onConfirm: (paradero: ParaderoInfo) => void
  onBack: () => void
}

export default function ConfirmarParadero({ location, onConfirm, onBack }: ConfirmarParaderoProps) {
  // Simulación de paraderos cercanos
  const [paraderos, setParaderos] = useState<ParaderoInfo[]>([])
  const [selectedParadero, setSelectedParadero] = useState<ParaderoInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulamos una carga de datos
    setIsLoading(true)

    // Aquí se conectaría con una API real para obtener paraderos cercanos
    // basados en la ubicación del usuario
    setTimeout(() => {
      const mockParaderos = [
        { id: "1234", distance: 200 },
        { id: "5678", distance: 350 },
        { id: "9012", distance: 480 },
        { id: "A3B4", distance: 600 },
        { id: "C5D6", distance: 750 },
        { id: "E7F8", distance: 900 },
        { id: "G9H0", distance: 1100 },
      ]
      setParaderos(mockParaderos)
      setSelectedParadero(mockParaderos[0])
      setIsLoading(false)

      // Vibración táctil al cargar los datos
      if ("vibrate" in navigator) {
        navigator.vibrate(10)
      }
    }, 1000)
  }, [location])

  const handleConfirm = () => {
    if (selectedParadero) {
      // Vibración táctil
      if ("vibrate" in navigator) {
        navigator.vibrate(15)
      }
      onConfirm(selectedParadero)
    }
  }

  const handleSelectParadero = (paradero: ParaderoInfo) => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(5)
    }
    setSelectedParadero(paradero)
  }

  return (
    <div className="h-screen w-full flex flex-col relative">
      {/* Botón de Volver */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors flex items-center justify-center w-10 h-10"
        aria-label="Volver"
      >
        <span className="text-black text-xl font-bold">&lt;</span>
      </button>

      {/* Mapa en escala de grises */}
      <div className="flex-1 grayscale">
        <MapPlaceholder />
      </div>

      {/* Tarjeta superpuesta */}
      <motion.div
        className="bg-white/90 backdrop-blur-xl w-full rounded-t-3xl shadow-vision p-6 pb-safe"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.5)",
        }}
      >
        <h2 className="text-2xl font-bold mb-6 tracking-tight flex items-center">
          <span className="mr-2 text-2xl">🚏</span> ¿Este es tu paradero?
        </h2>

        {/* Container for list/loader with fixed height and scroll */}
        <div className="h-[180px] sm:h-[250px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-full py-8">
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
            <ul className="space-y-3">
              <AnimatePresence>
                {paraderos.map((paradero, index) => (
                  <motion.li
                    key={paradero.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelectParadero(paradero)}
                    className={`apple-list-item ${
                      selectedParadero?.id === paradero.id ? "bg-black text-white" : "hover:bg-gray-100"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-lg font-medium tracking-tight flex items-center">
                      <span className="mr-2 text-xl">🚌</span>
                      {paradero.id} — {paradero.distance} m
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <motion.button
          onClick={handleConfirm}
          disabled={!selectedParadero || isLoading}
          className={`apple-button w-full py-4 mt-6 font-medium text-lg transition-all border-1 ${
            !selectedParadero || isLoading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-white hover:text-black hover:border-black hover:shadow-lg"
          }`}
          whileTap={{ scale: !selectedParadero || isLoading ? 1 : 0.98 }}
        >
          Sí, es este
        </motion.button>
      </motion.div>
    </div>
  )
}
