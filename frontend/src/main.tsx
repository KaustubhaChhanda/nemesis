import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Ensure browser loads fresh Nemesis graph logo favicon
try {
  const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (existingLink) {
    existingLink.href = `/favicon.svg?v=${Date.now()}`;
  }
} catch (_) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

