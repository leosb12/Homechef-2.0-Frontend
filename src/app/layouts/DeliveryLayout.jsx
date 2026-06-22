import React from 'react'
import RoleLayout from './RoleLayout'

const links = [
  { to: '/delivery/assigned', label: 'Entregas asignadas', icon: <DeliverySidebarIcon type="assigned" /> },
  { to: '/delivery/active', label: 'Entrega activa', icon: <DeliverySidebarIcon type="active" /> },
  { to: '/delivery/routes', label: 'Ruta actual', icon: <DeliverySidebarIcon type="routes" /> },
  { to: '/delivery/incidents', label: 'Incidencias', icon: <DeliverySidebarIcon type="incidents" /> },
  { to: '/delivery/history', label: 'Historial', icon: <DeliverySidebarIcon type="history" /> },
  { to: '/delivery/notifications', label: 'Notificaciones', icon: <DeliverySidebarIcon type="bell" /> },
  { to: '/delivery/profile', label: 'Mi perfil', icon: <DeliverySidebarIcon type="profile" /> },
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
        <DeliverySidebarIcon type="truck" stroke="white" />
      </div>
      <div>
        <p className="font-bold text-sm leading-tight">Ruta activa</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Delivery al día</p>
      </div>
    </div>
  </div>
)

export default function DeliveryLayout() {
  return (
    <RoleLayout
      title="Delivery"
      brandTitle="RiderConsole"
      brandGlyph="RD"
      links={links}
      sidebarFooter={sidebarFooter}
      collapseLabel="Contraer menu"
    />
  )
}

function DeliverySidebarIcon({ type, stroke = 'currentColor' }) {
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
    case 'assigned':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M9 10h6M9 14h6" />
        </svg>
      )
    case 'active':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      )
    case 'routes':
      return (
        <svg {...common}>
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      )
    case 'incidents':
      return (
        <svg {...common}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l4 2" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      )
    case 'profile':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    default:
      return null
  }
}
