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
import ChefDashboardPage from '../../modules/gestion_cocinero/pages/ChefDashboardPage'
import ChefDishesPage from '../../modules/gestion_cocinero/pages/ChefDishesPage'
import ChefMenuPage from '../../modules/gestion_cocinero/pages/ChefMenuPage'
import ChefProfilePage from '../../modules/gestion_cocinero/pages/ChefProfilePage'
import ChefAvailabilityPage from '../../modules/gestion_cocinero/pages/ChefAvailabilityPage'
import AISubscriptionPage from '../../modules/gestion_usuarios_acceso_suscripcion/pages/AISubscriptionPage'
import ChefIAHubPage from '../../modules/funciones_ia/pages/ChefIAHubPage'
import ChefIAFunctionPage from '../../modules/funciones_ia/pages/ChefIAFunctionPage'
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
        <Route path="cart" element={<Page title="Carrito" />} />
        <Route path="checkout" element={<Page title="Checkout" />} />
        <Route path="orders" element={<Page title="Mis pedidos" />} />
        <Route path="orders/:id/tracking" element={<Page title="Seguimiento de pedido" />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/chef" element={<ChefLayout />}>
        <Route path="dashboard" element={<ChefDashboardPage />} />
        <Route path="dishes" element={<ChefDishesPage />} />
        <Route path="dishes/create" element={<Page title="Crear plato" />} />
        <Route path="menu" element={<ChefMenuPage />} />
        <Route path="inventory" element={<Page title="Inventario" />} />
        <Route path="availability" element={<ChefAvailabilityPage />} />
        <Route path="orders" element={<Page title="Pedidos recibidos" />} />
        <Route path="ai/assistant" element={<ChefIAHubPage />} />
        <Route path="ai/:feature/use" element={<ChefIAFunctionPage />} />
        <Route path="ai/:feature" element={<ChefIAFunctionPage />} />
        <Route path="ai-subscription" element={<AISubscriptionPage />} />
        <Route path="subscription" element={<Navigate to="/chef/ai-subscription" replace />} />
        <Route path="profile" element={<ChefProfilePage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<Page title="Dashboard admin" />} />
        <Route path="users" element={<Page title="Usuarios" />} />
        <Route path="chefs" element={<Page title="Cocineros" />} />
        <Route path="publications" element={<Page title="Publicaciones" />} />
        <Route path="fraud" element={<Page title="Fraude y riesgo" />} />
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
