import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface RollingNumberProps {
  value: string;
  className?: string;
  duration?: number;
}

// Component for a single digit with rolling animation
const Digit = ({ value, prevValue, duration }: { value: string; prevValue: string; duration: number }) => {
  // Skip animation if values are the same
  if (value === prevValue) {
    return (
      <div className="inline-block w-[0.6em] font-mono font-bold text-center overflow-hidden">
        {value}
      </div>
    );
  }

  // Determine animation direction (up or down)
  const direction = (() => {
    // Special case for non-numeric characters
    if (!isNumeric(value) || !isNumeric(prevValue)) {
      return 1;  // Default direction
    }
    
    // For numeric values, determine if counting up or down
    return parseFloat(value) > parseFloat(prevValue) ? 1 : -1;
  })();
  
  return (
    <div className="inline-block w-[0.6em] h-[1.2em] font-mono font-bold text-center overflow-hidden relative">
      {/* Old value animates out */}
      <motion.div
        key={`prev-${prevValue}`}
        initial={{ y: 0 }}
        animate={{ y: -direction * 20 }}
        transition={{ 
          duration: duration / 1000,
          ease: "easeInOut"
        }}
        className="absolute left-0 w-full font-bold"
      >
        {prevValue}
      </motion.div>
      
      {/* New value animates in */}
      <motion.div
        key={`new-${value}`}
        initial={{ y: direction * 20 }}
        animate={{ y: 0 }}
        transition={{ 
          duration: duration / 1000,
          ease: "easeInOut"
        }}
        className="absolute left-0 w-full font-bold"
      >
        {value}
      </motion.div>
    </div>
  );
};

// Helper function to check if a string is numeric
const isNumeric = (str: string): boolean => {
  if (str === '.' || str === '-' || str === ' ') return false;
  return !isNaN(parseFloat(str)) && isFinite(Number(str));
};

export default function RollingNumber({ value, className = "", duration = 400 }: RollingNumberProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (value !== prevValue && !isAnimating) {
      setIsAnimating(true);
      
      // After animation completes, update the previous value
      const timer = setTimeout(() => {
        setPrevValue(value);
        setIsAnimating(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [value, prevValue, duration, isAnimating]);
  
  // Normalize the values for consistent display
  const normalizeValue = (val: string) => {
    return val.replace(/\s/g, " ").replace(/\./g, ".").replace(/-/g, "-");
  };
  
  const normalizedValue = normalizeValue(value);
  const normalizedPrevValue = normalizeValue(prevValue);
  
  // Split into individual characters
  const digits = normalizedValue.split("");
  const prevDigits = normalizedPrevValue.split("");
  
  // Make sure both arrays have the same length
  const maxLength = Math.max(digits.length, prevDigits.length);
  
  // Padding with spaces to match length
  while (digits.length < maxLength) digits.unshift(" ");
  while (prevDigits.length < maxLength) prevDigits.unshift(" ");
  
  return (
    <div className={`inline-flex font-mono font-bold ${className}`}>
      {digits.map((digit, index) => (
        <Digit
          key={`digit-${index}`}
          value={digit}
          prevValue={prevDigits[index]}
          duration={duration}
        />
      ))}
    </div>
  );
} 