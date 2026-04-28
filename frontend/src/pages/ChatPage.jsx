import { useState, useEffect } from 'react'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import { useSocket } from '../hooks/useSocket'
import { useChatStore } from '../context/chatStore'

export default function ChatPage() {
  useSocket()
  const { activeRoom, setActiveRoom } = useChatStore()
  const [showChat, setShowChat] = useState(false)

  // Dark mode: persisted in localStorage, applied to <html> element
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('convoxa_dark') === 'true')

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('convoxa_dark', 'true')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('convoxa_dark', 'false')
    }
  }, [darkMode])

  const handleSelectRoom = () => setShowChat(true)
  const handleBack = () => { setShowChat(false); setActiveRoom(null) }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${showChat && activeRoom ? 'hidden md:flex' : 'flex'} w-full md:w-auto md:flex-shrink-0`}>
        <Sidebar onSelectRoom={handleSelectRoom} darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} />
      </div>
      {/* Chat window */}
      <div className={`${showChat && activeRoom ? 'flex' : 'hidden md:flex'} flex-1 min-w-0`}>
        <ChatWindow onBack={handleBack} />
      </div>
    </div>
  )
}
