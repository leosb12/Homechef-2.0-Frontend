import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '../layouts/PublicLayout'
import ClientLayout from '../layouts/ClientLayout'
import ChefLayout from '../layouts/ChefLayout'
import AdminLayout from '../layouts/AdminLayout'
import DeliveryLayout from '../layouts/DeliveryLayout'
import PublicMarketplaceDashboardPage from '../../modules/marketplace_platos/pages/PublicMarketplaceDashboardPage'
import LoginPage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/LoginPage'
import RegisterPage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/RegisterPage'
import RecoverPasswordPage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/RecoverPasswordPage'
import ResetPasswordPage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/ResetPasswordPage'
import ProfilePage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/ProfilePage'
import ClientExplorePage from '../../modules/marketplace_platos/pages/ClientExplorePage'
import DishDetailPage from '../../modules/marketplace_platos/pages/DishDetailPage'
import FavoritesPage from '../../modules/marketplace_platos/pages/FavoritesPage'
import ChefPublicProfilePage from '../../modules/marketplace_platos/pages/ChefPublicProfilePage'
import ClientCartPage from '../../modules/pedidos_checkout_pagos/pages/ClientCartPage'
import ClientCheckoutPage from '../../modules/pedidos_checkout_pagos/pages/ClientCheckoutPage'
import ClientCoinGateReturnPage from '../../modules/pedidos_checkout_pagos/pages/ClientCoinGateReturnPage'
import ClientStripeReturnPage from '../../modules/pedidos_checkout_pagos/pages/ClientStripeReturnPage'
import ClientOrderDetailPage from '../../modules/pedidos_checkout_pagos/pages/ClientOrderDetailPage'
import ClientOrdersPage from '../../modules/pedidos_checkout_pagos/pages/ClientOrdersPage'
import OrderTrackingPage from '../../modules/pedidos_checkout_pagos/pages/OrderTrackingPage'
import ClientQrSimulatedPaymentPage from '../../modules/pedidos_checkout_pagos/pages/ClientQrSimulatedPaymentPage'
import ChefOrdersPage from '../../modules/pedidos_checkout_pagos/pages/ChefOrdersPage'
import ChefOrderDetailPage from '../../modules/pedidos_checkout_pagos/pages/ChefOrderDetailPage'
import ChefPendingPage from '../../modules/gestion_cocinero/pages/ChefPendingPage'
import ChefRejectedPage from '../../modules/gestion_cocinero/pages/ChefRejectedPage'
import ChefDashboardPage from '../../modules/gestion_cocinero/pages/ChefDashboardPage'
import ChefFinancesPage from '../../modules/gestion_cocinero/pages/ChefFinancesPage'
import ChefDishesPage from '../../modules/gestion_cocinero/pages/ChefDishesPage'
import ChefMenuPage from '../../modules/gestion_cocinero/pages/ChefMenuPage'
import ChefInventoryPage from '../../modules/gestion_cocinero/pages/ChefInventoryPage'
import ChefProfilePage from '../../modules/gestion_cocinero/pages/ChefProfilePage'
import ChefAvailabilityPage from '../../modules/gestion_cocinero/pages/ChefAvailabilityPage'
import AISubscriptionPage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/AISubscriptionPage'
import ChefIAHubPage from '../../modules/funciones_ia/pages/FuncionesIaPage'
import ChefIAFunctionPage from '../../modules/funciones_ia/pages/ChefIAFunctionPage'
import NotificationCenterPage from '../../modules/confianza_administracion_seguridad/pages/NotificationCenterPage'
import DynamicReportsPage from '../../modules/confianza_administracion_seguridad/pages/DynamicReportsPage'
import AdminDeliveryDriversPage from '../../modules/confianza_administracion_seguridad/pages/AdminDeliveryDriversPage'
import AdminActiveDeliveryOrdersPage from '../../modules/confianza_administracion_seguridad/pages/AdminActiveDeliveryOrdersPage'
import AdminUsersPage from '../../modules/confianza_administracion_seguridad/pages/AdminUsersPage'
import AdminChefsValidationPage from '../../modules/confianza_administracion_seguridad/pages/AdminChefsValidationPage'
import AdminPublicationsPage from '../../modules/confianza_administracion_seguridad/pages/AdminPublicationsPage'
import AdminDashboardPage from '../../modules/confianza_administracion_seguridad/pages/AdminDashboardPage'
import AdminFraudRiskPage from '../../modules/confianza_administracion_seguridad/pages/AdminFraudRiskPage'
import AdminAuditPage from '../../modules/confianza_administracion_seguridad/pages/AdminAuditPage'
import RiderAssignedPage from '../../modules/delivery_rider/pages/RiderAssignedPage'
import RiderActivePage from '../../modules/delivery_rider/pages/RiderActivePage'
import RiderRoutesPage from '../../modules/delivery_rider/pages/RiderRoutesPage'
import RiderIncidentsPage from '../../modules/delivery_rider/pages/RiderIncidentsPage'
import RiderHistoryPage from '../../modules/delivery_rider/pages/RiderHistoryPage'
import RiderProfilePage from '../../modules/delivery_rider/pages/RiderProfilePage'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'

function Page({ title }) { return <div><h2 className="text-xl font-semibold">{title}</h2></div> }

export default function AppRouter() {
  const authStatus = useAuthSession((state) => state.authStatus)
  const initializeAuth = useAuthSession((state) => state.initializeAuth)
  
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (authStatus === 'checking') {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center select-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #151b3d 0%, #080c21 100%)',
          color: '#ffffff',
          fontFamily: "'Outfit', 'Inter', sans-serif"
        }}
      >
        <div className="flex flex-col items-center max-w-md">
          {/* Custom animated loader ring */}
          <div className="relative h-20 w-20 mb-8 flex items-center justify-center">
            <div 
              className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-r-transparent border-b-cyan-400 border-l-transparent animate-spin"
              style={{ animationDuration: '1.2s' }}
            />
            <div 
              className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-fuchsia-500 border-b-transparent border-l-purple-500 animate-spin"
              style={{ animationDuration: '2s', animationDirection: 'reverse' }}
            />
            <div className="text-3xl filter drop-shadow-[0_4px_10px_rgba(167,139,250,0.4)]">👨‍🍳</div>
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300">
            Verificando sesión
          </h2>
          
          <p className="text-slate-400 mt-3 text-base leading-relaxed font-medium">
            Preparando tu cocina local offline-first...
          </p>

          {/* Micro decoration banner */}
          <div className="mt-8 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-xs text-violet-300/80 font-semibold tracking-wide">
            ✩ SECURE GATEWAY ✩
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicMarketplaceDashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recover-password" element={<RecoverPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/client" element={<ClientLayout />}>
        <Route path="explore" element={<ClientExplorePage />} />
        <Route path="dishes/:id" element={<DishDetailPage />} />
        <Route path="chefs/:id" element={<ChefPublicProfilePage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="cart" element={<ClientCartPage />} />
        <Route path="checkout" element={<ClientCheckoutPage />} />
        <Route path="payments/bitcoin-coingate/return" element={<ClientCoinGateReturnPage />} />
        <Route path="payments/stripe/return" element={<ClientStripeReturnPage />} />
        <Route path="payments/qr-simulado" element={<ClientQrSimulatedPaymentPage />} />
        <Route path="orders" element={<ClientOrdersPage />} />
        <Route path="orders/:id" element={<ClientOrderDetailPage />} />
        <Route path="orders/:id/tracking" element={<OrderTrackingPage viewerRole="client" />} />
        <Route path="notifications" element={<NotificationCenterPage viewerRole="client" />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/chef/pending" element={<ChefPendingPage />} />
      <Route path="/chef/rejected" element={<ChefRejectedPage />} />

      <Route path="/chef" element={<ChefLayout />}>
        <Route path="dashboard" element={<ChefDashboardPage />} />
        <Route path="finances" element={<ChefFinancesPage />} />
        <Route path="dishes" element={<ChefDishesPage />} />
        <Route path="dishes/create" element={<Page title="Crear plato" />} />
        <Route path="menu" element={<ChefMenuPage />} />
        <Route path="inventory" element={<ChefInventoryPage />} />
        <Route path="availability" element={<ChefAvailabilityPage />} />
        <Route path="orders" element={<ChefOrdersPage />} />
        <Route path="orders/:id" element={<ChefOrderDetailPage />} />
        <Route path="orders/:id/tracking" element={<OrderTrackingPage viewerRole="chef" />} />
        <Route path="notifications" element={<NotificationCenterPage viewerRole="chef" />} />
        <Route path="ai/assistant" element={<ChefIAHubPage />} />
        <Route path="ai/:feature/use" element={<ChefIAFunctionPage />} />
        <Route path="ai/:feature" element={<ChefIAFunctionPage />} />
        <Route path="ai-subscription" element={<AISubscriptionPage />} />
        <Route path="subscription" element={<Navigate to="/chef/ai-subscription" replace />} />
        <Route path="profile" element={<ChefProfilePage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="delivery-drivers" element={<AdminDeliveryDriversPage />} />
        <Route path="delivery-orders" element={<AdminActiveDeliveryOrdersPage />} />
        <Route path="chefs" element={<AdminChefsValidationPage />} />
        <Route path="publications" element={<AdminPublicationsPage />} />
        <Route path="fraud" element={<AdminFraudRiskPage />} />
        <Route path="reports" element={<DynamicReportsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="settings" element={<Page title="Configuracion" />} />
      </Route>

      <Route path="/delivery" element={<DeliveryLayout />}>
        <Route path="assigned" element={<RiderAssignedPage />} />
        <Route path="active" element={<RiderActivePage />} />
        <Route path="routes" element={<RiderRoutesPage />} />
        <Route path="incidents" element={<RiderIncidentsPage />} />
        <Route path="history" element={<RiderHistoryPage />} />
        <Route path="profile" element={<RiderProfilePage />} />
        <Route path="notifications" element={<NotificationCenterPage viewerRole="rider" />} />
      </Route>

      <Route path="*" element={<Navigate to='/' replace />} />
    </Routes>
  )
}
