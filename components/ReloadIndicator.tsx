"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ReloadIndicatorProps {
  onReload: (data?: any) => void
  reloadInterval: number
  fetchData: () => Promise<any>
}

export default function ReloadIndicator({ 
  onReload, 
  reloadInterval = 5000, 
  fetchData 
}: ReloadIndicatorProps) {
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const animationRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number>(0)
  const elapsedTimeRef = useRef<number>(0)
  const pendingDataRef = useRef<any>(null)
  const isFetchingRef = useRef<boolean>(false)
  const fetchStartedAtRef = useRef<number>(0)

  useEffect(() => {
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      
      if (!isPaused) {
        elapsedTimeRef.current += deltaTime;
        const newProgress = elapsedTimeRef.current / reloadInterval;
        
        setProgress(newProgress > 1 ? 1 : newProgress);
        
        // Start fetching at 50% progress
        if (newProgress >= 0.5 && !isFetchingRef.current) {
          isFetchingRef.current = true;
          fetchStartedAtRef.current = elapsedTimeRef.current;
          
          fetchData().then(data => {
            pendingDataRef.current = data;
            // Do NOT process the data yet - just store it for later
          }).catch(err => {
            console.error("Error fetching data:", err);
            pendingDataRef.current = null;
          });
        }
        
        // Only apply the data when the circle completes, regardless of when fetch finishes
        if (elapsedTimeRef.current >= reloadInterval) {
          // Pass the fetched data to onReload at the exact moment the circle completes
          onReload(pendingDataRef.current);
          isFetchingRef.current = false;
          pendingDataRef.current = null;
          elapsedTimeRef.current = 0;
          setProgress(0);
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start the animation
    if (!isPaused) {
      animationFrameId = requestAnimationFrame(animate);
    }
    
    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPaused, onReload, reloadInterval, fetchData]);

  const togglePause = () => {
    setIsPaused(!isPaused)
    if ("vibrate" in navigator) {
      navigator.vibrate(5)
    }
    
    // Reset timestamp to avoid jumps when resuming
    if (isPaused) {
      lastTimestampRef.current = 0;
    }
  }

  // Animation variants for the container
  const containerVariants = {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.15, 1], 
      opacity: isPaused ? 0.5 : 1,
      transition: { 
        scale: { duration: 0.4, ease: "easeInOut" },
        opacity: { duration: 0.3 } 
      } 
    }
  }
  
  // Animation variants for the icons
  const iconVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
    exit: { scale: 0, rotate: 180, transition: { duration: 0.2 } }
  }

  // Colors based on paused state
  const activeColor = "#22c55e"; // Green
  const pausedColor = "#9ca3af"; // Gray

  // Get current color based on state
  const currentColor = isPaused ? pausedColor : activeColor;

  return (
    <motion.div 
      className="w-6 h-6 relative rounded-full cursor-pointer"
      onClick={togglePause}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      key={isPaused ? "paused" : "playing"}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle 
          cx="12" 
          cy="12" 
          r="10" 
          fill="none" 
          strokeWidth="1" 
          stroke={currentColor}
          opacity="0.3"
        />
        <motion.circle 
          cx="12" 
          cy="12" 
          r="10" 
          fill="none" 
          strokeWidth="1.5" 
          stroke={currentColor}
          strokeDasharray={62.83} // 2π × r
          strokeDashoffset={62.83 - (progress * 62.83)}
          transform="rotate(-90 12 12)"
          initial={{ strokeWidth: 1.5 }}
          animate={{ 
            strokeWidth: [1.5, 2, 1.5],
            transition: { repeat: isPaused ? 0 : Infinity, repeatDelay: 2, duration: 1 }
          }}
        />
        
        {/* Pause/Play icon in the center */}
        <AnimatePresence mode="sync" initial={false}>
          {isPaused ? (
            // Play icon
            <motion.path
              key="play"
              d="M10 8L16 12L10 16V8Z"
              fill={currentColor}
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            />
          ) : (
            // Pause icon
            <motion.g
              key="pause"
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <rect x="9" y="8" width="2" height="8" fill={currentColor} />
              <rect x="13" y="8" width="2" height="8" fill={currentColor} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </motion.div>
  )
} 