'use client';

import dynamic from 'next/dynamic';

export const LiveMap = dynamic(() => import('./live-map').then((module) => module.LiveMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-rule" aria-busy="true" aria-label="Cargando mapa" />,
});
