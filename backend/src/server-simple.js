import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import routes
import vehicleRoutes from './routes/vehicles.js'
import scrapRoutes from './routes/scrap.js'
import billRoutes from './routes/bills.js'
import expenseRoutes from './routes/expenses.js'
import analyticsRoutes from './routes/analytics.js'

// Load environment variables
dotenv.config()

const app = express()

// Simple middleware
app.use(cors({
  origin: '*',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Vighneshwara Enterprises API is running'
  })
})

// Clear all data endpoint (for fresh start)
app.delete('/api/clear-all', async (req, res) => {
  try {
    const storage = (await import('./data/mongodb-storage.js')).default;
    await storage.clearAll();
    res.json({ message: 'All data cleared successfully! App is now fresh.' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing data', error: error.message });
  }
})

// API Routes - No authentication needed
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/scrap', scrapRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/analytics', analyticsRoutes)

// Simple error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 API: http://localhost:${PORT}`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📱 Mobile app can connect to: http://10.162.58.180:${PORT}`)
})

export default app