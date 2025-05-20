// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname),             // ✅ ensures "client/" is root
  build: {
    outDir: resolve(__dirname, '../dist'), // ✅ outputs to root/dist
    emptyOutDir: true,
  },
  plugins: [react()],
})
