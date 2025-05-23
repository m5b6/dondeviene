"use client"

import { useState, useEffect } from "react"
import AskLocationOrParadero, { LocationResult } from "@/components/askLocationOrParadero"
import ActivarAlertas from "@/components/activarAlertas"
import { AnimatePresence, motion } from "framer-motion"
import Logo from "@/components/Logo"
import SelectBus from "@/components/selectBus"
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
  const [manualParaderoCode, setManualParaderoCode] = useState<string | null>(null)

  const handleLocationResult = (result: LocationResult) => {
    setIsTransitioning(true)

    if (result.type === "location") {
      setLocation(result.position)
      setManualParaderoCode(null)
    } else if (result.type === "paradero") {
      setLocation(null)
      setManualParaderoCode(result.paradero)
    } else {
      setLocation(null)
      setManualParaderoCode(null)
    }

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
      paradero: selectedParadero,
      destino: destination,
    })
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(1)
      setLocation(null)
      setManualParaderoCode(null)
      setSelectedParadero(null)
      setDestination("")
      setLocationAttempts(0)
      setForceAllowNextStep(false)
      setIsTransitioning(false)
    }, 300)
  }

  const handleBack = () => {
    if (step > 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        // If we're going back from the paradero selection to location, clear the manual code
        if (step === 2) {
          setManualParaderoCode(null);
          setLocation(null);
        }
        setStep(step - 1)
        setIsTransitioning(false)
      }, 300)
    }
  }

  return (
    <main className="min-h-screen bg-off-white text-black pb-[env(safe-area-inset-bottom)]">
      {/* Logo component */}
      <Logo step={step} />
      
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

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <AskLocationOrParadero
              onResult={handleLocationResult}
              forceAllowNextStep={forceAllowNextStep}
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
            <SelectBus onConfirm={handleDestinationConfirm} onBack={handleBack} busStopId={selectedParadero?.cod || ""} />
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
            <ActivarAlertas
              paradero={selectedParadero ? selectedParadero.cod : ""}
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
