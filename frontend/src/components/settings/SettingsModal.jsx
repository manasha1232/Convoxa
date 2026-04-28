import { useState, useRef } from 'react'
import { useAuthStore } from '../../context/authStore'
import { X, User, Lock, Bell, Moon, UserPlus, Camera, Check, Loader2, AlertCircle, Copy, ExternalLink, Shield, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'

const TABS = [
  { id: 'profile',       label: 'Profile',        icon: User },
  { id: 'password',      label: 'Password',       icon: Lock },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'appearance',    label: 'Appearance',     icon: Moon },
  { id: 'invite',        label: 'Invite Friend',  icon: UserPlus },
  { id: 'security',      label: 'Security',       icon: Shield },
]

export default function SettingsModal({ onClose, darkMode, onToggleDark }) {
  const [tab, setTab] = useState('profile')
  const { user, updateProfile, changePassword, uploadAvatar, resendVerification, updateUserLocally } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileRef = useRef(null)

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErr, setPwErr] = useState('')
  const [notifPrefs, setNotifPrefs] = useState(user?.notification_preferences || { messages: true, mentions: true, sounds: true })
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const saveProfile = async () => {
    setSaving(true)
    try { await updateProfile({ full_name: fullName, bio }); toast.success('Profile updated!') }
    catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const handleAvatar = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setAvatarLoading(true)
    try { await uploadAvatar(file); toast.success('Avatar updated!') }
    catch { toast.error('Upload failed') }
    finally { setAvatarLoading(false) }
  }

  const savePassword = async () => {
    setPwErr('')
    if (pwForm.next !== pwForm.confirm) { setPwErr("Passwords don't match"); return }
    if (pwForm.next.length < 8) { setPwErr("Min 8 characters"); return }
    setSaving(true)
    try { await changePassword(pwForm.current, pwForm.next); toast.success('Password changed!'); setPwForm({ current: '', next: '', confirm: '' }) }
    catch (err) { setPwErr(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const saveNotifications = async () => {
    setSaving(true)
    try { await updateProfile({ notification_preferences: notifPrefs }); updateUserLocally({ notification_preferences: notifPrefs }); toast.success('Saved!') }
    catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const loadInvite = async () => {
    setInviteLoading(true)
    try { const { data } = await api.get('/users/invite-link'); setInviteLink(data.invite_url) }
    catch { toast.error('Could not get invite link') }
    finally { setInviteLoading(false) }
  }

  const colors = ['bg-violet-500','bg-sky-500','bg-amber-500','bg-rose-500','bg-teal-500','bg-indigo-500']
  const avatarColor = colors[(user?.full_name?.charCodeAt(0) || 0) % colors.length]

  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-violet-600' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">C</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Settings</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-white/80 flex items-center justify-center text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Tab sidebar */}
          <div className="w-44 border-r border-gray-100 flex-shrink-0 py-4 bg-gray-50/80">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition text-left ${
                  tab === id ? 'text-violet-700 bg-violet-50 border-r-2 border-violet-600' : 'text-gray-500 hover:bg-white hover:text-gray-900'
                }`}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* PROFILE */}
            {tab === 'profile' && (
              <div className="space-y-5">
                {!user?.email_verified && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Email not verified</p>
                      <button onClick={async () => { try { await resendVerification(); toast.success('Sent!') } catch { toast.error('Failed') } }}
                        className="text-xs font-semibold text-amber-700 underline mt-1">Resend verification →</button>
                    </div>
                  </div>
                )}
                {user?.email_verified && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                    <Check size={14} /> <span className="font-semibold">Verified</span> <span className="text-emerald-500">({user.email})</span>
                  </div>
                )}

                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {user?.avatar
                      ? <img src={user.avatar} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt="" />
                      : <div className={`w-20 h-20 ${avatarColor} rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg`}>
                          {user?.full_name?.[0]?.toUpperCase()}
                        </div>
                    }
                    <button onClick={() => fileRef.current?.click()} disabled={avatarLoading}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white shadow-lg">
                      {avatarLoading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-lg">{user?.full_name}</p>
                    <p className="text-sm text-gray-500 font-medium">@{user?.username}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Full name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200} placeholder="Tell people about yourself…"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/200</p>
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 shadow-md shadow-violet-200">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save changes
                </button>
              </div>
            )}

            {/* PASSWORD */}
            {tab === 'password' && (
              <div className="space-y-4 max-w-sm">
                <div><p className="font-black text-gray-900">Change password</p><p className="text-sm text-gray-500 mt-0.5">Min 8 characters.</p></div>
                {pwErr && <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"><AlertCircle size={14}/> {pwErr}</div>}
                {['current','next','confirm'].map((k, i) => (
                  <div key={k}>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">{['Current password','New password','Confirm new password'][i]}</label>
                    <input type="password" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                ))}
                <button onClick={savePassword} disabled={saving || !pwForm.current || !pwForm.next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 shadow-md shadow-violet-200">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Change password
                </button>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === 'notifications' && (
              <div className="space-y-4">
                <div><p className="font-black text-gray-900">Notifications</p><p className="text-sm text-gray-500 mt-0.5">Control how Convoxa notifies you.</p></div>
                {[
                  { key: 'messages', label: 'New messages', desc: 'Notify on incoming messages' },
                  { key: 'mentions', label: 'Mentions', desc: 'Notify when someone mentions you' },
                  { key: 'sounds',   label: 'Sound effects', desc: 'Play notification sounds' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
                    <div><p className="text-sm font-bold text-gray-900">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                    <Toggle on={notifPrefs[key]} onToggle={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))} />
                  </div>
                ))}
                <button onClick={saveNotifications} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 shadow-md shadow-violet-200">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                </button>
              </div>
            )}

            {/* APPEARANCE */}
            {tab === 'appearance' && (
              <div className="space-y-5">
                <div><p className="font-black text-gray-900">Appearance</p><p className="text-sm text-gray-500 mt-0.5">Customize your Convoxa experience.</p></div>
                <div className="flex items-center justify-between py-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon size={18} className="text-violet-500" /> : <Sun size={18} className="text-amber-500" />}
                    <div>
                      <p className="text-sm font-bold text-gray-900">Dark mode</p>
                      <p className="text-xs text-gray-500">Switch to dark color scheme</p>
                    </div>
                  </div>
                  <Toggle on={darkMode} onToggle={onToggleDark} />
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-sm text-violet-700">
                  <p className="font-bold mb-1">💡 Dark mode</p>
                  <p className="text-xs text-violet-600">Dark mode applies immediately and is saved in your browser. It will persist after you reload the page.</p>
                </div>
              </div>
            )}

            {/* INVITE */}
            {tab === 'invite' && (
              <div className="space-y-5">
                <div><p className="font-black text-gray-900">Invite a friend</p><p className="text-sm text-gray-500 mt-0.5">Grow your Convoxa network.</p></div>
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-200">
                    <UserPlus size={24} className="text-white" />
                  </div>
                  <p className="font-bold text-gray-900 mb-1">Share your invite link</p>
                  <p className="text-xs text-gray-500 mb-4">Anyone with the link can find and message you.</p>
                  {!inviteLink ? (
                    <button onClick={loadInvite} disabled={inviteLoading}
                      className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-200">
                      {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} Generate link
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white border border-violet-200 rounded-xl px-3 py-2 font-mono text-xs text-gray-600 truncate">{inviteLink}</div>
                      <button onClick={() => { navigator.clipboard.writeText(`Join me on Convoxa! ${inviteLink}`); toast.success('Copied!') }}
                        className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-200">
                        <Copy size={14} /> Copy invite
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {['WhatsApp','Telegram','Email'].map(p => (
                    <button key={p} onClick={async () => {
                      if (!inviteLink) await loadInvite()
                      const msg = encodeURIComponent(`Join me on Convoxa! ${inviteLink}`)
                      const urls = { WhatsApp:`https://wa.me/?text=${msg}`, Telegram:`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}`, Email:`mailto:?subject=Join Convoxa&body=${msg}` }
                      window.open(urls[p],'_blank')
                    }} className="flex-1 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SECURITY */}
            {tab === 'security' && (
              <div className="space-y-4">
                <div><p className="font-black text-gray-900">Security</p><p className="text-sm text-gray-500 mt-0.5">Your privacy and safety features.</p></div>
                {[
                  { icon: '🔒', title: 'End-to-end encryption', desc: 'All messages are encrypted in transit. No one at Convoxa can read your messages.' },
                  { icon: '🛡️', title: 'Harsh language guard', desc: 'Convoxa warns you before sending messages that may sound aggressive or hurtful.' },
                  { icon: '✅', title: 'Email verification', desc: user?.email_verified ? 'Your email is verified.' : 'Your email is not yet verified. Check Settings → Profile.' },
                  { icon: '🔐', title: 'Secure token auth', desc: 'Your session uses JWT tokens with configurable expiry. Logging out invalidates your session.' },
                  { icon: '👁️', title: 'Read receipts', desc: 'Blue double ticks show when your message has been read.' },
                  { icon: '🚫', title: 'Account data', desc: 'You can delete your messages at any time. Contact support to delete your account.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div><p className="text-sm font-bold text-gray-900">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
