"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import BackButton from '@/components/BackButton'
import { useRouter } from 'next/navigation'

export default function About() {
    const router = useRouter()
    return (
        <main className="min-h-screen bg-off-white text-black pb-[env(safe-area-inset-bottom)]">
            {/* Card layout with centered content */}
            <div className="h-screen w-full flex items-center justify-center p-6 pt-safe pb-safe">
                <motion.div 
                    className="w-full max-w-md vision-card p-6 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    {/* Back button */}
                    <BackButton variant='inside-card' onClick={() => router.back()} />
                    
                    {/* Title */}
                    <motion.h1
                        className="text-2xl font-bold mt-2 mb-6 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Acerca de dondeviene?
                    </motion.h1>

                    {/* Content */}
                    <motion.div
                        className="space-y-4 overflow-y-auto"
                        style={{ maxHeight: "calc(100vh - 200px)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >

                        <p className='text-justify'>
                            La única opción para saber cuándo viene la micro es usar <a href="https://red.cl" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:opacity-70 transition-opacity">red.cl</a>, o la app red, ambas muy incómodas de usar.
                        </p>
                        <p className='text-justify'>
                            <a href="https://dondeviene.cl" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:opacity-70 transition-opacity">dondeviene.cl</a> está hecho para ser extremadamente fácil de usar.
                        </p>
                        <p className='text-justify'>
                            Si tienes sugerencias <a 
                            className="text-black font-bold underline hover:opacity-70 transition-opacity" 
                            href="https://wa.me/56995411717" target="_blank" rel="noopener noreferrer">escríbeme al +56995411717</a>
                        </p>

                        <div className="pt-4 mt-4 border-t border-gray-200">

                            <div className="flex justify-center gap-6">
                                <a
                                    href="https://matiasberrios.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-black font-bold underline hover:opacity-70 transition-opacity"
                                >
                                    matiasberrios.com
                                </a>
                                <a
                                    href="https://vita.lat"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-black font-bold underline hover:opacity-70 transition-opacity"
                                >
                                    vita.lat
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </main>
    )
} 