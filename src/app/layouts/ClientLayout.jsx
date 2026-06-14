import RoleLayout from './RoleLayout'

const links = [
  { to: '/client/explore', label: 'Explorar platos', icon: <ClientSidebarIcon type="explore" /> },
  { to: '/client/favorites', label: 'Favoritos', icon: <ClientSidebarIcon type="favorites" /> },
  { to: '/client/cart', label: 'Carrito', icon: <ClientSidebarIcon type="cart" /> },
  { to: '/client/orders', label: 'Mis pedidos', icon: <ClientSidebarIcon type="orders" /> },
  { to: '/client/notifications', label: 'Notificaciones', icon: <ClientSidebarIcon type="bell" /> },
  { to: '/client/profile', label: 'Perfil', icon: <ClientSidebarIcon type="profile" /> },
]

const sidebarFooter = (
  <div
    className="rounded-[22px] border p-5"
    style={{
      borderColor: 'rgba(124,58,237,.14)',
      background:
        'linear-gradient(180deg, color-mix(in srgb, var(--panel) 92%, white 8%), color-mix(in srgb, var(--panel-soft) 88%, var(--brand) 12%))',
      boxShadow: '0 18px 36px rgba(15, 23, 42, 0.08)',
    }}
  >
    <div
      className="grid h-12 w-12 place-items-center rounded-full text-white"
      style={{
        background:
          'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
      }}
    >
      <ClientSidebarIcon type="spark" stroke="white" />
    </div>
    <p className="mt-4 text-lg font-bold">Tu experiencia lista para pedir</p>
    <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
      Explora platos, guarda favoritos y sigue tus pedidos desde un solo lugar.
    </p>
    <button
      type="button"
      className="mt-5 w-full rounded-xl border px-4 py-3 font-semibold"
      style={{
        borderColor: 'rgba(124,58,237,.22)',
        color: '#6d28d9',
        backgroundColor: 'color-mix(in srgb, var(--panel) 88%, white 12%)',
      }}
    >
      Explorar ahora
    </button>
  </div>
)

export default function ClientLayout() {
  return (
    <RoleLayout
      title="Cliente"
      brandTitle="HomeChef"
      brandGlyph="HC"
      links={links}
      sidebarFooter={sidebarFooter}
      collapseLabel="Contraer menu"
    />
  )
}

function ClientSidebarIcon({ type, stroke = 'currentColor' }) {
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
    case 'explore':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="m15.5 8.5-2.7 6-6 2.7 2.7-6Z" />
          <circle cx="12" cy="12" r="1.3" />
        </svg>
      )
    case 'favorites':
      return (
        <svg {...common}>
          <path d="M12 20s-6.5-4.2-8.4-8.2C2.1 8.7 4 5.5 7.3 5.5c1.8 0 3 1 3.7 2.2.7-1.2 1.9-2.2 3.7-2.2 3.3 0 5.2 3.2 3.7 6.3C18.5 15.8 12 20 12 20Z" />
        </svg>
      )
    case 'cart':
      return (
        <svg {...common}>
          <path d="M4 5h2l1.1 6.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L19 7H7" />
          <circle cx="10" cy="18" r="1.5" />
          <circle cx="17" cy="18" r="1.5" />
        </svg>
      )
    case 'orders':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6.5 16h11l-1.3-2.2V10a4.2 4.2 0 0 0-8.4 0v3.8Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      )
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.3" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...common}>
          <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
          <path d="M18.5 14.5 19 16l1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z" />
        </svg>
      )
    default:
      return null
  }
}
