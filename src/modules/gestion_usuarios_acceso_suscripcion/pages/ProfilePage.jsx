import { cloneElement, isValidElement, useEffect, useMemo, useState } from 'react'
import { changePassword, fetchProfile, updateProfile } from '../services/auth_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'

export default function ProfilePage() {
  const { isOnline } = useConnectivity()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState({ notify_gmail: false, notify_push: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notifMessage, setNotifMessage] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    notify_gmail: true,
    notify_push: true,
  })

  const [pwd, setPwd] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [showPwd, setShowPwd] = useState({
    current_password: false,
    new_password: false,
    new_password_confirm: false,
  })

  const helloName = useMemo(() => form.first_name || 'cliente', [form.first_name])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchProfile()
        setProfile(data)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          address: data.address || '',
          notify_gmail: data.notify_gmail ?? true,
          notify_push: data.notify_push ?? true,
        })
      } catch (err) {
        if (!isOnline) {
          setError('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
        } else {
          setError('No se pudo cargar el perfil.')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [isOnline])

  useEffect(() => {
    if (!notifMessage) return
    const timer = setTimeout(() => setNotifMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [notifMessage])

  const onSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSavingProfile(true)
    try {
      const data = await updateProfile(form)
      setProfile(data)
      setSuccess('Información actualizada')
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo guardar el perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const onSavePassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!isOnline) {
      setError('El cambio de contraseña requiere conexión.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(pwd)
      setPwd({ current_password: '', new_password: '', new_password_confirm: '' })
      setSuccess('Contraseña actualizada')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo actualizar la contraseña.')
    } finally {
      setSavingPassword(false)
    }
  }

  const onTogglePreference = async (key) => {
    const prev = { ...form }
    const next = { ...form, [key]: !form[key] }
    setForm(next)
    setNotifMessage('')
    setSavingPrefs((current) => ({ ...current, [key]: true }))
    try {
      await updateProfile({ notify_gmail: next.notify_gmail, notify_push: next.notify_push })
      const channel = key === 'notify_gmail' ? 'Gmail' : 'Push'
      const stateText = next[key] ? 'activado' : 'desactivado'
      setNotifMessage(`Notificaciones ${channel}: ${stateText}.`)
    } catch {
      setForm(prev)
      setError('No se pudo actualizar la preferencia de notificación.')
    } finally {
      setSavingPrefs((current) => ({ ...current, [key]: false }))
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Cargando perfil...</p>

  return (
    <section className="max-w-[1020px] space-y-4" style={{ color: 'var(--text)' }}>
      <header
        className="rounded-[26px] border px-4 py-5 sm:px-8 sm:py-6 relative overflow-hidden"
        style={{
          borderColor: 'var(--line)',
          background:
            'radial-gradient(circle at 82% 16%, rgba(124,58,237,.10), transparent 30%), linear-gradient(90deg, rgba(124,58,237,.03), rgba(168,85,247,.07))',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 relative z-10">
          <div
            className="grid place-items-center text-white"
            style={{
              width: 96,
              height: 96,
              minWidth: 96,
              minHeight: 96,
              borderRadius: 9999,
              background: 'linear-gradient(180deg,#8b5cf6,#6d28d9)',
            }}
          >
            <UserIcon className="h-11 w-11" />
          </div>
          <div>
            <p className="text-[32px] leading-none font-extrabold" style={{ color: 'var(--text)' }}>Tu perfil</p>
            <p className="text-lg mt-1 font-semibold" style={{ color: 'var(--brand)' }}>¡Hola, {helloName}! 👋</p>
            <p className="text-[18px] mt-1" style={{ color: 'var(--muted)' }}>Administra tu información personal y mantén tu cuenta segura.</p>
          </div>
        </div>
      </header>

      <form onSubmit={onSaveProfile} className="rounded-3xl border p-4 sm:p-6" style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel)' }}>
        <SectionTitle icon={<UserIcon className="h-5 w-5" />} title="Datos personales" subtitle="Actualiza tu información personal." />

        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <Field label="Nombre" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} icon={<UserIcon className="h-4 w-4" />} />
          <Field label="Apellido" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} icon={<UserIcon className="h-4 w-4" />} />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} icon={<PhoneIcon className="h-4 w-4" />} />
          <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} icon={<PinIcon className="h-4 w-4" />} placeholder="Ingresa tu dirección" />
        </div>

        <div className="mt-8 sm:mt-20 flex items-center justify-between gap-3 flex-wrap">
          <button
            disabled={savingProfile}
            className="h-10 px-6 rounded-xl text-white font-semibold flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg,#6d28d9,#8b5cf6)' }}
          >
            <RefreshIcon className={`h-4 w-4 ${savingProfile ? 'animate-spin' : ''}`} />
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {success ? <span className="px-4 py-1.5 rounded-full text-sm font-medium text-green-700 bg-green-100">✓ {success}</span> : null}
        </div>
      </form>

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={onSavePassword} className="rounded-3xl border p-4 sm:p-6" style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel)' }}>
          <SectionTitle icon={<LockIcon className="h-5 w-5" />} title="Cambiar contraseña" subtitle="Asegura tu cuenta con una contraseña fuerte." />

          <Field
            label="Contraseña actual"
            type={showPwd.current_password ? 'text' : 'password'}
            value={pwd.current_password}
            onChange={(v) => setPwd({ ...pwd, current_password: v })}
            placeholder="Ingresa tu contraseña actual"
            rightIcon={showPwd.current_password ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            onRightIconClick={() => setShowPwd((prev) => ({ ...prev, current_password: !prev.current_password }))}
            rightIconAria={showPwd.current_password ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
          />
          <Field
            label="Nueva contraseña"
            type={showPwd.new_password ? 'text' : 'password'}
            value={pwd.new_password}
            onChange={(v) => setPwd({ ...pwd, new_password: v })}
            placeholder="Ingresa tu nueva contraseña"
            rightIcon={showPwd.new_password ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            onRightIconClick={() => setShowPwd((prev) => ({ ...prev, new_password: !prev.new_password }))}
            rightIconAria={showPwd.new_password ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
          />
          <div className="mb-8">
          <Field
            label="Confirmar nueva contraseña"
            type={showPwd.new_password_confirm ? 'text' : 'password'}
            value={pwd.new_password_confirm}
            onChange={(v) => setPwd({ ...pwd, new_password_confirm: v })}
            placeholder="Confirma tu nueva contraseña"
            rightIcon={showPwd.new_password_confirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            onRightIconClick={() => setShowPwd((prev) => ({ ...prev, new_password_confirm: !prev.new_password_confirm }))}
            rightIconAria={showPwd.new_password_confirm ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
          />
          </div>

          <div className="mt-8 sm:mt-20 flex items-center gap-2 flex-wrap">
            <button
              disabled={savingPassword}
              className="h-10 px-6 rounded-xl text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg,#6d28d9,#8b5cf6)' }}
            >
              <LockIcon className={`h-4 w-4 ${savingPassword ? 'animate-spin' : ''}`} />
              {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
            <div className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
              Usa al menos 8 caracteres con letras, números y símbolos.
            </div>
          </div>
        </form>

        <section className="rounded-3xl border p-4 sm:p-6" style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel)' }}>
          <SectionTitle icon={<BellIcon className="h-5 w-5" />} title="Preferencias de notificación" subtitle="Elige cómo deseas recibir tus notificaciones." />

          <ToggleRow icon={<GmailBrandIcon className="h-6 w-6" />} title="Notificaciones por Gmail" subtitle="Recibe actualizaciones y promociones en tu correo." enabled={form.notify_gmail} pending={savingPrefs.notify_gmail} onToggle={() => onTogglePreference('notify_gmail')} />
          <ToggleRow icon={<PushNotificationIcon className="h-6 w-6" />} title="Notificaciones Push" subtitle="Recibe notificaciones en tu dispositivo." enabled={form.notify_push} pending={savingPrefs.notify_push} onToggle={() => onTogglePreference('notify_push')} />

          <p className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--muted)' }}>
            Puedes cambiar estas preferencias en cualquier momento.
          </p>
          {notifMessage ? (
            <p className="mt-2 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
              {notifMessage}
            </p>
          ) : null}
        </section>
      </div>

      {error ? <p className="text-red-500 text-sm">{error}</p> : null}
    </section>
  )
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-10 w-10 rounded-full grid place-items-center" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand)' }}>
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[34px] leading-none font-extrabold" style={{ color: 'var(--text)' }}>{title}</h3>
        <p style={{ color: 'var(--muted)' }}>{subtitle}</p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', icon, rightIcon, onRightIconClick, rightIconAria }) {
  const leftIcon = fitInputIcon(icon)
  const rightFieldIcon = fitInputIcon(rightIcon)

  return (
    <label className="block mt-2">
      <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="mt-1 relative">
        {leftIcon ? (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 grid place-items-center pointer-events-none"
            style={{ width: 18, height: 18 }}
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="h-16 w-full rounded-xl border text-[17px]"
          style={{
            borderColor: 'var(--line)',
            backgroundColor: 'transparent',
            paddingLeft: leftIcon ? '3rem' : '0.9rem',
            paddingRight: rightFieldIcon ? '3rem' : '0.9rem',
          }}
        />
        {rightFieldIcon ? (
          <button
            type="button"
            aria-label={rightIconAria || 'Cambiar visibilidad'}
            onClick={onRightIconClick}
            className="absolute top-1/2 -translate-y-1/2 text-slate-500 grid place-items-center"
            style={{ width: 18, height: 18, right: '0.875rem' }}
          >
            {rightFieldIcon}
          </button>
        ) : null}
      </div>
    </label>
  )
}

function fitInputIcon(icon) {
  if (!isValidElement(icon)) return null
  const prevStyle = icon.props?.style || {}
  return cloneElement(icon, {
    style: {
      ...prevStyle,
      width: 16,
      height: 16,
    },
  })
}
function ToggleRow({ icon, title, subtitle, enabled, pending, onToggle }) {
  return (
    <div className="rounded-xl border p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2" style={{ borderColor: 'var(--line)' }}>
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="grid place-items-center rounded-lg"
          style={{ width: 28, height: 28, backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[24px] leading-7" style={{ color: 'var(--text)' }}>{title}</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-label={enabled ? 'Desactivar preferencia' : 'Activar preferencia'}
        className="relative disabled:opacity-60 shrink-0"
        style={{
          width: 48,
          height: 28,
          borderRadius: 9999,
          backgroundColor: enabled ? '#6d28d9' : '#a0a7ba',
          transition: 'background-color .2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 27 : 3,
            width: 22,
            height: 22,
            borderRadius: 9999,
            backgroundColor: '#fff',
            transition: 'left .2s ease',
          }}
        />
      </button>
    </div>
  )
}

function SvgBase({ className, children, style }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>{children}</svg>
}

function UserIcon(props) { return <SvgBase {...props}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></SvgBase> }
function LockIcon(props) { return <SvgBase {...props}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 1 1 8 0v3" /></SvgBase> }
function BellIcon(props) { return <SvgBase {...props}><path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 19a2 2 0 0 0 4 0" /></SvgBase> }
function PhoneIcon(props) { return <SvgBase {...props}><rect x="7" y="2" width="10" height="20" rx="2" /><circle cx="12" cy="18" r="1" /><path d="M10 6h4" /></SvgBase> }
function PinIcon(props) { return <SvgBase {...props}><path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" /><circle cx="12" cy="11" r="2.5" /></SvgBase> }
function EyeIcon(props) { return <SvgBase {...props}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></SvgBase> }
function EyeOffIcon(props) { return <SvgBase {...props}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.17-6.29" /><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.76 21.76 0 0 1-3.16 4.19" /><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" /><path d="m1 1 22 22" /></SvgBase> }
function RefreshIcon(props) { return <SvgBase {...props}><path d="M21 12a9 9 0 0 1-15.5 6.4" /><path d="M3 12A9 9 0 0 1 18.5 5.6" /><path d="M3 16v-4h4" /><path d="M21 8v4h-4" /></SvgBase> }
function GmailBrandIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="#ffffff" />
      <path d="M4 8.2V18h3.2V10.6L12 14l4.8-3.4V18H20V8.2L12 14z" fill="#EA4335" />
      <path d="M4 8.2 12 14l8-5.8" fill="none" stroke="#FBBC05" strokeWidth="1.8" />
      <path d="M4 8.2V18" stroke="#34A853" strokeWidth="1.8" />
      <path d="M20 8.2V18" stroke="#4285F4" strokeWidth="1.8" />
    </svg>
  )
}
function PushNotificationIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M10 6.5h4" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <path d="M17.5 5.5h3" />
      <path d="M19 4v3" />
    </svg>
  )
}
