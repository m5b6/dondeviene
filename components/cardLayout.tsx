"use client"

import { ReactNode, useEffect, useState } from "react"
import { motion } from "framer-motion"
import MapPlaceholder from "./mapLoading"

interface CardLayoutProps {
  children: ReactNode;
}

export default function CardLayout({ children }: CardLayoutProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasVibrated, setHasVibrated] = useState(false);

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

  // Efecto de parallax para el fondo
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 10
      const y = (e.clientY / window.innerHeight - 0.5) * 10
      setOffset({ x, y })
    }

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta && e.gamma) {
        const x = (e.gamma / 45) * 10
        const y = (e.beta / 45) * 10
        setOffset({ x, y })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("deviceorientation", handleDeviceOrientation)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("deviceorientation", handleDeviceOrientation)
    }
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Fondo con mapa borroso y efecto parallax */}
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

      {/* Modal - No exit animation on the container */}
      <div className="absolute inset-0 flex items-center justify-center p-3 pt-safe pb-safe">
        <div className="w-full max-w-md vision-card p-8">
          {children}
        </div>
      </div>
    </div>
  );
} 