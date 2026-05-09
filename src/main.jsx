import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './app/router/AppRouter'
import './index.css'
import './shared/services/theme_session'
import { registerServiceWorker } from './shared/services/pwa'
import { startConnectivitySync } from './shared/services/sync_service'

registerServiceWorker()
startConnectivitySync()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>
)
