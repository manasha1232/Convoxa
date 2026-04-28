import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './context/authStore'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

// Apply dark mode before render
const savedDark = localStorage.getItem('convoxa_dark') === 'true'
if (savedDark) document.documentElement.classList.add('dark')

// 🔒 PRIVATE ROUTE
function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

// 🌐 PUBLIC ROUTE
function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) return null

  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  const init = useAuthStore(s => s.init)

  useEffect(() => {
    init()
  }, [])

  return (
    <BrowserRouter>
      <Toaster />

      <Routes>
        <Route path="/" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* 🔥 FIXED */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}