"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ParaderoList from "./ParaderoList"
import ParaderoMap from "./ParaderoMap"

// Animation variants for page transitions
const pageVariants = {
  enter: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 }
    }
  },
  exit: {
    x: -30,
    opacity: 0,
    transition: {
      x: { duration: 0.25 },
      opacity: { duration: 0.25 }
    }
  }
};

const mapVariants = {
  enter: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 }
    }
  },
  exit: {
    x: 30,
    opacity: 0,
    transition: {
      x: { duration: 0.25 },
      opacity: { duration: 0.25 }
    }
  }
};

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
          <motion.div
            key="list"
            initial={{ x: -30, opacity: 0 }}
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="absolute inset-0"
          >
            <ParaderoList
              userLocation={userLocation || null}
              forceManualMode={forceManualMode}
              onParaderoSelect={handleParaderoSelect}
              onBack={onBack}
            />
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ x: 30, opacity: 0 }}
            animate="enter"
            exit="exit"
            variants={mapVariants}
            className="absolute inset-0"
          >
            <ParaderoMap
              selectedParadero={selectedParadero!}
              userLocation={userLocation || null}
              onClose={handleCloseMap}
              onConfirm={handleConfirmParadero}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 