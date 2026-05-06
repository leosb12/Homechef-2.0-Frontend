export default function LoadingButton({
  loading = false,
  loadingLabel = 'Cargando...',
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button type={type} disabled={isDisabled} onClick={onClick} className={className} {...props}>
      {loading ? loadingLabel : children}
    </button>
  )
}