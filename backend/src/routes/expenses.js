import express from 'express'
import storage from '../data/mongodb-storage.js'

const router = express.Router()

// GET /api/expenses - Get all expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await storage.findAll('expenses')
    res.json(expenses)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message })
  }
})

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', async (req, res) => {
  try {
    const expense = await storage.findById('expenses', req.params.id)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }
    res.json(expense)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expense', error: error.message })
  }
})

// POST /api/expenses - Create new expense
router.post('/', async (req, res) => {
  try {
    const expense = await storage.create('expenses', req.body)
    res.status(201).json(expense)
  } catch (error) {
    res.status(500).json({ message: 'Error creating expense', error: error.message })
  }
})

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
  try {
    const expense = await storage.update('expenses', req.params.id, req.body)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }
    res.json(expense)
  } catch (error) {
    res.status(500).json({ message: 'Error updating expense', error: error.message })
  }
})

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await storage.delete('expenses', req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Expense not found' })
    }
    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense', error: error.message })
  }
})

export default router