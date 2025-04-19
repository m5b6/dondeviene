"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SeleccionarDestinoProps {
  onConfirm: (destino: string) => void
}

export default function SeleccionarDestino({ onConfirm }: SeleccionarDestinoProps) {
  const [destino, setDestino] = useState("")
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Simulación de búsqueda de destinos
  useEffect(() => {
    if (destino.length > 2) {
      // Aquí se conectaría con una API real para obtener sugerencias
      const mockSugerencias = [
        "Mercado Central",
        "Metro Universidad de Chile",
        "Plaza de Armas",
        "Parque Forestal",
        "Costanera Center",
      ].filter((s) => s.toLowerCase().includes(destino.toLowerCase()))

      setSugerencias(mockSugerencias)
    } else {
      setSugerencias([])
    }
  }, [destino])

  // Auto-focus en el input al cargar
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 500)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDestino(e.target.value)
  }

  const handleSelectSugerencia = (sugerencia: string) => {
    setDestino(sugerencia)
    setSugerencias([])
  }

  const handleConfirm = () => {
    if (destino.trim()) {
      onConfirm(destino)
    }
  }

  return (
    <motion.div
      className="h-screen w-full bg-off-white p-6 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.h2
        className="text-2xl font-bold mb-8 text-center tracking-tight"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Seleccionar Destino
      </motion.h2>

      <motion.div
        className="relative w-full max-w-md mx-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className={`relative transition-all duration-300 ${isFocused ? "scale-[1.02]" : ""}`}>
          <input
            ref={inputRef}
            type="text"
            value={destino}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="¿A dónde vas?"
            className="apple-input"
          />
        </div>

        <AnimatePresence>
          {sugerencias.length > 0 && (
            <motion.ul
              className="mt-2 bg-white rounded-2xl shadow-apple-sm overflow-hidden"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {sugerencias.map((sugerencia, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectSugerencia(sugerencia)}
                  className="apple-list-item"
                >
                  {sugerencia}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1"></div>

      <motion.button
        onClick={handleConfirm}
        disabled={!destino.trim()}
        className={`apple-button w-full py-4 font-medium text-lg ${
          destino.trim()
            ? "bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        } transition-colors`}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        whileTap={{ scale: destino.trim() ? 0.98 : 1 }}
      >
        Confirmar
      </motion.button>
    </motion.div>
  )
}
