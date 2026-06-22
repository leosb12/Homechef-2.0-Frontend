import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './app/router/AppRouter'
import './index.css'
import ErrorBoundary from './shared/components/ErrorBoundary'
import './shared/services/theme_session'
import { registerServiceWorker } from './shared/services/pwa'
import { startConnectivitySync } from './shared/services/sync_service'
import { startAdminSync } from './modules/confianza_administracion_seguridad/services/offlineSyncService'

registerServiceWorker()
startConnectivitySync()
startAdminSync()


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
)
