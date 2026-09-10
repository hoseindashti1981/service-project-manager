import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // GitHub Pages needs the repository path; a future custom domain needs '/'.
  const base = env.VITE_BASE_PATH || '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'], importScripts: ['reminder-notification.js'] },
        includeAssets: ['favicon-v061.png', 'apple-touch-icon-v061.png'],
        manifest: {
          id: base,
          name: 'لاین‌یار',
          short_name: 'لاین‌یار',
          description: 'اپلیکیشن مدیریت پروژه‌ها و خدمات فنی',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'fa',
          dir: 'rtl',
          start_url: base,
          scope: base,
          icons: [
            { src: 'pwa-192-v061.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512-v061.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
          ]
        }
      })
    ],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } }
  }
})
