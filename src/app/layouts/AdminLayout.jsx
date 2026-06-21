import RoleLayout from './RoleLayout'

const links = [
  { to: '/admin/dashboard', label: 'Resumen general', icon: <SidebarIcon type="dashboard" /> },
  { to: '/admin/users', label: 'Usuarios', icon: <SidebarIcon type="users" /> },
  { to: '/admin/chefs', label: 'Cocineros', icon: <SidebarIcon type="chef" /> },
  { to: '/admin/delivery-drivers', label: 'Repartidores', icon: <SidebarIcon type="delivery" /> },
  { to: '/admin/delivery-orders', label: 'Pedidos delivery', icon: <SidebarIcon type="route" /> },
  { to: '/admin/publications', label: 'Publicaciones', icon: <SidebarIcon type="publications" /> },
  { to: '/admin/fraud', label: 'Fraude y riesgo', icon: <SidebarIcon type="shield" /> },
  { to: '/admin/reports', label: 'Reportes', icon: <SidebarIcon type="reports" /> },
]

const sidebarFooter = (
  <div
    className="rounded-2xl border p-4 flex flex-col gap-3"
    style={{
      borderColor: 'rgba(124,58,237,.14)',
      background:
        'linear-gradient(180deg, color-mix(in srgb, var(--panel) 92%, white 8%), color-mix(in srgb, var(--panel-soft) 90%, var(--brand) 10%))',
    }}
  >
    <div className="flex items-center gap-3">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"
        style={{
          background: 'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
        }}
      >
        <SidebarIcon type="spark" stroke="white" />
      </div>
      <div>
        <p className="font-bold text-sm leading-tight">Admin</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Centro de control</p>
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
      Ver reportes
    </button>
  </div>
)

export default function AdminLayout() {
  return (
    <RoleLayout
      title="Administrador"
      brandTitle="AdminiChef"
      brandGlyph="AC"
      links={links}
      sidebarFooter={sidebarFooter}
      collapseLabel="Contraer menu"
    />
  )
}

function SidebarIcon({ type, stroke = 'currentColor' }) {
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
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13V10.5" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5 20a7 7 0 0 1 14 0" />
          <path d="M18 8h3" />
          <path d="M19.5 6.5v3" />
        </svg>
      )
    case 'chef':
      return (
        <svg {...common}>
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5 20a7 7 0 0 1 14 0" />
          <path d="m16 4 2-2 2 2" />
        </svg>
      )
    case 'delivery':
      return (
        <svg {...common}>
          <circle cx="7.5" cy="17.5" r="1.8" />
          <circle cx="17.5" cy="17.5" r="1.8" />
          <path d="M3 6h10v9H3z" />
          <path d="M13 9h4l3 3v3h-7Z" />
        </svg>
      )
    case 'route':
      return (
        <svg {...common}>
          <circle cx="6.5" cy="17.5" r="1.6" />
          <circle cx="17.5" cy="6.5" r="1.6" />
          <path d="M8 17.5h3.5a4 4 0 0 0 4-4V8" />
          <path d="M13 8h2.9" />
          <path d="m14.8 10 1.1-2 2 1.1" />
        </svg>
      )
    case 'publications':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5c0 4.5 2.8 7.6 7 10 4.2-2.4 7-5.5 7-10V6l-7-3Z" />
          <path d="M12 8v4" />
          <path d="M12 15h.01" />
        </svg>
      )
    case 'reports':
      return (
        <svg {...common}>
          <path d="M6 4h9l3 3v13H6z" />
          <path d="M15 4v4h4" />
          <path d="M9 13h6M9 17h4M9 9h2" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...common}>
          <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
        </svg>
      )
    default:
      return null
  }
}
