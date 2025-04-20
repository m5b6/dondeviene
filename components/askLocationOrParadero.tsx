"use client"

import { useState } from "react"
import PermitirUbicacion from "./askLocation"
import SelectParadero from "./selectParadero"

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
      // If user chose to continue without location, switch to paradero selection
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
    <>
      {view === "location" && (
        <PermitirUbicacion 
          onPermission={handleLocationPermission}
          onProceedWithoutLocation={() => setView("paradero")}
          forceAllowNextStep={forceAllowNextStep}
        />
      )}
      
      {view === "paradero" && (
        <SelectParadero 
          onParaderoSelected={handleParaderoSelected}
          onBack={handleBack}
        />
      )}
    </>
  );
} 