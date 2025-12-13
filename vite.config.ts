import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/poe2-campaignQSguide/',
  plugins: [react()],
})
