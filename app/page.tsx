"use client"

import { useState } from "react"
import PermitirUbicacion from "@/components/permitir-ubicacion"
import ConfirmarParadero from "@/components/confirmar-paradero"
import SeleccionarDestino from "@/components/seleccionar-destino"
import ActivarAlertas from "@/components/activar-alertas"
import { AnimatePresence, motion } from "framer-motion"

export default function Home() {
  const [step, setStep] = useState(1)
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [selectedParadero, setSelectedParadero] = useState<{ id: string; distance: number } | null>(null)
  const [destination, setDestination] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleLocationPermission = (position: GeolocationPosition | null) => {
    setIsTransitioning(true)
    setLocation(position)
    setTimeout(() => {
      setStep(2)
      setIsTransitioning(false)
    }, 300)
  }

  const handleParaderoConfirm = (paradero: { id: string; distance: number }) => {
    setIsTransitioning(true)
    setSelectedParadero(paradero)
    setTimeout(() => {
      setStep(3)
      setIsTransitioning(false)
    }, 300)
  }

  const handleDestinationConfirm = (dest: string) => {
    setIsTransitioning(true)
    setDestination(dest)
    setTimeout(() => {
      setStep(4)
      setIsTransitioning(false)
    }, 300)
  }

  const handleComplete = () => {
    // Aquí iría la lógica para guardar las preferencias del usuario
    console.log("Configuración completada:", {
      paradero: selectedParadero,
      destino: destination,
    })
    // Reiniciar el flujo o redirigir a la pantalla principal
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(1)
      setIsTransitioning(false)
    }, 300)
  }

  return (
    <main className="min-h-screen bg-off-white text-black">
      <AnimatePresence mode="wait">
        {isTransitioning ? (
          <motion.div
            key="transition"
            className="fixed inset-0 bg-black z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        ) : null}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PermitirUbicacion onPermission={handleLocationPermission} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConfirmarParadero location={location} onConfirm={handleParaderoConfirm} />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SeleccionarDestino onConfirm={handleDestinationConfirm} />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ActivarAlertas paradero={selectedParadero?.id || ""} destino={destination} onComplete={handleComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
