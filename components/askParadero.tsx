"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import CardLayout from "./cardLayout"

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
    <CardLayout>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate="enter"
        exit="exit"
        variants={contentVariants}
        className="flex flex-col h-[465px]"
      >
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
      </motion.div>
    </CardLayout>
  );
} 