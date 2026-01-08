import express from 'express'
import storage from '../data/mongodb-storage.js'

const router = express.Router()

// GET /api/scrap - Get all scrap items
router.get('/', async (req, res) => {
  try {
    const scrapItems = await storage.findAll('scrap')
    res.json(scrapItems)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scrap items', error: error.message })
  }
})

// GET /api/scrap/:id - Get scrap item by ID
router.get('/:id', async (req, res) => {
  try {
    const scrapItem = await storage.findById('scrap', req.params.id)
    if (!scrapItem) {
      return res.status(404).json({ message: 'Scrap item not found' })
    }
    res.json(scrapItem)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scrap item', error: error.message })
  }
})

// POST /api/scrap - Create new scrap item
router.post('/', async (req, res) => {
  try {
    const scrapItem = await storage.create('scrap', req.body)
    res.status(201).json(scrapItem)
  } catch (error) {
    res.status(500).json({ message: 'Error creating scrap item', error: error.message })
  }
})

// PUT /api/scrap/:id - Update scrap item
router.put('/:id', async (req, res) => {
  try {
    const scrapItem = await storage.update('scrap', req.params.id, req.body)
    if (!scrapItem) {
      return res.status(404).json({ message: 'Scrap item not found' })
    }
    res.json(scrapItem)
  } catch (error) {
    res.status(500).json({ message: 'Error updating scrap item', error: error.message })
  }
})

// DELETE /api/scrap/:id - Delete scrap item
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await storage.delete('scrap', req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Scrap item not found' })
    }
    res.json({ message: 'Scrap item deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting scrap item', error: error.message })
  }
})

export default router