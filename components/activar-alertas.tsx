"use client"

import { useState } from "react"
import MapPlaceholder from "./map-placeholder"
import { motion } from "framer-motion"

interface ActivarAlertasProps {
  paradero: string
  destino: string
  onComplete: () => void
}

export default function ActivarAlertas({ paradero, destino, onComplete }: ActivarAlertasProps) {
  const [alertasActivadas, setAlertasActivadas] = useState(true)

  const handleToggleAlertas = () => {
    setAlertasActivadas(!alertasActivadas)
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Fondo con mapa borroso */}
      <div className="absolute inset-0 filter blur-md">
        <MapPlaceholder />
      </div>

      {/* Tarjeta de resumen */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-full max-w-md apple-card p-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.h2
            className="text-2xl font-bold mb-6 tracking-tight"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Recibir alertas
          </motion.h2>

          <motion.div
            className="text-xl mb-8 font-medium"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex items-center space-x-2">
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
            className="flex items-center justify-between mb-10"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <span className="text-lg font-medium">5 min antes</span>
            <button
              onClick={handleToggleAlertas}
              className="apple-toggle focus:ring-2 focus:ring-black/10"
              aria-checked={alertasActivadas}
              style={{
                backgroundColor: alertasActivadas ? "#000" : "#E5E5E7",
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
            className="apple-button w-full py-4 bg-black text-white font-medium text-lg hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors"
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
