import RoleLayout from './RoleLayout'
const links = [
  { to: '/client/explore', label: 'Explorar platos', icon: '🧭' },
  { to: '/client/favorites', label: 'Favoritos', icon: '❤️' },
  { to: '/client/cart', label: 'Carrito', icon: '🛒', badge: 3 },
  { to: '/client/orders', label: 'Mis pedidos', icon: '📋' },
  { to: '/client/profile', label: 'Perfil', icon: '👤' },
]
export default function ClientLayout(){ return <RoleLayout title="Cliente" links={links} /> }
