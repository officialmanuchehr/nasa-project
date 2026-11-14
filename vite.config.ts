import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Vite: React + Tailwind v4. Папка /api обслуживается Vercel (serverless), не Vite.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
