import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { CheckCircle, XCircle, Loader2, MessageCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); setMessage('No token found.'); return }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => { setStatus('success') })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Verification failed. Link may have expired.')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
            <MessageCircle className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ChatApp</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="mx-auto text-violet-500 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Verifying your email…</h2>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-gray-500 text-sm mb-6">Your email has been verified. You can now use all features.</p>
              <Link to="/" className="inline-block px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition">
                Go to ChatApp →
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={56} className="mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link to="/" className="inline-block px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition">
                Back to app
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
