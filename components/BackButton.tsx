"use client"

import React from "react"
import { createPortal } from "react-dom"

interface BackButtonProps {
  onClick: () => void
  className?: string
  variant?: "default" | "inside-card"
}

export default function BackButton({ onClick, className = "", variant = "default" }: BackButtonProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const button = variant === "inside-card" ? (
    <button
      onClick={onClick}
      className={`fixed top-2 left-2 bg-transparent hover:bg-gray-100 rounded-full transition-colors text-black hover:text-black-600 w-12 h-12 ${className}`}
      aria-label="Volver"
      style={{
      }}
    >
      <span className="text-2xl">&#8249;</span>
    </button>
  ) : (
    <button
      onClick={onClick}
      className={`fixed top-2 left-2 z-20 p-1 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors flex items-center justify-center w-10 h-10 ${className}`}
      aria-label="Volver"
    >
      <span className="text-black text-xl font-light">&lt;</span>
    </button>
  )

  if (!mounted) return null

  return createPortal(button, document.body)
} 