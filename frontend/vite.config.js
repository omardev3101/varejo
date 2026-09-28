import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isElectron = process.env.npm_lifecycle_event === 'dist' || process.env.ELECTRON === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/varejo/',
})
