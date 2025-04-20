"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import MapPlaceholder from "./mapLoading"


interface SelectParaderoProps {
  onParaderoSelected: (paradero: string) => void;
  onBack: () => void;
}

export default function SelectParadero({ onParaderoSelected, onBack }: SelectParaderoProps) {
  const [paraderos, setParaderos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasVibrated, setHasVibrated] = useState(false);

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

  // Handle vibration effect
  useEffect(() => {
    if (!hasVibrated && "vibrate" in navigator) {
      try {
        if (document.hasFocus()) {
          navigator.vibrate(10) // Vibración sutil
        }
        setHasVibrated(true)
      } catch (e) {
        setHasVibrated(true)
      }
    }
  }, [hasVibrated]);

  // Parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 10;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      setOffset({ x, y });
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta && e.gamma) {
        const x = (e.gamma / 45) * 10;
        const y = (e.beta / 45) * 10;
        setOffset({ x, y });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("deviceorientation", handleDeviceOrientation);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };
  }, []);

  // Filter paraderos based on search term - more permissive search
  const filteredParaderos = paraderos.filter(p => {
    const searchLower = search.toLowerCase();
    const plower = p.toLowerCase();
    
    // Match if paradero starts with the search term
    return plower.startsWith(searchLower);
  });

  const handleParaderoSelect = (paradero: string) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Ignore vibration errors
      }
    }
    onParaderoSelected(paradero);
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

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Blurred map background with parallax effect */}
      <motion.div
        className="absolute inset-0 filter blur-md"
        animate={{
          x: offset.x,
          y: offset.y,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 30,
        }}
      >
        <MapPlaceholder />
      </motion.div>

      {/* Modal */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6 pt-safe pb-safe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div
          className="w-full max-w-md vision-card p-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.h1
            className="text-3xl font-bold text-center mb-4 tracking-tight flex items-center justify-center whitespace-nowrap"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Selecciona<br /> tu paradero
          </motion.h1>

          <motion.p
            className="text-xl text-center mb-8 text-gray font-light"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Busca por código de paradero
          </motion.p>

          <motion.div
            className="w-full space-y-4"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
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

            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center py-8">
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
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Results */}
            {!loading && !error && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
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
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron paraderos con "{search}"
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Escribe para buscar paraderos
                  </div>
                )}

                {search && filteredParaderos.length > 100 && (
                  <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-200">
                    Mostrando 100 de {filteredParaderos.length} resultados. Refina tu búsqueda para ver más.
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleBack}
              className="apple-button w-full py-3 text-gray-500 text-sm font-medium hover:text-black transition-colors mt-4"
            >
              Volver a ubicación
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
} 