import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'
import { MessageCircle, Loader2, Eye, EyeOff, Mail } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)
  const register = useAuthStore(s => s.register)
  const navigate = useNavigate()

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register(form)
      setDone(true)
      // Navigate after 2.5s so they see the email notice
      setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageCircle className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ChatApp</h1>
          </div>
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox!</h2>
            <p className="text-gray-500 text-sm mb-1">
              We sent a verification email to <strong>{form.email}</strong>.
            </p>
            <p className="text-gray-400 text-xs">Taking you to the app now…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
            <MessageCircle className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ChatApp</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">Start chatting in seconds</p>

          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'full_name', label: 'Full name',  type: 'text',  placeholder: 'Ada Lovelace' },
              { key: 'username',  label: 'Username',   type: 'text',  placeholder: 'ada_lovelace' },
              { key: 'email',     label: 'Email',      type: 'email', placeholder: 'ada@email.com' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <input
                  type={type} required
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition text-sm"
                />
              </div>
            ))}

            {/* Password with toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Mail size={12} /> We'll send a verification email after you sign up.
            </p>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have one?{' '}
            <Link to="/login" className="text-violet-600 font-semibold hover:underline">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
