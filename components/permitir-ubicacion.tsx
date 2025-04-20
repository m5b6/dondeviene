"use client"

import { useState, useEffect } from "react"
import MapPlaceholder from "./map-placeholder"
import { motion } from "framer-motion"

interface PermitirUbicacionProps {
  onPermission: (position: GeolocationPosition | null) => void
}

export default function PermitirUbicacion({ onPermission }: PermitirUbicacionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasVibrated, setHasVibrated] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasVibrated && "vibrate" in navigator) {
      try {
        if (document.hasFocus()) {
          navigator.vibrate(10) // Vibración sutil
        }
        setHasVibrated(true)
      } catch (e) {
        setHasVibrated(true)
      }
    }
  }, [hasVibrated])

  const handlePermitir = () => {
    setIsLoading(true)
    setPermissionError(null)

    // Vibración táctil - with error handling
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15)
      } catch (e) {
        // Ignore vibration errors
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoading(false)
          onPermission(position)
        },
        (error) => {
          setIsLoading(false)

          if (error.code === 1) { // PERMISSION_DENIED
            setPermissionError("Permiso denegado. Por favor activa la ubicación en tu navegador.")
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            setPermissionError("No se pudo obtener tu ubicación. Intenta de nuevo.")
          } else if (error.code === 3) { // TIMEOUT
            setPermissionError("La búsqueda de ubicación tomó demasiado tiempo. Intenta de nuevo.")
          } else {
            setPermissionError("Error al obtener tu ubicación. Intenta de nuevo.")
          }

          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.error("Error obteniendo ubicación:", error)
          }

          onPermission(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds
          maximumAge: 30000 // Accept positions up to 30 seconds old to improve reliability
        },
      )
    } else {
      setIsLoading(false)
      setPermissionError("Tu navegador no soporta geolocalización.")
      onPermission(null)
    }
  }

  const handleSkip = () => {
    // Vibración táctil - with error handling
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10)
      } catch (e) {
        // Ignore vibration errors
      }
    }
    onPermission(null)
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
    <div className="relative h-screen w-full overflow-hidden">
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

      {/* Modal */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6 pt-safe pb-safe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div
          className="w-full max-w-md vision-card p-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >

          <motion.h1
            className="text-3xl font-bold text-center mb-4 tracking-tight flex items-center justify-center whitespace-nowrap"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            ¿Podemos ver<br /> tu ubicación?
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
            {permissionError && (
              <motion.div
                className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {permissionError}
              </motion.div>
            )}

            <button
              onClick={handlePermitir}
              disabled={isLoading}
              className="apple-button w-full py-4 border-2 border-black text-black font-medium text-lg hover:bg-black hover:text-white transition-colors  hover:shadow-lg active:scale-[0.98]"
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
              className="apple-button w-full py-3 text-gray-500 text-sm font-medium hover:text-black transition-colors"
            >
              Continuar sin ubicación
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
