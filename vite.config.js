import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite : on active le plugin React.
export default defineConfig({
  plugins: [react()],
})
