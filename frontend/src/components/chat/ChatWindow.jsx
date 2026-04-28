import { useState, useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../../context/chatStore'
import { useAuthStore } from '../../context/authStore'
import { getSocket } from '../../utils/socket'
import api from '../../utils/api'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Send, Image, X, CheckCheck, Check, Smile, MoreVertical,
  Trash2, Copy, Phone, Video, Info, ArrowLeft, Plus,
  AlertTriangle, Shield, User, Clock, Hash
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Harsh language detection ──────────────────────────────────────────────────
const HARSH_WORDS = [
  'hate','stupid','idiot','dumb','shut up','moron','loser','ugly','worthless',
  'kill','die','trash','garbage','pathetic','disgusting','horrible','terrible',
  'awful','worst','jerk','ass','damn','hell','crap','shit','fuck','bitch',
]
function detectHarsh(text) {
  const lower = text.toLowerCase()
  return HARSH_WORDS.some(w => lower.includes(w))
}

// ── Quick-reactions strip (❤ + ... ) ─────────────────────────────────────────
const QUICK_REACTIONS = ['❤️','👍','😂','😮','😢']
const ALL_EMOJI = ['❤️','👍','😂','😮','😢','🙏','🔥','🎉','✅','👏','😍','🤔','😎','🥳','💯','🚀','👀','💪','🫂','✨']

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, src, size = 'sm', online }) {
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs'
  const colors = ['bg-violet-500','bg-sky-500','bg-amber-500','bg-rose-500','bg-teal-500','bg-indigo-500','bg-fuchsia-500','bg-lime-600']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className="relative flex-shrink-0">
      {src
        ? <img src={src} className={`${sz} rounded-full object-cover ring-2 ring-white`} alt={name} />
        : <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold`}>{name?.[0]?.toUpperCase()}</div>
      }
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-gray-300'}`} />
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0,1,2].map(i => (
        <span key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}
    </div>
  )
}

// ── Harsh language confirmation modal ────────────────────────────────────────
function HarshModal({ message, onSend, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">This may sound harsh</h3>
        <p className="text-gray-500 text-sm mb-1">Your message contains language that might come across as aggressive or hurtful.</p>
        <div className="bg-gray-50 rounded-xl px-4 py-3 my-4 text-sm text-gray-700 text-left italic border border-gray-100 line-clamp-3">
          "{message}"
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Edit message
          </button>
          <button onClick={onSend} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition">
            Send anyway
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Profile panel (click avatar/name in header) ───────────────────────────────
function ProfilePanel({ room, onlineUsers, onClose }) {
  const otherMemberId = !room.is_group && room.members?.find(m => m !== room._currentUserId)
  const isOnline = otherMemberId && onlineUsers.includes(otherMemberId)
  const colors = ['bg-violet-500','bg-sky-500','bg-amber-500','bg-rose-500','bg-teal-500','bg-indigo-500']
  const color = colors[(room.name?.charCodeAt(0) || 0) % colors.length]

  return (
    <div className="w-72 border-l border-gray-100 bg-white flex-shrink-0 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">{room.is_group ? 'Group Info' : 'Profile'}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
          <X size={16} />
        </button>
      </div>

      {/* Avatar + status */}
      <div className="flex flex-col items-center pt-8 pb-6 px-5 bg-gradient-to-b from-violet-50 to-white">
        <div className="relative mb-3">
          {room.avatar
            ? <img src={room.avatar} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white shadow-lg" alt="" />
            : <div className={`w-24 h-24 ${color} rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-lg`}>
                {room.name?.[0]?.toUpperCase()}
              </div>
          }
          {!room.is_group && (
            <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          )}
        </div>
        <p className="font-bold text-gray-900 text-lg">{room.name}</p>
        {!room.is_group && (
          <p className={`text-xs font-medium mt-1 ${isOnline ? 'text-emerald-500' : 'text-gray-400'}`}>
            {isOnline ? '● Online' : '○ Offline'}
          </p>
        )}
        {room.is_group && (
          <p className="text-xs text-gray-400 mt-1">{room.members?.length} members</p>
        )}
      </div>

      {/* Actions */}
      {!room.is_group && (
        <div className="flex justify-center gap-6 px-5 py-4 border-b border-gray-100">
          <button className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Phone size={18} className="text-violet-600" />
            </div>
            <span className="text-[10px] text-gray-500 font-medium">Voice</span>
          </button>
          <button className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Video size={18} className="text-violet-600" />
            </div>
            <span className="text-[10px] text-gray-500 font-medium">Video</span>
          </button>
        </div>
      )}

      {/* Info rows */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <Hash size={15} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Type</p>
            <p className="text-sm text-gray-700 font-medium">{room.is_group ? 'Group chat' : 'Direct message'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <Shield size={15} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Security</p>
            <p className="text-sm text-gray-700 font-medium">End-to-end encrypted</p>
          </div>
        </div>
        {!room.is_group && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Clock size={15} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Last seen</p>
              <p className="text-sm text-gray-700 font-medium">{isOnline ? 'Active now' : 'Recently'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar, showName, isGroup, onDelete, onCopy, currentUserId, onReact, onAvatarClick }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showAllEmoji, setShowAllEmoji] = useState(false)
  const menuRef = useRef(null)
  const isRead = msg.read_by?.some(id => id !== currentUserId)
  const isPending = msg.id?.startsWith?.('temp_')
  const reactions = msg.reactions || {}

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) { setShowMenu(false); setShowAllEmoji(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const myReaction = Object.entries(reactions).find(([, users]) => users.includes(currentUserId))?.[0]

  return (
    <div className={`group flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} mb-0.5`}>
      {!isMine && (
        showAvatar
          ? <button onClick={() => onAvatarClick?.(msg.sender)} className="flex-shrink-0">
              <Avatar name={msg.sender?.full_name} src={msg.sender?.avatar} />
            </button>
          : <div className="w-7 flex-shrink-0" />
      )}

      <div className="relative max-w-[70%] lg:max-w-[58%]" ref={menuRef}>
        {!isMine && isGroup && showName && (
          <p className="text-[11px] font-bold text-violet-500 mb-1 ml-1">{msg.sender?.full_name}</p>
        )}

        <div className={`relative px-4 py-2.5 ${isMine
          ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl rounded-br-sm shadow-md shadow-violet-200'
          : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100'
        }`}>
          {msg.message_type === 'image' && msg.media_url
            ? <img src={msg.media_url} alt="shared" className="rounded-xl max-w-full max-h-72 object-cover" />
            : <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          }
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-violet-200' : 'text-gray-400'}`}>
              {format(new Date(msg.created_at), 'h:mm a')}
            </span>
            {isMine && !isPending && (isRead
              ? <CheckCheck size={12} className="text-sky-300" />
              : <Check size={12} className="text-violet-300" />
            )}
            {isPending && <span className="text-[10px] text-violet-300">⏳</span>}
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs shadow-sm border transition ${
                  users.includes(currentUserId) ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                {emoji} <span className="font-medium">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover actions */}
        <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? 'right-full mr-2' : 'left-full ml-2'} hidden group-hover:flex items-center gap-1 z-10`}>
          {/* Quick reactions */}
          {QUICK_REACTIONS.map(e => (
            <button key={e} onClick={() => onReact(msg.id, e)}
              className={`w-7 h-7 text-sm rounded-full flex items-center justify-center transition hover:scale-125 ${myReaction === e ? 'bg-violet-100' : 'bg-white border border-gray-200 shadow-sm hover:bg-gray-50'}`}>
              {e}
            </button>
          ))}
          {/* More reactions */}
          <button onClick={() => setShowAllEmoji(v => !v)}
            className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-violet-600 shadow-sm">
            <Plus size={12} />
          </button>
          {/* More options */}
          <button onClick={() => setShowMenu(v => !v)}
            className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-violet-600 shadow-sm">
            <MoreVertical size={12} />
          </button>
        </div>

        {/* All emoji picker */}
        {showAllEmoji && (
          <div className={`absolute bottom-full mb-2 ${isMine ? 'right-0' : 'left-0'} bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-20`}>
            <div className="grid grid-cols-8 gap-0.5">
              {ALL_EMOJI.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setShowAllEmoji(false) }}
                  className="w-8 h-8 text-lg hover:bg-violet-50 rounded-lg flex items-center justify-center hover:scale-110 transition">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Context menu */}
        {showMenu && (
          <div className={`absolute bottom-full mb-2 ${isMine ? 'right-0' : 'left-0'} bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden min-w-[150px]`}>
            <button onClick={() => { onCopy(msg.content); setShowMenu(false) }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
              <Copy size={14} className="text-gray-400" /> Copy text
            </button>
            {isMine && (
              <button onClick={() => { onDelete(msg.id); setShowMenu(false) }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 border-t border-gray-100">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ChatWindow ────────────────────────────────────────────────────────────
export default function ChatWindow({ onBack }) {
  const { activeRoom, messages, fetchMessages, typingUsers, addOptimisticMessage, deleteMessage, onlineUsers } = useChatStore()
  const { user } = useAuthStore()
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const [harshPending, setHarshPending] = useState(null)
  const [profileView, setProfileView] = useState(null) // {full_name, avatar} of clicked sender
  const [msgReactions, setMsgReactions] = useState({}) // { [msgId]: { emoji: [userId] } }
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)

  const roomId = activeRoom?.id
  const roomMessages = messages[roomId] || []
  const typists = (typingUsers[roomId] || []).filter(u => u.user_id !== user?.id)

  // ── Fix: listen to socket message:new and join room on mount ──────────────
  useEffect(() => {
    if (!roomId) return
    fetchMessages(roomId)
    const socket = getSocket()
    socket?.emit('room:join', { room_id: roomId })
    // Mark read
    socket?.emit('message:read', { room_id: roomId })
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages.length, typists.length])

  const emitTyping = useCallback(() => {
    const socket = getSocket()
    if (!roomId) return
    socket?.emit('message:typing', { room_id: roomId })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socket?.emit('message:stop_typing', { room_id: roomId }), 2000)
  }, [roomId])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [text])

  const doSend = (content) => {
    const socket = getSocket()
    if (!socket) { toast.error('Not connected'); return }

    const tempId = `temp_${Date.now()}`
    addOptimisticMessage({
      id: tempId, room_id: roomId, sender_id: user?.id,
      sender: { id: user?.id, full_name: user?.full_name, avatar: user?.avatar },
      content, message_type: 'text', media_url: null,
      read_by: [user?.id], created_at: new Date().toISOString(), edited: false,
    })
    socket.emit('message:send', { room_id: roomId, content })
    socket.emit('message:stop_typing', { room_id: roomId })
    setText('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const sendMessage = async () => {
    if (imageFile) {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', imageFile)
        const { data } = await api.post('/media/upload', form)
        const socket = getSocket()
        socket?.emit('message:send', { room_id: roomId, content: '', message_type: 'image', media_url: data.url })
        setImageFile(null); setImagePreview(null)
      } catch { toast.error('Upload failed') }
      finally { setUploading(false) }
      return
    }
    const content = text.trim()
    if (!content) return
    if (detectHarsh(content)) { setHarshPending(content); return }
    doSend(content)
  }

  const handleReact = (msgId, emoji) => {
    setMsgReactions(prev => {
      const existing = prev[msgId] || {}
      const users = existing[emoji] || []
      const already = users.includes(user?.id)
      return {
        ...prev,
        [msgId]: {
          ...existing,
          [emoji]: already ? users.filter(u => u !== user?.id) : [...users, user?.id]
        }
      }
    })
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const handleFile = e => { const f = e.target.files[0]; if (!f) return; setImageFile(f); setImagePreview(URL.createObjectURL(f)); e.target.value = '' }
  const cancelImage = () => { setImageFile(null); setImagePreview(null) }
  const handleCopy = t => navigator.clipboard.writeText(t).then(() => toast.success('Copied!'))
  const handleDelete = id => { if (!id.startsWith('temp_')) deleteMessage(roomId, id) }

  const isOnline = !activeRoom?.is_group && activeRoom?.members?.some(m => m !== user?.id && onlineUsers?.includes?.(m))

  // Merge server reactions with local optimistic ones
  const getReactions = (msg) => {
    const local = msgReactions[msg.id] || {}
    const server = msg.reactions || {}
    const merged = { ...server }
    Object.entries(local).forEach(([emoji, users]) => { merged[emoji] = users })
    return merged
  }

  if (!activeRoom) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/20 to-white text-center px-8">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mb-6 shadow-2xl shadow-violet-200">
          <span className="text-5xl">💬</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Welcome to Convoxa</h2>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">Your conversations, elevated. Select a chat or start something new.</p>
        <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-full">
          <Shield size={13} className="text-violet-500" />
          <span className="text-xs text-violet-600 font-medium">End-to-end encrypted</span>
        </div>
      </div>
    )
  }

  const grouped = {}
  roomMessages.forEach(m => {
    const day = format(new Date(m.created_at), 'MMM d, yyyy')
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(m)
  })

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-w-0 h-full">
      {/* Harsh language modal */}
      {harshPending && (
        <HarshModal
          message={harshPending}
          onSend={() => { doSend(harshPending); setHarshPending(null) }}
          onCancel={() => setHarshPending(null)}
        />
      )}

      {/* Profile/sender peek modal */}
      {profileView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setProfileView(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-72" onClick={e => e.stopPropagation()}>
            <button onClick={() => setProfileView(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <X size={16} className="text-gray-400" />
            </button>
            {profileView.avatar
              ? <img src={profileView.avatar} className="w-24 h-24 rounded-3xl mx-auto mb-4 ring-4 ring-violet-100 shadow-lg object-cover" alt="" />
              : <div className="w-24 h-24 bg-violet-600 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {profileView.full_name?.[0]?.toUpperCase()}
                </div>
            }
            <p className="font-bold text-gray-900 text-xl">{profileView.full_name}</p>
            <p className="text-xs text-gray-400 mt-1">Convoxa member</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 lg:px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shadow-sm flex-shrink-0">
        <button onClick={onBack} className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>

        {/* Clickable avatar/name → opens profile panel */}
        <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="relative flex-shrink-0">
            {activeRoom.avatar
              ? <img src={activeRoom.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
              : <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                  {activeRoom.name?.[0]?.toUpperCase()}
                </div>
            }
            {!activeRoom.is_group && (
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm lg:text-base truncate">{activeRoom.name}</p>
            <p className="text-xs truncate">
              {typists.length > 0
                ? <span className="text-violet-500 font-medium animate-pulse">{typists[0].full_name.split(' ')[0]} is typing…</span>
                : !activeRoom.is_group
                  ? <span className={isOnline ? 'text-emerald-500 font-medium' : 'text-gray-400'}>
                      {isOnline ? '● Active now' : '○ Offline'}
                    </span>
                  : <span className="text-gray-400">{activeRoom.members.length} members</span>
              }
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="w-9 h-9 rounded-full hover:bg-violet-50 flex items-center justify-center text-gray-400 hover:text-violet-600 transition" title="Voice call (coming soon)">
            <Phone size={18} />
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-violet-50 flex items-center justify-center text-gray-400 hover:text-violet-600 transition" title="Video call (coming soon)">
            <Video size={18} />
          </button>
          <button onClick={() => setShowInfo(v => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${showInfo ? 'bg-violet-100 text-violet-600' : 'hover:bg-violet-50 text-gray-400 hover:text-violet-600'}`}>
            <Info size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-4 space-y-0.5">
          {Object.entries(grouped).map(([day, msgs]) => (
            <div key={day}>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] text-gray-400 font-semibold bg-slate-50 px-3 py-0.5 rounded-full border border-gray-200">{day}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {msgs.map((msg, i) => {
                const isMine = msg.sender_id === user?.id
                const showAvatar = !isMine && (i === 0 || msgs[i-1]?.sender_id !== msg.sender_id)
                const showName = i === 0 || msgs[i-1]?.sender_id !== msg.sender_id
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={{ ...msg, reactions: getReactions(msg) }}
                    isMine={isMine}
                    showAvatar={showAvatar}
                    showName={showName}
                    isGroup={activeRoom.is_group}
                    currentUserId={user?.id}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onReact={handleReact}
                    onAvatarClick={setProfileView}
                  />
                )
              })}
            </div>
          ))}
          {typists.length > 0 && (
            <div className="flex items-end gap-2">
              <Avatar name={typists[0].full_name} size="sm" />
              <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-100"><TypingDots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Profile/info panel */}
        {showInfo && (
          <ProfilePanel
            room={{ ...activeRoom, _currentUserId: user?.id }}
            onlineUsers={onlineUsers || []}
            onClose={() => setShowInfo(false)}
          />
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 lg:px-6 pb-2 bg-white flex-shrink-0">
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="h-24 rounded-xl object-cover border border-gray-200 shadow-sm" />
            <button onClick={cancelImage} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 lg:px-5 py-3 bg-white border-t border-gray-100 flex items-end gap-2 flex-shrink-0">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center text-gray-400 transition flex-shrink-0">
          <Image size={18} />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); emitTyping() }}
          onKeyDown={handleKey}
          placeholder="Message… (Enter to send)"
          className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 transition leading-relaxed"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />
        <button onClick={sendMessage}
          disabled={(!text.trim() && !imageFile) || uploading}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:opacity-90 flex items-center justify-center text-white transition disabled:opacity-40 flex-shrink-0 shadow-md shadow-violet-200">
          {uploading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send size={16} />
          }
        </button>
      </div>
    </div>
  )
}
