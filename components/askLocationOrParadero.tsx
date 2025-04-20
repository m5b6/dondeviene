"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import AskLocation from "./askLocation"
import AskParadero from "./askParadero"

export type LocationResult = 
  | { type: "location"; position: GeolocationPosition }
  | { type: "paradero"; paradero: string }
  | { type: "none" }

interface AskLocationOrParaderoProps {
  onResult: (result: LocationResult) => void;
  forceAllowNextStep?: boolean;
}

export default function AskLocationOrParadero({
  onResult,
  forceAllowNextStep = false
}: AskLocationOrParaderoProps) {
  const [view, setView] = useState<"location" | "paradero">("location");

  const handleLocationPermission = (position: GeolocationPosition | null) => {
    if (position) {
      onResult({ type: "location", position });
    } else {
      setView("paradero");
    }
  };

  const handleParaderoSelected = (paradero: string) => {
    onResult({ type: "paradero", paradero });
  };

  const handleBack = () => {
    setView("location");
  };

  const handleProceedWithoutAnything = () => {
    onResult({ type: "none" });
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {view === "location" ? (
          <AskLocation 
            key="location"
            onPermission={handleLocationPermission}
            onProceedWithoutLocation={() => setView("paradero")}
            forceAllowNextStep={forceAllowNextStep}
          />
        ) : (
          <AskParadero 
            key="paradero"
            onParaderoSelected={handleParaderoSelected}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 