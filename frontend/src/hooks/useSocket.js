import { useEffect } from 'react'
import { getSocket } from '../utils/socket'
import { useChatStore } from '../context/chatStore'

export function useSocket() {
  const { appendMessage, setOnlineUsers, setUserOnline, setUserOffline, setTyping, clearTyping, markRead } = useChatStore()

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on('message:new',        appendMessage)
    socket.on('online_users',       setOnlineUsers)
    socket.on('user:online',        ({ user_id }) => setUserOnline(user_id))
    socket.on('user:offline',       ({ user_id }) => setUserOffline(user_id))
    socket.on('message:typing',     (d) => setTyping(d.room_id, { user_id: d.user_id, full_name: d.full_name }))
    socket.on('message:stop_typing',(d) => clearTyping(d.room_id, d.user_id))
    socket.on('message:read_ack',   (d) => markRead(d.room_id, d.user_id))

    return () => {
      socket.off('message:new')
      socket.off('online_users')
      socket.off('user:online')
      socket.off('user:offline')
      socket.off('message:typing')
      socket.off('message:stop_typing')
      socket.off('message:read_ack')
    }
  }, [])
}
