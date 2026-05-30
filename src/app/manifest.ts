import type { MetadataRoute } from 'next'

// Served at /manifest.webmanifest and auto-linked into <head> by Next.js.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pollit',
    short_name: 'Pollit',
    description: 'Nigeria: Have your say. Pave the way. Save the day.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#DC2626',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
