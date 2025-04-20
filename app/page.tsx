"use client"

import { useState, useEffect } from "react"
import PermitirUbicacion from "@/components/permitir-ubicacion"
import ConfirmarParadero from "@/components/confirmar-paradero"
import SeleccionarDestino from "@/components/seleccionar-destino"
import ActivarAlertas from "@/components/activar-alertas"
import { AnimatePresence, motion } from "framer-motion"
import { useGeolocation } from "@/hooks/useGeolocation"

// Define the type for selected paradero info, matching ConfirmarParadero's output
interface SelectedParaderoInfo {
  id: number;
  cod: string;
  name: string;
  distance: number;
  pos: [number, number];
}

export default function Home() {
  const [step, setStep] = useState(1)
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [selectedParadero, setSelectedParadero] = useState<SelectedParaderoInfo | null>(null)
  const [destination, setDestination] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [locationAttempts, setLocationAttempts] = useState(0)
  const [forceAllowNextStep, setForceAllowNextStep] = useState(false)

  // Use the geolocation hook with refined options
  const { permission, position, error, requestPermission } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 7000,
    maximumAge: 10000, // Accept positions up to 10 seconds old
  })

  // Auto-proceed to next step if we get permission and position
  useEffect(() => {
    // If we have a position, proceed automatically
    if (permission === 'granted' && position && step === 1) {
      handleLocationPermission(position)
    }
    // If we've failed to get location despite attempts, set force allow flag
    else if ((permission === 'denied' || (error && locationAttempts >= 2)) && step === 1) {
      setForceAllowNextStep(true)
    }
  }, [permission, position, error, step, locationAttempts])

  // Try to request permission immediately
  useEffect(() => {
    if (step === 1 && locationAttempts === 0) {
      requestPermission()
      setLocationAttempts(1)
    }
  }, [step, locationAttempts, requestPermission])

  // Handle retrying for location
  const handleRetryLocation = () => {
    setLocationAttempts(prev => prev + 1)
    requestPermission()
  }

  const handleLocationPermission = (position: GeolocationPosition | null) => {
    setIsTransitioning(true)
    setLocation(position)
    setTimeout(() => {
      setStep(2)
      setIsTransitioning(false)
    }, 300)
  }

  // Function to proceed without location
  const handleProceedWithoutLocation = () => {
    setIsTransitioning(true)
    setLocation(null)
    setTimeout(() => {
      setStep(2)
      setIsTransitioning(false)
    }, 300)
  }

  // Update handler function to expect the new type
  const handleParaderoConfirm = (paradero: SelectedParaderoInfo) => {
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
    console.log("Configuración completada:", {
      paradero: selectedParadero, // Log the full object
      destino: destination,
    })
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(1)
      setLocationAttempts(0)
      setForceAllowNextStep(false)
      setIsTransitioning(false)
    }, 300)
  }

  const handleBack = () => {
    if (step > 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setStep(step - 1)
        setIsTransitioning(false)
      }, 300)
    }
  }

  return (
    <main className="min-h-screen bg-off-white text-black pb-[env(safe-area-inset-bottom)]">
      {isTransitioning && (
        <motion.div
          key="transition"
          className="fixed inset-0 bg-black z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      <AnimatePresence mode="popLayout">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <PermitirUbicacion 
              onPermission={handleLocationPermission} 
              onRetry={handleRetryLocation}
              onProceedWithoutLocation={handleProceedWithoutLocation}
              error={error}
              forceAllowNextStep={forceAllowNextStep}
              permission={permission}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <ConfirmarParadero
              location={location}
              onConfirm={handleParaderoConfirm} // Now matches the expected type
              onBack={handleBack}
            />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <SeleccionarDestino onConfirm={handleDestinationConfirm} onBack={handleBack} />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <ActivarAlertas
              // Convert id to string if ActivarAlertas expects string
              paradero={selectedParadero ? selectedParadero.cod : ""} // Pass cod instead, which is string
              destino={destination}
              onComplete={handleComplete}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
