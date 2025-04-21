"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import AskLocation from "./askLocation"
import AskParadero from "./askParadero"
import CardLayout from "./cardLayout"

export type LocationResult = 
  | { type: "location"; position: GeolocationPosition }
  | { type: "paradero"; paradero: string }
  | { type: "none" }

interface AskLocationOrParaderoProps {
  onResult: (result: LocationResult) => void;
  forceAllowNextStep?: boolean;
}

// Animation variants for page transitions
const pageVariants = {
  locationEnter: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 }
    }
  },
  locationExit: {
    x: -30,
    opacity: 0,
    transition: {
      x: { duration: 0.25 },
      opacity: { duration: 0.25 }
    }
  },
  paraderoEnter: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 }
    }
  },
  paraderoExit: {
    x: 30,
    opacity: 0,
    transition: {
      x: { duration: 0.25 },
      opacity: { duration: 0.25 }
    }
  }
};

export default function AskLocationOrParadero({
  onResult,
  forceAllowNextStep = false
}: AskLocationOrParaderoProps) {
  const [view, setView] = useState<"location" | "paradero">("location");
  const [userPosition, setUserPosition] = useState<GeolocationPosition | null>(null);
  const [forceManualMode, setForceManualMode] = useState(false);

  const handleLocationPermission = (position: GeolocationPosition | null) => {
    if (position) {
      // Save the position for use in Paradero selection
      setUserPosition(position);
      // Ensure we're not in manual mode when location is available
      setForceManualMode(false);
      // Go to paradero selection view
      setView("paradero");
    } else {
      setView("paradero");
    }
  };

  const handleParaderoSelected = (paradero: string) => {
    // If we have user location, include it in the result
    if (userPosition) {
      onResult({ type: "location", position: userPosition });
    } else {
      onResult({ type: "paradero", paradero });
    }
  };

  const handleBack = () => {
    setView("location");
  };

  const handleProceedWithoutAnything = () => {
    onResult({ type: "none" });
  };

  const handleProceedWithoutLocation = () => {
    // Set manual mode flag and go to paradero selection
    setForceManualMode(true);
    setView("paradero");
  };

  // DIRECT ROUTE: Bypass all steps and send paradero code directly to parent
  const handleDirectConfirm = (paraderoCode: string) => {
    // This bypasses all intermediate steps and goes to selectBus.tsx
    onResult({ type: "paradero", paradero: paraderoCode });
  };

  return (
    <CardLayout>
      <div className="relative h-global">
        <AnimatePresence mode="wait" initial={false}>
          {view === "location" ? (
            <motion.div 
              key="location"
              initial={{ x: -30, opacity: 0 }}
              animate="locationEnter"
              exit="locationExit"
              variants={pageVariants}
              className="absolute inset-0"
            >
              <AskLocation 
                onPermission={handleLocationPermission}
                onProceedWithoutLocation={handleProceedWithoutLocation}
                forceAllowNextStep={forceAllowNextStep}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="paradero"
              initial={{ x: 30, opacity: 0 }}
              animate="paraderoEnter"
              exit="paraderoExit"
              variants={pageVariants}
              className="absolute inset-0"
            >
              <AskParadero 
                onParaderoSelected={handleParaderoSelected}
                onBack={handleBack}
                userLocation={userPosition}
                forceManualMode={forceManualMode}
                onDirectConfirm={handleDirectConfirm}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CardLayout>
  );
} 