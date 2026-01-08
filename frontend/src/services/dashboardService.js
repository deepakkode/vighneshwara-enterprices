// Dashboard Service - Combines data from all Firebase services for dashboard analytics
import firebaseService from './firebase.js'
import vehicleService from './vehicleService.js'
import scrapService from './scrapService.js'
import { where, orderBy, limit } from 'firebase/firestore'

class DashboardService {
  constructor() {
    this.dailySummariesCollection = 'dailySummaries'
  }

  // Get comprehensive dashboard data
  async getDashboardData() {
    try {
      console.log('🔄 Loading dashboard data from Firebase...')
      
      // Get data from all services in parallel
      const [vehicleSummary, scrapSummary] = await Promise.all([
        vehicleService.getDashboardSummary(),
        scrapService.getDashboardSummary()
      ])
      
      const totalProfit = vehicleSummary.vehicleEarnings + scrapSummary.scrapTrading
      
      const dashboardData = {
        totalProfit,
        vehicleEarnings: vehicleSummary.vehicleEarnings,
        scrapTrading: scrapSummary.scrapTrading,
        billsGenerated: 0, // Will be implemented when bill service is added
        lastUpdated: new Date(),
        
        // Additional metrics
        todayTransactions: vehicleSummary.todayTransactions + scrapSummary.todayTransactions,
        
        // Trends (will be calculated from historical data)
        trends: {
          totalProfitTrend: 0,
          vehicleProfitTrend: 0,
          scrapProfitTrend: 0
        }
      }
      
      console.log('✅ Dashboard data loaded:', dashboardData)
      return dashboardData
    } catch (error) {
      console.error('❌ Error getting dashboard data:', error)
      throw error
    }
  }

  // Get weekly summary data
  async getWeeklySummary() {
    try {
      console.log('🔄 Loading weekly summary from Firebase...')
      
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      
      // Get analytics from both services
      const [vehicleAnalytics, scrapAnalytics] = await Promise.all([
        this.getVehicleWeeklyAnalytics(7),
        scrapService.getScrapAnalytics(7)
      ])
      
      const weeklyData = {
        weeklyTotals: {
          totalBusinessProfit: vehicleAnalytics.totalProfit + scrapAnalytics.profit,
          totalVehicleProfit: vehicleAnalytics.totalProfit,
          scrapProfit: scrapAnalytics.profit,
          transactionCount: vehicleAnalytics.totalTransactions + scrapAnalytics.transactionCount
        },
        vehicleData: vehicleAnalytics,
        scrapData: scrapAnalytics,
        period: { startDate, endDate }
      }
      
      console.log('✅ Weekly summary loaded:', weeklyData)
      return weeklyData
    } catch (error) {
      console.error('❌ Error getting weekly summary:', error)
      throw error
    }
  }

  // Get vehicle analytics for dashboard
  async getVehicleWeeklyAnalytics(days = 7) {
    try {
      // Get analytics for both vehicle types
      const [lorryAnalytics, truckAnalytics] = await Promise.all([
        vehicleService.getVehicleTypeAnalytics('LORRY', days),
        vehicleService.getVehicleTypeAnalytics('TRUCK_AUTO', days)
      ])
      
      return {
        totalProfit: lorryAnalytics.profit + truckAnalytics.profit,
        totalIncome: lorryAnalytics.income + truckAnalytics.income,
        totalExpenses: lorryAnalytics.expenses + truckAnalytics.expenses,
        totalTransactions: lorryAnalytics.transactionCount + truckAnalytics.transactionCount,
        lorryData: lorryAnalytics,
        truckData: truckAnalytics
      }
    } catch (error) {
      console.error('Error getting vehicle weekly analytics:', error)
      throw error
    }
  }

  // Get profit trends for charts
  async getProfitTrends(days = 7) {
    try {
      console.log(`🔄 Loading profit trends for ${days} days...`)
      
      const endDate = new Date()
      const dates = Array.from({ length: days }, (_, i) => {
        const date = new Date(endDate)
        date.setDate(date.getDate() - (days - 1 - i))
        return date
      })
      
      // Get daily data for each date
      const dailyData = await Promise.all(
        dates.map(async (date) => {
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
          
          // Get vehicle transactions for this day
          const vehicleTransactions = await firebaseService.getDocuments('vehicleTransactions', [
            where('transactionDate', '>=', firebaseService.createTimestamp(startOfDay)),
            where('transactionDate', '<', firebaseService.createTimestamp(endOfDay))
          ])
          
          // Get scrap transactions for this day
          const scrapTransactions = await firebaseService.getDocuments('scrapTransactions', [
            where('transactionDate', '>=', firebaseService.createTimestamp(startOfDay)),
            where('transactionDate', '<', firebaseService.createTimestamp(endOfDay))
          ])
          
          // Calculate vehicle profit
          const vehicleIncome = vehicleTransactions
            .filter(t => t.transactionType === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0)
          const vehicleExpenses = vehicleTransactions
            .filter(t => t.transactionType === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0)
          const vehicleProfit = vehicleIncome - vehicleExpenses
          
          // Calculate scrap profit
          const scrapSales = scrapTransactions
            .filter(t => t.transactionType === 'SALE')
            .reduce((sum, t) => sum + t.totalAmount, 0)
          const scrapPurchases = scrapTransactions
            .filter(t => t.transactionType === 'PURCHASE')
            .reduce((sum, t) => sum + t.totalAmount, 0)
          const scrapProfit = scrapSales - scrapPurchases
          
          return {
            date: date.toISOString().split('T')[0],
            vehicleProfit,
            scrapProfit,
            totalProfit: vehicleProfit + scrapProfit,
            transactionCount: vehicleTransactions.length + scrapTransactions.length
          }
        })
      )
      
      // Format for Chart.js
      const chartData = {
        labels: dailyData.map(d => new Date(d.date).toLocaleDateString('en-IN', { 
          month: 'short', 
          day: 'numeric' 
        })),
        datasets: [
          {
            label: 'Total Profit',
            data: dailyData.map(d => d.totalProfit),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Vehicle Profit',
            data: dailyData.map(d => d.vehicleProfit),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            fill: false,
            tension: 0.4
          },
          {
            label: 'Scrap Profit',
            data: dailyData.map(d => d.scrapProfit),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            fill: false,
            tension: 0.4
          }
        ]
      }
      
      console.log('✅ Profit trends loaded:', chartData)
      return { chartData, dailyData }
    } catch (error) {
      console.error('❌ Error getting profit trends:', error)
      throw error
    }
  }

  // Store daily summary (for performance optimization)
  async storeDailySummary(date, summaryData) {
    try {
      const dateString = date.toISOString().split('T')[0]
      const docId = `summary_${dateString}`
      
      const summary = {
        date: firebaseService.createTimestamp(date),
        dateString,
        ...summaryData,
        calculatedAt: firebaseService.createTimestamp(new Date())
      }
      
      // Use set instead of add to overwrite existing summary
      await firebaseService.updateDocument(this.dailySummariesCollection, docId, summary)
      console.log(`✅ Daily summary stored for ${dateString}`)
      
      return summary
    } catch (error) {
      console.error('❌ Error storing daily summary:', error)
      throw error
    }
  }

  // Get stored daily summary
  async getDailySummary(date) {
    try {
      const dateString = date.toISOString().split('T')[0]
      const docId = `summary_${dateString}`
      
      return await firebaseService.getDocument(this.dailySummariesCollection, docId)
    } catch (error) {
      console.error('❌ Error getting daily summary:', error)
      return null
    }
  }

  // Real-time dashboard subscription
  subscribeToDashboardUpdates(callback) {
    // Subscribe to both vehicle and scrap transactions
    const vehicleListenerId = firebaseService.subscribeToCollection(
      'vehicleTransactions',
      () => {
        console.log('🔄 Vehicle transactions updated, refreshing dashboard...')
        this.getDashboardData().then(callback).catch(console.error)
      },
      [orderBy('transactionDate', 'desc'), limit(1)]
    )
    
    const scrapListenerId = firebaseService.subscribeToCollection(
      'scrapTransactions',
      () => {
        console.log('🔄 Scrap transactions updated, refreshing dashboard...')
        this.getDashboardData().then(callback).catch(console.error)
      },
      [orderBy('transactionDate', 'desc'), limit(1)]
    )
    
    // Return combined listener ID for cleanup
    return `dashboard_${vehicleListenerId}_${scrapListenerId}`
  }

  // Get recent activity for dashboard
  async getRecentActivity(limitCount = 10) {
    try {
      // Get recent transactions from both collections
      const [vehicleTransactions, scrapTransactions] = await Promise.all([
        firebaseService.getDocuments('vehicleTransactions', [
          orderBy('transactionDate', 'desc'),
          limit(limitCount)
        ]),
        firebaseService.getDocuments('scrapTransactions', [
          orderBy('transactionDate', 'desc'),
          limit(limitCount)
        ])
      ])
      
      // Combine and sort by date
      const allTransactions = [
        ...vehicleTransactions.map(t => ({ ...t, type: 'vehicle' })),
        ...scrapTransactions.map(t => ({ ...t, type: 'scrap' }))
      ].sort((a, b) => {
        const dateA = a.transactionDate?.toDate ? a.transactionDate.toDate() : new Date(a.transactionDate)
        const dateB = b.transactionDate?.toDate ? b.transactionDate.toDate() : new Date(b.transactionDate)
        return dateB - dateA
      }).slice(0, limitCount)
      
      return allTransactions
    } catch (error) {
      console.error('❌ Error getting recent activity:', error)
      throw error
    }
  }

  // Calculate trends by comparing with previous period
  async calculateTrends(currentData, days = 7) {
    try {
      // Get data for previous period
      const previousEndDate = new Date()
      previousEndDate.setDate(previousEndDate.getDate() - days)
      const previousStartDate = new Date(previousEndDate)
      previousStartDate.setDate(previousStartDate.getDate() - days)
      
      // Get previous period analytics
      const [prevVehicleAnalytics, prevScrapAnalytics] = await Promise.all([
        this.getVehicleAnalyticsForPeriod(previousStartDate, previousEndDate),
        this.getScrapAnalyticsForPeriod(previousStartDate, previousEndDate)
      ])
      
      const previousTotal = prevVehicleAnalytics.totalProfit + prevScrapAnalytics.profit
      const currentTotal = currentData.vehicleEarnings + currentData.scrapTrading
      
      const totalProfitTrend = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : 0
      
      const vehicleProfitTrend = prevVehicleAnalytics.totalProfit > 0
        ? ((currentData.vehicleEarnings - prevVehicleAnalytics.totalProfit) / prevVehicleAnalytics.totalProfit) * 100
        : 0
      
      const scrapProfitTrend = prevScrapAnalytics.profit > 0
        ? ((currentData.scrapTrading - prevScrapAnalytics.profit) / prevScrapAnalytics.profit) * 100
        : 0
      
      return {
        totalProfitTrend,
        vehicleProfitTrend,
        scrapProfitTrend
      }
    } catch (error) {
      console.error('❌ Error calculating trends:', error)
      return {
        totalProfitTrend: 0,
        vehicleProfitTrend: 0,
        scrapProfitTrend: 0
      }
    }
  }

  // Helper methods for trend calculations
  async getVehicleAnalyticsForPeriod(startDate, endDate) {
    try {
      const transactions = await firebaseService.getDocuments('vehicleTransactions', [
        where('transactionDate', '>=', firebaseService.createTimestamp(startDate)),
        where('transactionDate', '<=', firebaseService.createTimestamp(endDate))
      ])
      
      const income = transactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const expenses = transactions
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
      
      return {
        totalProfit: income - expenses,
        income,
        expenses,
        transactionCount: transactions.length
      }
    } catch (error) {
      console.error('Error getting vehicle analytics for period:', error)
      return { totalProfit: 0, income: 0, expenses: 0, transactionCount: 0 }
    }
  }

  async getScrapAnalyticsForPeriod(startDate, endDate) {
    try {
      const transactions = await firebaseService.getDocuments('scrapTransactions', [
        where('transactionDate', '>=', firebaseService.createTimestamp(startDate)),
        where('transactionDate', '<=', firebaseService.createTimestamp(endDate))
      ])
      
      const sales = transactions
        .filter(t => t.transactionType === 'SALE')
        .reduce((sum, t) => sum + t.totalAmount, 0)
      
      const purchases = transactions
        .filter(t => t.transactionType === 'PURCHASE')
        .reduce((sum, t) => sum + t.totalAmount, 0)
      
      return {
        profit: sales - purchases,
        sales,
        purchases,
        transactionCount: transactions.length
      }
    } catch (error) {
      console.error('Error getting scrap analytics for period:', error)
      return { profit: 0, sales: 0, purchases: 0, transactionCount: 0 }
    }
  }

  // Cleanup subscriptions
  unsubscribe(listenerId) {
    if (listenerId.startsWith('dashboard_')) {
      // Handle combined listener IDs
      const parts = listenerId.split('_')
      if (parts.length >= 3) {
        firebaseService.unsubscribe(parts[1])
        firebaseService.unsubscribe(parts[2])
      }
    } else {
      firebaseService.unsubscribe(listenerId)
    }
  }
}

// Create singleton instance
const dashboardService = new DashboardService()

export default dashboardService