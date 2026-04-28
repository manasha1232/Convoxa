import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  return socket
}

export function initSocket(token) {
  if (socket) socket.disconnect()
  socket = io('/', {
    path: '/ws/socket.io',
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
