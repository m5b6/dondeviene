"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import { RedParadero } from "../types/red"
import dynamic from 'next/dynamic'
import { fetchNearbyParaderos, ParaderoInfo } from "../lib/fetch-paraderos"
import BackButton from "./BackButton"

const MapaParaderos = dynamic(() => import('./map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-200">Cargando mapa...</div>
});

interface ConfirmarParaderoProps {
  location: GeolocationPosition | null;
  manualParaderoCode?: string | null;
  onConfirm: (paradero: ParaderoInfo) => void;
  onBack: () => void;
}

export default function ConfirmarParadero({ location, manualParaderoCode, onConfirm, onBack }: ConfirmarParaderoProps) {
  const [paraderos, setParaderos] = useState<ParaderoInfo[]>([]);
  const [selectedParadero, setSelectedParadero] = useState<ParaderoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userCoords = location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null;

  // Fetch nearby paraderos based on location
  useEffect(() => {
    if (!location && !manualParaderoCode) {
      setError("No se pudo obtener la ubicación ni se proporcionó un código de paradero.");
      setIsLoading(false);
      return;
    }

    const getParaderos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (location) {
          const { latitude, longitude } = location.coords;
          const nearbyParaderos = await fetchNearbyParaderos(latitude, longitude);

          if (nearbyParaderos.length > 0) {
            setParaderos(nearbyParaderos);
            setSelectedParadero(nearbyParaderos[0]);

            if ("vibrate" in navigator) {
              navigator.vibrate(10);
            }
          } else {
            setError("No se encontraron paraderos cercanos.");
            setParaderos([]);
            setSelectedParadero(null);
          }
        }
      } catch (err: any) {
        setError(err.message || "Error al buscar paraderos. Intenta de nuevo.");
        setParaderos([]);
        setSelectedParadero(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!manualParaderoCode) {
      getParaderos();
    }
  }, [location, manualParaderoCode]);

  // Fetch specific paradero by code
  useEffect(() => {
    if (!manualParaderoCode) return;

    const getParaderoByCode = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // This is a placeholder implementation - you would need to implement an actual API call
        // to fetch paradero details by code in your fetchParaderoByCode function

        // Simulating a paradero result for now
        // In a real implementation, you would make an API call to get paradero details
        setTimeout(() => {
          const manualParadero: ParaderoInfo = {
            id: 0, // Placeholder ID
            cod: manualParaderoCode,
            name: `Paradero ${manualParaderoCode}`, // You'd get the real name from API
            distance: 0, // We don't know the distance for manual selection
            pos: [0, 0] // You'd get the real position from API
          };

          setParaderos([manualParadero]);
          setSelectedParadero(manualParadero);
          setIsLoading(false);

          if ("vibrate" in navigator) {
            navigator.vibrate(10);
          }
        }, 500);
      } catch (err: any) {
        setError(`Error al buscar el paradero ${manualParaderoCode}. Intenta de nuevo.`);
        setParaderos([]);
        setSelectedParadero(null);
        setIsLoading(false);
      }
    };

    getParaderoByCode();
  }, [manualParaderoCode]);

  const handleConfirm = () => {
    if (selectedParadero) {
      if ("vibrate" in navigator) {
        navigator.vibrate(15);
      }
      onConfirm(selectedParadero);
    }
  };

  const handleSelectParadero = (paradero: ParaderoInfo) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(5);
    }
    setSelectedParadero(paradero);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return (
    <div className="h-screen w-full flex flex-col relative">
      <BackButton onClick={onBack} />

      <div className="flex-1 relative">
        <MapaParaderos
          userLocation={userCoords}
          selectedParadero={selectedParadero}
          isLoading={isLoading && paraderos.length === 0}
        />
      </div>

      <motion.div
        className="bg-white/90 backdrop-blur-xl w-full rounded-t-3xl shadow-vision p-6 pb-safe"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.5)",
          position: "relative", zIndex: 10
        }}
      >
        <h2 className="text-2xl font-bold mb-6 tracking-tight flex items-center">
          <span className="mr-2 text-2xl">📍</span> ¿Este es tu paradero?
        </h2>

        {/* List Container */}
        <div className="h-[180px] sm:h-[250px] overflow-y-auto pr-1">
          {isLoading && paraderos.length === 0 ? ( // Show spinner only on initial load
            <div className="flex justify-center items-center h-full py-8">
              <svg
                className="animate-spin h-8 w-8 text-black"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-full text-center text-red-600 px-4">
              {error}
            </div>
          ) : paraderos.length === 0 && !isLoading ? ( // Show message only after loading finished
            <div className="flex justify-center items-center h-full text-center text-gray-500 px-4">
              No se encontraron paraderos cercanos.
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence>
                {paraderos.map((paradero, index) => (
                  <motion.li
                    key={paradero.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectParadero(paradero)}
                    className={`apple-list-item ${selectedParadero?.id === paradero.id ? "bg-black text-white" : "hover:bg-gray-100"
                      }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-lg font-medium tracking-tight flex items-center justify-between">
                      <span className="flex items-center truncate pr-2">
                        <span className="mr-2 text-xl">🚏</span>
                        <span className="font-semibold mr-2">{paradero.cod}</span>
                        <span className={`truncate ${selectedParadero?.id === paradero.id ? 'text-gray-400' : 'text-gray-600'}`}>{paradero.name}</span>
                      </span>
                      <span className={`font-normal text-sm whitespace-nowrap pl-2 ${selectedParadero?.id === paradero.id ? 'text-gray-300' : 'text-gray-500'}`}>
                        {formatDistance(paradero.distance)}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Confirm Button */}
        <motion.button
          onClick={handleConfirm}
          disabled={!selectedParadero || isLoading || !!error}
          className={`apple-button w-full py-4 mt-6 font-medium text-lg transition-all border-1 ${!selectedParadero || isLoading || !!error
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-white hover:text-black hover:border-black hover:shadow-lg"
            }`}
          whileTap={{ scale: !selectedParadero || isLoading || !!error ? 1 : 0.98 }}
        >
          Sí, es este
        </motion.button>
      </motion.div>
    </div>
  );
}
