import express from 'express'

const router = express.Router()

// Simple audit routes for development
router.get('/', (req, res) => {
  res.json([])
})

router.get('/logs', (req, res) => {
  res.json({ logs: [] })
})

export default router