import { createContext, useContext, useEffect, useState } from 'react'
import useSocket from '../hooks/useSocket'
import toast from 'react-hot-toast'
import { API_ENDPOINTS } from '../config/api'

const SocketContext = createContext()

export const useSocketContext = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { socket, emit, on, off, connected } = useSocket()
  const [dashboardData, setDashboardData] = useState({
    totalProfit: 0,
    vehicleEarnings: 0,
    scrapTrading: 0,
    billsGenerated: 0,
    lastUpdated: null
  })

  useEffect(() => {
    if (!socket) return

    // Listen for transaction updates
    const handleTransactionCreated = (data) => {
      console.log('📊 New transaction created:', data)
      
      // Show notification
      if (data.type === 'vehicle') {
        toast.success(`New vehicle ${data.transaction.transactionType.toLowerCase()} recorded: ₹${data.transaction.amount}`)
      } else if (data.type === 'scrap') {
        toast.success(`New scrap ${data.transaction.transactionType.toLowerCase()} recorded: ₹${data.transaction.totalAmount}`)
      }

      // Trigger dashboard refresh
      refreshDashboardData()
    }

    const handleTransactionUpdated = (data) => {
      console.log('📝 Transaction updated:', data)
      toast.info('Transaction updated - dashboard refreshed')
      refreshDashboardData()
    }

    const handleTransactionDeleted = (data) => {
      console.log('🗑️ Transaction deleted:', data)
      toast.info('Transaction deleted - dashboard refreshed')
      refreshDashboardData()
    }

    const handleBillGenerated = (data) => {
      console.log('📄 New bill generated:', data)
      toast.success(`New ${data.billType} generated: ${data.billNumber}`)
      refreshDashboardData()
    }

    const handleDashboardRefresh = (data) => {
      console.log('🔄 Dashboard refresh requested:', data)
      refreshDashboardData()
    }

    // Register event listeners
    on('transaction-created', handleTransactionCreated)
    on('transaction-updated', handleTransactionUpdated)
    on('transaction-deleted', handleTransactionDeleted)
    on('bill-generated', handleBillGenerated)
    on('dashboard-refresh', handleDashboardRefresh)

    // Cleanup event listeners
    return () => {
      off('transaction-created', handleTransactionCreated)
      off('transaction-updated', handleTransactionUpdated)
      off('transaction-deleted', handleTransactionDeleted)
      off('bill-generated', handleBillGenerated)
      off('dashboard-refresh', handleDashboardRefresh)
    }
  }, [socket, on, off])

  // Function to refresh dashboard data
  const refreshDashboardData = async () => {
    try {
      // Fetch latest dashboard data from API
      const response = await fetch(API_ENDPOINTS.DASHBOARD_SUMMARY)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDashboardData({
            totalProfit: data.data.totalBusinessProfit || 0,
            vehicleEarnings: data.data.totalVehicleProfit || 0,
            scrapTrading: data.data.scrapProfit || 0,
            billsGenerated: data.data.billsGenerated || 0,
            lastUpdated: new Date()
          })
        }
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error)
    }
  }

  // Initial data load
  useEffect(() => {
    refreshDashboardData()
  }, [])

  const value = {
    socket,
    connected,
    dashboardData,
    refreshDashboardData,
    emit
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}