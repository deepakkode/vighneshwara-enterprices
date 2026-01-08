import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Performance and Load Tests', () => {
  let testVehicleIds = []
  let testScrapTransactionIds = []

  beforeAll(async () => {
    // Clean up test data
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})
    await prisma.vehicleTransaction.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.dailySummary.deleteMany({})

    // Create test vehicles for load testing
    const vehiclePromises = Array(10).fill().map((_, index) =>
      prisma.vehicle.create({
        data: {
          vehicleType: index % 2 === 0 ? 'LORRY' : 'TRUCK_AUTO',
          vehicleNumber: `LOAD-${String(index).padStart(3, '0')}`,
          status: 'ACTIVE'
        }
      })
    )

    const vehicles = await Promise.all(vehiclePromises)
    testVehicleIds = vehicles.map(v => v.id)

    // Create test scrap transactions for load testing
    const scrapPromises = Array(5).fill().map((_, index) =>
      prisma.scrapTransaction.create({
        data: {
          transactionType: index % 2 === 0 ? 'PURCHASE' : 'SALE',
          partyName: `Load Test Party ${index}`,
          partyAddress: `Address ${index}`,
          scrapType: ['Iron', 'Steel', 'Aluminum', 'Copper', 'Brass'][index],
          quantity: 100 + index * 50,
          rate: 50 + index * 10,
          totalAmount: (100 + index * 50) * (50 + index * 10),
          transactionDate: new Date()
        }
      })
    )

    const scrapTransactions = await Promise.all(scrapPromises)
    testScrapTransactionIds = scrapTransactions.map(s => s.id)
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})
    await prisma.vehicleTransaction.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.dailySummary.deleteMany({})
    await prisma.$disconnect()
  })

  describe('API Response Time Tests', () => {
    it('should respond to health check within 100ms', async () => {
      const startTime = Date.now()
      
      const response = await request(app)
        .get('/health')
        .expect(200)

      const responseTime = Date.now() - startTime
      
      expect(response.body.status).toBe('OK')
      expect(responseTime).toBeLessThan(100)
      
      console.log(`Health check response time: ${responseTime}ms`)
    })

    it('should respond to dashboard analytics within 500ms', async () => {
      const startTime = Date.now()
      
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      const responseTime = Date.now() - startTime
      
      expect(response.body.success).toBe(true)
      expect(responseTime).toBeLessThan(500)
      
      console.log(`Dashboard analytics response time: ${responseTime}ms`)
    })

    it('should respond to vehicle transactions list within 300ms', async () => {
      const vehicleId = testVehicleIds[0]
      const startTime = Date.now()
      
      const response = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions`)
        .expect(200)

      const responseTime = Date.now() - startTime
      
      expect(response.body.success).toBe(true)
      expect(responseTime).toBeLessThan(300)
      
      console.log(`Vehicle transactions list response time: ${responseTime}ms`)
    })

    it('should respond to scrap transactions list within 300ms', async () => {
      const startTime = Date.now()
      
      const response = await request(app)
        .get('/api/scrap/transactions')
        .expect(200)

      const responseTime = Date.now() - startTime
      
      expect(response.body.success).toBe(true)
      expect(responseTime).toBeLessThan(300)
      
      console.log(`Scrap transactions list response time: ${responseTime}ms`)
    })

    it('should generate bills within 2 seconds', async () => {
      const transactionId = testScrapTransactionIds[0]
      const startTime = Date.now()
      
      const response = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Performance Test Customer',
          totalAmount: 10000
        })
        .expect(201)

      const responseTime = Date.now() - startTime
      
      expect(response.body.success).toBe(true)
      expect(responseTime).toBeLessThan(2000)
      
      console.log(`Bill generation response time: ${responseTime}ms`)
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle 50 concurrent vehicle transaction creations', async () => {
      const startTime = Date.now()
      
      const promises = Array(50).fill().map((_, index) => {
        const vehicleId = testVehicleIds[index % testVehicleIds.length]
        return request(app)
          .post('/api/vehicles/transactions')
          .send({
            vehicleId,
            transactionType: index % 2 === 0 ? 'INCOME' : 'EXPENSE',
            incomeType: index % 2 === 0 ? 'RENTAL' : undefined,
            expenseType: index % 2 === 1 ? 'PETROL' : undefined,
            amount: 1000 + index * 10,
            description: `Concurrent test transaction ${index}`,
            transactionDate: new Date().toISOString()
          })
      })

      const responses = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.description).toBe(`Concurrent test transaction ${index}`)
      })

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000) // 10 seconds for 50 requests
      
      console.log(`50 concurrent vehicle transactions completed in ${totalTime}ms`)
      console.log(`Average response time: ${(totalTime / 50).toFixed(2)}ms per request`)
    })

    it('should handle 30 concurrent scrap transaction creations', async () => {
      const startTime = Date.now()
      
      const scrapTypes = ['Iron', 'Steel', 'Aluminum', 'Copper', 'Brass']
      
      const promises = Array(30).fill().map((_, index) =>
        request(app)
          .post('/api/scrap/transactions')
          .send({
            transactionType: index % 2 === 0 ? 'PURCHASE' : 'SALE',
            partyName: `Concurrent Party ${index}`,
            partyAddress: `Address ${index}`,
            scrapType: scrapTypes[index % scrapTypes.length],
            quantity: 50 + index * 5,
            rate: 40 + index * 2,
            transactionDate: new Date().toISOString()
          })
      )

      const responses = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.partyName).toBe(`Concurrent Party ${index}`)
      })

      expect(totalTime).toBeLessThan(8000) // 8 seconds for 30 requests
      
      console.log(`30 concurrent scrap transactions completed in ${totalTime}ms`)
    })

    it('should handle 20 concurrent bill generations', async () => {
      const startTime = Date.now()
      
      const promises = Array(20).fill().map((_, index) => {
        const transactionId = testScrapTransactionIds[index % testScrapTransactionIds.length]
        return request(app)
          .post('/api/bills/generate')
          .send({
            transactionId,
            billType: index % 2 === 0 ? 'TAX_INVOICE' : 'PURCHASE_VOUCHER',
            partyName: `Concurrent Bill Customer ${index}`,
            totalAmount: 5000 + index * 500
          })
      })

      const responses = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.partyName).toBe(`Concurrent Bill Customer ${index}`)
      })

      expect(totalTime).toBeLessThan(15000) // 15 seconds for 20 bill generations
      
      console.log(`20 concurrent bill generations completed in ${totalTime}ms`)
    })

    it('should handle mixed concurrent operations', async () => {
      const startTime = Date.now()
      
      const vehiclePromises = Array(10).fill().map((_, index) => {
        const vehicleId = testVehicleIds[index % testVehicleIds.length]
        return request(app)
          .post('/api/vehicles/transactions')
          .send({
            vehicleId,
            transactionType: 'INCOME',
            incomeType: 'RENTAL',
            amount: 2000 + index * 100,
            transactionDate: new Date().toISOString()
          })
      })

      const scrapPromises = Array(10).fill().map((_, index) =>
        request(app)
          .post('/api/scrap/transactions')
          .send({
            transactionType: 'SALE',
            partyName: `Mixed Test Party ${index}`,
            scrapType: 'Iron',
            quantity: 100,
            rate: 50,
            transactionDate: new Date().toISOString()
          })
      )

      const billPromises = Array(5).fill().map((_, index) => {
        const transactionId = testScrapTransactionIds[index % testScrapTransactionIds.length]
        return request(app)
          .post('/api/bills/generate')
          .send({
            transactionId,
            billType: 'TAX_INVOICE',
            partyName: `Mixed Bill Customer ${index}`,
            totalAmount: 8000
          })
      })

      const analyticsPromises = Array(5).fill().map(() =>
        request(app).get('/api/analytics/dashboard')
      )

      const allPromises = [
        ...vehiclePromises,
        ...scrapPromises,
        ...billPromises,
        ...analyticsPromises
      ]

      const responses = await Promise.all(allPromises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status)
        expect(response.body.success).toBe(true)
      })

      expect(totalTime).toBeLessThan(12000) // 12 seconds for 30 mixed operations
      
      console.log(`30 mixed concurrent operations completed in ${totalTime}ms`)
    })
  })

  describe('Large Dataset Performance', () => {
    beforeAll(async () => {
      // Create a large dataset for performance testing
      const vehicleId = testVehicleIds[0]
      
      // Create 200 vehicle transactions
      const transactionPromises = Array(200).fill().map((_, index) =>
        prisma.vehicleTransaction.create({
          data: {
            vehicleId,
            transactionType: index % 2 === 0 ? 'INCOME' : 'EXPENSE',
            incomeType: index % 2 === 0 ? 'RENTAL' : undefined,
            expenseType: index % 2 === 1 ? 'PETROL' : undefined,
            amount: 1000 + index * 10,
            description: `Large dataset transaction ${index}`,
            transactionDate: new Date(Date.now() - index * 60 * 60 * 1000) // Spread over time
          }
        })
      )

      await Promise.all(transactionPromises)
    })

    it('should handle pagination with large datasets efficiently', async () => {
      const vehicleId = testVehicleIds[0]
      
      // Test first page
      const startTime1 = Date.now()
      const page1Response = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions?page=1&limit=20`)
        .expect(200)
      const time1 = Date.now() - startTime1

      expect(page1Response.body.success).toBe(true)
      expect(page1Response.body.data.length).toBe(20)
      expect(time1).toBeLessThan(500)

      // Test middle page
      const startTime2 = Date.now()
      const page5Response = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions?page=5&limit=20`)
        .expect(200)
      const time2 = Date.now() - startTime2

      expect(page5Response.body.success).toBe(true)
      expect(page5Response.body.data.length).toBe(20)
      expect(time2).toBeLessThan(500)

      // Test last page
      const startTime3 = Date.now()
      const page10Response = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions?page=10&limit=20`)
        .expect(200)
      const time3 = Date.now() - startTime3

      expect(page10Response.body.success).toBe(true)
      expect(time3).toBeLessThan(500)

      console.log(`Pagination performance: Page 1: ${time1}ms, Page 5: ${time2}ms, Page 10: ${time3}ms`)
    })

    it('should handle date range queries efficiently', async () => {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago

      const startTime = Date.now()
      const response = await request(app)
        .get(`/api/analytics/profit-trends?startDate=${startDate}&endDate=${endDate}`)
        .expect(200)
      const responseTime = Date.now() - startTime

      expect(response.body.success).toBe(true)
      expect(responseTime).toBeLessThan(1000)

      console.log(`Date range query performance: ${responseTime}ms`)
    })

    it('should handle complex analytics queries efficiently', async () => {
      const startTime = Date.now()
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)
      const responseTime = Date.now() - startTime

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalTransactions).toBeGreaterThan(200)
      expect(responseTime).toBeLessThan(1000)

      console.log(`Complex analytics query performance: ${responseTime}ms`)
    })
  })

  describe('Memory Usage and Resource Management', () => {
    it('should not leak memory during bulk operations', async () => {
      const initialMemory = process.memoryUsage()
      
      // Perform bulk operations
      const bulkPromises = Array(100).fill().map((_, index) => {
        const vehicleId = testVehicleIds[index % testVehicleIds.length]
        return request(app)
          .post('/api/vehicles/transactions')
          .send({
            vehicleId,
            transactionType: 'INCOME',
            incomeType: 'RENTAL',
            amount: 1500,
            description: `Memory test transaction ${index}`,
            transactionDate: new Date().toISOString()
          })
      })

      await Promise.all(bulkPromises)

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

      console.log(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle database connections efficiently', async () => {
      // Test multiple concurrent database operations
      const dbPromises = Array(50).fill().map(() =>
        request(app).get('/api/analytics/dashboard')
      )

      const startTime = Date.now()
      const responses = await Promise.all(dbPromises)
      const totalTime = Date.now() - startTime

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      // Should complete efficiently
      expect(totalTime).toBeLessThan(5000)

      console.log(`50 concurrent database operations completed in ${totalTime}ms`)
    })
  })

  describe('Error Handling Under Load', () => {
    it('should handle invalid requests gracefully under load', async () => {
      const invalidPromises = Array(20).fill().map((_, index) =>
        request(app)
          .post('/api/vehicles/transactions')
          .send({
            // Missing required fields
            amount: 1000,
            description: `Invalid request ${index}`
          })
      )

      const responses = await Promise.all(invalidPromises)

      // All should fail gracefully
      responses.forEach(response => {
        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.error).toBeDefined()
      })

      // Server should still be responsive
      const healthResponse = await request(app)
        .get('/health')
        .expect(200)

      expect(healthResponse.body.status).toBe('OK')
    })

    it('should maintain performance during mixed valid/invalid requests', async () => {
      const vehicleId = testVehicleIds[0]
      
      const mixedPromises = Array(40).fill().map((_, index) => {
        if (index % 4 === 0) {
          // Invalid request (25% of requests)
          return request(app)
            .post('/api/vehicles/transactions')
            .send({
              amount: 1000 // Missing required fields
            })
        } else {
          // Valid request (75% of requests)
          return request(app)
            .post('/api/vehicles/transactions')
            .send({
              vehicleId,
              transactionType: 'INCOME',
              incomeType: 'RENTAL',
              amount: 1000 + index,
              transactionDate: new Date().toISOString()
            })
        }
      })

      const startTime = Date.now()
      const responses = await Promise.all(mixedPromises)
      const totalTime = Date.now() - startTime

      // Check response distribution
      const validResponses = responses.filter(r => r.status === 201)
      const invalidResponses = responses.filter(r => r.status === 400)

      expect(validResponses.length).toBe(30) // 75% valid
      expect(invalidResponses.length).toBe(10) // 25% invalid
      expect(totalTime).toBeLessThan(8000) // Should complete within 8 seconds

      console.log(`Mixed valid/invalid requests completed in ${totalTime}ms`)
    })
  })
})