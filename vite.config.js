import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configuration Vite : plugin React + PWA (app installable, hors-ligne).
// `base` correspond au sous-dossier où le site est publié sur GitHub Pages
// (https://benjaminthouverez-cpu.github.io/carta/).
export default defineConfig({
  base: '/carta/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // met à jour l'app en arrière-plan
      injectRegister: 'auto', // injecte l'enregistrement du service worker
      includeAssets: ['carta.svg'],
      manifest: {
        name: 'Carta',
        short_name: 'Carta',
        description: 'Vos sujets, à l’encre sur papier',
        lang: 'fr',
        start_url: '/carta/',
        scope: '/carta/',
        display: 'standalone',
        background_color: '#f7efdd',
        theme_color: '#9a5b34',
        icons: [
          {
            src: 'carta.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
