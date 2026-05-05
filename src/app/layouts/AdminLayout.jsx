import RoleLayout from './RoleLayout'
const links = [
  { to: '/admin/dashboard', label: 'Resumen general' },{ to: '/admin/users', label: 'Usuarios' },{ to: '/admin/publications', label: 'Publicaciones' },{ to: '/admin/fraud', label: 'Fraude y riesgo' },{ to: '/admin/reports', label: 'Reportes' },{ to: '/admin/settings', label: 'Configuracion' }
]
export default function AdminLayout(){ return <RoleLayout title="Administrador" links={links} /> }
