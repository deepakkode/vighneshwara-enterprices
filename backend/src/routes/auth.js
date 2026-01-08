import express from 'express'

const router = express.Router()

// Simple auth routes for development
router.post('/login', (req, res) => {
  res.json({ message: 'Login successful', token: 'dev-token' })
})

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' })
})

router.get('/me', (req, res) => {
  res.json({ user: { id: 1, name: 'Admin', role: 'admin' } })
})

export default router