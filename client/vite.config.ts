import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('./cert/cert.key'),
      cert: fs.readFileSync('./cert/cert.crt'),
    },
    port: 5173,
  },
})
