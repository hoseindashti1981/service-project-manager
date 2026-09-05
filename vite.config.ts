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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'مدیریت پروژه و خدمات فنی',
          short_name: 'مدیریت پروژه',
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
            { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
          ]
        }
      })
    ],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } }
  }
})
