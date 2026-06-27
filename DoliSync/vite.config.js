import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api-dolibarr': {
        target: 'http://localhost:8080/dolibarr/api/index.php',
               
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-dolibarr/, '')
      },
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      }
    }
  }
})
