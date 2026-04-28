import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../../context/chatStore'
import { useAuthStore } from '../../context/authStore'
import { getSocket } from '../../utils/socket'
import api from '../../utils/api'
import { formatDistanceToNow } from 'date-fns'
import { Search, Plus, LogOut, Users, Check, CheckCheck, Settings, X, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsModal from '../settings/SettingsModal'

function Avatar({ name, src, online, size = 'md' }) {
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'
  const colors = ['bg-violet-500','bg-sky-500','bg-amber-500','bg-rose-500','bg-teal-500','bg-indigo-500','bg-fuchsia-500','bg-lime-600']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className="relative flex-shrink-0">
      {src
        ? <img src={src} alt={name} className={`${sz} rounded-full object-cover ring-2 ring-white`} />
        : <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold`}>
            {name?.[0]?.toUpperCase()}
          </div>
      }
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-gray-300'}`} />
      )}
    </div>
  )
}

function ReadTick({ msg, userId }) {
  if (msg?.sender_id !== userId) return null
  const read = msg.read_by?.some(id => id !== userId)
  return read
    ? <CheckCheck size={13} className="text-sky-400 flex-shrink-0" />
    : <Check size={13} className="text-gray-300 flex-shrink-0" />
}

// Format last seen properly
function formatLastSeen(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    return formatDistanceToNow(date, { addSuffix: true })
  } catch { return '' }
}

export default function Sidebar({ onSelectRoom, darkMode, onToggleDark }) {
  const { rooms, fetchRooms, activeRoom, setActiveRoom, upsertRoom, onlineUsers } = useChatStore()
  const { user, logout } = useAuthStore()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([])
  const searchTimer = useRef(null)

  useEffect(() => { fetchRooms() }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!search.trim()) { setSearchResults([]); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/users/search', { params: { q: search } })
        setSearchResults(data)
      } catch { /* ignore */ }
      finally { setSearching(false) }
    }, 300)
  }, [search])

  const openDM = async (targetUser) => {
    try {
      const { data: room } = await api.post('/rooms/', { members: [targetUser.id], is_group: false })
      upsertRoom(room)
      setActiveRoom(room)
      getSocket()?.emit('room:join', { room_id: room.id })
      setSearch(''); setSearchResults([]); setShowNew(false)
      onSelectRoom?.(room)
    } catch { toast.error('Could not open chat') }
  }

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return }
    if (groupMembers.length < 1) { toast.error('Add at least one member'); return }
    try {
      const { data: room } = await api.post('/rooms/', {
        name: groupName, members: groupMembers.map(m => m.id), is_group: true,
      })
      upsertRoom(room); setActiveRoom(room)
      getSocket()?.emit('room:join', { room_id: room.id })
      setGroupName(''); setGroupMembers([]); setShowGroupModal(false)
      onSelectRoom?.(room)
      toast.success('Group created!')
    } catch { toast.error('Could not create group') }
  }

  const selectRoom = (room) => {
    setActiveRoom(room)
    const socket = getSocket()
    if (activeRoom) socket?.emit('room:leave', { room_id: activeRoom.id })
    socket?.emit('room:join', { room_id: room.id })
    socket?.emit('message:read', { room_id: room.id })
    onSelectRoom?.(room)
  }

  const filteredRooms = search && !showNew
    ? rooms.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()))
    : rooms

  return (
    <>
      <aside className="w-full md:w-80 lg:w-[340px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            {/* Convoxa brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200">
                <span className="text-white text-lg font-black leading-none">C</span>
              </div>
              <div>
                <span className="font-black text-gray-900 text-lg tracking-tight">Convoxa</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowNew(v => !v)} title="New chat"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${showNew ? 'bg-violet-100 text-violet-600' : 'hover:bg-gray-100 text-gray-500 hover:text-violet-600'}`}>
                <Plus size={18} />
              </button>
              <button onClick={() => setShowSettings(true)} title="Settings"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-violet-600 transition">
                <Settings size={17} />
              </button>
              <button onClick={logout} title="Sign out"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition">
                <LogOut size={17} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={showNew ? 'Search people…' : 'Search Convoxa…'}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition border border-gray-100"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Me card — click to open settings */}
        <button onClick={() => setShowSettings(true)}
          className="px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100 flex items-center gap-3 hover:from-violet-100 hover:to-fuchsia-100 transition text-left">
          <Avatar name={user?.full_name} src={user?.avatar} online={true} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
              {!user?.email_verified && <span className="w-2 h-2 bg-amber-400 rounded-full" title="Email not verified" />}
            </div>
            <p className="text-xs text-violet-500 font-medium">@{user?.username}</p>
          </div>
          <Settings size={14} className="text-violet-300 flex-shrink-0" />
        </button>

        {/* New chat panel */}
        {showNew && (
          <div className="border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">New conversation</p>
              <button onClick={() => setShowGroupModal(true)}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-bold">
                <Hash size={12} /> New Group
              </button>
            </div>
            {searching && <p className="px-4 py-2 text-xs text-gray-400">Searching…</p>}
            {!search && <p className="px-4 py-2 text-xs text-gray-400">Type a name to search for people</p>}
            {!searching && searchResults.length === 0 && search && (
              <p className="px-4 py-2 text-xs text-gray-400">No users found for "{search}"</p>
            )}
            {searchResults.map(u => (
              <button key={u.id} onClick={() => openDM(u)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white transition text-left">
                <Avatar name={u.full_name} src={u.avatar} online={onlineUsers.includes(u.id)} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                {onlineUsers.includes(u.id) && <span className="text-[11px] text-emerald-500 font-bold">● Online</span>}
              </button>
            ))}
          </div>
        )}

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
              <Users size={36} className="mb-3 text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-300 mt-1">Tap + to start chatting</p>
            </div>
          )}
          {filteredRooms.map(room => {
            const isActive = activeRoom?.id === room.id
            const otherMemberId = !room.is_group && room.members?.find(m => m !== user?.id)
            const isOnline = !room.is_group && otherMemberId && onlineUsers.includes(otherMemberId)
            const lastMsg = room.last_message
            const timeStr = lastMsg?.created_at ? formatLastSeen(lastMsg.created_at) : ''

            return (
              <button key={room.id} onClick={() => selectRoom(room)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 transition text-left border-b border-gray-50/80 ${
                  isActive
                    ? 'bg-violet-50 border-l-[3px] border-l-violet-600'
                    : 'hover:bg-gray-50/80 border-l-[3px] border-l-transparent'
                }`}>
                <Avatar name={room.name} src={room.avatar} online={isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm truncate ${isActive ? 'font-black text-violet-900' : 'font-bold text-gray-900'}`}>
                      {room.name}
                    </p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2 font-medium">{timeStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {lastMsg?.sender_id === user?.id && <ReadTick msg={lastMsg} userId={user.id} />}
                    <p className={`text-xs truncate flex-1 ${room.unread_count > 0 ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                      {lastMsg ? (lastMsg.message_type === 'image' ? '📷 Image' : lastMsg.content) : 'Start a conversation'}
                    </p>
                    {room.unread_count > 0 && (
                      <span className="min-w-[20px] h-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-white text-[11px] flex items-center justify-center font-bold flex-shrink-0 px-1.5">
                        {room.unread_count > 99 ? '99+' : room.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Group modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 text-lg">Create Group</h3>
              <button onClick={() => setShowGroupModal(false)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <input value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="Group name…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search and add members…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>

              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-violet-100 text-violet-700 rounded-full px-3 py-1 text-xs font-semibold">
                      {m.full_name}
                      <button onClick={() => setGroupMembers(p => p.filter(x => x.id !== m.id))}><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.filter(u => !groupMembers.find(m => m.id === u.id)).map(u => (
                <button key={u.id} onClick={() => setGroupMembers(p => [...p, u])}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition">
                  <Avatar name={u.full_name} src={u.avatar} size="sm" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                  <Plus size={14} className="text-violet-500" />
                </button>
              ))}

              <button onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 shadow-md shadow-violet-200">
                Create group ({groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} darkMode={darkMode} onToggleDark={onToggleDark} />
      )}
    </>
  )
}
