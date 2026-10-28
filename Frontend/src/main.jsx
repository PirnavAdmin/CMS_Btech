import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './App.css'
import './styles/global.css'
import App from './App.jsx'
import ToastProvider from './components/ToastProvider.jsx'
import './styles/dark-mode.css'
import './styles/dark-mode-contrast.css'
import './styles/view-status-colors.css'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider><BrowserRouter><App /></BrowserRouter></ToastProvider>
  </StrictMode>,
)


