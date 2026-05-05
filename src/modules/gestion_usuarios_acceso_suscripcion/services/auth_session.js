import { create } from 'zustand'

const token = localStorage.getItem('homechef_access_token')
const role = localStorage.getItem('homechef_role')
const rawUser = localStorage.getItem('homechef_user')

export const useAuthSession = create((set) => ({
  accessToken: token || '',
  role: role || '',
  user: rawUser ? JSON.parse(rawUser) : null,
  setSession: ({ access, role, user }) => {
    localStorage.setItem('homechef_access_token', access)
    localStorage.setItem('homechef_role', role)
    localStorage.setItem('homechef_user', JSON.stringify(user))
    set({ accessToken: access, role, user })
  },
  clearSession: () => {
    localStorage.removeItem('homechef_access_token')
    localStorage.removeItem('homechef_role')
    localStorage.removeItem('homechef_user')
    set({ accessToken: '', role: '', user: null })
  },
}))
