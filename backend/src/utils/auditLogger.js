import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const prisma = new PrismaClient()

// Audit log levels
export const AUDIT_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
}

// Audit event types
export const AUDIT_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  
  // Data operations
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  
  // Business operations
  VEHICLE_TRANSACTION: 'VEHICLE_TRANSACTION',
  SCRAP_TRANSACTION: 'SCRAP_TRANSACTION',
  BILL_GENERATED: 'BILL_GENERATED',
  BILL_DOWNLOADED: 'BILL_DOWNLOADED',
  
  // System events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_UPLOAD: 'FILE_UPLOAD',
  
  // Admin events
  ADMIN_ACTION: 'ADMIN_ACTION',
  CONFIG_CHANGE: 'CONFIG_CHANGE'
}

// Create audit log entry
export const createAuditLog = async (eventData) => {
  const {
    event,
    level = AUDIT_LEVELS.INFO,
    userId = null,
    entityType = null,
    entityId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
    success = true,
    errorMessage = null
  } = eventData

  try {
    // Create audit log in database
    const auditLog = await prisma.auditLog.create({
      data: {
        event,
        level,
        userId,
        entityType,
        entityId,
        details: JSON.stringify(details),
        ipAddress,
        userAgent,
        success,
        errorMessage,
        timestamp: new Date()
      }
    })

    // Also log to application logger
    const logMessage = `Audit: ${event} - ${success ? 'SUCCESS' : 'FAILED'}`
    const logData = {
      auditId: auditLog.id,
      userId,
      entityType,
      entityId,
      ipAddress,
      details
    }

    switch (level) {
      case AUDIT_LEVELS.CRITICAL:
        logger.error(logMessage, logData)
        break
      case AUDIT_LEVELS.ERROR:
        logger.error(logMessage, logData)
        break
      case AUDIT_LEVELS.WARN:
        logger.warn(logMessage, logData)
        break
      default:
        logger.info(logMessage, logData)
    }

    return auditLog
  } catch (error) {
    logger.error('Failed to create audit log:', error)
    // Don't throw error to avoid breaking the main operation
    return null
  }
}

// Audit middleware for Express routes
export const auditMiddleware = (event, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now()
    
    // Store original res.json to intercept response
    const originalJson = res.json
    let responseData = null
    
    res.json = function(data) {
      responseData = data
      return originalJson.call(this, data)
    }
    
    // Continue with the request
    next()
    
    // Log after response is sent
    res.on('finish', async () => {
      const duration = Date.now() - startTime
      const success = res.statusCode < 400
      
      const auditData = {
        event,
        level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.ERROR,
        userId: req.user?.id || null,
        entityType: options.entityType || null,
        entityId: req.params?.id || null,
        details: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          requestBody: req.method !== 'GET' ? req.body : undefined,
          responseData: success ? responseData : undefined,
          ...options.details
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success,
        errorMessage: success ? null : responseData?.error || 'Request failed'
      }
      
      await createAuditLog(auditData)
    })
  }
}

// Specific audit functions for common operations
export const auditVehicleTransaction = async (req, transactionData, success = true, error = null) => {
  await createAuditLog({
    event: AUDIT_EVENTS.VEHICLE_TRANSACTION,
    level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.ERROR,
    userId: req.user?.id,
    entityType: 'VehicleTransaction',
    entityId: transactionData?.id,
    details: {
      vehicleType: transactionData?.vehicleType,
      transactionType: transactionData?.transactionType,
      amount: transactionData?.amount,
      description: transactionData?.description
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    success,
    errorMessage: error?.message
  })
}

export const auditScrapTransaction = async (req, transactionData, success = true, error = null) => {
  await createAuditLog({
    event: AUDIT_EVENTS.SCRAP_TRANSACTION,
    level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.ERROR,
    userId: req.user?.id,
    entityType: 'ScrapTransaction',
    entityId: transactionData?.id,
    details: {
      scrapType: transactionData?.scrapType,
      transactionType: transactionData?.transactionType,
      quantity: transactionData?.quantity,
      rate: transactionData?.rate,
      total: transactionData?.total
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    success,
    errorMessage: error?.message
  })
}

export const auditBillGeneration = async (req, billData, success = true, error = null) => {
  await createAuditLog({
    event: AUDIT_EVENTS.BILL_GENERATED,
    level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.ERROR,
    userId: req.user?.id,
    entityType: 'Bill',
    entityId: billData?.id,
    details: {
      billType: billData?.type,
      billNumber: billData?.billNumber,
      amount: billData?.totalAmount,
      customerName: billData?.customerName
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    success,
    errorMessage: error?.message
  })
}

export const auditSecurityViolation = async (req, violationType, details = {}) => {
  await createAuditLog({
    event: AUDIT_EVENTS.SECURITY_VIOLATION,
    level: AUDIT_LEVELS.CRITICAL,
    userId: req.user?.id,
    details: {
      violationType,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      ...details
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    success: false,
    errorMessage: `Security violation: ${violationType}`
  })
}

export const auditFileUpload = async (req, fileData, success = true, error = null) => {
  await createAuditLog({
    event: AUDIT_EVENTS.FILE_UPLOAD,
    level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.WARN,
    userId: req.user?.id,
    details: {
      fileName: fileData?.originalname,
      fileSize: fileData?.size,
      mimeType: fileData?.mimetype,
      destination: fileData?.destination
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    success,
    errorMessage: error?.message
  })
}

// Query audit logs
export const getAuditLogs = async (filters = {}) => {
  const {
    startDate,
    endDate,
    userId,
    event,
    level,
    entityType,
    success,
    page = 1,
    limit = 50
  } = filters

  const where = {}
  
  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = new Date(startDate)
    if (endDate) where.timestamp.lte = new Date(endDate)
  }
  
  if (userId) where.userId = userId
  if (event) where.event = event
  if (level) where.level = level
  if (entityType) where.entityType = entityType
  if (typeof success === 'boolean') where.success = success

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ])

  return {
    logs: logs.map(log => ({
      ...log,
      details: JSON.parse(log.details || '{}')
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
}

// Cleanup old audit logs (run periodically)
export const cleanupAuditLogs = async (retentionDays = 90) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    })

    logger.info(`Cleaned up ${result.count} old audit logs`)
    return result.count
  } catch (error) {
    logger.error('Failed to cleanup audit logs:', error)
    return 0
  }
}

// Schedule cleanup to run daily
setInterval(() => {
  cleanupAuditLogs()
}, 24 * 60 * 60 * 1000) // 24 hours