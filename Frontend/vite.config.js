import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-underline',
      '@tiptap/extension-text-align',
      'socket.io-client',
      'lodash',
      'framer-motion'
    ]
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
