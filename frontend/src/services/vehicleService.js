// Vehicle Service - Firebase operations for vehicles and vehicle transactions
import firebaseService from './firebase.js'
import { where, orderBy, limit } from 'firebase/firestore'

class VehicleService {
  constructor() {
    this.vehiclesCollection = 'vehicles'
    this.transactionsCollection = 'vehicleTransactions'
  }

  // Vehicle CRUD Operations
  async getVehicles() {
    try {
      return await firebaseService.getDocuments(this.vehiclesCollection, [
        orderBy('vehicleNumber', 'asc')
      ])
    } catch (error) {
      console.error('Error getting vehicles:', error)
      throw error
    }
  }

  async getVehicle(vehicleId) {
    try {
      return await firebaseService.getDocument(this.vehiclesCollection, vehicleId)
    } catch (error) {
      console.error('Error getting vehicle:', error)
      throw error
    }
  }

  async addVehicle(vehicleData) {
    try {
      const vehicle = {
        vehicleNumber: vehicleData.vehicleNumber,
        vehicleType: vehicleData.vehicleType, // 'LORRY' or 'TRUCK_AUTO'
        status: vehicleData.status || 'ACTIVE',
        description: vehicleData.description || '',
        // Additional fields can be added here
      }
      return await firebaseService.addDocument(this.vehiclesCollection, vehicle)
    } catch (error) {
      console.error('Error adding vehicle:', error)
      throw error
    }
  }

  async updateVehicle(vehicleId, vehicleData) {
    try {
      return await firebaseService.updateDocument(this.vehiclesCollection, vehicleId, vehicleData)
    } catch (error) {
      console.error('Error updating vehicle:', error)
      throw error
    }
  }

  async deleteVehicle(vehicleId) {
    try {
      return await firebaseService.deleteDocument(this.vehiclesCollection, vehicleId)
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      throw error
    }
  }

  // Vehicle Transaction CRUD Operations
  async getVehicleTransactions(vehicleId = null) {
    try {
      const constraints = [orderBy('transactionDate', 'desc')]
      
      if (vehicleId) {
        constraints.unshift(where('vehicleId', '==', vehicleId))
      }
      
      return await firebaseService.getDocuments(this.transactionsCollection, constraints)
    } catch (error) {
      console.error('Error getting vehicle transactions:', error)
      throw error
    }
  }

  async getVehicleTransaction(transactionId) {
    try {
      return await firebaseService.getDocument(this.transactionsCollection, transactionId)
    } catch (error) {
      console.error('Error getting vehicle transaction:', error)
      throw error
    }
  }

  async addVehicleTransaction(transactionData) {
    try {
      const transaction = {
        vehicleId: transactionData.vehicleId,
        transactionType: transactionData.transactionType, // 'INCOME' or 'EXPENSE'
        amount: parseFloat(transactionData.amount),
        description: transactionData.description,
        transactionDate: firebaseService.createTimestamp(new Date(transactionData.transactionDate)),
        
        // Type-specific fields
        ...(transactionData.transactionType === 'INCOME' && {
          incomeType: transactionData.incomeType // 'RENTAL' or 'TRANSPORTATION'
        }),
        ...(transactionData.transactionType === 'EXPENSE' && {
          expenseType: transactionData.expenseType // 'PETROL', 'MAINTENANCE', 'REPAIRS', 'OTHER'
        }),
        
        // Additional metadata
        clientTimestamp: transactionData.clientTimestamp || Date.now()
      }
      
      return await firebaseService.addDocument(this.transactionsCollection, transaction)
    } catch (error) {
      console.error('Error adding vehicle transaction:', error)
      throw error
    }
  }

  async updateVehicleTransaction(transactionId, transactionData) {
    try {
      const updateData = {
        ...transactionData,
        amount: parseFloat(transactionData.amount),
        transactionDate: firebaseService.createTimestamp(new Date(transactionData.transactionDate))
      }
      
      return await firebaseService.updateDocument(this.transactionsCollection, transactionId, updateData)
    } catch (error) {
      console.error('Error updating vehicle transaction:', error)
      throw error
    }
  }

  async deleteVehicleTransaction(transactionId) {
    try {
      return await firebaseService.deleteDocument(this.transactionsCollection, transactionId)
    } catch (error) {
      console.error('Error deleting vehicle transaction:', error)
      throw error
    }
  }

  // Real-time subscriptions
  subscribeToVehicles(callback) {
    return firebaseService.subscribeToCollection(
      this.vehiclesCollection, 
      callback,
      [orderBy('vehicleNumber', 'asc')]
    )
  }

  subscribeToVehicleTransactions(callback, vehicleId = null) {
    const constraints = [orderBy('transactionDate', 'desc')]
    
    if (vehicleId) {
      constraints.unshift(where('vehicleId', '==', vehicleId))
    }
    
    return firebaseService.subscribeToCollection(
      this.transactionsCollection, 
      callback,
      constraints
    )
  }

  subscribeToVehicle(vehicleId, callback) {
    return firebaseService.subscribeToDocument(this.vehiclesCollection, vehicleId, callback)
  }

  // Analytics and calculations
  async getVehicleAnalytics(vehicleId, days = 7) {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const transactions = await firebaseService.getDocuments(this.transactionsCollection, [
        where('vehicleId', '==', vehicleId),
        where('transactionDate', '>=', firebaseService.createTimestamp(startDate)),
        where('transactionDate', '<=', firebaseService.createTimestamp(endDate)),
        orderBy('transactionDate', 'desc')
      ])
      
      const income = transactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const expenses = transactions
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
      
      return {
        vehicleId,
        period: { startDate, endDate, days },
        transactions,
        income,
        expenses,
        profit: income - expenses,
        transactionCount: transactions.length
      }
    } catch (error) {
      console.error('Error getting vehicle analytics:', error)
      throw error
    }
  }

  async getVehicleTypeAnalytics(vehicleType, days = 7) {
    try {
      // First get all vehicles of this type
      const vehicles = await firebaseService.getDocuments(this.vehiclesCollection, [
        where('vehicleType', '==', vehicleType)
      ])
      
      const vehicleIds = vehicles.map(v => v.id)
      
      if (vehicleIds.length === 0) {
        return {
          vehicleType,
          vehicles: [],
          transactions: [],
          income: 0,
          expenses: 0,
          profit: 0,
          transactionCount: 0
        }
      }
      
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      // Get transactions for all vehicles of this type
      // Note: Firestore doesn't support 'in' queries with more than 10 items
      // For larger datasets, we'd need to batch the queries
      const transactions = await firebaseService.getDocuments(this.transactionsCollection, [
        where('vehicleId', 'in', vehicleIds.slice(0, 10)), // Limit to first 10 vehicles
        where('transactionDate', '>=', firebaseService.createTimestamp(startDate)),
        where('transactionDate', '<=', firebaseService.createTimestamp(endDate)),
        orderBy('transactionDate', 'desc')
      ])
      
      const income = transactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const expenses = transactions
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
      
      return {
        vehicleType,
        period: { startDate, endDate, days },
        vehicles,
        transactions,
        income,
        expenses,
        profit: income - expenses,
        transactionCount: transactions.length
      }
    } catch (error) {
      console.error('Error getting vehicle type analytics:', error)
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
      
      const todayIncome = todayTransactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const todayExpenses = todayTransactions
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
      
      return {
        vehicleEarnings: todayIncome - todayExpenses,
        todayTransactions: todayTransactions.length,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error getting dashboard summary:', error)
      throw error
    }
  }

  // Cleanup subscriptions
  unsubscribe(listenerId) {
    firebaseService.unsubscribe(listenerId)
  }
}

// Create singleton instance
const vehicleService = new VehicleService()

export default vehicleService