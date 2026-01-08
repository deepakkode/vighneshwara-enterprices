import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import 'express-async-errors'

import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

// Import enhanced security and performance middleware
import { 
  securityHeaders, 
  apiRateLimit, 
  sanitizeInput, 
  auditLogger,
  validateFileUpload 
} from './middleware/security.js'
import { 
  compressionMiddleware, 
  performanceMonitor, 
  cacheControl 
} from './utils/performance.js'

// Import routes
import vehicleRoutes from './routes/vehicles.js'
import scrapRoutes from './routes/scrap.js'
import billRoutes from './routes/bills.js'
import expenseRoutes from './routes/expenses.js'
import analyticsRoutes from './routes/analytics.js'
import authRoutes from './routes/auth.js'
import auditRoutes from './routes/audit.js'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

// Enhanced middleware stack
app.use(securityHeaders)
app.use(compressionMiddleware)
app.use(apiRateLimit)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(auditLogger)
app.use(performanceMonitor)
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(sanitizeInput)
app.use(validateFileUpload)

// Static files for uploads
app.use('/uploads', express.static('uploads'))

// Health check endpoint with caching
app.get('/health', cacheControl(60), (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API Routes (No authentication needed for APK deployment)
app.use('/api/auth', authRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/scrap', scrapRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/audit', auditRoutes)

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)
  
  socket.on('join-dashboard', () => {
    socket.join('dashboard')
    logger.info(`Client ${socket.id} joined dashboard room`)
  })
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Make io available to routes
app.set('io', io)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📊 Dashboard: http://localhost:${PORT}`)
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
})

export default app