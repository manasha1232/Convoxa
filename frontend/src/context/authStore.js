import { create } from 'zustand'
import api from '../utils/api'
import { initSocket, disconnectSocket } from '../utils/socket'

function saveToken(token, remember) {
  if (remember) {
    localStorage.setItem('token', token)
    localStorage.setItem('rememberMe', 'true')
    sessionStorage.removeItem('token')
  } else {
    sessionStorage.setItem('token', token)
    localStorage.removeItem('token')
    localStorage.removeItem('rememberMe')
  }
}

function getStoredToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null
}

function clearStoredToken() {
  localStorage.removeItem('token')
  localStorage.removeItem('rememberMe')
  sessionStorage.removeItem('token')
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getStoredToken(),
  loading: true,
  rememberMe: localStorage.getItem('rememberMe') === 'true',

  init: async () => {
    const token = getStoredToken()
    if (!token) { set({ loading: false }); return }
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, token, loading: false })
      initSocket(token)
    } catch {
      clearStoredToken()
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (email, password, remember = false) => {
    const { data } = await api.post('/auth/login', { email, password })
    saveToken(data.access_token, remember)
    set({ user: data.user, token: data.access_token, rememberMe: remember })
    initSocket(data.access_token)
    return data.user
  },

  register: async (form) => {
    const { data } = await api.post('/auth/register', form)
    saveToken(data.access_token, true)
    set({ user: data.user, token: data.access_token, rememberMe: true })
    initSocket(data.access_token)
    return data.user
  },

  logout: () => {
    clearStoredToken()
    disconnectSocket()
    set({ user: null, token: null, rememberMe: false })
  },

  updateProfile: async (updates) => {
    const { data } = await api.put('/auth/profile', updates)
    set({ user: data })
    return data
  },

  changePassword: async (currentPassword, newPassword) => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  uploadAvatar: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/users/avatar', form)
    set(s => ({ user: { ...s.user, avatar: data.avatar_url } }))
    return data.avatar_url
  },

  resendVerification: async () => {
    await api.post('/auth/resend-verification')
  },

  updateUserLocally: (updates) => {
    set(s => ({ user: { ...s.user, ...updates } }))
  },
}))
