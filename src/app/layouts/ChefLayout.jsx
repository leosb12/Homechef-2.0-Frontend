import RoleLayout from './RoleLayout'

const links = [
  { to: '/chef/dashboard', label: 'Resumen general', icon: <ChefSidebarIcon type="dashboard" /> },
  { to: '/chef/finances', label: 'Mis ingresos', icon: <ChefSidebarIcon type="wallet" /> },
  { to: '/chef/dishes', label: 'Mis platos', icon: <ChefSidebarIcon type="dishes" /> },
  { to: '/chef/menu', label: 'Menu del dia', icon: <ChefSidebarIcon type="menuBook" /> },
  { to: '/chef/inventory', label: 'Inventario', icon: <ChefSidebarIcon type="inventory" /> },
  { to: '/chef/availability', label: 'Disponibilidad', icon: <ChefSidebarIcon type="clock" /> },
  { to: '/chef/orders', label: 'Pedidos recibidos', icon: <ChefSidebarIcon type="orders" /> },
  { to: '/chef/notifications', label: 'Notificaciones', icon: <ChefSidebarIcon type="bell" /> },
  { to: '/chef/ai/assistant', label: 'Asistente IA', icon: <ChefSidebarIcon type="spark" /> },
  { to: '/chef/ai-subscription', label: 'Suscripcion IA', icon: <ChefSidebarIcon type="credit" /> },
  { to: '/chef/profile', label: 'Perfil cocinero', icon: <ChefSidebarIcon type="chef" /> },
]

const sidebarFooter = (
  <div
    className="rounded-2xl border p-4 flex flex-col gap-3"
    style={{
      borderColor: 'rgba(124,58,237,.14)',
      background:
        'linear-gradient(180deg, color-mix(in srgb, var(--panel) 92%, white 8%), color-mix(in srgb, var(--panel-soft) 88%, var(--brand) 12%))',
    }}
  >
    <div className="flex items-center gap-3">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"
        style={{
          background: 'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
        }}
      >
        <ChefSidebarIcon type="hat" stroke="white" />
      </div>
      <div>
        <p className="font-bold text-sm leading-tight">Cocina activa</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Operacion al dia</p>
      </div>
    </div>
    <button
      type="button"
      className="w-full rounded-lg border py-2 text-sm font-semibold transition hover:opacity-80"
      style={{
        borderColor: 'rgba(124,58,237,.22)',
        color: '#6d28d9',
        backgroundColor: 'color-mix(in srgb, var(--panel) 88%, white 12%)',
      }}
    >
      Ver panel
    </button>
  </div>
)

import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'
import { api } from '../../shared/services/api'
import { useConnectivity } from '../../shared/hooks/useConnectivity'

export default function ChefLayout() {
  const user = useAuthSession((state) => state.user)
  const setSession = useAuthSession((state) => state.setSession)
  const role = useAuthSession((state) => state.role)
  const accessToken = useAuthSession((state) => state.accessToken)
  const location = useLocation()
  const [isInitializing, setIsInitializing] = useState(true)
  const { isOnline } = useConnectivity()

  useEffect(() => {
    if (role === 'COCINERO' && accessToken && accessToken !== 'offline_placeholder_token' && !user?.chef_profile && isOnline) {
      api.get('/auth/session/')
        .then(res => {
          if (res.data?.user) {
            setSession({ access: accessToken, role, user: res.data.user })
          }
        })
        .catch(console.error)
        .finally(() => setIsInitializing(false))
    } else {
      setIsInitializing(false)
    }
  }, [role, accessToken, user, setSession, isOnline])
  
  const status = user?.chef_profile?.status

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center">Cargando perfil...</div>
  }
  
  if (status === 'pending_validation' && location.pathname !== '/chef/pending') {
    return <Navigate to="/chef/pending" replace />
  }
  if (status === 'rejected' && location.pathname !== '/chef/rejected') {
    return <Navigate to="/chef/rejected" replace />
  }
  if (status === 'approved' && (location.pathname === '/chef/pending' || location.pathname === '/chef/rejected')) {
    return <Navigate to="/chef/dashboard" replace />
  }

  return (
    <RoleLayout
      title="Cocinero"
      brandTitle="ChefConsole"
      brandGlyph="CH"
      links={status === 'approved' ? links : []}
      sidebarFooter={status === 'approved' ? sidebarFooter : null}
      collapseLabel="Contraer menu"
    />
  )
}

function ChefSidebarIcon({ type, stroke = 'currentColor' }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (type) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="5" rx="1.5" />
          <rect x="13" y="11" width="7" height="9" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'dishes':
      return (
        <svg {...common}>
          <path d="M4 13a8 8 0 0 0 16 0Z" />
          <path d="M8 9h8" />
          <path d="M12 5v4" />
        </svg>
      )
    case 'menuBook':
      return (
        <svg {...common}>
          <path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H19v16H8.5A2.5 2.5 0 0 0 6 21Z" />
          <path d="M6 5.5V21H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h1Z" />
          <path d="M10 8h5M10 12h5" />
        </svg>
      )
    case 'inventory':
      return (
        <svg {...common}>
          <path d="M4 7.5 12 4l8 3.5L12 11Z" />
          <path d="M4 7.5V16.5L12 20l8-3.5V7.5" />
          <path d="M12 11v9" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3 2" />
        </svg>
      )
    case 'orders':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6.5 16h11l-1.3-2.2V10a4.2 4.2 0 0 0-8.4 0v3.8Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...common}>
          <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
          <path d="M18.5 14.5 19 16l1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z" />
        </svg>
      )
    case 'credit':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h3" />
        </svg>
      )
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      )
    case 'chef':
      return (
        <svg {...common}>
          <path d="M8 10.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 5.5 8 5.5c.6-1.5 2-2.5 3.8-2.5 2.2 0 4 1.5 4.4 3.6A2.9 2.9 0 0 1 18.5 10.5Z" />
          <path d="M8.5 10.5v3.5c0 1.7 1.6 3 3.5 3s3.5-1.3 3.5-3v-3.5" />
          <path d="M10 21h4" />
        </svg>
      )
    case 'hat':
      return (
        <svg {...common}>
          <path d="M8 11c-1.7 0-3-1.3-3-3s1.3-3 3-3c.6-1.4 2-2.3 3.7-2.3 2.2 0 4 1.4 4.5 3.5A3 3 0 0 1 19 11Z" />
          <path d="M7.5 11v2.5A2.5 2.5 0 0 0 10 16h4a2.5 2.5 0 0 0 2.5-2.5V11" />
        </svg>
      )
    default:
      return null
  }
}
