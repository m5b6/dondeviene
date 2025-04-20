"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'

interface LogoProps {
  step?: number;
}

const Logo = ({ step = 1 }: LogoProps) => (
  <Link href="/about">
    <motion.div 
      className="fixed top-4 right-4 z-10 cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <h2 className={`font-bold text-sm transition-colors duration-300 ${step === 2 ? 'text-white' : 'text-black/80'}`}>
        dondeviene?
      </h2>
    </motion.div>
  </Link>
)

export default Logo 