import express from 'express'
import storage from '../data/storage.js'

const router = express.Router()

// GET /api/vehicles/transactions - Get all vehicle transactions (MOVED UP)
router.get('/transactions', async (req, res) => {
  try {
    const transactions = storage.findAll('vehicleTransactions')
    res.json(transactions)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle transactions', error: error.message })
  }
})

// POST /api/vehicles/transactions - Create vehicle transaction (MOVED UP)
router.post('/transactions', async (req, res) => {
  try {
    const transaction = storage.create('vehicleTransactions', req.body)
    res.status(201).json(transaction)
  } catch (error) {
    res.status(500).json({ message: 'Error creating vehicle transaction', error: error.message })
  }
})

// GET /api/vehicles - Get all vehicles
router.get('/', async (req, res) => {
  try {
    const vehicles = storage.findAll('vehicles')
    res.json(vehicles)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles', error: error.message })
  }
})

// GET /api/vehicles/:id - Get vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicle = storage.findById('vehicles', req.params.id)
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    res.json(vehicle)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle', error: error.message })
  }
})

// POST /api/vehicles - Create new vehicle
router.post('/', async (req, res) => {
  try {
    const vehicle = storage.create('vehicles', req.body)
    res.status(201).json(vehicle)
  } catch (error) {
    res.status(500).json({ message: 'Error creating vehicle', error: error.message })
  }
})

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const vehicle = storage.update('vehicles', req.params.id, req.body)
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    res.json(vehicle)
  } catch (error) {
    res.status(500).json({ message: 'Error updating vehicle', error: error.message })
  }
})

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const deleted = storage.delete('vehicles', req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    res.json({ message: 'Vehicle deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vehicle', error: error.message })
  }
})

export default router