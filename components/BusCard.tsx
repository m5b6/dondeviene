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

export interface IndividualBus {
  id: string
  serviceId: string
  name: string
  licensePlate: string
  metersDistance: number
  minArrivalTime: number
  maxArrivalTime: number
  estimatedArrival: string
  valid: boolean
  status: string
  previousDistance?: number
  previousMinTime?: number
  color?: string
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
  micro?: MicroRoute
  bus?: IndividualBus
  index: number
  isSelected: boolean
  onSelect: (micro: MicroRoute | IndividualBus) => void
}

export default function BusCard({ micro, bus, index, isSelected, onSelect }: BusCardProps) {

  const getArrivalTimeValue = (arrivalTime: string): string => {
    if (arrivalTime === "Llegando.") return "Llegando";
    
    // Try to extract numbers from strings like "Entre 16 Y 22 min." or "Menos de 6 min."
    const numbers = arrivalTime.match(/\d+/g);
    
    if (numbers && numbers.length >= 2) {
      // If we found at least 2 numbers, return them in the format "X - Y min"
      return `${parseInt(numbers[0])} - ${parseInt(numbers[1])} min`;
    } else if (numbers && numbers.length === 1) {
      // If we found just one number (like in "Menos de 6 min.")
      return `${numbers[0]} min`;
    }
    
    // If we couldn't parse anything, return the original string
    return arrivalTime;
  }

  // Calculate distance text
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toString().padStart(3, '0')}m`
    } else {
      return `${(meters / 1000).toFixed(3)}km`
    }
  }

  const getDistanceValue = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toString().padStart(3, '0')}`
    } else {
      return `${(meters / 1000).toFixed(3)}`
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

  // Use either individual bus or micro route data
  const item = bus || micro!;
  const valid = item.valid;
  const estimatedArrival = item.estimatedArrival;
  const name = item.name;
  const status = item.status;
  const color = bus?.color || "#3B82F6"; // Default to blue if no color provided

  const metersDistance = bus ? bus.metersDistance : micro?.buses[0]?.meters_distance;
  const licensePlate = bus ? bus.licensePlate : undefined;

  const formatLicensePlate = (plate: string): string => {
    const cleanPlate = plate.replace(/[^a-zA-Z0-9]/g, '');

    if (cleanPlate.length !== 6) {
      return cleanPlate;
    }

    // Format as XX ⋅ XX ⋅ XX
    return `${cleanPlate.slice(0, 2)} ⋅ ${cleanPlate.slice(2, 4)} ⋅ ${cleanPlate.slice(4, 6)}`;
  };

  const formattedLicensePlate = licensePlate ? formatLicensePlate(licensePlate) : '';

  return (
    <motion.div
      key={bus ? `${bus.serviceId}-${bus.id}` : micro!.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${!valid ? "opacity-60" : ""} flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors duration-150 ${isSelected
        ? "bg-black text-white"
        : "bg-white/50 hover:bg-gray-100 shadow-md"
        }`}
      onClick={() => valid && onSelect(bus || micro!)}
      whileTap={{ scale: valid ? 0.98 : 1 }}
    >
      <div className="flex-1">
        <div className="flex items-center">
          <span className={`text-xl mr-2 ${valid ? "animate-bus-rumble" : "grayscale opacity-60"}`}>🚌</span>
          <span
            className={`inline-flex items-center px-2 py-0.4 rounded-md text-sm font-medium text-white`}
            style={{ backgroundColor: color }}
          >
            {name}
          </span>
        </div>
        {licensePlate && (
          <div className={`text-sm mt-0.5 ${isSelected ? "text-gray-300" : "text-gray-600"} font-medium tracking-wide uppercase`}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              letterSpacing: "0.05em"
            }}>
            {formattedLicensePlate}
          </div>
        )}
      </div>
      <div className="text-right">
        {valid ? (
          <>
            <div className={`font-medium ${isSelected ? "text-white" : "text-accent"} flex items-center justify-end`}>
                <span className="flex items-center">
                  <BlurTransition
                    value={getArrivalTimeValue(estimatedArrival)}
                  />
                </span>
            </div>
            {metersDistance !== undefined && (
              <div className={`text-xs ${isSelected ? "text-gray-300" : "text-gray-500"} flex items-center justify-end`}>
                <RollingNumber
                  value={getDistanceValue(metersDistance)}
                  duration={500}
                  className="font-mono"
                />
                <span className="ml-1 font-bold">{getDistanceUnit(metersDistance)}</span>
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