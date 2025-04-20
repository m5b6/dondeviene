"use client"

import React from "react"

interface BackButtonProps {
  onClick: () => void
  className?: string
}

export default function BackButton({ onClick, className = "" }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-2 left-2 z-20 p-1 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors flex items-center justify-center w-10 h-10 ${className}`}
      aria-label="Volver"
    >
      <span className="text-black text-xl font-light">&lt;</span>
    </button>
  )
} 