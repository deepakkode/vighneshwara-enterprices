import compression from 'compression'
import { logger } from './logger.js'

// Enhanced compression middleware
export const compressionMiddleware = compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false
    }
    
    // Compress all responses by default
    return compression.filter(req, res)
  }
})

// Response caching headers
export const cacheControl = (maxAge = 3600) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`)
      res.set('ETag', `"${Date.now()}"`)
    }
    next()
  }
}

// Performance monitoring middleware
export const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint()
  const startMemory = process.memoryUsage()
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint()
    const endMemory = process.memoryUsage()
    
    const duration = Number(endTime - startTime) / 1000000 // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed
    
    // Log slow requests
    if (duration > 1000) { // > 1 second
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl}`, {
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        ip: req.ip
      })
    }
    
    // Log performance metrics
    logger.debug(`Request performance: ${req.method} ${req.originalUrl}`, {
      duration: `${duration.toFixed(2)}ms`,
      memoryUsage: `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      statusCode: res.statusCode
    })
  })
  
  next()
}

// Database query optimization helpers
export const optimizeQuery = {
  // Pagination helper
  paginate: (page = 1, limit = 10) => {
    const offset = (page - 1) * limit
    return {
      skip: offset,
      take: Math.min(limit, 100) // Max 100 items per page
    }
  },
  
  // Date range optimization
  dateRange: (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Ensure valid date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range')
    }
    
    // Limit range to prevent excessive queries
    const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year
    if (end.getTime() - start.getTime() > maxRange) {
      throw new Error('Date range too large (max 1 year)')
    }
    
    return {
      gte: start,
      lte: end
    }
  },
  
  // Search optimization
  search: (query, fields) => {
    if (!query || query.length < 2) return {}
    
    const searchTerms = query.split(' ').filter(term => term.length > 1)
    
    return {
      OR: fields.flatMap(field => 
        searchTerms.map(term => ({
          [field]: {
            contains: term,
            mode: 'insensitive'
          }
        }))
      )
    }
  }
}

// Memory usage monitoring
export const memoryMonitor = () => {
  const usage = process.memoryUsage()
  const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB'
  
  logger.info('Memory Usage:', {
    rss: formatBytes(usage.rss),
    heapTotal: formatBytes(usage.heapTotal),
    heapUsed: formatBytes(usage.heapUsed),
    external: formatBytes(usage.external)
  })
  
  // Warn if memory usage is high
  if (usage.heapUsed > 500 * 1024 * 1024) { // > 500MB
    logger.warn('High memory usage detected', {
      heapUsed: formatBytes(usage.heapUsed)
    })
  }
}

// Start memory monitoring
setInterval(memoryMonitor, 5 * 60 * 1000) // Every 5 minutes

// Image optimization helper
export const optimizeImage = {
  // Validate image dimensions
  validateDimensions: (width, height, maxWidth = 2048, maxHeight = 2048) => {
    return width <= maxWidth && height <= maxHeight
  },
  
  // Calculate optimal quality based on file size
  calculateQuality: (fileSize) => {
    if (fileSize < 100 * 1024) return 95 // < 100KB: high quality
    if (fileSize < 500 * 1024) return 85 // < 500KB: good quality
    if (fileSize < 1024 * 1024) return 75 // < 1MB: medium quality
    return 65 // > 1MB: lower quality for compression
  },
  
  // Generate responsive image sizes
  generateSizes: (originalWidth, originalHeight) => {
    const aspectRatio = originalWidth / originalHeight
    
    return [
      { width: 150, height: Math.round(150 / aspectRatio), suffix: 'thumb' },
      { width: 300, height: Math.round(300 / aspectRatio), suffix: 'small' },
      { width: 600, height: Math.round(600 / aspectRatio), suffix: 'medium' },
      { width: 1200, height: Math.round(1200 / aspectRatio), suffix: 'large' }
    ].filter(size => size.width <= originalWidth)
  }
}