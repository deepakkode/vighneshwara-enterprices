// Scrap Service - Firebase operations for scrap transactions
import firebaseService from './firebase.js'
import { where, orderBy, limit } from 'firebase/firestore'

class ScrapService {
  constructor() {
    this.transactionsCollection = 'scrapTransactions'
  }

  // Scrap Transaction CRUD Operations
  async getScrapTransactions() {
    try {
      return await firebaseService.getDocuments(this.transactionsCollection, [
        orderBy('transactionDate', 'desc')
      ])
    } catch (error) {
      console.error('Error getting scrap transactions:', error)
      throw error
    }
  }

  async getScrapTransaction(transactionId) {
    try {
      return await firebaseService.getDocument(this.transactionsCollection, transactionId)
    } catch (error) {
      console.error('Error getting scrap transaction:', error)
      throw error
    }
  }

  async addScrapTransaction(transactionData) {
    try {
      const transaction = {
        transactionType: transactionData.transactionType, // 'PURCHASE' or 'SALE'
        scrapType: transactionData.scrapType, // 'IRON', 'STEEL', 'COPPER', 'ALUMINUM', 'OTHER'
        quantity: parseFloat(transactionData.quantity),
        unit: transactionData.unit, // 'KG', 'TON', 'PIECE'
        ratePerUnit: parseFloat(transactionData.ratePerUnit),
        totalAmount: parseFloat(transactionData.totalAmount),
        description: transactionData.description || '',
        transactionDate: firebaseService.createTimestamp(new Date(transactionData.transactionDate)),
        
        // Additional metadata
        clientTimestamp: transactionData.clientTimestamp || Date.now(),
        
        // Optional fields
        ...(transactionData.supplierName && { supplierName: transactionData.supplierName }),
        ...(transactionData.buyerName && { buyerName: transactionData.buyerName }),
        ...(transactionData.location && { location: transactionData.location })
      }
      
      return await firebaseService.addDocument(this.transactionsCollection, transaction)
    } catch (error) {
      console.error('Error adding scrap transaction:', error)
      throw error
    }
  }

  async updateScrapTransaction(transactionId, transactionData) {
    try {
      const updateData = {
        ...transactionData,
        quantity: parseFloat(transactionData.quantity),
        ratePerUnit: parseFloat(transactionData.ratePerUnit),
        totalAmount: parseFloat(transactionData.totalAmount),
        transactionDate: firebaseService.createTimestamp(new Date(transactionData.transactionDate))
      }
      
      return await firebaseService.updateDocument(this.transactionsCollection, transactionId, updateData)
    } catch (error) {
      console.error('Error updating scrap transaction:', error)
      throw error
    }
  }

  async deleteScrapTransaction(transactionId) {
    try {
      return await firebaseService.deleteDocument(this.transactionsCollection, transactionId)
    } catch (error) {
      console.error('Error deleting scrap transaction:', error)
      throw error
    }
  }

  // Real-time subscriptions
  subscribeToScrapTransactions(callback) {
    return firebaseService.subscribeToCollection(
      this.transactionsCollection, 
      callback,
      [orderBy('transactionDate', 'desc')]
    )
  }

  subscribeToScrapTransaction(transactionId, callback) {
    return firebaseService.subscribeToDocument(this.transactionsCollection, transactionId, callback)
  }

  // Analytics and calculations
  async getScrapAnalytics(days = 7) {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const transactions = await firebaseService.getDocuments(this.transactionsCollection, [
        where('transactionDate', '>=', firebaseService.createTimestamp(startDate)),
        where('transactionDate', '<=', firebaseService.createTimestamp(endDate)),
        orderBy('transactionDate', 'desc')
      ])
      
      const purchases = transactions.filter(t => t.transactionType === 'PURCHASE')
      const sales = transactions.filter(t => t.transactionType === 'SALE')
      
      const totalPurchases = purchases.reduce((sum, t) => sum + t.totalAmount, 0)
      const totalSales = sales.reduce((sum, t) => sum + t.totalAmount, 0)
      const profit = totalSales - totalPurchases
      
      // Calculate by scrap type
      const byScrapType = {}
      transactions.forEach(t => {
        if (!byScrapType[t.scrapType]) {
          byScrapType[t.scrapType] = {
            purchases: 0,
            sales: 0,
            quantity: 0,
            transactions: 0
          }
        }
        
        byScrapType[t.scrapType].transactions++
        byScrapType[t.scrapType].quantity += t.quantity
        
        if (t.transactionType === 'PURCHASE') {
          byScrapType[t.scrapType].purchases += t.totalAmount
        } else {
          byScrapType[t.scrapType].sales += t.totalAmount
        }
      })
      
      return {
        period: { startDate, endDate, days },
        transactions,
        totalPurchases,
        totalSales,
        profit,
        transactionCount: transactions.length,
        purchaseCount: purchases.length,
        saleCount: sales.length,
        byScrapType
      }
    } catch (error) {
      console.error('Error getting scrap analytics:', error)
      throw error
    }
  }

  async getScrapTypeAnalytics(scrapType, days = 7) {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const transactions = await firebaseService.getDocuments(this.transactionsCollection, [
        where('scrapType', '==', scrapType),
        where('transactionDate', '>=', firebaseService.createTimestamp(startDate)),
        where('transactionDate', '<=', firebaseService.createTimestamp(endDate)),
        orderBy('transactionDate', 'desc')
      ])
      
      const purchases = transactions.filter(t => t.transactionType === 'PURCHASE')
      const sales = transactions.filter(t => t.transactionType === 'SALE')
      
      const totalPurchases = purchases.reduce((sum, t) => sum + t.totalAmount, 0)
      const totalSales = sales.reduce((sum, t) => sum + t.totalAmount, 0)
      const totalQuantity = transactions.reduce((sum, t) => sum + t.quantity, 0)
      
      const averageRate = transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.ratePerUnit, 0) / transactions.length 
        : 0
      
      return {
        scrapType,
        period: { startDate, endDate, days },
        transactions,
        totalPurchases,
        totalSales,
        profit: totalSales - totalPurchases,
        totalQuantity,
        averageRate,
        transactionCount: transactions.length,
        purchaseCount: purchases.length,
        saleCount: sales.length
      }
    } catch (error) {
      console.error('Error getting scrap type analytics:', error)
      throw error
    }
  }

  // Dashboard summary data
  async getDashboardSummary() {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      // Get today's transactions
      const todayTransactions = await firebaseService.getDocuments(this.transactionsCollection, [
        where('transactionDate', '>=', firebaseService.createTimestamp(startOfDay)),
        where('transactionDate', '<', firebaseService.createTimestamp(endOfDay))
      ])
      
      const purchases = todayTransactions.filter(t => t.transactionType === 'PURCHASE')
      const sales = todayTransactions.filter(t => t.transactionType === 'SALE')
      
      const totalPurchases = purchases.reduce((sum, t) => sum + t.totalAmount, 0)
      const totalSales = sales.reduce((sum, t) => sum + t.totalAmount, 0)
      
      return {
        scrapTrading: totalSales - totalPurchases,
        todayTransactions: todayTransactions.length,
        todayPurchases: purchases.length,
        todaySales: sales.length,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error getting scrap dashboard summary:', error)
      throw error
    }
  }

  // Get recent transactions for dashboard
  async getRecentTransactions(limitCount = 10) {
    try {
      return await firebaseService.getDocuments(this.transactionsCollection, [
        orderBy('transactionDate', 'desc'),
        limit(limitCount)
      ])
    } catch (error) {
      console.error('Error getting recent scrap transactions:', error)
      throw error
    }
  }

  // Get inventory summary (current stock levels)
  async getInventorySummary() {
    try {
      const transactions = await firebaseService.getDocuments(this.transactionsCollection)
      
      const inventory = {}
      
      transactions.forEach(t => {
        if (!inventory[t.scrapType]) {
          inventory[t.scrapType] = {
            scrapType: t.scrapType,
            totalPurchased: 0,
            totalSold: 0,
            currentStock: 0,
            totalValue: 0,
            averageRate: 0,
            transactionCount: 0
          }
        }
        
        const item = inventory[t.scrapType]
        item.transactionCount++
        
        if (t.transactionType === 'PURCHASE') {
          item.totalPurchased += t.quantity
          item.currentStock += t.quantity
          item.totalValue += t.totalAmount
        } else {
          item.totalSold += t.quantity
          item.currentStock -= t.quantity
          item.totalValue -= t.totalAmount
        }
        
        // Calculate average rate
        item.averageRate = item.totalValue / Math.max(item.currentStock, 1)
      })
      
      return Object.values(inventory)
    } catch (error) {
      console.error('Error getting inventory summary:', error)
      throw error
    }
  }

  // Cleanup subscriptions
  unsubscribe(listenerId) {
    firebaseService.unsubscribe(listenerId)
  }
}

// Create singleton instance
const scrapService = new ScrapService()

export default scrapService