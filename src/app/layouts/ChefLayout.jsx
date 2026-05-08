import RoleLayout from './RoleLayout'
const links = [
  { to: '/chef/dashboard', label: 'Resumen general', icon: '📊' },
  { to: '/chef/dishes', label: 'Mis platos', icon: '🍲' },
  { to: '/chef/menu', label: 'Menu del dia', icon: '🗓️' },
  { to: '/chef/inventory', label: 'Inventario', icon: '📦' },
  { to: '/chef/availability', label: 'Disponibilidad', icon: '⏰' },
  { to: '/chef/ai/assistant', label: 'Asistente IA', icon: '🤖' },
  { to: '/chef/ai-subscription', label: 'Suscripción IA', icon: '💳' },
  { to: '/chef/profile', label: 'Perfil cocinero', icon: '👨‍🍳' },
]
export default function ChefLayout(){ return <RoleLayout title="Cocinero" links={links} /> }
