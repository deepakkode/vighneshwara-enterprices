import express from 'express'
import storage from '../data/mongodb-storage.js'

const router = express.Router()

// GET /api/bills - Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await storage.findAll('bills')
    res.json(bills)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error: error.message })
  }
})

// GET /api/bills/:id - Get bill by ID
router.get('/:id', async (req, res) => {
  try {
    const bill = await storage.findById('bills', req.params.id)
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' })
    }
    res.json(bill)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bill', error: error.message })
  }
})

// POST /api/bills - Create new bill
router.post('/', async (req, res) => {
  try {
    const bill = await storage.create('bills', req.body)
    res.status(201).json(bill)
  } catch (error) {
    res.status(500).json({ message: 'Error creating bill', error: error.message })
  }
})

// PUT /api/bills/:id - Update bill
router.put('/:id', async (req, res) => {
  try {
    const bill = await storage.update('bills', req.params.id, req.body)
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' })
    }
    res.json(bill)
  } catch (error) {
    res.status(500).json({ message: 'Error updating bill', error: error.message })
  }
})

// DELETE /api/bills/:id - Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await storage.delete('bills', req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Bill not found' })
    }
    res.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bill', error: error.message })
  }
})

export default router