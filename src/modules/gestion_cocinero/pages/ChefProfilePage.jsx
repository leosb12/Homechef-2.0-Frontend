import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { uploadFile } from '../../../shared/services/uploads'
import { changePassword } from '../../gestion_usuarios_acceso_suscripcion/services/auth_service'
import { fetchChefProfile, saveChefLocation, saveChefProfile } from '../services/chef_service'
import LoadingButton from '../components/LoadingButton'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import ChefOfflineBanner from '../components/ChefOfflineBanner'


const SANTA_CRUZ = { lat: -17.7833, lng: -63.1821 }

function normalizeGeneral(data) {
  return {
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email: data.email || '',
    phone: data.phone || '',
    business_name: data.business_name || '',
    status: data.status || 'pending_validation',
    public_description: data.public_description || '',
    specialties: Array.isArray(data.specialties) ? data.specialties.join(', ') : '',
    schedule: data.schedule || '',
    profile_image_url: data.profile_image_url || '',
  }
}

function normalizeLocation(data) {
  return {
    latitude: data?.location?.latitude ?? SANTA_CRUZ.lat,
    longitude: data?.location?.longitude ?? SANTA_CRUZ.lng,
    address: data?.location?.address || '',
  }
}

export default function ChefProfilePage() {
  const { isOnline } = useConnectivity()
  const [general, setGeneral] = useState(normalizeGeneral({}))

  const [generalBase, setGeneralBase] = useState(normalizeGeneral({}))
  const [location, setLocation] = useState(normalizeLocation({}))
  const [locationBase, setLocationBase] = useState(normalizeLocation({}))
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })

  const [editingGeneral, setEditingGeneral] = useState(false)
  const [editingLocation, setEditingLocation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [noticeContext, setNoticeContext] = useState('')
  const [loadingAction, setLoadingAction] = useState('')
  const fileInputRef = useRef(null)

  const isGeneralDirty = useMemo(
    () => JSON.stringify(general) !== JSON.stringify(generalBase),
    [general, generalBase]
  )
  const isLocationDirty = useMemo(
    () => JSON.stringify(location) !== JSON.stringify(locationBase),
    [location, locationBase]
  )
  const canChangePassword = useMemo(() => {
    return (
      passwordForm.current_password.trim().length > 0 &&
      passwordForm.new_password.trim().length > 0 &&
      passwordForm.new_password_confirm.trim().length > 0
    )
  }, [passwordForm])

  useEffect(() => {
    fetchChefProfile()
      .then((data) => {
        const g = normalizeGeneral(data)
        const l = normalizeLocation(data)
        setGeneral(g)
        setGeneralBase(g)
        setLocation(l)
        setLocationBase(l)
      })
      .catch(() => {
        setIsError(true)
        setMessage('No se pudo cargar el perfil de cocinero.')
      })
      .finally(() => setLoading(false))
  }, [])

  const setNotice = (text, error = false, context = '') => {
    setIsError(error)
    setMessage(text)
    setNoticeContext(context)
  }

  const onPickImage = async (event) => {
    if (!editingGeneral) return
    const file = event.target.files?.[0]
    if (!file) return
    if (!isOnline) {
      setNotice('La subida de imágenes requiere conexión. Puedes editar los demás campos offline.', true, 'general')
      event.target.value = ''
      return
    }
    setUploadingImage(true)
    try {
      const uploaded = await uploadFile(file, 'chef-profile')
      setGeneral((prev) => ({ ...prev, profile_image_url: uploaded.public_url || uploaded.file_path }))
      setNotice('Imagen subida correctamente.')
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || 'No se pudo subir la imagen.', true)
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }


  const removeImage = () => {
    if (!editingGeneral) return
    setGeneral((prev) => ({ ...prev, profile_image_url: '' }))
  }

  const saveGeneral = async (event) => {
    event.preventDefault()
    setNotice('', false, 'general')
    setLoadingAction('save-general')
    const payload = {
      first_name: general.first_name,
      last_name: general.last_name,
      phone: general.phone,
      business_name: general.business_name,
      public_description: general.public_description,
      specialties: general.specialties.split(',').map((x) => x.trim()).filter(Boolean),
      schedule: general.schedule,
      profile_image_url: general.profile_image_url,
    }

    try {
      const data = await saveChefProfile(payload)
      const normalized = normalizeGeneral(data)
      setGeneral(normalized)
      setGeneralBase(normalized)
      setEditingGeneral(false)
      setNotice('Perfil actualizado correctamente.', false, 'general')
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo guardar los cambios del perfil.', true, 'general')
    } finally {
      setLoadingAction((current) => (current === 'save-general' ? '' : current))
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (!isOnline) {
      setNotice('El cambio de contraseña requiere conexión.', true, 'general')
      return
    }
    setLoadingAction('change-password')
    try {
      await changePassword(passwordForm)
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      })
      setNotice('Contrasena actualizada correctamente.')
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || 'No se pudo cambiar la contrasena.', true)
    } finally {
      setLoadingAction((current) => (current === 'change-password' ? '' : current))
    }
  }


  const onMapChange = ({ lat, lng }) => {
    if (!editingLocation) return
    setLocation((prev) => ({
      ...prev,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    }))
  }

  const useCurrentLocation = () => {
    if (!editingLocation) return
    setLoadingAction('use-location')
    if (!navigator.geolocation) {
      setNotice('Tu navegador no soporta geolocalizacion.', true)
      setLoadingAction('')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }))
        setLoadingAction('')
      },
      () => {
        setNotice('No se pudo obtener tu ubicacion actual.', true)
        setLoadingAction('')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const saveLocation = async () => {
    setLoadingAction('save-location')
    try {
      const saved = await saveChefLocation({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        address: location.address,
      })
      const normalized = {
        latitude: saved.latitude,
        longitude: saved.longitude,
        address: saved.address || '',
      }
      setLocation(normalized)
      setLocationBase(normalized)
      setEditingLocation(false)
      setNotice('Ubicacion guardada correctamente.')
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo guardar la ubicacion.', true)
    } finally {
      setLoadingAction((current) => (current === 'save-location' ? '' : current))
    }
  }

  if (loading) return <p>Cargando perfil de cocinero...</p>

  return (
    <section className="space-y-4">
      <ChefOfflineBanner />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <h1 className="text-3xl font-bold">Perfil de cocinero</h1>
        <LoadingButton
          type="button"
          className="px-4 py-2 rounded-lg text-white self-start sm:self-auto"
          style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          onClick={() => {
            setLoadingAction('toggle-general')
            setEditingGeneral((prev) => !prev)
            window.setTimeout(() => setLoadingAction((current) => (current === 'toggle-general' ? '' : current)), 150)
          }}
          loading={loadingAction === 'toggle-general'}
          loadingLabel="..."
        >
          {editingGeneral ? 'Cancelar edicion' : 'Editar perfil'}
        </LoadingButton>
      </div>

      <form className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }} onSubmit={saveGeneral}>
        <div className="grid sm:grid-cols-2 gap-3">
          <InputField label="Nombre" value={general.first_name} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, first_name: v })} />
          <InputField label="Apellidos" value={general.last_name} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, last_name: v })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <InputField label="Telefono" value={general.phone} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, phone: v })} />
          <InputField label="Correo" value={general.email} disabled onChange={() => {}} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <InputField label="Nombre comercial" value={general.business_name} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, business_name: v })} />
          <InputField label="Estado de cuenta" value={general.status} disabled onChange={() => {}} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            <TextAreaField label="Descripcion publica" value={general.public_description} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, public_description: v })} />
            <InputField label="Especialidades" value={general.specialties} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, specialties: v })} placeholder="cocina italiana, postres" />
            <InputField label="Horario general" value={general.schedule} disabled={!editingGeneral} onChange={(v) => setGeneral({ ...general, schedule: v })} placeholder="Ej: Lun-Sab 09:00-18:00" />

            <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
              <p className="font-semibold">Cambiar contrasena</p>
              <InputField type="password" label="Contrasena actual" value={passwordForm.current_password} disabled={false} onChange={(v) => setPasswordForm((prev) => ({ ...prev, current_password: v }))} />
              <InputField type="password" label="Nueva contrasena" value={passwordForm.new_password} disabled={false} onChange={(v) => setPasswordForm((prev) => ({ ...prev, new_password: v }))} />
              <InputField type="password" label="Confirmar nueva contrasena" value={passwordForm.new_password_confirm} disabled={false} onChange={(v) => setPasswordForm((prev) => ({ ...prev, new_password_confirm: v }))} />
              <LoadingButton
                type="button"
                disabled={!canChangePassword}
                onClick={handleChangePassword}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                loading={loadingAction === 'change-password'}
                loadingLabel="Cambiando..."
              >
                Cambiar contrasena
              </LoadingButton>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border p-3 space-y-3 h-full" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
              <p className="font-semibold">Imagen de perfil</p>
              <div className="w-full max-w-[320px] aspect-square rounded-lg overflow-hidden border mx-auto" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                {general.profile_image_url ? (
                  <img src={general.profile_image_url} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-sm opacity-70">Sin foto</div>
                )}
              </div>
              <div className="flex gap-2">
                <LoadingButton
                  type="button"
                  disabled={!editingGeneral || uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 text-center px-3 py-2 rounded-lg border disabled:opacity-60"
                  style={{ borderColor: 'var(--line)' }}
                  loading={uploadingImage}
                  loadingLabel="Subiendo..."
                >
                  Subir foto
                </LoadingButton>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={!editingGeneral} onChange={onPickImage} />
                <LoadingButton
                  type="button"
                  disabled={!editingGeneral}
                  onClick={() => {
                    setLoadingAction('remove-image')
                    removeImage()
                    window.setTimeout(() => setLoadingAction((current) => (current === 'remove-image' ? '' : current)), 150)
                  }}
                  className="px-3 py-2 rounded-lg border disabled:opacity-60"
                  style={{ borderColor: 'var(--line)' }}
                  aria-label="Quitar foto"
                  loading={loadingAction === 'remove-image'}
                  loadingLabel="..."
                >
                  🗑
                </LoadingButton>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <LoadingButton type="submit" disabled={!editingGeneral || !isGeneralDirty} className="px-4 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }} loading={loadingAction === 'save-general'} loadingLabel="Guardando...">
                Guardar cambios
              </LoadingButton>
            </div>
            {message && noticeContext === 'general' && (
              <p className={isError ? 'text-red-500 text-right' : 'text-emerald-500 text-right'} aria-live="polite">
                {message}
              </p>
            )}
          </div>
        </div>
      </form>

      <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-lg">Ubicacion del cocinero (OpenStreetMap)</h2>
          <LoadingButton type="button" className="px-3 py-2 rounded-lg border self-start sm:self-auto" style={{ borderColor: 'var(--line)' }} onClick={() => {
            setLoadingAction('toggle-location')
            setEditingLocation((prev) => !prev)
            window.setTimeout(() => setLoadingAction((current) => (current === 'toggle-location' ? '' : current)), 150)
          }} loading={loadingAction === 'toggle-location'} loadingLabel="...">
            {editingLocation ? 'Cancelar ubicacion' : 'Editar ubicacion'}
          </LoadingButton>
        </div>

        <MapPicker latitude={location.latitude} longitude={location.longitude} editable={editingLocation} onChange={onMapChange} />
        {!editingLocation && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Puedes acercar/alejar y mover el mapa libremente. Activa "Editar ubicacion" para mover el marcador.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <InputField label="Latitud" value={String(location.latitude)} disabled={!editingLocation} onChange={(v) => setLocation({ ...location, latitude: Number(v) || 0 })} />
          <InputField label="Longitud" value={String(location.longitude)} disabled={!editingLocation} onChange={(v) => setLocation({ ...location, longitude: Number(v) || 0 })} />
        </div>
        <InputField label="Direccion" value={location.address} disabled={!editingLocation} onChange={(v) => setLocation({ ...location, address: v })} placeholder="Direccion o referencia" />

        <div className="flex flex-wrap gap-2">
          <LoadingButton type="button" disabled={!editingLocation} onClick={useCurrentLocation} className="px-4 py-2 rounded-lg border disabled:opacity-60" style={{ borderColor: 'var(--line)' }} loading={loadingAction === 'use-location'} loadingLabel="Buscando...">
            Usar ubicacion actual
          </LoadingButton>
          <LoadingButton type="button" disabled={!editingLocation || !isLocationDirty} onClick={saveLocation} className="px-4 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }} loading={loadingAction === 'save-location'} loadingLabel="Guardando...">
            Guardar ubicacion
          </LoadingButton>
        </div>
      </section>

      {message && noticeContext !== 'general' && <p className={isError ? 'text-red-500' : 'text-emerald-500'}>{message}</p>}
    </section>
  )
}

function MapPicker({ latitude, longitude, onChange, editable }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [longitude, latitude],
      zoom: 12,
    })

    markerRef.current = new maplibregl.Marker({ draggable: editable }).setLngLat([longitude, latitude]).addTo(mapRef.current)

    mapRef.current.on('click', (event) => {
      if (!editable) return
      const lng = event.lngLat.lng
      const lat = event.lngLat.lat
      markerRef.current.setLngLat([lng, lat])
      onChange({ lat, lng })
    })

    markerRef.current.on('dragend', () => {
      if (!editable) return
      const lngLat = markerRef.current.getLngLat()
      onChange({ lat: lngLat.lat, lng: lngLat.lng })
    })

    return () => {
      markerRef.current?.remove()
      mapRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
    }
  }, [editable, latitude, longitude, onChange])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    markerRef.current.setLngLat([longitude, latitude])
    markerRef.current.setDraggable(editable)
    mapRef.current.easeTo({ center: [longitude, latitude], duration: 250 })
  }, [latitude, longitude, editable])

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="h-72 w-full rounded-xl overflow-hidden border" style={{ borderColor: 'var(--line)' }} />
    </div>
  )
}

function InputField({ label, value, onChange, disabled, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <input
        type={type}
        className="h-12 w-full rounded-lg border px-3"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function TextAreaField({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <textarea
        className="min-h-[100px] w-full rounded-lg border px-3 py-2"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
