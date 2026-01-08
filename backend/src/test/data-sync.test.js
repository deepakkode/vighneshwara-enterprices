import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Data Synchronization Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})
    await prisma.vehicleTransaction.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.dailySummary.deleteMany({})
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

  describe('Cross-Platform Data Consistency', () => {
    it('should maintain consistent data across web and mobile APIs', async () => {
      // Create test vehicle
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .send({
          vehicleType: 'LORRY',
          vehicleNumber: 'SYNC-001',
          status: 'ACTIVE'
        })
        .expect(201)

      const vehicleId = vehicleResponse.body.data.id

      // Create transaction via "web" API
      const webTransactionResponse = await request(app)
        .post('/api/vehicles/transactions')
        .send({
          vehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 5000,
          description: 'Web transaction',
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      // Verify transaction is visible via "mobile" API (same endpoint)
      const mobileListResponse = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions`)
        .set('User-Agent', 'MobileApp/1.0')
        .expect(200)

      expect(mobileListResponse.body.success).toBe(true)
      expect(mobileListResponse.body.data.length).toBe(1)
      expect(mobileListResponse.body.data[0].description).toBe('Web transaction')

      // Create transaction via "mobile" API
      const mobileTransactionResponse = await request(app)
        .post('/api/vehicles/transactions')
        .set('User-Agent', 'MobileApp/1.0')
        .send({
          vehicleId,
          transactionType: 'EXPENSE',
          expenseType: 'PETROL',
          amount: 1500,
          description: 'Mobile transaction',
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      // Verify both transactions are visible via web API
      const webListResponse = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions`)
        .expect(200)

      expect(webListResponse.body.success).toBe(true)
      expect(webListResponse.body.data.length).toBe(2)

      const descriptions = webListResponse.body.data.map(t => t.description)
      expect(descriptions).toContain('Web transaction')
      expect(descriptions).toContain('Mobile transaction')

      // Verify analytics show consistent data
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      expect(analyticsResponse.body.data.totalIncome).toBe(5000)
      expect(analyticsResponse.body.data.totalExpenses).toBe(1500)
      expect(analyticsResponse.body.data.totalProfit).toBe(3500)
    })

    it('should handle concurrent updates from multiple platforms', async () => {
      // Create test vehicle
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .send({
          vehicleType: 'TRUCK_AUTO',
          vehicleNumber: 'CONCURRENT-001',
          status: 'ACTIVE'
        })
        .expect(201)

      const vehicleId = vehicleResponse.body.data.id

      // Create concurrent transactions from different "platforms"
      const webPromises = Array(5).fill().map((_, i) =>
        request(app)
          .post('/api/vehicles/transactions')
          .set('User-Agent', 'WebApp/1.0')
          .send({
            vehicleId,
            transactionType: 'INCOME',
            incomeType: 'TRANSPORTATION',
            amount: 1000 + i * 100,
            description: `Web transaction ${i}`,
            transactionDate: new Date().toISOString()
          })
      )

      const mobilePromises = Array(5).fill().map((_, i) =>
        request(app)
          .post('/api/vehicles/transactions')
          .set('User-Agent', 'MobileApp/1.0')
          .send({
            vehicleId,
            transactionType: 'EXPENSE',
            expenseType: 'MAINTENANCE',
            amount: 500 + i * 50,
            description: `Mobile transaction ${i}`,
            transactionDate: new Date().toISOString()
          })
      )

      // Execute all requests concurrently
      const allResponses = await Promise.all([...webPromises, ...mobilePromises])

      // All should succeed
      allResponses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })

      // Verify all transactions are recorded
      const finalListResponse = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions`)
        .expect(200)

      expect(finalListResponse.body.data.length).toBe(10)

      // Verify data integrity
      const webTransactions = finalListResponse.body.data.filter(t => 
        t.description.startsWith('Web transaction')
      )
      const mobileTransactions = finalListResponse.body.data.filter(t => 
        t.description.startsWith('Mobile transaction')
      )

      expect(webTransactions.length).toBe(5)
      expect(mobileTransactions.length).toBe(5)
    })
  })

  describe('Real-time Synchronization', () => {
    it('should update analytics in real-time across platforms', async () => {
      // Get initial analytics
      const initialAnalytics = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      const initialProfit = parseFloat(initialAnalytics.body.data.totalProfit)

      // Create vehicle for testing
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .send({
          vehicleType: 'LORRY',
          vehicleNumber: 'REALTIME-001',
          status: 'ACTIVE'
        })
        .expect(201)

      const vehicleId = vehicleResponse.body.data.id

      // Add transaction via mobile
      await request(app)
        .post('/api/vehicles/transactions')
        .set('User-Agent', 'MobileApp/1.0')
        .send({
          vehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 2500,
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      // Verify analytics updated immediately via web
      const updatedAnalytics = await request(app)
        .get('/api/analytics/dashboard')
        .set('User-Agent', 'WebApp/1.0')
        .expect(200)

      const updatedProfit = parseFloat(updatedAnalytics.body.data.totalProfit)
      expect(updatedProfit).toBe(initialProfit + 2500)

      // Add expense via web
      await request(app)
        .post('/api/vehicles/transactions')
        .set('User-Agent', 'WebApp/1.0')
        .send({
          vehicleId,
          transactionType: 'EXPENSE',
          expenseType: 'REPAIRS',
          amount: 800,
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      // Verify analytics updated via mobile
      const finalAnalytics = await request(app)
        .get('/api/analytics/dashboard')
        .set('User-Agent', 'MobileApp/1.0')
        .expect(200)

      const finalProfit = parseFloat(finalAnalytics.body.data.totalProfit)
      expect(finalProfit).toBe(initialProfit + 2500 - 800)
    })
  })

  describe('Bill Format Consistency', () => {
    it('should generate identical bills across platforms', async () => {
      // Create scrap transaction
      const scrapResponse = await request(app)
        .post('/api/scrap/transactions')
        .send({
          transactionType: 'SALE',
          partyName: 'Consistent Customer',
          partyAddress: '123 Test Street',
          partyGstin: '29ABCDE1234F1Z5',
          scrapType: 'Steel',
          quantity: 100,
          rate: 75,
          transactionDate: new Date().toISOString()
        })
        .expect(201)

      const transactionId = scrapResponse.body.data.id

      // Generate bill via web
      const webBillResponse = await request(app)
        .post('/api/bills/generate')
        .set('User-Agent', 'WebApp/1.0')
        .send({
          transactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Consistent Customer',
          partyAddress: '123 Test Street',
          partyGstin: '29ABCDE1234F1Z5',
          totalAmount: 8850,
          totalBeforeTax: 7500,
          sgst: 675,
          cgst: 675
        })
        .expect(201)

      const webBillId = webBillResponse.body.data.id

      // Generate identical bill via mobile (should get same result)
      const mobileBillResponse = await request(app)
        .post('/api/bills/generate')
        .set('User-Agent', 'MobileApp/1.0')
        .send({
          transactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Consistent Customer',
          partyAddress: '123 Test Street',
          partyGstin: '29ABCDE1234F1Z5',
          totalAmount: 8850,
          totalBeforeTax: 7500,
          sgst: 675,
          cgst: 675
        })
        .expect(201)

      const mobileBillId = mobileBillResponse.body.data.id

      // Get bill details from both
      const webBillDetails = await request(app)
        .get(`/api/bills/${webBillId}`)
        .expect(200)

      const mobileBillDetails = await request(app)
        .get(`/api/bills/${mobileBillId}`)
        .expect(200)

      // Compare key fields (excluding IDs and timestamps)
      const webBill = webBillDetails.body.data
      const mobileBill = mobileBillDetails.body.data

      expect(webBill.billType).toBe(mobileBill.billType)
      expect(webBill.partyName).toBe(mobileBill.partyName)
      expect(webBill.totalAmount).toBe(mobileBill.totalAmount)
      expect(webBill.sgst).toBe(mobileBill.sgst)
      expect(webBill.cgst).toBe(mobileBill.cgst)

      // Download PDFs and verify they're generated
      const webPdfResponse = await request(app)
        .get(`/api/bills/${webBillId}/pdf`)
        .expect(200)

      const mobilePdfResponse = await request(app)
        .get(`/api/bills/${mobileBillId}/pdf`)
        .expect(200)

      expect(webPdfResponse.headers['content-type']).toBe('application/pdf')
      expect(mobilePdfResponse.headers['content-type']).toBe('application/pdf')
    })
  })

  describe('Offline Synchronization Simulation', () => {
    it('should handle data created during offline periods', async () => {
      // Create vehicle
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .send({
          vehicleType: 'LORRY',
          vehicleNumber: 'OFFLINE-001',
          status: 'ACTIVE'
        })
        .expect(201)

      const vehicleId = vehicleResponse.body.data.id

      // Simulate offline transactions (created with past timestamps)
      const offlineTransactions = [
        {
          vehicleId,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 3000,
          description: 'Offline transaction 1',
          transactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
        },
        {
          vehicleId,
          transactionType: 'EXPENSE',
          expenseType: 'PETROL',
          amount: 800,
          description: 'Offline transaction 2',
          transactionDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
        }
      ]

      // "Sync" offline transactions
      const syncPromises = offlineTransactions.map(transaction =>
        request(app)
          .post('/api/vehicles/transactions')
          .set('X-Offline-Sync', 'true')
          .send(transaction)
      )

      const syncResponses = await Promise.all(syncPromises)

      // All should succeed
      syncResponses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })

      // Verify transactions are properly ordered by date
      const listResponse = await request(app)
        .get(`/api/vehicles/${vehicleId}/transactions?sortBy=transactionDate&order=asc`)
        .expect(200)

      const transactions = listResponse.body.data
      expect(transactions.length).toBe(2)
      expect(transactions[0].description).toBe('Offline transaction 1')
      expect(transactions[1].description).toBe('Offline transaction 2')

      // Verify analytics include offline data
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200)

      expect(analyticsResponse.body.data.totalIncome).toBeGreaterThanOrEqual(3000)
      expect(analyticsResponse.body.data.totalExpenses).toBeGreaterThanOrEqual(800)
    })
  })

  describe('Data Validation Consistency', () => {
    it('should apply same validation rules across platforms', async () => {
      const testCases = [
        {
          name: 'negative amount',
          data: {
            transactionType: 'INCOME',
            incomeType: 'RENTAL',
            amount: -1000,
            transactionDate: new Date().toISOString()
          },
          shouldFail: true
        },
        {
          name: 'missing required field',
          data: {
            transactionType: 'INCOME',
            amount: 1000,
            transactionDate: new Date().toISOString()
            // Missing incomeType
          },
          shouldFail: true
        },
        {
          name: 'invalid transaction type',
          data: {
            transactionType: 'INVALID',
            amount: 1000,
            transactionDate: new Date().toISOString()
          },
          shouldFail: true
        },
        {
          name: 'valid transaction',
          data: {
            transactionType: 'INCOME',
            incomeType: 'RENTAL',
            amount: 1000,
            transactionDate: new Date().toISOString()
          },
          shouldFail: false
        }
      ]

      // Create test vehicle
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .send({
          vehicleType: 'LORRY',
          vehicleNumber: 'VALIDATION-001',
          status: 'ACTIVE'
        })
        .expect(201)

      const vehicleId = vehicleResponse.body.data.id

      // Test each case on both "platforms"
      for (const testCase of testCases) {
        const transactionData = { ...testCase.data, vehicleId }

        // Test via web
        const webResponse = await request(app)
          .post('/api/vehicles/transactions')
          .set('User-Agent', 'WebApp/1.0')
          .send(transactionData)

        // Test via mobile
        const mobileResponse = await request(app)
          .post('/api/vehicles/transactions')
          .set('User-Agent', 'MobileApp/1.0')
          .send(transactionData)

        if (testCase.shouldFail) {
          expect(webResponse.status).toBe(400)
          expect(mobileResponse.status).toBe(400)
          expect(webResponse.body.success).toBe(false)
          expect(mobileResponse.body.success).toBe(false)
        } else {
          expect(webResponse.status).toBe(201)
          expect(mobileResponse.status).toBe(201)
          expect(webResponse.body.success).toBe(true)
          expect(mobileResponse.body.success).toBe(true)
        }

        console.log(`✓ Validation consistency verified for: ${testCase.name}`)
      }
    })
  })
})