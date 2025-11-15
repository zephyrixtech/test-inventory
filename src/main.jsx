import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'
import { Toaster } from 'react-hot-toast'
import ReduxProvider from './components/ReduxProvider'

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ReduxProvider>
        <App />
        <Toaster />
      </ReduxProvider>
    </StrictMode>,
  )
}


