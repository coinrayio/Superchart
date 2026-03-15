import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    cssTarget: 'chrome61',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'Superchart',
      formats: ['es', 'cjs'],
      fileName: (format) => `superchart.${format}.js`,
    },
    rollupOptions: {
      external: [
            'react', 'react-dom', 'react/jsx-runtime', 'klinecharts',
            /^@codemirror\//,
            /^@lezer\//,
          ],
      output: {
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'style.css') {
            return 'superchart.css'
          }
          return chunkInfo.name ?? 'asset'
        },
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          klinecharts: 'klinecharts',
        },
      },
    },
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
