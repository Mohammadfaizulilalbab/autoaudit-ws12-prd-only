import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relatif + hash routing: jalan di subpath GitHub Pages mana pun, termasuk saat dimuat ulang.
export default defineConfig({
  base: './',
  plugins: [react()],
})
