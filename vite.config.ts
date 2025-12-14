import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/poe2-campaignQSguide/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'plasmic-host': resolve(__dirname, 'plasmic-host.html'),
      },
    },
  },
}))
