import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger.js'

const prisma = new PrismaClient()

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Token generation
export const generateTokens = (userId, email) => {
  const payload = { userId, email }
  
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'vighneshwara-enterprises',
    audience: 'vighneshwara-app'
  })
  
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'vighneshwara-enterprises',
    audience: 'vighneshwara-app'
  })
  
  return { accessToken, refreshToken }
}

// Token verification
export const verifyToken = (token, secret = JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, {
      issuer: 'vighneshwara-enterprises',
      audience: 'vighneshwara-app'
    })
  } catch (error) {
    logger.warn('Token verification failed:', error.message)
    return null
  }
}

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' })
    }
    
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    })
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    
    req.user = user
    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Optional authentication (for public endpoints that can benefit from user context)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true, role: true }
        })
        
        if (user) {
          req.user = user
        }
      }
    }
    
    next()
  } catch (error) {
    // Don't fail on optional auth errors
    logger.debug('Optional auth failed:', error.message)
    next()
  }
}

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} with role ${req.user.role}`)
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    next()
  }
}

// Password hashing utilities
export const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

// Refresh token handling
export const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' })
    }
    
    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET)
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    })
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    
    // Generate new tokens
    const tokens = generateTokens(user.id, user.email)
    
    res.json({
      message: 'Tokens refreshed successfully',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    logger.error('Token refresh error:', error)
    res.status(500).json({ error: 'Token refresh failed' })
  }
}

// Session management
const activeSessions = new Map()

export const createSession = (userId, tokenId) => {
  const sessionId = `${userId}-${tokenId}`
  activeSessions.set(sessionId, {
    userId,
    tokenId,
    createdAt: new Date(),
    lastActivity: new Date()
  })
  
  // Clean up old sessions periodically
  if (activeSessions.size > 1000) {
    cleanupSessions()
  }
  
  return sessionId
}

export const updateSessionActivity = (sessionId) => {
  const session = activeSessions.get(sessionId)
  if (session) {
    session.lastActivity = new Date()
  }
}

export const removeSession = (sessionId) => {
  activeSessions.delete(sessionId)
}

const cleanupSessions = () => {
  const now = new Date()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      activeSessions.delete(sessionId)
    }
  }
  
  logger.info(`Cleaned up old sessions. Active sessions: ${activeSessions.size}`)
}

// Run session cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000)