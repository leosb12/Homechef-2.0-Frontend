import { create } from 'zustand'

const saved = localStorage.getItem('homechef_theme')
const initialTheme = saved || 'dark'

const applyTheme = (theme) => {
  const root = document.documentElement
  root.classList.remove('theme-dark', 'theme-light')
  root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark')
}

applyTheme(initialTheme)

export const useThemeSession = create((set) => ({
  theme: initialTheme,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('homechef_theme', next)
      applyTheme(next)
      return { theme: next }
    }),
}))
