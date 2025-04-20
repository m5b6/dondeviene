"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import ParaderoList from "./ParaderoList"
import ParaderoMap from "./ParaderoMap"

interface AskParaderoProps {
  onParaderoSelected: (paradero: string) => void;
  onBack: () => void;
  userLocation?: GeolocationPosition | null;
  forceManualMode?: boolean;
}

export default function AskParadero({ 
  onParaderoSelected, 
  onBack, 
  userLocation,
  forceManualMode = false
}: AskParaderoProps) {
  const [showMap, setShowMap] = useState(false);
  const [selectedParadero, setSelectedParadero] = useState<string | null>(null);

  const handleParaderoSelect = (paradero: string | any) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Ignore vibration errors
      }
    }
    
    setSelectedParadero(paradero);
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedParadero(null);
  };

  const handleConfirmParadero = (paradero: string) => {
    onParaderoSelected(paradero);
  };

  return (
    <div className="h-[465px]">
      <AnimatePresence mode="wait">
        {!showMap ? (
          <ParaderoList
            userLocation={userLocation || null}
            forceManualMode={forceManualMode}
            onParaderoSelect={handleParaderoSelect}
            onBack={onBack}
          />
        ) : (
          <ParaderoMap
            selectedParadero={selectedParadero!}
            userLocation={userLocation || null}
            onClose={handleCloseMap}
            onConfirm={handleConfirmParadero}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 