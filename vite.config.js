import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite : on active le plugin React.
// `base` correspond au sous-dossier où le site est publié sur GitHub Pages
// (https://benjaminthouverez-cpu.github.io/carta/).
export default defineConfig({
  base: '/carta/',
  plugins: [react()],
})
