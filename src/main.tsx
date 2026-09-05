import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './app/router'
import { PwaInstallPrompt } from './components/pwa-install-prompt'
import './index.css'

const redirectedPath = new URLSearchParams(window.location.search).get('p')
if (redirectedPath) {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL
  window.history.replaceState(null, '', base + redirectedPath)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaInstallPrompt />
    <RouterProvider router={router} />
  </StrictMode>
)
