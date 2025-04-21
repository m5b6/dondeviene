"use client"

import { useState, useEffect } from "react"
import MapPlaceholder from "./mapLoading"
import { motion } from "framer-motion"
import BackButton from "./BackButton"

interface ActivarAlertasProps {
  paradero: string
  destino: string
  onComplete: () => void
  onBack: () => void
}

export default function ActivarAlertas({ paradero, destino, onComplete, onBack }: ActivarAlertasProps) {
  const [alertasActivadas, setAlertasActivadas] = useState(true)
  const [hasVibrated, setHasVibrated] = useState(false)

  // Efecto para vibración al cargar
  useEffect(() => {
    if (!hasVibrated && "vibrate" in navigator) {
      navigator.vibrate(10) // Vibración sutil
      setHasVibrated(true)
    }
  }, [hasVibrated])

  const handleToggleAlertas = () => {
    // Vibración táctil
    if ("vibrate" in navigator) {
      navigator.vibrate(alertasActivadas ? 5 : 10)
    }
    setAlertasActivadas(!alertasActivadas)
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

      {/* Tarjeta de resumen */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6 pt-safe pb-safe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-full max-w-md vision-card p-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="flex items-center mb-4 relative"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <BackButton onClick={onBack} variant="inside-card" />
            <h2 className="text-2xl font-bold tracking-tight w-full text-center flex items-center justify-center">
              <span className="mr-2 text-2xl">🔔</span> Recibir alertas
            </h2>
          </motion.div>

          <motion.div
            className="text-xl mb-8 font-medium"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex items-center space-x-2 bg-white/50 p-3 rounded-xl">
              <span className="font-semibold">{paradero}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{destino}</span>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center justify-between mb-10 bg-white/50 p-4 rounded-xl"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <span className="text-lg font-medium flex items-center">
              <span className="mr-2 text-xl">⏰</span> 5 min antes
            </span>
            <button
              onClick={handleToggleAlertas}
              className="apple-toggle focus:ring-2 focus:ring-black/10"
              aria-checked={alertasActivadas}
              style={{
                backgroundColor: alertasActivadas ? "#34C7B5" : "#E5E5E7",
              }}
            >
              <span
                className="apple-toggle-knob"
                style={{
                  transform: alertasActivadas ? "translateX(24px)" : "translateX(2px)",
                }}
              />
            </button>
          </motion.div>

          <motion.button
            onClick={onComplete}
            className="apple-button w-full py-4 bg-black text-white font-medium text-lg hover:bg-white hover:text-black hover:border-2 hover:border-black hover:shadow-lg transition-colors"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            whileTap={{ scale: 0.98 }}
          >
            Listo
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
