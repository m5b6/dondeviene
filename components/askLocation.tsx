"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { usePreciseGeolocation } from "../hooks/useGeolocation"

interface PermitirUbicacionProps {
  onPermission: (position: GeolocationPosition | null) => void;
  onRetry?: () => void;
  onProceedWithoutLocation?: () => void;
  forceAllowNextStep?: boolean;
}

// Animation variants for content transition
const contentVariants = {
  enter: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export default function AskLocation({ 
  onPermission, 
  onRetry, 
  onProceedWithoutLocation, 
  forceAllowNextStep = false
}: PermitirUbicacionProps) {
  const [buttonLoading, setButtonLoading] = useState(false)
  
  const { 
    permission, 
    position, 
    error, 
    requestPermission 
  } = usePreciseGeolocation();

  // Pass position to parent component when we get it
  useEffect(() => {
    if (position && permission === "granted") {
      setButtonLoading(false);
      onPermission(position);
    }
  }, [position, permission, onPermission]);

  // Handle error state changes
  useEffect(() => {
    if (error || permission === "denied" || permission === "unsupported") {
      setButtonLoading(false);
    }
  }, [error, permission]);

  const handlePermitir = () => {
    // Set button to loading state
    setButtonLoading(true);
    
    // Vibración táctil - with error handling
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15)
      } catch (e) {
        // Ignore vibration errors
      }
    }

    // If we have an onRetry function from the parent, use that
    if (onRetry) {
      onRetry();
      return;
    }

    // Otherwise request permission using our hook
    requestPermission();
  };

  const handleSkip = () => {
    // Vibración táctil - with error handling
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10)
      } catch (e) {
        // Ignore vibration errors
      }
    }
    // Use the dedicated function if available
    if (onProceedWithoutLocation) {
      onProceedWithoutLocation();
    } else {
      onPermission(null);
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;
    
    if ('code' in error) {
      if (error.code === 1) { // PERMISSION_DENIED
        return "Permiso denegado. Por favor activa la ubicación en tu navegador."
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        return "No se pudo obtener tu ubicación. Intenta de nuevo."
      } else if (error.code === 3) { // TIMEOUT
        return "La búsqueda de ubicación tomó demasiado tiempo. Intenta de nuevo."
      }
    }
    return "Error al obtener tu ubicación. Intenta de nuevo."
  };

  const permissionError = getErrorMessage();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate="enter"
      exit="exit"
      variants={contentVariants}
      className="flex flex-col h-[465px] justify-between"
    >
      {/* Header area */}
      <div>
        <h1 className="text-3xl font-bold text-center mb-4 tracking-tight flex items-center justify-center whitespace-nowrap">
          ¿Podemos ver<br /> tu ubicación?
        </h1>

        <p className="text-xl text-center mb-8 text-gray font-light">
          Para mostrarte tus paraderos más cercanos
        </p>
      </div>

      {/* Main content and button area */}
      <div className="flex flex-col justify-between">
        {/* Content area */}
        <div className="mb-2">
          {permissionError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {permissionError}
              {forceAllowNextStep && (
                <span className="block mt-2">
                  Puedes continuar sin ubicación para seleccionar tu paradero manualmente.
                </span>
              )}
            </div>
          )}

          <button
            onClick={handlePermitir}
            disabled={buttonLoading}
            className="apple-button w-full py-4 border-2 border-black text-black font-medium text-lg hover:bg-black hover:text-white transition-colors hover:shadow-lg active:scale-[0.98]"
          >
            {buttonLoading ? (
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
              error ? "Reintentar" : "Permitir"
            )}
          </button>
        </div>

        {/* Secondary button - fixed at bottom */}
        <button
          onClick={handleSkip}
          className="apple-button w-full text-gray-500 text-sm font-medium hover:text-black transition-colors"
          style={{ paddingBottom: "0px" }}
        >
          Seleccionar manualmente
        </button>
      </div>
    </motion.div>
  )
}
