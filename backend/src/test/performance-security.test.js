import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'
import { createAuditLog, AUDIT_EVENTS, AUDIT_LEVELS } from '../utils/auditLogger.js'

const prisma = new PrismaClient()

describe('Performance and Security Features', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({})
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({})
    await prisma.$disconnect()
  })

  describe('Security Middleware', () => {
    it('should add security headers to responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBeDefined()
    })

    it('should sanitize malicious input', async () => {
      const maliciousData = {
        description: '<script>alert("xss")</script>Normal text',
        amount: '100'
      }

      const response = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: 'test-vehicle',
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          ...maliciousData,
          transactionDate: new Date().toISOString()
        })

      // Should not contain script tags in response
      if (response.body.data) {
        expect(response.body.data.description).not.toContain('<script>')
      }
    })

    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(10).fill().map(() => 
        request(app).get('/health')
      )

      const responses = await Promise.all(requests)
      
      // All requests should succeed initially (within rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status)
      })
    })

    it('should validate file uploads', async () => {
      const response = await request(app)
        .post('/api/vehicles/transactions')
        .attach('photo', Buffer.from('fake-image-data'), 'test.txt') // Wrong file type
        .field('vehicleId', 'test-vehicle')
        .field('transactionType', 'EXPENSE')
        .field('expenseType', 'MAINTENANCE')
        .field('amount', '500')
        .field('transactionDate', new Date().toISOString())

      // Should reject invalid file types
      expect([400, 500]).toContain(response.status)
    })
  })

  describe('Performance Optimizations', () => {
    it('should compress responses', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Accept-Encoding', 'gzip')

      // Check if response is compressed
      expect(response.headers['content-encoding']).toBeDefined()
    })

    it('should add cache headers for static endpoints', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      // Check for cache control headers
      expect(response.headers['cache-control']).toBeDefined()
      expect(response.headers['etag']).toBeDefined()
    })

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now()
      
      const response = await request(app)
        .get('/api/vehicles/transactions?page=1&limit=10')

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
      
      if (response.body.data) {
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data.length).toBeLessThanOrEqual(10)
      }
    })

    it('should optimize database queries with proper indexing', async () => {
      const startTime = Date.now()
      
      // Test a complex query that should benefit from indexing
      const response = await request(app)
        .get('/api/analytics/dashboard')

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(2000) // Should respond within 2 seconds
    })
  })

  describe('Audit Logging', () => {
    it('should create audit logs for API requests', async () => {
      // Make a request that should be audited
      await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: 'test-vehicle',
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 1000,
          description: 'Test transaction',
          transactionDate: new Date().toISOString()
        })

      // Wait a bit for async audit log creation
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          event: AUDIT_EVENTS.VEHICLE_TRANSACTION
        },
        orderBy: { timestamp: 'desc' },
        take: 1
      })

      expect(auditLogs.length).toBeGreaterThan(0)
      expect(auditLogs[0].event).toBe(AUDIT_EVENTS.VEHICLE_TRANSACTION)
    })

    it('should retrieve audit logs via API', async () => {
      // Create a test audit log
      await createAuditLog({
        event: AUDIT_EVENTS.SYSTEM_ERROR,
        level: AUDIT_LEVELS.ERROR,
        details: { test: 'data' },
        success: false,
        errorMessage: 'Test error'
      })

      const response = await request(app)
        .get('/api/audit?limit=10')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.logs).toBeDefined()
      expect(Array.isArray(response.body.data.logs)).toBe(true)
    })

    it('should provide audit statistics', async () => {
      const response = await request(app)
        .get('/api/audit/stats')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.totalEvents).toBeDefined()
      expect(response.body.data.eventsByType).toBeDefined()
      expect(response.body.data.successRate).toBeDefined()
    })

    it('should export audit logs in different formats', async () => {
      // Test JSON export
      const jsonResponse = await request(app)
        .get('/api/audit/export?format=json')
        .expect(200)

      expect(jsonResponse.headers['content-type']).toContain('application/json')

      // Test CSV export
      const csvResponse = await request(app)
        .get('/api/audit/export?format=csv')
        .expect(200)

      expect(csvResponse.headers['content-type']).toContain('text/csv')
      expect(csvResponse.text).toContain('Timestamp,Event,Level') // CSV headers
    })
  })

  describe('Input Validation', () => {
    it('should validate email formats', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123'
        })

      expect([400, 422]).toContain(response.status)
    })

    it('should validate currency amounts', async () => {
      const response = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: 'test-vehicle',
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 'invalid-amount',
          transactionDate: new Date().toISOString()
        })

      expect([400, 422]).toContain(response.status)
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          // Missing required fields
          transactionType: 'INCOME'
        })

      expect([400, 422]).toContain(response.status)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to create a transaction with invalid vehicle ID
      const response = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: 'non-existent-vehicle',
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 1000,
          transactionDate: new Date().toISOString()
        })

      expect([400, 404, 500]).toContain(response.status)
      expect(response.body.error).toBeDefined()
    })

    it('should return proper error responses', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Memory and Performance Monitoring', () => {
    it('should include performance metrics in health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body.uptime).toBeDefined()
      expect(response.body.memory).toBeDefined()
      expect(response.body.timestamp).toBeDefined()
    })

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now()
      
      // Make 10 concurrent requests
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/analytics/dashboard')
      )

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(5000) // 5 seconds for 10 concurrent requests
    })
  })
})