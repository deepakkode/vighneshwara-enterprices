import express from 'express'
import storage from '../data/mongodb-storage.js'

const router = express.Router()

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const vehicles = await storage.findAll('vehicles')
    const scrap = await storage.findAll('scrap')
    const expenses = await storage.findAll('expenses')
    const bills = await storage.findAll('bills')

    const analytics = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.status === 'active').length,
      totalScrapItems: scrap.length,
      totalExpenses: expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0),
      totalBills: bills.reduce((sum, bill) => sum + (bill.amount || 0), 0),
      pendingBills: bills.filter(b => b.paymentStatus === 'pending').length,
      paidBills: bills.filter(b => b.paymentStatus === 'paid').length,
      monthlyExpenses: expenses.filter(exp => {
        const expDate = new Date(exp.date)
        const now = new Date()
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
      }).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
    }

    res.json(analytics)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message })
  }
})

export default router