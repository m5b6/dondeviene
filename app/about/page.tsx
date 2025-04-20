"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function About() {
    return (
        <main className="min-h-screen bg-off-white text-black p-6 pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-3xl mx-auto">
                {/* Back button with animation */}
                <motion.div
                    className="fixed top-4 left-4 z-10"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Link href="/">
                        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full font-medium">
                            <span>←</span> Volver
                        </button>
                    </Link>
                </motion.div>

                {/* Title with animation */}
                <motion.h1
                    className="text-3xl font-bold mt-16 mb-8 text-center"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    Acerca de dondeviene?
                </motion.h1>

                {/* Content with staggered animation */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="prose prose-lg mx-auto"
                >
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <p className="mb-4">
                            este proyecto comenzó cuando me di cuenta de un problema para los chilenos:
                        </p>
                        <p className="mb-4">
                            la única opción para saber cuándo viene la micro es usar <a href="https://red.cl" target="_blank" rel="noopener noreferrer">red.cl</a>, o la app red, ambas muy incomodas de usar
                        </p>
                        <p className="mb-4">
                            <a href="https://dondeviene.cl" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors underline">dondeviene.cl</a> está diseñado para ser extremadamente fácil de usar.
                        </p>
                        <p className="mb-4">
                            si tienes sugerencias <a 
                            className="text-blue-600 hover:text-blue-800 transition-colors underline" 
                            href="https://wa.me/56995411717" target="_blank" rel="noopener noreferrer">escríbeme al +56995411717</a>
                        </p>

                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 mb-4">
                            Este proyecto fue creado como un hack en un fin de semana.
                        </p>
                        <div className="flex justify-center gap-6 mt-4">
                            <a
                                href="https://matiasberrios.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 transition-colors underline"
                            >
                                matiasberrios.com
                            </a>
                            <a
                                href="https://vita.lat"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 transition-colors underline"
                            >
                                vita.lat
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    )
} 