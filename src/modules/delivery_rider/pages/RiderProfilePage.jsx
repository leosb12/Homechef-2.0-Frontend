import React, { useEffect, useState } from 'react'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session'
import RiderOfflineBanner from '../components/RiderOfflineBanner'
import { getCachedRiderModule, queueRiderMutation } from '../services/deliveryRiderService'

export default function RiderProfilePage() {
  const { isOnline } = useConnectivity()
  const user = useAuthSession((state) => state.user)
  
  const [profile, setProfile] = useState(null)
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleType, setVehicleType] = useState('motocicleta')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    void loadProfile()
  }, [isOnline])

  async function loadProfile() {
    setLoading(true)
    try {
      const data = await getCachedRiderModule('rider_profile')
      if (data && data.length > 0) {
        const prof = data[0]
        setProfile(prof)
        setVehicleBrand(prof.vehicle_brand || '')
        setVehicleModel(prof.vehicle_model || '')
        setVehiclePlate(prof.vehicle_plate || '')
        setVehicleType(prof.vehicle_type || 'motocicleta')
      }
    } catch (err) {
      console.error('Error loading rider profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    
    const payload = {
      vehicle_brand: vehicleBrand,
      vehicle_model: vehicleModel,
      vehicle_plate: vehiclePlate,
      vehicle_type: vehicleType,
    }

    try {
      // Optimistic save locally first
      const { saveCachedRiderModule } = await import('../services/deliveryRiderService')
      const updated = { ...profile, ...payload, __offline: !isOnline }
      await saveCachedRiderModule('rider_profile', [updated])
      setProfile(updated)

      // Queue action
      await queueRiderMutation({
        entity: 'rider_profile',
        action: 'UPDATE',
        payload,
        options: { server_id: profile?.id }
      })

      setSuccessMsg(isOnline ? 'Perfil del vehículo actualizado correctamente.' : 'Perfil del vehículo actualizado localmente. Se sincronizará al volver la conexión.')
    } catch (err) {
      alert('Error al guardar cambios de vehículo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        Cargando perfil del repartidor...
      </div>
    )
  }

  return (
    <section className="space-y-6 max-w-2xl mx-auto">
      <RiderOfflineBanner />

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Mi Perfil de Repartidor</h1>
        <p style={{ color: 'var(--muted)' }}>Consulta tus datos personales y gestiona la información de tu vehículo de reparto.</p>
      </div>

      {successMsg && (
        <div className="rounded-xl border p-3.5 text-sm text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30">
          {successMsg}
        </div>
      )}

      {/* Datos Personales */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <h2 className="text-xl font-bold">Datos Personales</h2>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Nombre Completo</label>
            <p className="font-semibold text-base mt-1">
              {user?.first_name} {user?.last_name || ''}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Correo Electrónico</label>
            <p className="font-semibold text-base mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Teléfono</label>
            <p className="font-semibold text-base mt-1">{user?.phone || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Rol Operativo</label>
            <p className="font-semibold text-base mt-1">Repartidor (Rider)</p>
          </div>
        </div>
      </div>

      {/* Vehículo */}
      {profile ? (
        <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-xl font-bold">Información de Vehículo</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Tipo de Vehículo</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl border p-3"
                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--input)' }}
              >
                <option value="motocicleta">Motocicleta</option>
                <option value="vehiculo">Automóvil/Vehículo</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Marca</label>
                <input
                  type="text"
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  className="w-full rounded-xl border p-3"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'var(--input)' }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Modelo</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full rounded-xl border p-3"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'var(--input)' }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Placa / Patente</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full rounded-xl border p-3"
                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--input)' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios de Vehículo'}
            </button>
          </form>
        </div>
      ) : (
        !isOnline && (
          <div className="rounded-2xl border p-6 text-center space-y-2" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <p className="font-semibold text-lg">No hay datos offline disponibles para esta pantalla.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Conéctate y sincroniza cuando tengas internet.</p>
          </div>
        )
      )}
    </section>
  )
}
