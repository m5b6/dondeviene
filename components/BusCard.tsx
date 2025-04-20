"use client"

import { motion } from "framer-motion"
import RollingNumber from "./RollingNumber"
import { useState, useEffect, useRef } from "react"

export interface Bus {
  id: string
  meters_distance: number
  min_arrival_time: number
  max_arrival_time: number
}

export interface MicroRoute {
  id: string
  name: string
  destination: string
  estimatedArrival: string
  valid: boolean
  status: string
  buses: Bus[]
  previousDistance?: number
  previousMinTime?: number
}

// Add a blur transition component for arrival times
const BlurTransition = ({ value, className = "" }: { value: string, className?: string }) => {
  const [blurred, setBlurred] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  
  useEffect(() => {
    if (value !== prevValueRef.current) {
      // Blur first
      setBlurred(true);
      
      // Set new value after short delay
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setBlurred(false);
      }, 150);
      
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);
  
  return (
    <span 
      className={`transition-all duration-150 ${blurred ? 'opacity-0 blur-sm' : 'opacity-100 blur-0'} ${className}`}
    >
      {displayValue}
    </span>
  );
};

interface BusCardProps {
  micro: MicroRoute
  index: number
  isSelected: boolean
  onSelect: (micro: MicroRoute) => void
}

export default function BusCard({ micro, index, isSelected, onSelect }: BusCardProps) {
  // Extract numeric part from arrival time
  const getArrivalTimeValue = (arrivalTime: string): string => {
    if (arrivalTime === "Llegando") return arrivalTime
    const match = arrivalTime.match(/(\d+)-(\d+)/)
    if (match) return `${match[1]}-${match[2]}`
    return arrivalTime
  }

  // Calculate distance text
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters}m`
    } else {
      return `${(meters / 1000).toFixed(2)}km`
    }
  }

  const getDistanceValue = (meters: number): string => {
    if (meters < 1000) {
      return `${meters}`
    } else {
      return `${(meters / 1000).toFixed(2)}`
    }
  }

  const getDistanceUnit = (meters: number): string => {
    return meters < 1000 ? "m" : "km"
  }

  // Get change indicators for animations
  const getDistanceChange = (current?: number, previous?: number) => {
    if (current === undefined || previous === undefined) return null
    if (current < previous) return "decrease"
    if (current > previous) return "increase"
    return null
  }

  const getTimeChange = (current?: number, previous?: number) => {
    if (current === undefined || previous === undefined) return null
    if (current < previous) return "decrease"
    if (current > previous) return "increase"
    return null
  }

  return (
    <motion.div
      key={micro.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${!micro.valid ? "opacity-60" : ""} flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors duration-150 ${isSelected
        ? "bg-black text-white"
        : "bg-white/50 hover:bg-gray-100 shadow-md"
        }`}
      onClick={() => micro.valid && onSelect(micro)}
      whileTap={{ scale: micro.valid ? 0.98 : 1 }}
    >
      <div className="flex-1">
        <div className="flex items-center">
          <span className={`text-xl mr-2 ${micro.valid ? "animate-bus-rumble" : "grayscale opacity-60"}`}>🚌</span>
          <span className={`font-semibold text-lg ${isSelected ? "text-white" : ""}`}>
            {micro.name}
          </span>
        </div>
        <div className={`text-sm mt-1 ${isSelected ? "text-gray-300" : "text-gray-500"}`}>
          {micro.status}
        </div>
      </div>
      <div className="text-right">
        {micro.valid ? (
          <>
            <div className={`font-medium ${isSelected ? "text-white" : "text-accent"} flex items-center`}>
              {micro.estimatedArrival === "Llegando" ? (
                <span>Llegando</span>
              ) : micro.estimatedArrival.includes("min") ? (
                <span className="flex items-center">
                  <BlurTransition
                    value={getArrivalTimeValue(micro.estimatedArrival)}
                    className="font-mono"
                  />
                  <span className="ml-1">min</span>
                </span>
              ) : (
                <span>{micro.estimatedArrival}</span>
              )}
            </div>
            {micro.buses.length > 0 && (
              <div className={`text-xs ${isSelected ? "text-gray-300" : "text-gray-500"} flex items-center justify-end`}>
                <RollingNumber
                  value={getDistanceValue(micro.buses[0].meters_distance)}
                  duration={500}
                  className="font-mono"
                />
                <span className="ml-1 font-bold">{getDistanceUnit(micro.buses[0].meters_distance)}</span>
              </div>
            )}
            <div className="flex items-center justify-end mt-1">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className={`text-xs font-medium ${isSelected ? "text-green-300" : "text-green-600"}`}>
                en vivo
              </span>
            </div>
          </>
        ) : (
          <div className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-500"}`}>
            No disponible
          </div>
        )}
      </div>
    </motion.div>
  )
} 