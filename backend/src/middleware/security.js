import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import xss from 'xss'
import validator from 'validator'
import { logger } from '../utils/logger.js'

// Enhanced rate limiting with different limits for different endpoints
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`)
      res.status(429).json({ error: message })
    }
  })
}

// Specific rate limits for different endpoints
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts')
export const apiRateLimit = createRateLimit(15 * 60 * 1000, 100, 'Too many API requests')
export const uploadRateLimit = createRateLimit(60 * 60 * 1000, 10, 'Too many file uploads')

// Enhanced helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj
    
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // XSS protection
        sanitized[key] = xss(value, {
          whiteList: {}, // No HTML tags allowed
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script']
        })
        
        // Additional validation for common injection patterns
        if (sanitized[key].includes('<script') || 
            sanitized[key].includes('javascript:') ||
            sanitized[key].includes('onload=') ||
            sanitized[key].includes('onerror=')) {
          logger.warn(`Potential XSS attempt blocked from IP: ${req.ip}`)
          return res.status(400).json({ error: 'Invalid input detected' })
        }
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  if (req.body) {
    req.body = sanitizeObject(req.body)
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query)
  }
  
  next()
}

// Input validation helpers
export const validateInput = {
  email: (email) => validator.isEmail(email),
  phone: (phone) => validator.isMobilePhone(phone, 'en-IN'),
  number: (num) => validator.isNumeric(String(num)),
  alphanumeric: (str) => validator.isAlphanumeric(str),
  length: (str, min, max) => validator.isLength(str, { min, max }),
  currency: (amount) => validator.isCurrency(String(amount), { 
    symbol: '₹', 
    require_symbol: false, 
    allow_negatives: false 
  })
}

// Request logging for audit trail
export const auditLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Log request
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    body: req.method !== 'GET' ? req.body : undefined
  })
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.info(`Response ${res.statusCode} for ${req.method} ${req.originalUrl}`, {
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString()
    })
  })
  
  next()
}

// File upload security
export const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) return next()
  
  const files = req.files || [req.file]
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      logger.warn(`Invalid file type upload attempt: ${file.mimetype} from IP: ${req.ip}`)
      return res.status(400).json({ error: 'Invalid file type' })
    }
    
    if (file.size > maxSize) {
      logger.warn(`File too large upload attempt: ${file.size} bytes from IP: ${req.ip}`)
      return res.status(400).json({ error: 'File too large' })
    }
  }
  
  next()
}