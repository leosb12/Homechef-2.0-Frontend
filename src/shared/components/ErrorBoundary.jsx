import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] render failed', { error, errorInfo })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100">
          <section className="max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h1 className="text-xl font-semibold">HomeChef no pudo renderizar esta vista</h1>
            <p className="mt-3 text-sm text-slate-300">
              La aplicacion sigue cargada. Recarga la pagina para intentar recuperar la vista actual.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Recargar
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
