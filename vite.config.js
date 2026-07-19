import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Pisahkan library besar agar bundle awal ringan (toleran koneksi lambat)
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          export: ['jspdf', 'jspdf-autotable', 'xlsx'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
