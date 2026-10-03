import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dónde viene',
    short_name: 'Dónde viene',
    description: 'Cuándo llega tu micro en Santiago.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F3EE',
    theme_color: '#121212',
    lang: 'es-CL',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
