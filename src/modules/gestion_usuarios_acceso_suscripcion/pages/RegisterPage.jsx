import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { registerUser } from '../services/auth_service'
import { useThemeSession } from '../../../shared/services/theme_session'

const SANTA_CRUZ = { lat: -17.7833, lng: -63.1821 }

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'CLIENTE',
  password: '',
  password_confirm: '',
  chef_specialties: '',
  chef_latitude: SANTA_CRUZ.lat,
  chef_longitude: SANTA_CRUZ.lng,
  chef_schedule: '',
  accept_terms: false,
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const theme = useThemeSession((state) => state.theme)
  const toggleTheme = useThemeSession((state) => state.toggleTheme)
  const isDark = theme === 'dark'

  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [themeLoading, setThemeLoading] = useState(false)
  const [buttonLoading, setButtonLoading] = useState('')

  const checks = useMemo(() => {
    const p = form.password || ''
    return {
      minLength: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /[0-9]/.test(p),
    }
  }, [form.password])

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const onMapChange = ({ lat, lng }) => {
    setForm((prev) => ({
      ...prev,
      chef_latitude: Number(lat.toFixed(6)),
      chef_longitude: Number(lng.toFixed(6)),
    }))
  }

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalizacion.')
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setError('')
        onMapChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationLoading(false)
      },
      () => {
        setError('No se pudo obtener tu ubicacion actual.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const onToggleTheme = () => {
    setThemeLoading(true)
    setButtonLoading('theme')
    toggleTheme()
    window.setTimeout(() => {
      setThemeLoading(false)
      setButtonLoading((current) => (current === 'theme' ? '' : current))
    }, 150)
  }

  const onTogglePassword = () => {
    setButtonLoading('password')
    setShowPassword((prev) => !prev)
    window.setTimeout(() => setButtonLoading((current) => (current === 'password' ? '' : current)), 150)
  }

  const onToggleConfirmPassword = () => {
    setButtonLoading('confirm-password')
    setShowConfirmPassword((prev) => !prev)
    window.setTimeout(() => setButtonLoading((current) => (current === 'confirm-password' ? '' : current)), 150)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setButtonLoading('submit')
    setError('')
    setSuccess('')
    try {
      const payload = { ...form }
      if (payload.role !== 'COCINERO') {
        delete payload.chef_specialties
        delete payload.chef_latitude
        delete payload.chef_longitude
        delete payload.chef_schedule
      }
      await registerUser(payload)
      setSuccess('Registro exitoso. Ahora puedes iniciar sesion.')
      setTimeout(() => navigate('/login'), 900)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo completar el registro.')
    } finally {
      setSubmitting(false)
      setButtonLoading((current) => (current === 'submit' ? '' : current))
    }
  }

  return (
    <section
      className="relative overflow-hidden min-h-screen px-6 py-6 lg:px-10 lg:py-8"
      style={{
        backgroundColor: 'var(--bg)',
        backgroundImage: isDark
          ? 'radial-gradient(circle at 20% 20%, rgba(124,58,237,.14), transparent 45%), radial-gradient(circle at 80% 80%, rgba(34,211,238,.10), transparent 42%)'
          : 'radial-gradient(circle at 20% 20%, rgba(124,58,237,.08), transparent 45%), radial-gradient(circle at 80% 80%, rgba(147,197,253,.12), transparent 42%)',
      }}
    >
      <style>{`
        .register-input::placeholder { color: var(--muted); opacity: 0.85; }
        .register-input:-webkit-autofill,
        .register-input:-webkit-autofill:hover,
        .register-input:-webkit-autofill:focus,
        .register-select:-webkit-autofill,
        .register-select:-webkit-autofill:hover,
        .register-select:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--text);
          -webkit-box-shadow: 0 0 0px 1000px transparent inset;
          transition: background-color 9999s ease-out 0s;
        }
        .register-select option { background: #0a1738; color: #e5e7eb; }
      `}</style>

      <div
        className="fixed top-0 left-0 right-0 z-50 border-b px-6 py-4 lg:px-10"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      >
        <div className="max-w-[1680px] mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <span
              className="h-14 w-14 rounded-full grid place-items-center text-white text-2xl font-bold"
              style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-2))' }}
            >
              👨‍🍳
            </span>
            <span>
              <span className="block text-5xl font-extrabold leading-none" style={{ color: 'var(--text)' }}>HomeChef</span>
              <span className="block text-lg mt-1" style={{ color: 'var(--muted)' }}>Cocina local, momentos inolvidables 💜</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleTheme}
            className="h-12 px-4 rounded-xl border flex items-center gap-3"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            disabled={themeLoading || buttonLoading === 'theme'}
          >
            {themeLoading || buttonLoading === 'theme' ? (
              <span>Cargando...</span>
            ) : (
              <>
                <span style={{ color: isDark ? '#94a3b8' : '#f59e0b' }}>☀</span>
                <span style={{ color: 'var(--line)' }}>|</span>
                <span style={{ color: isDark ? '#8b5cf6' : '#64748b' }}>🌙</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="h-28" />

      <div className="max-w-[1680px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_840px] gap-8 lg:gap-6 items-start">
        <div className="pt-2 min-w-0 relative z-10 lg:col-start-1">
          <div className="inline-flex rounded-full px-4 py-2 text-lg border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>
            💜 Unete a nuestra comunidad
          </div>

          <h2 className="mt-6 text-5xl xl:text-6xl font-extrabold leading-[1.05]" style={{ color: 'var(--text)' }}>
            Crea tu cuenta y
            <br />
            <span style={{ color: 'var(--brand-2)' }}>empieza a disfrutar</span>
          </h2>

          <p className="mt-6 text-3xl xl:text-[34px] max-w-3xl leading-relaxed" style={{ color: 'var(--muted)' }}>
            Descubre platos increibles, apoya a chefs locales y vive experiencias unicas.
          </p>
        </div>

        <div
          className="rounded-[30px] border p-6 lg:p-8 w-full max-w-[840px] justify-self-stretch lg:justify-self-start lg:col-start-2 lg:-ml-10 mt-8 lg:mt-0 relative z-20"
          style={{
            borderColor: 'var(--line)',
            backgroundColor: isDark ? 'rgba(10,19,45,.78)' : 'rgba(255,255,255,.9)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="text-center">
            <div
              className="mx-auto h-20 w-20 rounded-full grid place-items-center text-white text-3xl mb-4"
              style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-2))' }}
            >
              👤
            </div>
            <h3 className="text-5xl font-bold" style={{ color: 'var(--text)' }}>Crear cuenta</h3>
          </div>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nombres" name="first_name" value={form.first_name} onChange={onChange} placeholder="Ingresa tu nombre" left="👤" required />
              <Field label="Apellidos" name="last_name" value={form.last_name} onChange={onChange} placeholder="Ingresa tus apellidos" left="👤" required />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Correo electronico" name="email" type="email" value={form.email} onChange={onChange} placeholder="ejemplo@correo.com" left="✉" required />
              <Field label="Telefono (opcional)" name="phone" value={form.phone} onChange={onChange} placeholder="Ingresa tu numero" left="📞" />
            </div>

            <label className="block">
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Tipo de cuenta</span>
              <div className="mt-1 h-14 rounded-xl border flex items-center px-3 gap-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
                <span style={{ color: 'var(--muted)' }}>👥</span>
                <select name="role" value={form.role} onChange={onChange} className="register-select flex-1 bg-transparent outline-none" style={{ color: 'var(--text)' }}>
                  <option value="CLIENTE">Cliente</option>
                  <option value="COCINERO">Cocinero</option>
                </select>
              </div>
            </label>

            {form.role === 'COCINERO' && (
              <div className="grid gap-3">
                <Field label="Especialidades" name="chef_specialties" value={form.chef_specialties} onChange={onChange} placeholder="Ej: cocina italiana, postres" left="🍽" required />

                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>Ubicacion en mapa (OpenStreetMap)</p>
                    <button
                      type="button"
                      onClick={onUseCurrentLocation}
                      className="px-3 py-1.5 rounded-lg text-sm border"
                      style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                      disabled={locationLoading || buttonLoading === 'location'}
                    >
                      {locationLoading || buttonLoading === 'location' ? 'Buscando...' : 'Usar ubicacion actual'}
                    </button>
                  </div>

                  <MapPicker
                    latitude={form.chef_latitude}
                    longitude={form.chef_longitude}
                    onChange={onMapChange}
                    isDark={isDark}
                  />

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <Field label="Latitud" name="chef_latitude" value={String(form.chef_latitude)} onChange={onChange} placeholder="-17.7833" left="📍" required />
                    <Field label="Longitud" name="chef_longitude" value={String(form.chef_longitude)} onChange={onChange} placeholder="-63.1821" left="📍" required />
                  </div>
                </div>

                <Field label="Horario general" name="chef_schedule" value={form.chef_schedule} onChange={onChange} placeholder="Ej: Lun-Sab 09:00-18:00" left="🕒" required />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="Contrasena"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                placeholder="Crea una contrasena"
                left="🔒"
                right={
                  <button type="button" onClick={onTogglePassword} disabled={buttonLoading === 'password'}>
                    {buttonLoading === 'password' ? '...' : showPassword ? '🙈' : '👁'}
                  </button>
                }
                required
              />
              <Field
                label="Confirmar contrasena"
                name="password_confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.password_confirm}
                onChange={onChange}
                placeholder="Confirma tu contrasena"
                left="🔒"
                right={
                  <button type="button" onClick={onToggleConfirmPassword} disabled={buttonLoading === 'confirm-password'}>
                    {buttonLoading === 'confirm-password' ? '...' : showConfirmPassword ? '🙈' : '👁'}
                  </button>
                }
                required
              />
            </div>

            <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
              <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Tu contrasena debe tener al menos:</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2" style={{ color: 'var(--muted)' }}>
                <RequirementItem ok={checks.minLength} label="8 caracteres" />
                <RequirementItem ok={checks.upper} label="Una letra mayuscula" />
                <RequirementItem ok={checks.lower} label="Una letra minuscula" />
                <RequirementItem ok={checks.number} label="Un numero" />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <input name="accept_terms" type="checkbox" checked={form.accept_terms} onChange={onChange} />
              <span>Acepto los <Link to="#" style={{ color: 'var(--brand-2)' }}>Terminos y condiciones</Link> y la <Link to="#" style={{ color: 'var(--brand-2)' }}>Politica de privacidad</Link></span>
            </label>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-500">{success}</p> : null}

            <button
              disabled={submitting || buttonLoading === 'submit'}
              className="w-full h-14 rounded-xl text-white text-2xl font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {submitting || buttonLoading === 'submit' ? 'Registrando...' : 'Crear cuenta'}
            </button>

            <div className="pt-2 text-center text-lg" style={{ color: 'var(--muted)' }}>
              Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-bold" style={{ color: 'var(--brand-2)' }}>
                Iniciar sesion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function MapPicker({ latitude, longitude, onChange, isDark }) {
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
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [longitude, latitude],
      zoom: 12,
    })

    markerRef.current = new maplibregl.Marker({ color: isDark ? '#8b5cf6' : '#6d28d9', draggable: true })
      .setLngLat([longitude, latitude])
      .addTo(mapRef.current)

    mapRef.current.on('click', (event) => {
      const lng = event.lngLat.lng
      const lat = event.lngLat.lat
      markerRef.current.setLngLat([lng, lat])
      onChange({ lat, lng })
    })

    markerRef.current.on('dragend', () => {
      const lngLat = markerRef.current.getLngLat()
      onChange({ lat: lngLat.lat, lng: lngLat.lng })
    })

    return () => {
      markerRef.current?.remove()
      mapRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    markerRef.current.setLngLat([longitude, latitude])
    mapRef.current.easeTo({ center: [longitude, latitude], duration: 500 })
  }, [latitude, longitude])

  return <div ref={mapContainerRef} className="h-72 w-full rounded-xl overflow-hidden border" style={{ borderColor: 'var(--line)' }} />
}

function Field({ label, name, value, onChange, type = 'text', placeholder, left, right, required = false }) {
  return (
    <label className="block">
      <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="mt-1 h-14 rounded-xl border flex items-center px-3 gap-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
        <span style={{ color: 'var(--muted)' }}>{left}</span>
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="register-input flex-1 bg-transparent outline-none"
          style={{ color: 'var(--text)' }}
          required={required}
        />
        {right}
      </div>
    </label>
  )
}

function RequirementItem({ ok, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-4 w-4 rounded-[4px] border"
        style={{
          borderColor: ok ? '#22c55e' : 'var(--line)',
          backgroundColor: ok ? '#22c55e' : 'transparent',
        }}
      />
      {label}
    </span>
  )
}

