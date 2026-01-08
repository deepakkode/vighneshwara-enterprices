import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_ENDPOINTS } from '../config/api'

const useSocket = (serverUrl = API_ENDPOINTS.SOCKET_URL) => {
  const socketRef = useRef(null)

  useEffect(() => {
    console.log('🔌 Connecting to Socket.IO server:', serverUrl)
    
    // Create socket connection
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id)
      // Join dashboard room for real-time updates
      socket.emit('join-dashboard')
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [serverUrl])

  // Helper function to emit events
  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data)
    }
  }

  // Helper function to listen to events
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }

  // Helper function to remove event listeners
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    connected: socketRef.current?.connected || false
  }
}

export default useSocket