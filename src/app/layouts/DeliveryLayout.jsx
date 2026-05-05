import RoleLayout from './RoleLayout'
const links = [
  { to: '/delivery/assigned', label: 'Entregas asignadas' },{ to: '/delivery/active', label: 'Entregas activas' },{ to: '/delivery/routes', label: 'Ruta actual' },{ to: '/delivery/incidents', label: 'Incidencias' }
]
export default function DeliveryLayout(){ return <RoleLayout title="Delivery" links={links} /> }
