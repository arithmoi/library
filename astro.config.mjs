// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages deployment configuration
  site: 'https://yourusername.github.io',
  // Remove base path for development, add it back for production deployment
  // base: '/library',
  
  // Build configuration for static site generation
  output: 'static',
  
  // Optimize for production
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
  },
  
  // Vite configuration for better PDF.js handling
  vite: {
    optimizeDeps: {
      exclude: ['pdfjs-dist']
    },
    server: {
      fs: {
        allow: ['..']
      }
    },
    build: {
      rollupOptions: {
        external: ['pdfjs-dist'],
        output: {
          manualChunks: {
            'pdf-worker': ['pdfjs-dist/build/pdf.worker.min.mjs']
          }
        }
      }
    }
  },
  
  // Security headers for PDF viewing
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  
  // Integrations for enhanced functionality
  integrations: []
});
