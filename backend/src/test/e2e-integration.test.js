import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'
import { createAuditLog, AUDIT_EVENTS } from '../utils/auditLogger.js'

const prisma = new PrismaClient()

describe('End-to-End Integration Tests', () => {
  let testVehicleId
  let testScrapTransactionId
  let testBillId

  beforeAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({})
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})
    await prisma.vehicleTransaction.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.dailySummary.deleteMany({})
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({})
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})
    await prisma.vehicleTransaction.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.dailySummary.deleteMany({})
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Create a test vehicle for each test
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleType: 'LORRY',
        vehicleNumber: 'TEST-001',
        status: 'ACTIVE'
      }
    })
    testVehicleId = vehicle.id
  })

  describe('Complete Vehicle Management Workflow', () => {
    it('should handle complete vehicle transaction lifecycle', async () => {
      // Step 1: Create income transaction
      const incomeResponse = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 5000,
          description: 'Daily rental income',
          transactionDate: new Date().toISOString(),
          vehicleNumber: 'TEST-001',
          partyName: 'ABC Company'
        })
        .expect(201)

      expect(incomeResponse.body.success).toBe(true)
      expect(incomeResponse.body.data.amount).toBe('5000')
      expect(incomeResponse.body.data.transactionType).toBe('INCOME')

      const incomeTransactionId = incomeResponse.body.data.id

      // Step 2: Create expense transaction
      const expenseResponse = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'EXPENSE',
          expenseType: 'PETROL',
          amount: 1500,
          description: 'Fuel cost',
          transactionDate: new Date().toISOString(),
          vehicleNumber: 'TEST-001'
        })
        .expect(201)

      expect(expenseResponse.body.success).toBe(true)
      expect(expenseResponse.body.data.amount).toBe('1500')
      expect(expenseResponse.body.data.transactionType).toBe('EXPENSE')

      // Step 3: Verify transactions are listed
      const listResponse = await request(app)
        .get(`/api/vehicles/${testVehicleId}/transactions`)
        .expect(200)

      expect(listResponse.body.success).toBe(true)
      expect(listResponse.body.data.length).toBe(2)

      // Step 4: Update a transaction
      const updateResponse = await request(app)
        .put(`/api/vehicles/transactions/${incomeTransactionId}`)
        .send({
          amount: 5500,
          description: 'Updated rental income'
        })
        .expect(200)

      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.amount).toBe('5500')

      // Step 5: Get analytics to verify profit calculation
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      expect(analyticsResponse.body.success).toBe(true)
      expect(analyticsResponse.body.data.totalProfit).toBeGreaterThan(0)

      // Step 6: Delete a transaction
      await request(app)
        .delete(`/api/vehicles/transactions/${incomeTransactionId}`)
        .expect(200)

      // Verify deletion
      const finalListResponse = await request(app)
        .get(`/api/vehicles/${testVehicleId}/transactions`)
        .expect(200)

      expect(finalListResponse.body.data.length).toBe(1)
    })

    it('should calculate daily profits correctly', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Create multiple transactions
      await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 3000,
          transactionDate: new Date().toISOString()
        })

      await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'EXPENSE',
          expenseType: 'MAINTENANCE',
          amount: 800,
          transactionDate: new Date().toISOString()
        })

      // Get daily summary
      const summaryResponse = await request(app)
        .get(`/api/analytics/daily-summary?date=${today}`)
        .expect(200)

      expect(summaryResponse.body.success).toBe(true)
      expect(summaryResponse.body.data.totalIncome).toBeGreaterThan(0)
      expect(summaryResponse.body.data.totalExpenses).toBeGreaterThan(0)
      expect(summaryResponse.body.data.totalProfit).toBe(
        summaryResponse.body.data.totalIncome - summaryResponse.body.data.totalExpenses
      )
    })
  })

  describe('Complete Scrap Trading Workflow', () => {
    it('should handle complete scrap transaction lifecycle', async () => {
      // Step 1: Create purchase transaction
      const purchaseResponse = await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'PURCHASE',
          partyName: 'Scrap Supplier Ltd',
          partyAddress: '123 Industrial Area',
          partyPhone: '9876543210',
          scrapType: 'Iron',
          quantity: 100,
          rate: 45,
          transactionDate: new Date().toISOString(),
          vehicleNumber: 'TRUCK-001'
        })
        .expect(201)

      expect(purchaseResponse.body.success).toBe(true)
      expect(purchaseResponse.body.data.totalAmount).toBe('4500')
      expect(purchaseResponse.body.data.transactionType).toBe('PURCHASE')

      testScrapTransactionId = purchaseResponse.body.data.id

      // Step 2: Create sale transaction
      const saleResponse = await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'SALE',
          partyName: 'Steel Mill Corp',
          partyAddress: '456 Factory Road',
          partyPhone: '9876543211',
          scrapType: 'Iron',
          quantity: 100,
          rate: 52,
          transactionDate: new Date().toISOString(),
          vehicleNumber: 'TRUCK-001'
        })
        .expect(201)

      expect(saleResponse.body.success).toBe(true)
      expect(saleResponse.body.data.totalAmount).toBe('5200')
      expect(saleResponse.body.data.transactionType).toBe('SALE')

      // Step 3: Verify scrap profit calculation
      const analyticsResponse = await request(app)
        .get('/api/analytics/scrap-summary')
        .expect(200)

      expect(analyticsResponse.body.success).toBe(true)
      expect(analyticsResponse.body.data.totalProfit).toBe(700) // 5200 - 4500

      // Step 4: Get scrap transactions list
      const listResponse = await request(app)
        .get('/api/scrap/transactions')
        .expect(200)

      expect(listResponse.body.success).toBe(true)
      expect(listResponse.body.data.length).toBe(2)

      // Step 5: Update scrap transaction
      const updateResponse = await request(app)
        .put(`/api/scrap/transactions/${testScrapTransactionId}`)
        .send({
          rate: 47,
          notes: 'Updated rate after negotiation'
        })
        .expect(200)

      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.rate).toBe('47')
      expect(updateResponse.body.data.totalAmount).toBe('4700')
    })

    it('should validate scrap types correctly', async () => {
      // Test with invalid scrap type
      const invalidResponse = await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'PURCHASE',
          partyName: 'Test Supplier',
          scrapType: 'InvalidType',
          quantity: 50,
          rate: 30,
          transactionDate: new Date().toISOString()
        })
        .expect(400)

      expect(invalidResponse.body.success).toBe(false)
      expect(invalidResponse.body.error).toContain('Invalid scrap type')

      // Test with valid scrap type
      const validResponse = await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'PURCHASE',
          partyName: 'Test Supplier',
          scrapType: 'Aluminum',
          quantity: 50,
          rate: 30,
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      expect(validResponse.body.success).toBe(true)
    })
  })

  describe('Complete Bill Generation Workflow', () => {
    beforeEach(async () => {
      // Create a scrap transaction for bill generation
      const scrapTransaction = await prisma.scrapTransaction.create({
        data: {
          transactionType: 'SALE',
          partyName: 'Test Customer',
          partyAddress: '789 Business District',
          partyGstin: '29ABCDE1234F1Z5',
          scrapType: 'Steel',
          quantity: 200,
          rate: 60,
          totalAmount: 12000,
          transactionDate: new Date()
        }
      })
      testScrapTransactionId = scrapTransaction.id
    })

    it('should generate and manage bills complete lifecycle', async () => {
      // Step 1: Generate Tax Invoice
      const billResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId: testScrapTransactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Test Customer',
          partyAddress: '789 Business District',
          partyGstin: '29ABCDE1234F1Z5',
          totalAmount: 12000,
          sgst: 1080,
          cgst: 1080,
          totalBeforeTax: 10000
        })
        .expect(201)

      expect(billResponse.body.success).toBe(true)
      expect(billResponse.body.data.billType).toBe('TAX_INVOICE')
      expect(billResponse.body.data.totalAmount).toBe('12000')

      testBillId = billResponse.body.data.id

      // Step 2: Get bill details
      const billDetailsResponse = await request(app)
        .get(`/api/bills/${testBillId}`)
        .expect(200)

      expect(billDetailsResponse.body.success).toBe(true)
      expect(billDetailsResponse.body.data.billNumber).toBeDefined()

      // Step 3: Download bill PDF
      const pdfResponse = await request(app)
        .get(`/api/bills/${testBillId}/pdf`)
        .expect(200)

      expect(pdfResponse.headers['content-type']).toBe('application/pdf')

      // Step 4: List all bills
      const billsListResponse = await request(app)
        .get('/api/bills')
        .expect(200)

      expect(billsListResponse.body.success).toBe(true)
      expect(billsListResponse.body.data.length).toBeGreaterThan(0)

      // Step 5: Update bill status
      const updateStatusResponse = await request(app)
        .put(`/api/bills/${testBillId}`)
        .send({
          status: 'SENT'
        })
        .expect(200)

      expect(updateStatusResponse.body.success).toBe(true)
      expect(updateStatusResponse.body.data.status).toBe('SENT')

      // Step 6: Search bills
      const searchResponse = await request(app)
        .get('/api/bills?search=Test Customer')
        .expect(200)

      expect(searchResponse.body.success).toBe(true)
      expect(searchResponse.body.data.length).toBeGreaterThan(0)
    })

    it('should generate Purchase Voucher correctly', async () => {
      const purchaseResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId: testScrapTransactionId,
          billType: 'PURCHASE_VOUCHER',
          partyName: 'Supplier Company',
          partyAddress: '456 Supply Street',
          totalAmount: 8000,
          reverseCharge: true
        })
        .expect(201)

      expect(purchaseResponse.body.success).toBe(true)
      expect(purchaseResponse.body.data.billType).toBe('PURCHASE_VOUCHER')
      expect(purchaseResponse.body.data.reverseCharge).toBe(true)
    })
  })

  describe('Real-time Updates Integration', () => {
    it('should broadcast updates via Socket.IO', async () => {
      // This test would require Socket.IO client setup
      // For now, we'll test that the endpoints work correctly
      
      // Create a transaction that should trigger real-time updates
      const response = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'INCOME',
          incomeType: 'TRANSPORTATION',
          amount: 2500,
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      expect(response.body.success).toBe(true)

      // Verify analytics are updated
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      expect(analyticsResponse.body.success).toBe(true)
      expect(analyticsResponse.body.data.totalIncome).toBeGreaterThan(0)
    })
  })

  describe('Data Synchronization', () => {
    it('should maintain data consistency across operations', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Create vehicle transactions
      await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 4000,
          transactionDate: new Date().toISOString()
        })

      await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'EXPENSE',
          expenseType: 'MAINTENANCE',
          amount: 1200,
          transactionDate: new Date().toISOString()
        })

      // Create scrap transactions
      await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'PURCHASE',
          partyName: 'Scrap Dealer',
          scrapType: 'Copper',
          quantity: 50,
          rate: 80,
          transactionDate: new Date().toISOString()
        })

      await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'SALE',
          partyName: 'Metal Buyer',
          scrapType: 'Copper',
          quantity: 50,
          rate: 90,
          transactionDate: new Date().toISOString()
        })

      // Verify dashboard shows correct totals
      const dashboardResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      const data = dashboardResponse.body.data
      expect(data.totalIncome).toBe(4000 + 4500) // Vehicle income + Scrap sales
      expect(data.totalExpenses).toBe(1200 + 4000) // Vehicle expenses + Scrap purchases
      expect(data.totalProfit).toBe(data.totalIncome - data.totalExpenses)

      // Verify daily summary matches
      const summaryResponse = await request(app)
        .get(`/api/analytics/daily-summary?date=${today}`)
        .expect(200)

      expect(summaryResponse.body.data.totalProfit).toBe(data.totalProfit)
    })

    it('should handle concurrent operations correctly', async () => {
      // Create multiple concurrent transactions
      const promises = []

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/vehicles/transactions')
            .send({
              vehicleId: testVehicleId,
              transactionType: 'INCOME',
              incomeType: 'RENTAL',
              amount: 1000 + i * 100,
              transactionDate: new Date().toISOString()
            })
        )
      }

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })

      // Verify all transactions are recorded
      const listResponse = await request(app)
        .get(`/api/vehicles/${testVehicleId}/transactions`)
        .expect(200)

      expect(listResponse.body.data.length).toBe(5)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Try to create transaction with non-existent vehicle
      const response = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: 'non-existent-id',
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 1000,
          transactionDate: new Date().toISOString()
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })

    it('should validate input data properly', async () => {
      // Test invalid amount
      const invalidAmountResponse = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: -1000, // Negative amount
          transactionDate: new Date().toISOString()
        })
        .expect(400)

      expect(invalidAmountResponse.body.success).toBe(false)

      // Test missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          // Missing transactionType
          amount: 1000,
          transactionDate: new Date().toISOString()
        })
        .expect(400)

      expect(missingFieldsResponse.body.success).toBe(false)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle multiple requests efficiently', async () => {
      const startTime = Date.now()

      // Create 20 concurrent requests
      const promises = Array(20).fill().map((_, index) =>
        request(app)
          .post('/api/vehicles/transactions')
          .send({
            vehicleId: testVehicleId,
            transactionType: 'INCOME',
            incomeType: 'RENTAL',
            amount: 1000 + index,
            description: `Load test transaction ${index}`,
            transactionDate: new Date().toISOString()
          })
      )

      const responses = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.description).toBe(`Load test transaction ${index}`)
      })

      // Should complete within reasonable time (10 seconds for 20 requests)
      expect(totalTime).toBeLessThan(10000)

      console.log(`Load test completed: 20 requests in ${totalTime}ms`)
    })

    it('should maintain performance with large datasets', async () => {
      // Create many transactions
      const transactions = []
      for (let i = 0; i < 50; i++) {
        transactions.push({
          vehicleId: testVehicleId,
          transactionType: i % 2 === 0 ? 'INCOME' : 'EXPENSE',
          incomeType: i % 2 === 0 ? 'RENTAL' : undefined,
          expenseType: i % 2 === 1 ? 'PETROL' : undefined,
          amount: 1000 + i * 10,
          transactionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      // Create transactions in batches
      for (let i = 0; i < transactions.length; i += 10) {
        const batch = transactions.slice(i, i + 10)
        const promises = batch.map(transaction =>
          request(app)
            .post('/api/vehicles/transactions')
            .send(transaction)
        )
        await Promise.all(promises)
      }

      // Test pagination performance
      const startTime = Date.now()
      const paginatedResponse = await request(app)
        .get(`/api/vehicles/${testVehicleId}/transactions?page=1&limit=20`)
        .expect(200)
      const endTime = Date.now()

      expect(paginatedResponse.body.success).toBe(true)
      expect(paginatedResponse.body.data.length).toBeLessThanOrEqual(20)
      expect(endTime - startTime).toBeLessThan(1000) // Should respond within 1 second

      // Test analytics performance with large dataset
      const analyticsStartTime = Date.now()
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)
      const analyticsEndTime = Date.now()

      expect(analyticsResponse.body.success).toBe(true)
      expect(analyticsEndTime - analyticsStartTime).toBeLessThan(2000) // Should respond within 2 seconds
    })
  })

  describe('Audit Trail Verification', () => {
    it('should create audit logs for all operations', async () => {
      // Clear existing audit logs
      await prisma.auditLog.deleteMany({})

      // Perform various operations
      await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId: testVehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 3000,
          transactionDate: new Date().toISOString()
        })

      await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'PURCHASE',
          partyName: 'Test Supplier',
          scrapType: 'Iron',
          quantity: 100,
          rate: 50,
          transactionDate: new Date().toISOString()
        })

      // Wait for audit logs to be created
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/audit?limit=10')
        .expect(200)

      expect(auditResponse.body.success).toBe(true)
      expect(auditResponse.body.data.logs.length).toBeGreaterThan(0)

      // Verify audit log contains expected events
      const logs = auditResponse.body.data.logs
      const hasVehicleTransaction = logs.some(log => 
        log.event === AUDIT_EVENTS.VEHICLE_TRANSACTION
      )
      const hasScrapTransaction = logs.some(log => 
        log.event === AUDIT_EVENTS.SCRAP_TRANSACTION
      )

      expect(hasVehicleTransaction).toBe(true)
      expect(hasScrapTransaction).toBe(true)
    })
  })
})