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
import AdminDeliveryDriversPage from '../../modules/confianza_administracion_seguridad/pages/AdminDeliveryDriversPage'
import AdminActiveDeliveryOrdersPage from '../../modules/confianza_administracion_seguridad/pages/AdminActiveDeliveryOrdersPage'
import AdminUsersPage from '../../modules/confianza_administracion_seguridad/pages/AdminUsersPage'
import AdminChefsValidationPage from '../../modules/confianza_administracion_seguridad/pages/AdminChefsValidationPage'
import AdminPublicationsPage from '../../modules/confianza_administracion_seguridad/pages/AdminPublicationsPage'
import AdminDashboardPage from '../../modules/confianza_administracion_seguridad/pages/AdminDashboardPage'
import AdminFraudRiskPage from '../../modules/confianza_administracion_seguridad/pages/AdminFraudRiskPage'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'

function Page({ title }) { return <div><h2 className="text-xl font-semibold">{title}</h2></div> }

export default function AppRouter() {
  const syncFromStorage = useAuthSession((state) => state.syncFromStorage)
  
  useEffect(() => {
    syncFromStorage()
  }, [syncFromStorage])
  
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
        <Route path="reports" element={<Page title="Reportes" />} />
        <Route path="settings" element={<Page title="Configuracion" />} />
      </Route>

      <Route path="/delivery" element={<DeliveryLayout />}>
        <Route path="assigned" element={<Page title="Entregas asignadas" />} />
        <Route path="active" element={<Page title="Entregas activas" />} />
        <Route path="routes" element={<Page title="Rutas" />} />
        <Route path="incidents" element={<Page title="Incidencias" />} />
      </Route>

      <Route path="*" element={<Navigate to='/' replace />} />
    </Routes>
  )
}
