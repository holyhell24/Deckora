import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import packageJson from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/Deckora/',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
})
