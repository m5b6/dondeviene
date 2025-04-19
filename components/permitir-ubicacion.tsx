"use client"

import { useState } from "react"
import MapPlaceholder from "./map-placeholder"
import { motion } from "framer-motion"

interface PermitirUbicacionProps {
  onPermission: (position: GeolocationPosition | null) => void
}

export default function PermitirUbicacion({ onPermission }: PermitirUbicacionProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePermitir = () => {
    setIsLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoading(false)
          onPermission(position)
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error)
          setIsLoading(false)
          onPermission(null)
        },
      )
    } else {
      console.error("Geolocalización no soportada")
      setIsLoading(false)
      onPermission(null)
    }
  }

  const handleSkip = () => {
    onPermission(null)
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Fondo con mapa borroso */}
      <div className="absolute inset-0 filter blur-md">
        <MapPlaceholder />
      </div>

      {/* Modal */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div
          className="w-full max-w-md apple-card p-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.h1
            className="text-3xl font-bold text-center mb-4 tracking-tight"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            ¿Podemos usar tu ubicación?
          </motion.h1>

          <motion.p
            className="text-xl text-center mb-8 text-gray font-light"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Para mostrarte tu paradero más cercano
          </motion.p>

          <motion.div
            className="w-full space-y-4"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <button
              onClick={handlePermitir}
              disabled={isLoading}
              className="apple-button w-full py-4 border-2 border-black text-black font-medium text-lg hover:bg-black hover:text-white transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
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
                  Cargando...
                </span>
              ) : (
                "Permitir"
              )}
            </button>

            <button
              onClick={handleSkip}
              className="apple-button w-full py-4 text-gray font-medium text-lg hover:text-black transition-colors"
            >
              No ahora
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
