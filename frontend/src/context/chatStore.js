import { create } from 'zustand'
import api from '../utils/api'

export const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},

  fetchRooms: async () => {
    const { data } = await api.get('/rooms/')
    set({ rooms: data })
  },

  setActiveRoom: (room) => set({ activeRoom: room }),

  upsertRoom: (room) => {
    set(s => {
      const exists = s.rooms.find(r => r.id === room.id)
      return { rooms: exists ? s.rooms.map(r => r.id === room.id ? { ...r, ...room } : r) : [room, ...s.rooms] }
    })
  },

  fetchMessages: async (roomId) => {
    const { data } = await api.get(`/rooms/${roomId}/messages`)
    set(s => ({ messages: { ...s.messages, [roomId]: data } }))
  },

  // Optimistic: show message instantly before server confirms
  addOptimisticMessage: (msg) => {
    set(s => {
      const current = s.messages[msg.room_id] || []
      // Don't add duplicate temp messages
      if (current.find(m => m.id === msg.id)) return s
      return { messages: { ...s.messages, [msg.room_id]: [...current, msg] } }
    })
  },

  // Called when socket sends message:new — replaces optimistic or appends new
  appendMessage: (msg) => {
    set(s => {
      const current = s.messages[msg.room_id] || []
      // Remove any temp_ messages from same sender with same content (optimistic)
      const filtered = current.filter(m => {
        if (!m.id?.startsWith('temp_')) return true
        return !(m.sender_id === msg.sender_id && m.content === msg.content)
      })
      // Also avoid exact id duplicate
      const deduped = filtered.filter(m => m.id !== msg.id)
      const updated = [...deduped, msg]

      const rooms = s.rooms.map(r =>
        r.id === msg.room_id
          ? { ...r, last_message: { content: msg.content, sender_id: msg.sender_id, created_at: msg.created_at, message_type: msg.message_type } }
          : r
      ).sort((a, b) => (b.last_message?.created_at || '').localeCompare(a.last_message?.created_at || ''))

      return { messages: { ...s.messages, [msg.room_id]: updated }, rooms }
    })
  },

  deleteMessage: async (roomId, messageId) => {
    set(s => ({ messages: { ...s.messages, [roomId]: (s.messages[roomId] || []).filter(m => m.id !== messageId) } }))
    try { await api.delete(`/rooms/${roomId}/messages/${messageId}`) } catch { /* ignore */ }
  },

  setOnlineUsers: (ids) => set({ onlineUsers: ids }),
  setUserOnline: (id) => set(s => ({ onlineUsers: [...new Set([...s.onlineUsers, id])] })),
  setUserOffline: (id) => set(s => ({ onlineUsers: s.onlineUsers.filter(u => u !== id) })),

  setTyping: (roomId, user) => {
    set(s => {
      const prev = s.typingUsers[roomId] || []
      return { typingUsers: { ...s.typingUsers, [roomId]: prev.find(u => u.user_id === user.user_id) ? prev : [...prev, user] } }
    })
  },
  clearTyping: (roomId, userId) => {
    set(s => ({ typingUsers: { ...s.typingUsers, [roomId]: (s.typingUsers[roomId] || []).filter(u => u.user_id !== userId) } }))
  },

  markRead: (roomId, userId) => {
    set(s => ({
      messages: { ...s.messages, [roomId]: (s.messages[roomId] || []).map(m => m.read_by?.includes(userId) ? m : { ...m, read_by: [...(m.read_by || []), userId] }) },
      rooms: s.rooms.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r),
    }))
  },
}))
