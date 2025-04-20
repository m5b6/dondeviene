"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import dynamic from 'next/dynamic'
import { fetchParaderoByCode, ParaderoInfo } from '../lib/fetch-paraderos'

const MapaParaderos = dynamic(() => import('./map'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Cargando mapa...</div>
});

interface ParaderoMapProps {
  selectedParadero: string | ParaderoInfo;
  userLocation: GeolocationPosition | null;
  onClose: () => void;
  onConfirm: (paradero: string) => void;
}

// Animation variants for content transition
const contentVariants = {
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

export default function ParaderoMap({ 
  selectedParadero, 
  userLocation,
  onClose,
  onConfirm
}: ParaderoMapProps) {
  const [selectedParaderoInfo, setSelectedParaderoInfo] = useState<ParaderoInfo | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapUserLocation, setMapUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Extract user coordinates
  useEffect(() => {
    if (userLocation) {
      setMapUserLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      });
    }
  }, [userLocation]);

  // Fetch paradero info if needed
  useEffect(() => {
    const fetchParaderoInfo = async () => {
      // If paradero is already a ParaderoInfo object, use it directly
      if (typeof selectedParadero !== 'string') {
        setSelectedParaderoInfo(selectedParadero);
        return;
      }
      
      // Otherwise fetch the paradero location by code
      try {
        setMapLoading(true);
        const paraderoInfo = await fetchParaderoByCode(selectedParadero);
        setSelectedParaderoInfo(paraderoInfo);
      } catch (error) {
        console.error("Error fetching paradero location:", error);
      } finally {
        setMapLoading(false);
      }
    };

    fetchParaderoInfo();
  }, [selectedParadero]);

  const handleClose = () => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // Ignore vibration errors
      }
    }
    onClose();
  };
  
  const handleConfirm = () => {
    if (selectedParaderoInfo) {
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(15);
        } catch (e) {
          // Ignore vibration errors
        }
      }
      onConfirm(selectedParaderoInfo.cod);
    }
  };

  // Function to render a color badge for bus services
  const renderColorBadge = (color: string) => {
    return (
      <div 
        className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
        style={{ backgroundColor: color }}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate="enter"
      exit="exit"
      variants={contentVariants}
      className="flex flex-col h-[465px]"
    >
      {/* Map view when a paradero is selected */}
      <div className="h-full flex flex-col">
        <div className="pb-2">
          <h2 className="text-xl font-bold text-center mb-0">
            {selectedParaderoInfo?.name || `Paradero ${selectedParaderoInfo?.cod}`}
          </h2>
          <p className="text-center text-gray-500 text-sm mb-1">{selectedParaderoInfo?.cod}</p>
        </div>
        
        {/* Map and info layout */}
        <div className="flex-1 flex flex-col h-full">
          {/* Map container - now takes 40% of the height */}
          <div className="h-[40%] relative rounded-xl overflow-hidden mb-2">
            {mapLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <svg
                  className="animate-spin h-8 w-8 text-gray-500"
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
              </div>
            ) : (
              <MapaParaderos
                userLocation={mapUserLocation}
                selectedParadero={selectedParaderoInfo}
              />
            )}
          </div>
          
          {/* Bus arrivals list - takes the remaining height */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 mb-2">
            {selectedParaderoInfo?.buses && selectedParaderoInfo.buses.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {selectedParaderoInfo.buses.map((bus, index) => (
                  <div key={index} className="p-2 flex items-center">
                    <div className="flex items-center mr-3">
                      {renderColorBadge(bus.color)}
                      <span className="font-mono font-bold">{bus.service}</span>
                    </div>
                    
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-gray-900">{bus.destination}</div>
                      <div className="text-xs text-gray-500">
                        {bus.busPlate && `${bus.busPlate} • `}{bus.distance}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${bus.timeToArrival.includes('Llegando') ? 'text-green-600' : 'text-gray-900'}`}>
                        {bus.timeToArrival}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
                {mapLoading ? 
                  "Cargando información de buses..." : 
                  "No hay información de buses disponible en este momento."}
              </div>
            )}
          </div>
          
          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="apple-button flex-1 py-3 text-gray-500 text-sm font-medium hover:text-black transition-colors"
            >
              Volver
            </button>
            <button
              onClick={handleConfirm}
              className="apple-button flex-1 py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 