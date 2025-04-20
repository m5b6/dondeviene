"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import CardLayout from "./cardLayout"
import dynamic from 'next/dynamic'
import { fetchParaderoByCode, ParaderoInfo } from '../lib/fetch-paraderos'

const MapaParaderos = dynamic(() => import('./map'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Cargando mapa...</div>
});

interface AskParaderoProps {
  onParaderoSelected: (paradero: string) => void;
  onBack: () => void;
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
    x: 20,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export default function AskParadero({ onParaderoSelected, onBack }: AskParaderoProps) {
  const [paraderos, setParaderos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // New states for map functionality
  const [showMap, setShowMap] = useState(false);
  const [selectedParaderoInfo, setSelectedParaderoInfo] = useState<ParaderoInfo | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Fetch user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Fetch paraderos
  useEffect(() => {
    const fetchParaderos = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://www.red.cl/restservice_v2/rest/getparadas/all');

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setParaderos(data);
        } else {
          setParaderos([]);
        }

        setLoading(false);
      } catch (err) {
        setError('No se pudieron cargar los paraderos. Intenta de nuevo más tarde.');
        setLoading(false);
        console.error('Error fetching paraderos:', err);
      }
    };

    fetchParaderos();
  }, []);

  // Filter paraderos based on search term
  const filteredParaderos = paraderos.filter(p => {
    const searchLower = search.toLowerCase();
    const plower = p.toLowerCase();

    // Match if paradero starts with the search term
    return plower.startsWith(searchLower);
  });

  const handleParaderoSelect = async (paradero: string) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Ignore vibration errors
      }
    }

    try {
      setMapLoading(true);
      // Fetch the paradero location
      const paraderoInfo = await fetchParaderoByCode(paradero);
      setSelectedParaderoInfo(paraderoInfo);
      // Show the map
      setShowMap(true);
    } catch (error) {
      console.error("Error fetching paradero location:", error);
      // If we can't get the location, just proceed with the selection
      onParaderoSelected(paradero);
    } finally {
      setMapLoading(false);
    }
  };

  const handleBack = () => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // Ignore vibration errors
      }
    }
    onBack();
  };
  
  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedParaderoInfo(null);
  };
  
  const handleConfirmParadero = () => {
    if (selectedParaderoInfo) {
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(15);
        } catch (e) {
          // Ignore vibration errors
        }
      }
      onParaderoSelected(selectedParaderoInfo.cod);
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
    <CardLayout>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate="enter"
        exit="exit"
        variants={contentVariants}
        className="flex flex-col h-[465px]"
      >
        {!showMap ? (
          <>
            {/* Header area */}
            <div>
              <h1 className="text-3xl font-bold text-center mb-4 tracking-tight flex items-center justify-center whitespace-nowrap">
                ¿Cuál es<br /> tu paradero?
              </h1>

              <p className="text-xl text-center mb-8 text-gray font-light">
                Busca por código de paradero
              </p>
            </div>

            {/* Main content and button area */}
            <div className="flex-1 flex flex-col justify-between">
              {/* Content area */}
              <div className="mb-auto">
                {/* Search input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="PC123, PA111..."
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-black focus:outline-none focus:ring-0"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Error state */}
                {error && !loading && (
                  <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}


                {loading ? (
                  <div className="h-[200px] flex justify-center items-center py-8">
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
                  <div className="h-[200px] overflow-y-auto border border-gray-200 rounded-xl">
                    {filteredParaderos.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {filteredParaderos.slice(0, 100).map((paradero) => (
                          <li key={paradero}>
                            <button
                              onClick={() => handleParaderoSelect(paradero)}
                              className="w-full text-left p-3 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                            >
                              <span className="font-medium">{paradero}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : search ? (
                      <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                        No se encontraron paraderos con "{search}"
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
                        Escribe para buscar paraderos
                      </div>
                    )}

                    {search && filteredParaderos.length > 100 && (
                      <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-200">
                        Mostrando 100 de {filteredParaderos.length} resultados
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Back button - fixed at bottom */}
              <button
                onClick={handleBack}
                className="apple-button w-full py-3 text-gray-500 text-sm font-medium hover:text-black transition-colors"
              >
                Volver
              </button>
            </div>
          </>
        ) : (
          <>
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
                      userLocation={userLocation}
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
                    onClick={handleCloseMap}
                    className="apple-button flex-1 py-3 text-gray-500 text-sm font-medium hover:text-black transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirmParadero}
                    className="apple-button flex-1 py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </CardLayout>
  );
} 