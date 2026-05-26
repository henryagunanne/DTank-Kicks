import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    // Use vite-tsconfig-paths plugin instead of a resolve option
  },
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      server: { entry: 'server' }, // points to src/server.ts 
    }),
    // viteReact MUST come AFTER tanstackStart
    viteReact(),
  ],
})