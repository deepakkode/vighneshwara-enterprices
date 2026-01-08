// Simple file-based data storage for development
// In production, this would be replaced with a proper database

import fs from 'fs'
import path from 'path'

class DataStorage {
  constructor() {
    this.dataFile = path.join(process.cwd(), 'data.json')
    this.vehicles = []
    this.vehicleTransactions = []
    this.scrap = []
    this.expenses = []
    this.bills = []
    this.nextId = 1
    
    // Load existing data on startup
    this.loadData()
  }

  // Load data from file
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'))
        this.vehicles = data.vehicles || []
        this.vehicleTransactions = data.vehicleTransactions || []
        this.scrap = data.scrap || []
        this.expenses = data.expenses || []
        this.bills = data.bills || []
        this.nextId = data.nextId || 1
        console.log('📂 Data loaded from file:', this.dataFile)
        console.log(`📊 Loaded: ${this.vehicles.length} vehicles, ${this.vehicleTransactions.length} transactions, ${this.scrap.length} scrap items, ${this.expenses.length} expenses`)
      } else {
        console.log('📂 No existing data file found, initializing with sample data')
        this.initializeSampleData()
      }
    } catch (error) {
      console.error('❌ Error loading data:', error)
      this.initializeSampleData()
    }
  }

  // Save data to file
  saveData() {
    try {
      const data = {
        vehicles: this.vehicles,
        vehicleTransactions: this.vehicleTransactions,
        scrap: this.scrap,
        expenses: this.expenses,
        bills: this.bills,
        nextId: this.nextId,
        lastUpdated: new Date().toISOString()
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2))
      console.log('💾 Data saved to file')
    } catch (error) {
      console.error('❌ Error saving data:', error)
    }
  }

  // Generic CRUD operations
  create(collection, data) {
    const item = { ...data, id: this.nextId++, createdAt: new Date().toISOString() }
    this[collection].push(item)
    this.saveData() // Save after creating
    return item
  }

  findAll(collection) {
    return this[collection] || []
  }

  findById(collection, id) {
    return this[collection].find(item => item.id === parseInt(id))
  }

  update(collection, id, data) {
    const index = this[collection].findIndex(item => item.id === parseInt(id))
    if (index === -1) return null
    
    this[collection][index] = { 
      ...this[collection][index], 
      ...data, 
      updatedAt: new Date().toISOString() 
    }
    this.saveData() // Save after updating
    return this[collection][index]
  }

  delete(collection, id) {
    const index = this[collection].findIndex(item => item.id === parseInt(id))
    if (index === -1) return false
    
    this[collection].splice(index, 1)
    this.saveData() // Save after deleting
    return true
  }

  // Initialize with some sample data
  initializeSampleData() {
    // Sample vehicles
    this.create('vehicles', {
      vehicleNumber: 'MH12AB1234',
      vehicleType: 'Truck',
      driverName: 'Rajesh Kumar',
      driverPhone: '9876543210',
      capacity: 10,
      status: 'active'
    })

    this.create('vehicles', {
      vehicleNumber: 'MH12CD5678',
      vehicleType: 'Tempo',
      driverName: 'Suresh Patil',
      driverPhone: '9876543211',
      capacity: 5,
      status: 'active'
    })

    // Sample scrap items
    this.create('scrap', {
      itemName: 'Iron Scrap',
      category: 'Metal',
      weight: 100,
      pricePerKg: 25,
      totalAmount: 2500,
      customerName: 'ABC Industries',
      customerPhone: '9876543212',
      date: new Date().toISOString().split('T')[0]
    })

    this.create('scrap', {
      itemName: 'Copper Wire',
      category: 'Metal',
      weight: 50,
      pricePerKg: 450,
      totalAmount: 22500,
      customerName: 'XYZ Trading',
      customerPhone: '9876543213',
      date: new Date().toISOString().split('T')[0]
    })

    // Sample expenses
    this.create('expenses', {
      description: 'Diesel for MH12AB1234',
      category: 'Fuel',
      amount: 5000,
      paymentMethod: 'Cash',
      vehicleNumber: 'MH12AB1234',
      date: new Date().toISOString().split('T')[0],
      notes: 'Full tank'
    })

    this.create('expenses', {
      description: 'Driver Salary - Rajesh',
      category: 'Salary',
      amount: 15000,
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      notes: 'Monthly salary'
    })

    // Sample bills
    this.create('bills', {
      billNumber: 'BILL001',
      customerName: 'PQR Construction',
      customerPhone: '9876543214',
      customerAddress: 'Mumbai, Maharashtra',
      items: 'Transportation of construction materials',
      amount: 25000,
      paymentStatus: 'pending',
      paymentMethod: 'Cheque',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Net 30 days payment terms'
    })

    this.create('bills', {
      billNumber: 'BILL002',
      customerName: 'LMN Industries',
      customerPhone: '9876543215',
      customerAddress: 'Pune, Maharashtra',
      items: 'Scrap collection and disposal',
      amount: 18000,
      paymentStatus: 'paid',
      paymentMethod: 'NEFT',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Payment received'
    })

    // Sample vehicle transactions
    this.create('vehicleTransactions', {
      vehicleId: 1,
      vehicleName: 'Truck',
      type: 'income',
      description: 'Transportation service',
      amount: '15000',
      date: new Date().toISOString().split('T')[0]
    })

    this.create('vehicleTransactions', {
      vehicleId: 1,
      vehicleName: 'Truck',
      type: 'expense',
      description: 'Fuel cost',
      amount: '3000',
      date: new Date().toISOString().split('T')[0]
    })

    this.create('vehicleTransactions', {
      vehicleId: 2,
      vehicleName: 'Auto',
      type: 'income',
      description: 'Local delivery',
      amount: '8000',
      date: new Date().toISOString().split('T')[0]
    })

    // Save the initial sample data
    this.saveData()
    console.log('✅ Sample data initialized and saved')
  }
}

// Create singleton instance
const storage = new DataStorage()
// Sample data is loaded automatically in constructor

export default storage